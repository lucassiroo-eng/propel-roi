import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
async function azureFetch(body: Record<string, unknown>, timeoutMs = 60000): Promise<Response> {
  const k = Deno.env.get("AZURE_ANTHROPIC_API_KEY");
  if (!k) throw new Error("AZURE_ANTHROPIC_API_KEY not set");
  const h = { "api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
  const p = JSON.stringify(body);
  for (let a = 0; a <= 2; a++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    try {
      const r = await fetch(AZURE_URL, { method: "POST", headers: h, body: p, signal: c.signal });
      clearTimeout(t);
      if (r.status === 429 && a < 2) {
        const tx = await r.text();
        const m = tx.match(/wait (\d+) seconds/i);
        const w = m ? Math.min(+m[1], 60) : 25;
        console.log("Azure 429 — retry in " + w + "s");
        await new Promise(r => setTimeout(r, w * 1000));
        continue;
      }
      return r;
    } catch (e) {
      clearTimeout(t);
      if (a < 2 && (e as Error).name !== "AbortError") {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Azure: max retries exceeded");
}

async function lovableFetch(system: string, user: string, tool: any): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) { console.log("LOVABLE_API_KEY not set, skipping fallback"); return null; }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 4096,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{ type: "function", function: { name: tool.name, description: tool.description, parameters: tool.input_schema } }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text();
      console.error("Lovable AI error:", res.status, body);
      return null;
    }
    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return null;
    return typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
  } catch (err) {
    clearTimeout(timeout);
    console.error("Lovable fallback error:", err);
    return null;
  }
}

const ENHANCE_TOOL = {
  name: "enhance_roi_descriptions",
  description: "Extract personalized savings descriptions from a sales call transcript, mapped by module and stakeholder",
  input_schema: {
    type: "object",
    properties: {
      modules: {
        type: "object",
        description: "Keys are module IDs. Values are objects with optional employee/hr/manager arrays of bullet strings.",
        additionalProperties: {
          type: "object",
          properties: {
            employee: { type: "array", items: { type: "string" } },
            hr: { type: "array", items: { type: "string" } },
            manager: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    required: ["modules"],
  },
};

const LANG_LABELS: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French",
};

function buildSystemPrompt(modules: string[], language: string): string {
  const lang = LANG_LABELS[language] ?? "English";
  return `You are an ROI analyst for Factorial HR software. You will receive a sales call transcript and a list of HR modules that the prospect is evaluating.

Your task: extract REAL quotes, pain points, and specific challenges mentioned by the prospect in the transcript. Map them to the appropriate module and stakeholder type.

Stakeholder types:
- employee: individual contributors, regular staff
- hr: HR admins, HR managers, finance/payroll people
- manager: team leads, department heads, people managers

Modules to analyze: ${modules.join(", ")}

Rules:
1. Use the prospect's own words and specific details (names, numbers, timeframes) when possible
2. Each bullet should start with a concrete pain or quote, e.g.: "Your payroll team spends 3 days each month reconciling timesheets manually"
3. Return 2-4 bullets per stakeholder per module — only include stakeholders where the transcript has relevant content
4. If a module was NOT discussed in the transcript, omit it entirely from the response
5. The FIRST bullet for each stakeholder should be the strongest/most impactful finding — it will be featured in the summary slide
6. Respond in ${lang}
7. Do not invent details not present in the transcript — only extract what was actually said`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript, modules, language } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "transcript is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!modules?.length) {
      return new Response(JSON.stringify({ error: "modules array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = (language ?? "en").slice(0, 2);
    const systemPrompt = buildSystemPrompt(modules, lang);
    const transcriptTrimmed = transcript.slice(0, 80000);

    let result: any = null;
    let azureError = "";

    try {
      const res = await azureFetch({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: transcriptTrimmed }],
        tools: [ENHANCE_TOOL],
        tool_choice: { type: "tool", name: "enhance_roi_descriptions" },
      }, 60000);

      if (res.ok) {
        const data = await res.json();
        if (data.stop_reason === "max_tokens") {
          azureError = "Response truncated";
          console.error(azureError);
        } else {
          const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
          result = toolBlock?.input ?? null;
          if (!result) azureError = "No tool_use block in response";
        }
      } else {
        azureError = "Azure " + res.status + ": " + (await res.text()).slice(0, 300);
        console.error(azureError);
      }
    } catch (err: any) {
      azureError = "Azure exception: " + (err.message ?? String(err));
      console.error("Azure call failed:", err);
    }

    if (!result) {
      console.log("Azure failed (" + azureError + "), trying Lovable fallback");
      result = await lovableFetch(systemPrompt, transcriptTrimmed, ENHANCE_TOOL);
    }

    if (!result?.modules) {
      return new Response(JSON.stringify({ error: "AI enhancement failed", debug: azureError }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const descriptions = result.modules;
    const validModuleSet = new Set(modules);
    const filtered: Record<string, any> = {};
    let totalBullets = 0;
    for (const [modId, stakeholders] of Object.entries(descriptions)) {
      if (!validModuleSet.has(modId)) continue;
      const cleaned: Record<string, string[]> = {};
      for (const [sk, bullets] of Object.entries(stakeholders as any)) {
        if (!["employee", "hr", "manager"].includes(sk)) continue;
        if (Array.isArray(bullets) && bullets.length > 0) {
          cleaned[sk] = bullets.map(String).slice(0, 5);
          totalBullets += cleaned[sk].length;
        }
      }
      if (Object.keys(cleaned).length > 0) filtered[modId] = cleaned;
    }

    return new Response(JSON.stringify({
      descriptions: filtered,
      meta: { modules_enriched: Object.keys(filtered).length, total_bullets: totalBullets },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Unhandled error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
