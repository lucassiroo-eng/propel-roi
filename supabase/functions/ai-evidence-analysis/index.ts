import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
async function azureFetch(body: Record<string, unknown>, timeoutMs = 30000): Promise<Response> {
  const k = Deno.env.get("AZURE_ANTHROPIC_API_KEY"); if (!k) throw new Error("AZURE_ANTHROPIC_API_KEY not set");
  const h = { "x-api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
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

// ── Types ──

interface EvidenceItem {
  index: number;
  text: string;
  evidence_type: string;
  attribution: string;
  source_label: string;
  source_date: string | null;
}

interface RuleMatch {
  evidence_index: number;
  rule_id: number | null;
  module_id: string;
  evidence_type: string;
  attribution: string;
  match_quality: string;
  strength: string;
}

interface ModuleMatch {
  module_id: string;
  confidence: number;
  confidence_level: string;
  evidence_chain: RuleMatch[];
  strongest_quote: string;
  rationale: string;
}

// ── Confidence scoring (deterministic) ──

const STRENGTH_BASE: Record<string, number> = { strong: 0.9, moderate: 0.6, weak: 0.3 };
const ATTRIBUTION_MULT: Record<string, number> = {
  client_verbatim: 1.0, client_paraphrase: 0.85, pae_interpretation: 0.65, inferred: 0.4,
};

function scoreConfidence(matches: RuleMatch[]): number {
  if (matches.length === 0) return 0;
  const scores = matches.map(m =>
    (STRENGTH_BASE[m.strength] ?? 0.5) * (ATTRIBUTION_MULT[m.attribution] ?? 0.5)
  );
  return Math.min(1, Math.max(...scores) + (scores.length - 1) * 0.05);
}

function confidenceLevel(c: number): string {
  if (c >= 0.7) return "high";
  if (c >= 0.4) return "medium";
  return "low";
}

// ── Pass 1: Evidence extraction ──

const EXTRACT_TOOL = {
  name: "extract_evidence",
  description: "Extract evidence items from deal content",
  input_schema: {
    type: "object" as const,
    properties: {
      evidence: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            text: { type: "string" as const },
            evidence_type: { type: "string" as const, enum: ["direct_quote", "metric", "situation", "tool_mention", "sentiment", "process_gap"] },
            attribution: { type: "string" as const, enum: ["client_verbatim", "client_paraphrase", "pae_interpretation", "inferred"] },
            source_label: { type: "string" as const },
            source_date: { type: "string" as const },
          },
          required: ["text", "evidence_type", "attribution", "source_label"],
        },
      },
    },
    required: ["evidence"],
  },
};

const PASS1_SYSTEM = `You are an evidence extraction engine for Factorial HR sales analysis.

Read the deal content below and extract every statement, metric, complaint, or situation that could indicate a business pain or need. For each piece of evidence:

1. Quote the source text verbatim (or prefix with ~ if paraphrasing)
2. Classify the evidence type:
   - direct_quote: client's own words describing a problem
   - metric: a quantifiable number or measurement the client mentioned
   - situation: client described a workflow, process, or scenario
   - tool_mention: client named a specific tool or system they use
   - sentiment: emotional/frustration language
   - process_gap: client described a missing capability or workaround
3. Classify attribution based on the section label:
   - Content under [CLIENT_EMAIL] or [CLIENT_CALL]: client_verbatim (exact words) or client_paraphrase (close summary)
   - Content under [OUTGOING_EMAIL]: pae_interpretation (seller's view) unless quoting the client
   - Content under [PAE_NOTE]: pae_interpretation
   - If you're inferring from context: inferred
4. Include the source label and date if available

Rules:
- Extract ALL potentially relevant evidence, even if weak
- Do NOT match to modules or pains yet — just extract raw evidence
- Preserve the original language of the source
- For metrics, include the exact number and unit
- Be thorough — it's better to over-extract than miss evidence`;

// ── Pass 2: Rule-guided matching ──

const MATCH_TOOL = {
  name: "match_modules",
  description: "Match extracted evidence to modules using rules",
  input_schema: {
    type: "object" as const,
    properties: {
      matches: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            module_id: { type: "string" as const },
            evidence_indices: { type: "array" as const, items: { type: "number" as const } },
            rule_ids: { type: "array" as const, items: { type: "number" as const } },
            match_qualities: { type: "array" as const, items: { type: "string" as const, enum: ["exact", "close", "partial"] } },
            strongest_quote: { type: "string" as const },
            rationale: { type: "string" as const },
          },
          required: ["module_id", "evidence_indices", "strongest_quote", "rationale"],
        },
      },
    },
    required: ["matches"],
  },
};

function buildPass2System(
  rules: any[],
  profiles: any[],
  country: string,
  sector: string,
  seats: number,
): string {
  const rulesBlock = rules.map(r =>
    `[R${r.id}] module=${r.module_id} | type=${r.evidence_type} | strength=${r.strength} | pattern="${r.pattern}"${r.negation_phrases?.length ? ` | negations: ${r.negation_phrases.join(", ")}` : ""}`
  ).join("\n");

  const profilesBlock = profiles.map(p =>
    `**${p.module_id}**: strong=[${(p.strong_signals ?? []).join("; ")}] | moderate=[${(p.moderate_signals ?? []).join("; ")}]${p.anti_signals?.length ? ` | anti=[${p.anti_signals.join("; ")}]` : ""}`
  ).join("\n");

  return `You are a deterministic module-matching engine. Given extracted evidence items and structured rules, determine which Factorial modules have supporting evidence.

For each module, evaluate the extracted evidence against its rules and profile. A module matches when at least 1 evidence item supports it.

Evidence rules (use rule IDs in your response):
${rulesBlock}

Module profiles (for context):
${profilesBlock}

Prospect context: Country=${country}, Sector=${sector}, Employees=${seats}

Rules:
- Match evidence to modules where a clear logical connection exists
- Use rule IDs when a rule matches; if no specific rule but profile matches, omit rule_id
- A single evidence item CAN support multiple modules
- For strongest_quote, pick the most compelling evidence text for that module
- Write rationale in the prospect's language (infer from evidence language), 1-2 sentences
- Respect anti_signals — if anti-evidence is present, do NOT include that module`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { content, country, sector, seats, language } = await req.json();
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "content is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch rules and profiles in parallel
    const [rulesRes, profilesRes] = await Promise.all([
      supabase.from("evidence_rules").select("*").eq("is_active", true),
      supabase.from("module_evidence_profiles").select("*").eq("is_active", true),
    ]);

    const rules = rulesRes.data ?? [];
    const profiles = profilesRes.data ?? [];

    // ── Pass 1: Extract evidence ──
    let evidence: EvidenceItem[] = [];
    try {
      const res = await azureFetch({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        temperature: 0,
        system: PASS1_SYSTEM,
        messages: [{ role: "user", content }],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "tool", name: "extract_evidence" },
      }, 60000);

      if (res.ok) {
        const data = await res.json();
        const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
        const raw = toolBlock?.input?.evidence ?? [];
        evidence = raw.map((e: any, i: number) => ({ ...e, index: i }));
      } else {
        console.error("Pass 1 failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Pass 1 error:", err);
    }

    if (evidence.length === 0) {
      return new Response(JSON.stringify({
        evidence: [],
        matches: [],
        module_signals: [],
        meta: { passes: 0, model: "claude-opus-4-6" },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Pass 2: Match evidence to modules ──
    const evidenceBlock = evidence.map((e, i) =>
      `[E${i}] type=${e.evidence_type} | attr=${e.attribution} | src=${e.source_label} | "${e.text}"`
    ).join("\n");

    let rawMatches: any[] = [];
    try {
      const res = await azureFetch({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        temperature: 0,
        system: buildPass2System(rules, profiles, country ?? "ES", sector ?? "", seats ?? 50),
        messages: [{
          role: "user",
          content: `Extracted evidence:\n${evidenceBlock}\n\nMatch each evidence item to the modules it supports. Be thorough.`,
        }],
        tools: [MATCH_TOOL],
        tool_choice: { type: "tool", name: "match_modules" },
      }, 60000);

      if (res.ok) {
        const data = await res.json();
        const toolBlock = data.content?.find((b: any) => b.type === "tool_use");
        rawMatches = toolBlock?.input?.matches ?? [];
      } else {
        console.error("Pass 2 failed:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Pass 2 error:", err);
    }

    // ── Deterministic scoring ──
    const rulesById = new Map(rules.map(r => [r.id, r]));

    const moduleMatches: ModuleMatch[] = rawMatches.map((m: any) => {
      const chain: RuleMatch[] = (m.evidence_indices ?? []).map((ei: number, j: number) => {
        const ruleId = m.rule_ids?.[j] ?? null;
        const rule = ruleId ? rulesById.get(ruleId) : null;
        const ev = evidence[ei];
        return {
          evidence_index: ei,
          rule_id: ruleId,
          module_id: m.module_id,
          evidence_type: ev?.evidence_type ?? "situation",
          attribution: ev?.attribution ?? "inferred",
          match_quality: m.match_qualities?.[j] ?? "partial",
          strength: rule?.strength ?? "moderate",
        };
      });

      const confidence = scoreConfidence(chain);
      return {
        module_id: m.module_id,
        confidence,
        confidence_level: confidenceLevel(confidence),
        evidence_chain: chain,
        strongest_quote: m.strongest_quote ?? "",
        rationale: m.rationale ?? "",
      };
    }).sort((a: ModuleMatch, b: ModuleMatch) => b.confidence - a.confidence);

    // Module signals summary
    const moduleSignals = moduleMatches.map(m => ({
      module_id: m.module_id,
      evidence_count: m.evidence_chain.length,
      max_confidence: m.confidence,
      confidence_level: m.confidence_level,
    }));

    return new Response(JSON.stringify({
      evidence,
      matches: moduleMatches,
      module_signals: moduleSignals,
      rules_used: rules.length,
      profiles_used: profiles.length,
      meta: { passes: 2, model: "claude-opus-4-6" },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("ai-evidence-analysis error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
