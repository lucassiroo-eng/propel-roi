import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Build the shared system prompt + user message
function buildPrompt(painList: string, country: string, sector: string, notes: string, language: string) {
  const langMap: Record<string, string> = { es: "Spanish", fr: "French", en: "English" };
  const langName = langMap[language] || "English";

  const systemPrompt = `You are a deterministic Factorial HR pain-matching engine. Your only job is to map discovery notes from a sales call to the pains in the Factorial Pains Library, using the trigger phrases attached to each pain as the matching signal.

Read the discovery notes and identify every pain from the library that has evidence in the notes. A pain is a match when the notes contain phrases, symptoms or situations that align with the pain's trigger phrases — explicitly or as a paraphrase.

Available pains (each includes trigger phrases to guide matching):
${painList}

Rules:
- Only return pain_ids from the list above
- Match based on trigger phrases — if the notes contain phrases or symptoms listed in a pain's triggers, select that pain
- Never invent or modify pain_ids
- Consider the prospect's country (${country || "unknown"}) and sector (${sector || "unknown"})
- Write the rationale for each suggestion in ${langName} — keep it to 1 short sentence`;

  return { systemPrompt, userMessage: `Discovery notes:\n${notes}` };
}

// Tool schema shared by both providers
const suggestPainsTool = {
  name: "suggest_pains",
  description: "Return suggested pains based on discovery notes",
  parameters: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pain_id: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["pain_id", "rationale"],
        },
      },
    },
    required: ["suggestions"],
  },
};

function getJwtPayload(authHeader: string): Record<string, any> | null {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isAnonRequest(authHeader: string | null): boolean {
  if (!authHeader) return true;
  const claims = getJwtPayload(authHeader);
  return claims?.role === "anon" && !claims?.sub;
}

// Try Azure Anthropic
async function callAzure(systemPrompt: string, userMessage: string): Promise<any[] | null> {
  const apiKey = Deno.env.get("AZURE_ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages",
      {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-6",
          max_tokens: 1024,
          temperature: 0,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          tools: [{
            name: suggestPainsTool.name,
            description: suggestPainsTool.description,
            input_schema: suggestPainsTool.parameters,
          }],
          tool_choice: { type: "tool", name: "suggest_pains" },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      console.error("Azure AI error:", res.status, body);
      return null; // fallback
    }

    const data = await res.json();
    const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
    return toolBlock?.input?.suggestions ?? [];
  } catch (err) {
    clearTimeout(timeout);
    console.error("Azure call failed:", err);
    return null;
  }
}

// Fallback: Lovable AI Gateway (OpenAI-compatible)
async function callLovableAI(systemPrompt: string, userMessage: string): Promise<any[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("No AI provider available");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1024,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [{
          type: "function",
          function: suggestPainsTool,
        }],
        tool_choice: { type: "function", function: { name: "suggest_pains" } },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      console.error("Lovable AI error:", res.status, body);
      if (res.status === 429) throw new Error("Rate limited, try again later");
      if (res.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`Lovable AI error: ${res.status}`);
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return [];
    return JSON.parse(toolCall.function.arguments).suggestions ?? [];
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check — allow unauthenticated requests (preview mode)
    const authHeader = req.headers.get("Authorization");
    if (!isAnonRequest(authHeader)) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { notes, country, sector, language } = await req.json();
    if (!notes || typeof notes !== "string") {
      return new Response(JSON.stringify({ error: "notes is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: pains } = await supabaseAdmin
      .from("pain_library")
      .select("pain_id, persona, pain_statement, trigger_phrases")
      .eq("is_archived", false)
      .order("display_order");

    const painList = (pains ?? [])
      .map((p: any) => {
        let line = `- ${p.pain_id}: [${p.persona}] ${p.pain_statement}`;
        if (p.trigger_phrases) line += `\n  Triggers: ${p.trigger_phrases}`;
        return line;
      })
      .join("\n");

    const { systemPrompt, userMessage } = buildPrompt(painList, country, sector, notes, language ?? "en");

    // Try Azure first, fallback to Lovable AI
    let suggestions = await callAzure(systemPrompt, userMessage);
    if (suggestions === null) {
      console.log("Azure failed, falling back to Lovable AI Gateway");
      suggestions = await callLovableAI(systemPrompt, userMessage);
    }

    // Validate pain_ids exist
    const validIds = new Set((pains ?? []).map((p: any) => p.pain_id));
    const filtered = (suggestions ?? []).filter((s: any) => validIds.has(s.pain_id));

    return new Response(JSON.stringify({ suggestions: filtered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("ai-assist-pain-mapping error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
