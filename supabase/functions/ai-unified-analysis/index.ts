import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
async function azureFetch(body: Record<string, unknown>, timeoutMs = 30000): Promise<Response> {
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

// Fallback: Lovable AI Gateway
async function lovableFetch(system: string, user: string, tool: any): Promise<any> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("No AI fallback available");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
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

// ── Scoring ──
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

// ── Tool schema ──
const ANALYSIS_TOOL = {
  name: "analyze_deal",
  description: "Extract evidence from deal content and map to Factorial modules and pains",
  input_schema: {
    type: "object",
    properties: {
      evidence: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quote: {
              type: "string",
              description: "The evidence text. For client_verbatim: copy-paste exact words in original language. For other attributions: write a clear contextual sentence.",
            },
            attribution: {
              type: "string",
              enum: ["client_verbatim", "client_paraphrase", "pae_interpretation", "inferred"],
            },
            strength: {
              type: "string",
              enum: ["strong", "moderate", "weak"],
            },
            source_type: {
              type: "string",
              enum: ["call", "incoming_email", "outgoing_email", "note"],
            },
            source_date: { type: "string", description: "Date of source if available (YYYY-MM-DD)" },
            source_who: { type: "string", description: "Who said it — role or name if known (e.g. 'HR Director', 'CFO', 'the prospect', 'María García')" },
            modules: {
              type: "array",
              items: { type: "string" },
              description: "Module IDs this evidence supports",
            },
            pains: {
              type: "array",
              items: { type: "string" },
              description: "Pain IDs from pain_library this evidence supports (if any match)",
            },
          },
          required: ["quote", "attribution", "strength", "source_type", "source_who", "modules"],
        },
      },
    },
    required: ["evidence"],
  },
};

function buildSystemPrompt(moduleBlock: string, painBlock: string, country: string, sector: string, seats: number): string {
  return `You are an expert Factorial HR evidence-extraction engine. You read deal communications and extract every piece of evidence about the PROSPECT's pains, problems, and needs — then classify which Factorial modules and pains each piece of evidence supports.

CRITICAL — WHAT COUNTS AS EVIDENCE:
1. ONLY the PROSPECT's (client's) pains, problems, complaints, workflows, and situations.
2. IGNORE the seller's pitch entirely. When the seller says "le hemos hablado de X", "le propuse Y", "Factorial tiene Z" — that is NOT evidence. Skip it.
3. Look for SYMPTOMS: "tardamos 3 horas...", "lo hacemos en Excel...", "no tenemos forma de...", "cada mes nos pasa..."

CONTENT PRIORITY:
1. CALL TRANSCRIPTS — highest. The prospect's voice reveals real pains.
2. INCOMING EMAILS — from the prospect describing their situation.
3. OUTGOING EMAILS — low value, only if they contain quoted replies from the prospect.
4. NOTES — lowest. Only use if they clearly describe the prospect's situation, not the seller's pitch.

ATTRIBUTION — classify each evidence item:
- client_verbatim: you are copy-pasting the prospect's exact words from a call transcript or incoming email
- client_paraphrase: the prospect said something similar but you're paraphrasing closely
- pae_interpretation: the seller described the prospect's situation (e.g. in notes or outgoing email)
- inferred: you're inferring a need from context (company size, industry norms)

STRENGTH:
- strong: prospect explicitly describes a concrete pain or problem that a module solves
- moderate: prospect mentions a related topic or situation that implies the need
- weak: inferred from context only (company size, industry)

QUOTE FORMAT — THIS IS CRITICAL:
For client_verbatim: Copy-paste the prospect's EXACT words in their ORIGINAL language. Max 2 sentences.
For client_paraphrase: Write: "[Role/Name], during [source], mentioned: [close paraphrase in original language]"
For pae_interpretation: Write: "According to seller notes from [date], [what the prospect's situation is]"
For inferred: Write: "Given [context: company size/sector/etc], [why this module is likely relevant]"

NEVER fabricate quotes. NEVER quote the seller pitching products.

SOURCE_WHO: Always identify who said it. Use the person's name if known, otherwise their role (e.g. "HR Director", "the prospect", "the CFO"). If from seller notes, say "according to PAE notes".

MODULES — map evidence to these module IDs:
${moduleBlock}

PAINS — if evidence matches any of these pain trigger phrases, include the pain_id:
${painBlock}

Context: Country=${country}, Sector=${sector}, Employees=${seats}

RULES:
- Be THOROUGH — extract ALL evidence, even weak signals. The user can filter later.
- One evidence item can map to MULTIPLE modules.
- Each piece of evidence MUST have at least one module.
- Pain mapping is optional — only include pain_ids when trigger phrases clearly match.
- Write everything in the SAME language as the source content.`;
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

    // Fetch pain library for trigger phrases (unless caller provided them)
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

    const userMessage = "Analyze the following deal communications. Extract ALL evidence of prospect pains and map each to modules (and pains where applicable).\n\n" + content;

    // Try Azure first
    let result: any = null;
    try {
      const res = await azureFetch({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: "analyze_deal" },
      }, 30000);

      if (res.ok) {
        const data = await res.json();
        const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
        result = toolBlock?.input ?? null;
      } else {
        const errText = await res.text();
        console.error("Azure error:", res.status, errText);
      }
    } catch (err) {
      console.error("Azure call failed:", err);
    }

    // Fallback to Lovable
    if (!result) {
      console.log("Azure failed, trying Lovable fallback");
      result = await lovableFetch(systemPrompt, userMessage, ANALYSIS_TOOL);
    }

    if (!result?.evidence?.length) {
      return new Response(JSON.stringify({ evidence: [], modules: [], pains: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evidence: any[] = result.evidence;

    // ── Deterministic scoring per module ──
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

    // Build module results with formatted quotes
    const modules = Array.from(moduleMap.entries()).map(([moduleId, { items, bestQuote }]) => {
      const score = scoreModule(items);
      const confidence = confidenceLabel(score);

      // Build contextual quote
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

    // ── Pain aggregation ──
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
