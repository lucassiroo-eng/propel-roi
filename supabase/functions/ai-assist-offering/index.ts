import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { azureFetch } from "../_shared/azureFetch.ts";

const suggestOfferingTool = {
  name: "suggest_offering_changes",
  description: "Suggest module changes for the prospect's offering",
  parameters: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "remove", "swap"] },
            module: { type: "string" },
            swap_for: { type: "string", description: "Only when action is swap" },
            rationale: { type: "string" },
          },
          required: ["action", "module", "rationale"],
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

async function callAzure(systemPrompt: string, userMessage: string): Promise<any[] | null> {
  try {
    const res = await azureFetch({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: [{
        name: suggestOfferingTool.name,
        description: suggestOfferingTool.description,
        input_schema: suggestOfferingTool.parameters,
      }],
      tool_choice: { type: "tool", name: "suggest_offering_changes" },
    });

    if (!res.ok) {
      console.error("Azure AI error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
    return toolBlock?.input?.suggestions ?? [];
  } catch (err) {
    console.error("Azure call failed:", err);
    return null;
  }
}

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
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [{
          type: "function",
          function: suggestOfferingTool,
        }],
        tool_choice: { type: "function", function: { name: "suggest_offering_changes" } },
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
    const authHeader = req.headers.get("Authorization");
    if (!isAnonRequest(authHeader)) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader! } } }
      );
      const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const {
      selectedPains,
      sector,
      country,
      currentModules,
      userMessage,
      language,
      showPricing,
    } = await req.json();

    if (!userMessage || typeof userMessage !== "string") {
      return new Response(JSON.stringify({ error: "userMessage is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch context data
    const [rulesRes, benchRes, painsRes, pricingRes] = await Promise.all([
      supabaseAdmin.from("bundle_recommendation_rules").select("*"),
      supabaseAdmin.from("industry_benchmarks").select("*").eq("country", country ?? "ES").eq("sector", sector ?? ""),
      supabaseAdmin.from("pain_library").select("pain_id, persona, pain_statement, primary_module").eq("is_archived", false),
      showPricing
        ? supabaseAdmin.from("pricing").select("sku_name, price_business_yearly, price_enterprise_yearly").eq("country", country ?? "ES").eq("sku_type", "line_item")
        : Promise.resolve({ data: null }),
    ]);

    const langMap: Record<string, string> = { es: "Spanish", fr: "French", en: "English" };
    const langName = langMap[language] || "English";

    const selectedPainDetails = (painsRes.data ?? [])
      .filter((p: any) => (selectedPains ?? []).includes(p.pain_id))
      .map((p: any) => `${p.pain_id}: [${p.persona}] ${p.pain_statement} (module: ${p.primary_module})`)
      .join("\n");

    const rulesContext = (rulesRes.data ?? [])
      .map((r: any) => `${r.rule_id}: triggers=${r.triggering_pains}, min=${r.min_pains}, bundle=${r.recommended_bundle}`)
      .join("\n");

    const benchContext = (benchRes.data ?? [])
      .map((b: any) => {
        const rates = b.attach_rates ?? {};
        const top = Object.entries(rates)
          .filter(([, v]) => (v as number) > 0.1)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .map(([k, v]) => `${k}=${Math.round((v as number) * 100)}%`)
          .join(", ");
        return `${b.sector} (${b.n_customers} customers): ${top}`;
      })
      .join("\n");

    const pricingContext = showPricing && pricingRes.data
      ? (pricingRes.data as any[]).map((p: any) => `${p.sku_name}: B=${p.price_business_yearly}, E=${p.price_enterprise_yearly}`).join("\n")
      : "Pricing is hidden from the PAE currently.";

    const systemPrompt = `You are a Factorial HR sales consultant advising a PAE (Pre-sales Account Executive) on which modules to include in a prospect's offering.

Context:
- Country: ${country ?? "unknown"}
- Sector: ${sector ?? "unknown"}
- Selected pains:
${selectedPainDetails || "None selected"}

Current module composition: ${(currentModules ?? []).join(", ") || "None"}

Bundle recommendation rules:
${rulesContext}

Sector benchmarks (attach rates):
${benchContext || "No benchmark data available"}

Pricing:
${pricingContext}

Rules:
- Only suggest modules that exist in the Factorial product suite
- Each suggestion must have a clear business rationale tied to the prospect's pains or sector data
- Maximum 4 suggestions per response
- You can suggest adding, removing, or swapping modules
- Write rationales in ${langName}
- Never make up attach rates or statistics — only cite data from the benchmarks above
- If pricing is hidden, do not mention prices in your rationale`;

    let suggestions = await callAzure(systemPrompt, userMessage);
    if (suggestions === null) {
      console.log("Azure failed, falling back to Lovable AI Gateway");
      suggestions = await callLovableAI(systemPrompt, userMessage);
    }

    return new Response(JSON.stringify({ suggestions: suggestions ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    if (err.name === "AbortError") {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("ai-assist-offering error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
