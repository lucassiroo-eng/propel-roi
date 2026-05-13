import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
async function azureFetch(body: Record<string, unknown>, timeoutMs = 30000): Promise<Response> {
  const k = Deno.env.get("AZURE_ANTHROPIC_API_KEY"); if (!k) throw new Error("AZURE_ANTHROPIC_API_KEY not set");
  const h = { "api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
  const p = JSON.stringify(body);
  for (let a = 0; a <= 2; a++) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs);
    try {
      const r = await fetch(AZURE_URL, { method: "POST", headers: h, body: p, signal: c.signal }); clearTimeout(t);
      if (r.status === 429 && a < 2) { const tx = await r.text(); const m = tx.match(/wait (\d+) seconds/i); const w = m ? Math.min(+m[1], 60) : 25; console.log(`Azure 429 — retry in ${w}s`); await new Promise(r => setTimeout(r, w * 1000)); continue; }
      return r;
    } catch (e) { clearTimeout(t); if (a < 2 && (e as Error).name !== "AbortError") { await new Promise(r => setTimeout(r, 3000)); continue; } throw e; }
  }
  throw new Error("Azure: max retries exceeded");
}

const extractVarsTool = {
  name: "extract_variables",
  description: "Extract variable values mentioned in call notes",
  parameters: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            var_key: { type: "string", description: "Variable ID like I24" },
            value: { type: "number", description: "The numeric value found" },
            sentence: { type: "string", description: "The exact sentence or phrase from the notes that justifies this value" },
          },
          required: ["var_key", "value", "sentence"],
        },
      },
    },
    required: ["matches"],
  },
};

async function callAzure(systemPrompt: string, userMessage: string): Promise<any[] | null> {
  try {
    const res = await azureFetch({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      tools: [{
        name: extractVarsTool.name,
        description: extractVarsTool.description,
        input_schema: extractVarsTool.parameters,
      }],
      tool_choice: { type: "tool", name: "extract_variables" },
    });

    if (!res.ok) {
      console.error("Azure AI error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
    return toolBlock?.input?.matches ?? [];
  } catch (err) {
    console.error("Azure call failed:", err);
    return null;
  }
}

async function callLovableAI(systemPrompt: string, userMessage: string): Promise<any[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        tools: [{
          type: "function",
          function: {
            name: extractVarsTool.name,
            description: extractVarsTool.description,
            parameters: extractVarsTool.parameters,
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_variables" } },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Lovable AI error:", res.status, body);
      return null;
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return [];
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    return args.matches ?? [];
  } catch (err) {
    console.error("Lovable AI call failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, variables, language } = await req.json();

    if (!notes || !variables || !Array.isArray(variables) || variables.length === 0) {
      return new Response(JSON.stringify({ matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the variable list for the prompt
    const varList = variables
      .map((v: any) => `- ${v.var_key}: "${v.label}" (unit: ${v.unit || "count"})`)
      .join("\n");

    const langMap: Record<string, string> = { es: "Spanish", fr: "French", en: "English" };
    const langName = langMap[language] || "English";

    const systemPrompt = `You are a data extraction engine for Factorial HR sales calls. Your job is to scan the CALL NOTES provided below and find any explicit numeric values that correspond to the given variables.

CRITICAL RULES:
- Only return a match when the CALL NOTES contain an explicit number or clearly quantifiable statement for that variable
- Do NOT infer or calculate values — only extract what is explicitly stated IN THE CALL NOTES
- The "sentence" field MUST be a verbatim copy-paste from the call notes text — do NOT paraphrase, summarize, or generate new text. Copy the exact sentence or phrase from the notes where the value appears.
- NEVER use pain descriptions, pain statements, or any other source for the sentence — ONLY the call notes text provided in the user message
- If a percentage is mentioned (e.g. "3%"), return the decimal form (0.03) as the value
- If a currency amount is mentioned (e.g. "25€/hour"), return just the number (25)
- Only match variables from the provided list — never invent variable IDs
- Be conservative: if unsure, do not include a match`;

    const userMessage = `Variables to search for:\n${varList}\n\n--- START OF CALL NOTES (only quote from this section) ---\n${notes}\n--- END OF CALL NOTES ---`;

    // Try Azure first, fallback to Lovable AI
    let matches = await callAzure(systemPrompt, userMessage);
    if (matches === null) {
      matches = await callLovableAI(systemPrompt, userMessage);
    }

    return new Response(JSON.stringify({ matches: matches ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in ai-extract-notes-variables:", err);
    return new Response(JSON.stringify({ error: "Internal error", matches: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
