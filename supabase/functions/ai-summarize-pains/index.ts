import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { azureFetch } from "../_shared/azureFetch.ts";

function getJwtPayload(authHeader: string): Record<string, any> | null {
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
    return JSON.parse(atob(padded));
  } catch { return null; }
}

function isAnonRequest(authHeader: string | null): boolean {
  if (!authHeader) return true;
  const claims = getJwtPayload(authHeader);
  return claims?.role === "anon" && !claims?.sub;
}

const SYSTEM_PROMPT = `<role>
You are a senior Account Executive at Factorial (https://factorial.es), a global HR SaaS. You know the Factorial product (Time Tracking, Time Off, Performance, Onboarding, Recruitment, Payroll, Compensation, Documents, IT Hub, Multi-entity, etc.) and sell using BANT and MEDDICC.
</role>

<task>
Read all the deal notes carefully and identify every pain, friction, inefficiency, cost or risk the prospect has expressed — explicitly or implicitly. Compile them.
</task>

<output_format>
Return all the mentioned pains. For each pain use this structure:

**[Short pain title — your own wording, max 8 words]**
- **Evidence**: [quote or close paraphrase from the notes]
- **Quantification clues**: [any numbers, hours, costs, headcount mentioned — or "None mentioned"]

**Why it hurts**: [1 sentence explaining the business impact]
</output_format>

<rules>
- Write in the same language as the notes.
- Never invent pains, numbers or quotes. If the notes do not support it, do not include it.
- Quote or paraphrase the notes — do not summarise abstractly.
- Do not map pains to any product, module, framework or predefined list. Just collect what the prospect actually said.
- Stay concise. No filler, no generic SaaS language, no feature recommendations.
</rules>`;

async function callAzure(notes: string, companyName: string): Promise<string | null> {
  try {
    const res = await azureFetch({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Company: ${companyName}\n\nDeal notes:\n${notes}` }],
    });
    if (!res.ok) {
      console.error("Azure error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Azure call failed:", err);
    return null;
  }
}

async function callLovableAI(notes: string, companyName: string): Promise<string> {
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
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Company: ${companyName}\n\nDeal notes:\n${notes}` },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text();
      console.error("Lovable AI error:", res.status, body);
      if (res.status === 429) throw new Error("Rate limited, try again later");
      if (res.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI error: ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
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
    const { notes, company_name } = await req.json();
    if (!notes || typeof notes !== "string") {
      return new Response(JSON.stringify({ error: "notes is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let summary = await callAzure(notes, company_name || "Unknown");
    if (!summary) {
      console.log("Azure failed, falling back to Lovable AI");
      summary = await callLovableAI(notes, company_name || "Unknown");
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ai-summarize-pains error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
