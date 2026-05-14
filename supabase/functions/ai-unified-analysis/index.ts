import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
async function azureFetch(body: Record<string, unknown>, timeoutMs = 30000): Promise<Response> {
  const k = Deno.env.get("AZURE_ANTHROPIC_API_KEY");
  if (!k) throw new Error("AZURE_ANTHROPIC_API_KEY not set");
  const h = { "x-api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
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
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1536,
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

const STRENGTH: Record<string, number> = { strong: 0.9, moderate: 0.6, weak: 0.3 };
const ATTR_MULT: Record<string, number> = {
  client_verbatim: 1.0, client_paraphrase: 0.85, pae_interpretation: 0.65, inferred: 0.4,
};

function scoreModule(items: any[]): number {
  if (items.length === 0) return 0;
  const scores = items.map(i =>
    (STRENGTH[i.strength] ?? 0.5) * (ATTR_MULT[i.attribution] ?? 0.5)
  );
  return Math.min(1, Math.max(...scores) + (scores.length - 1) * 0.05);
}

function confidenceLabel(c: number): "strong" | "possible" {
  return c >= 0.55 ? "strong" : "possible";
}

const ANALYSIS_TOOL = {
  name: "analyze_deal",
  description: "Extract max 15 evidence items from deal content, map to modules and pains",
  input_schema: {
    type: "object",
    properties: {
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quote: { type: "string", description: "Max 1 sentence. Verbatim: exact prospect words. Other: contextual summary." },
            attribution: { type: "string", enum: ["client_verbatim", "client_paraphrase", "pae_interpretation", "inferred"] },
            strength: { type: "string", enum: ["strong", "moderate", "weak"] },
            source_type: { type: "string", enum: ["call", "incoming_email", "outgoing_email", "note"] },
            source_date: { type: "string" },
            source_who: { type: "string" },
            modules: { type: "array", items: { type: "string" } },
            pains: { type: "array", items: { type: "string" } },
          },
          required: ["quote", "attribution", "strength", "source_type", "source_who", "modules"],
        },
      },
    },
    required: ["evidence"],
  },
};

function buildSystemPrompt(moduleBlock: string, painBlock: string, country: string, sector: string, seats: number): string {
  return `Evidence-extraction engine for Factorial HR. Extract prospect pains from deal communications and map to modules/pains.

Extract the PROSPECT's problems, needs, and current tools/processes. Max 15 evidence items, prioritize strong signals.

CONTENT PRIORITY:
1. CALL NOTES / SUMMARIES — high value, contain structured pain descriptions
2. CALL TRANSCRIPTS — prospect's own words about their problems
3. INCOMING EMAILS — prospect describing their situation
4. OUTGOING EMAILS — only if they quote or describe the prospect's situation

Attribution: client_verbatim (exact words from call/email), client_paraphrase (close paraphrase), pae_interpretation (described in notes/summaries), inferred (from context).
Strength: strong (explicit pain or need), moderate (implies need), weak (inferred from context).

Quote format — keep to 1 sentence max:
- client_verbatim: prospect's exact words in original language
- client_paraphrase: "[Who], during [source], mentioned: [paraphrase]"
- pae_interpretation: "According to call notes, [situation]"
- inferred: "Given [context], [why relevant]"

source_who: name or role of speaker (e.g. "HR Director", "María García").

MODULES:
${moduleBlock}

PAINS (match via trigger phrases):
${painBlock}

Context: Country=${country}, Sector=${sector}, Employees=${seats}

Rules: one evidence can map to multiple modules. Each must have ≥1 module. Pain mapping optional. Same language as source.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, country, sector, seats, modules_ref, pains_ref } = await req.json();
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let painBlock = pains_ref ?? "";
    if (!painBlock) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: pains } = await supabaseAdmin
        .from("pain_library")
        .select("pain_id, persona, pain_statement, trigger_phrases")
        .eq("is_archived", false)
        .order("display_order");

      painBlock = (pains ?? []).map((p: any) => {
        let line = "- " + p.pain_id + ": [" + p.persona + "] " + p.pain_statement;
        if (p.trigger_phrases) line += " | Triggers: " + p.trigger_phrases;
        return line;
      }).join("\n");
    }

    const moduleBlock = modules_ref ?? "";
    const systemPrompt = buildSystemPrompt(moduleBlock, painBlock, country ?? "ES", sector ?? "", seats ?? 50);

    const contentTrimmed = content.slice(0, 18000);
    const userMessage = "Extract evidence of prospect pains. Max 15 items, strongest first.\n\n" + contentTrimmed;

    let result: any = null;
    let azureError = "";
    try {
      const res = await azureFetch({
        model: "claude-opus-4-6",
        max_tokens: 1536,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "analyze_deal" },
      }, 25000);

      if (res.ok) {
        const data = await res.json();
        const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
        result = toolBlock?.input ?? null;
        if (!result) azureError = "No tool_use block in response";
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
      result = await lovableFetch(systemPrompt, userMessage, ANALYSIS_TOOL);
    }

    if (!result) {
      return new Response(JSON.stringify({ error: "AI analysis failed", debug: azureError }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!result?.evidence?.length) {
      return new Response(JSON.stringify({ evidence: [], modules: [], pains: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evidence: any[] = result.evidence;

    const moduleMap = new Map<string, { items: any[]; bestQuote: any }>();
    for (const ev of evidence) {
      for (const modId of (ev.modules ?? [])) {
        if (!moduleMap.has(modId)) {
          moduleMap.set(modId, { items: [], bestQuote: null });
        }
        const entry = moduleMap.get(modId)!;
        entry.items.push(ev);
        const evScore = (STRENGTH[ev.strength] ?? 0.5) * (ATTR_MULT[ev.attribution] ?? 0.5);
        const bestScore = entry.bestQuote
          ? (STRENGTH[entry.bestQuote.strength] ?? 0.5) * (ATTR_MULT[entry.bestQuote.attribution] ?? 0.5)
          : 0;
        if (evScore > bestScore) {
          entry.bestQuote = ev;
        }
      }
    }

    const modules = Array.from(moduleMap.entries()).map(([moduleId, { items, bestQuote }]) => {
      const score = scoreModule(items);
      const confidence = confidenceLabel(score);

      let quote = "";
      if (bestQuote) {
        const who = bestQuote.source_who || "the prospect";
        const sourceType = bestQuote.source_type === "call" ? "a call"
          : bestQuote.source_type === "incoming_email" ? "an email"
          : bestQuote.source_type === "outgoing_email" ? "seller notes"
          : "internal notes";
        const dateStr = bestQuote.source_date ? " (" + bestQuote.source_date + ")" : "";

        if (bestQuote.attribution === "client_verbatim") {
          quote = who + ", in " + sourceType + dateStr + ", said: «" + bestQuote.quote + "»";
        } else if (bestQuote.attribution === "client_paraphrase") {
          quote = who + ", in " + sourceType + dateStr + ", mentioned: «" + bestQuote.quote + "»";
        } else {
          quote = bestQuote.quote;
        }
      }

      return {
        module_id: moduleId,
        confidence,
        score: Math.round(score * 100),
        quote,
        evidence_count: items.length,
      };
    }).sort((a, b) => b.score - a.score);

    const painMap = new Map<string, { count: number; bestQuote: string }>();
    for (const ev of evidence) {
      for (const painId of (ev.pains ?? [])) {
        if (!painMap.has(painId)) painMap.set(painId, { count: 0, bestQuote: "" });
        const entry = painMap.get(painId)!;
        entry.count++;
        if (!entry.bestQuote && ev.quote) entry.bestQuote = ev.quote;
      }
    }
    const pains = Array.from(painMap.entries()).map(([pain_id, { count, bestQuote }]) => ({
      pain_id,
      evidence_count: count,
      rationale: bestQuote,
    }));

    return new Response(JSON.stringify({
      evidence,
      modules,
      pains,
      meta: { evidence_count: evidence.length, module_count: modules.length, pain_count: pains.length },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("ai-unified-analysis error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
