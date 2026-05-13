import { createClient } from "npm:@supabase/supabase-js@2";

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

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AIRTABLE_BASE    = "appIfs2C59eVeLK4F";
const EMAILS_TABLE     = "tbltDfeem4cNwMSH5";
const CALLS_TABLE      = "tblWIll52EKR6uNXL";
const DEALS_TABLE      = "tblulFcSI0mDBw4lC";
const COMPANIES_TABLE  = "tbluzghXeuw8yz0Qp";

// Field IDs
const F = {
  // Emails
  EMAIL_DATE:      "fldnjzpuJ1EQA07fs",
  EMAIL_SUBJECT:   "flde9kJJBWnvGLFUJ",
  EMAIL_BODY:      "fldfMJGnnztv22QOU", // Body_Clean preferred
  EMAIL_BODY_RAW:  "fldpI4RZHIaGGmypO",
  EMAIL_DIRECTION: "fldgVFAB67dnusgrc",
  EMAIL_FROM:      "fldNCbgEgv9OnRzBz",
  // Calls
  CALL_DATE:       "fldprzFHalU4krLd9",
  CALL_TRANSCRIPT: "fldlwhTfx6cRJmAWk",
  CALL_DURATION:   "fld5daifQ2AIbRyDw",
  CALL_OWNER:      "fldeQ0Krs1q4goD3w",
  // Deals
  DEAL_ID:         "fldrcgvqiDVDL3kjy",
  DEAL_NAME:       "fldmzbnbry8FhewfQ",
  DEAL_AMOUNT:     "fldZpeaD7omYo5e1t",
  DEAL_STAGE:      "fldR0leyMGyTt6D0V",
  DEAL_CONTACTS:   "fldAWYnaWPT082VvP",
  DEAL_PAE:        "fldumEE2afuU3K0nn",
  DEAL_EMAILS:     "fldyjtBPuOzC55vhB", // multipleRecordLinks → Emails table
  DEAL_CALLS:      "fldkhI54DtjnRqsNp", // multipleRecordLinks → Calls table
  DEAL_COMPANY:    "fldnUWd12DHIvcqtN", // multipleRecordLinks → Companies table
  // Companies
  COMPANY_NAME:    "fldlZRwUM2Yut46fg",
};

function extractDealId(urlOrId: string): string {
  // Match last numeric segment in URL path (handles /deal/ID and /record/0-3/ID formats)
  const m = urlOrId.match(/\/(\d{6,})\/?(?:\?.*)?$/);
  if (m) return m[1];
  // Plain numeric ID
  if (/^\d+$/.test(urlOrId.trim())) return urlOrId.trim();
  return urlOrId.trim();
}

async function airtableGet(token: string, tableId: string, formula: string, fieldIds: string[]) {
  const p = new URLSearchParams({ filterByFormula: formula, pageSize: "100", returnFieldsByFieldId: "true" });
  fieldIds.forEach((f, i) => p.append(`fields[${i}]`, f));
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}?${p}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Airtable ${tableId}: ${res.status}`);
  return (await res.json()).records ?? [];
}

async function airtableGetByRecordIds(token: string, tableId: string, recordIds: string[], fieldIds: string[]) {
  if (!recordIds.length) return [];
  const formula = recordIds.length === 1
    ? `RECORD_ID()="${recordIds[0]}"`
    : `OR(${recordIds.map(id => `RECORD_ID()="${id}"`).join(",")})`;
  return airtableGet(token, tableId, formula, fieldIds);
}

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

async function runPainMapping(
  _apiKey: string,
  painList: string,
  notes: string,
  country: string,
  sector: string,
  language: string
): Promise<Array<{ pain_id: string; rationale: string }> | null> {
  const langMap: Record<string, string> = { es: "Spanish", fr: "French", en: "English" };
  const langName = langMap[language] || "English";

  const systemPrompt = `You are a deterministic Factorial HR pain-matching engine. Your only job is to map discovery notes from emails and calls to the pains in the Factorial Pains Library, using the trigger phrases attached to each pain as the matching signal.

Read the discovery notes and identify every pain from the library that has evidence in the notes. A pain is a match when the notes contain phrases, symptoms or situations that align with the pain's trigger phrases — explicitly or as a paraphrase.

Available pains (each includes trigger phrases to guide matching):
${painList}

Rules:
- Only return pain_ids from the list above
- Match based on trigger phrases — if the notes contain phrases or symptoms listed in a pain's triggers, select that pain
- Never invent or modify pain_ids
- Consider the prospect's country (${country || "unknown"}) and sector (${sector || "unknown"})
- Write the rationale for each suggestion in ${langName} — keep it to 1 short sentence`;

  try {
    const res = await azureFetch({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: `Discovery notes from emails and calls:\n${notes}` }],
      tools: [{ name: suggestPainsTool.name, description: suggestPainsTool.description, input_schema: suggestPainsTool.parameters }],
      tool_choice: { type: "tool", name: "suggest_pains" },
    }, 60000);
    if (!res.ok) { console.error("Azure error:", res.status); return null; }
    const data = await res.json();
    return data.content?.find((b: any) => b.type === "tool_use")?.input?.suggestions ?? [];
  } catch (err) {
    console.error("Azure call failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { deal_url, country = "ES", sector = "", language = "en" } = await req.json();
    if (!deal_url) return new Response(JSON.stringify({ error: "deal_url required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    const dealId = extractDealId(deal_url);
    const airtableToken = Deno.env.get("AIRTABLE_PAT");
    if (!airtableToken) throw new Error("AIRTABLE_PAT not configured");

    // Step 1: fetch Deal record (includes linked record IDs)
    const dealRecords = await airtableGet(airtableToken, DEALS_TABLE, `{deal_id}="${dealId}"`,
      [F.DEAL_ID, F.DEAL_NAME, F.DEAL_AMOUNT, F.DEAL_STAGE, F.DEAL_CONTACTS, F.DEAL_PAE, F.DEAL_EMAILS, F.DEAL_CALLS, F.DEAL_COMPANY]);

    const dealFields = dealRecords[0]?.fields ?? {};

    // Step 2: follow multipleRecordLinks to fetch Emails, Calls and Company name in parallel
    const emailRecordIds: string[]   = dealFields[F.DEAL_EMAILS]  ?? [];
    const callRecordIds: string[]    = dealFields[F.DEAL_CALLS]   ?? [];
    const companyRecordIds: string[] = dealFields[F.DEAL_COMPANY] ?? [];

    const [emailRecords, callRecords, companyRecords] = await Promise.all([
      airtableGetByRecordIds(airtableToken, EMAILS_TABLE, emailRecordIds,
        [F.EMAIL_DATE, F.EMAIL_SUBJECT, F.EMAIL_BODY, F.EMAIL_BODY_RAW, F.EMAIL_DIRECTION, F.EMAIL_FROM]),
      airtableGetByRecordIds(airtableToken, CALLS_TABLE, callRecordIds,
        [F.CALL_DATE, F.CALL_TRANSCRIPT, F.CALL_DURATION, F.CALL_OWNER]),
      airtableGetByRecordIds(airtableToken, COMPANIES_TABLE, companyRecordIds.slice(0, 1),
        [F.COMPANY_NAME]),
    ]);

    const companyNameFromTable: string = companyRecords[0]?.fields?.[F.COMPANY_NAME] ?? "";
    // Fallback: extract from deal name (e.g. "HT Médica - from Telefonica" → "HT Médica")
    const companyNameFromDeal = (dealFields[F.DEAL_NAME] ?? "").split(/\s*[-–]\s*(from|de)\s/i)[0].trim();
    const companyName: string = companyNameFromTable || companyNameFromDeal;

    const emails = emailRecords
      .map((r: any) => ({
        date:      r.fields[F.EMAIL_DATE] ?? "",
        subject:   r.fields[F.EMAIL_SUBJECT] ?? "",
        body:      r.fields[F.EMAIL_BODY] ?? r.fields[F.EMAIL_BODY_RAW] ?? "",
        direction: r.fields[F.EMAIL_DIRECTION] ?? "",
        from:      r.fields[F.EMAIL_FROM] ?? "",
      }))
      .filter((e: any) => e.body || e.subject)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    const calls = callRecords
      .map((r: any) => ({
        date:             r.fields[F.CALL_DATE] ?? "",
        transcript:       r.fields[F.CALL_TRANSCRIPT] ?? "",
        duration_seconds: r.fields[F.CALL_DURATION] ?? 0,
        owner:            r.fields[F.CALL_OWNER] ?? "",
      }))
      .filter((c: any) => c.transcript)
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Build combined notes for AI
    const parts: string[] = [];
    if (emails.length > 0) {
      parts.push(`## Emails (${emails.length})\n` + emails.slice(-20).map((e: any) =>
        `[${e.date?.slice(0,10)}] ${e.subject}\n${e.body.slice(0, 600)}`
      ).join("\n\n---\n"));
    }
    if (calls.length > 0) {
      parts.push(`## Call transcripts (${calls.length})\n` + calls.slice(-8).map((c: any) =>
        `[${c.date?.slice(0,10)}] ${c.owner}\n${c.transcript.slice(0, 1200)}`
      ).join("\n\n---\n"));
    }
    const combinedNotes = parts.join("\n\n");

    // Get pain library + run AI mapping
    let suggestions: Array<{ pain_id: string; rationale: string }> = [];
    const azureKey = Deno.env.get("AZURE_ANTHROPIC_API_KEY");

    if (combinedNotes && azureKey) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: pains } = await supabase
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

      const raw = await runPainMapping(azureKey, painList, combinedNotes, country, sector, language);
      const validIds = new Set((pains ?? []).map((p: any) => p.pain_id));
      suggestions = (raw ?? []).filter((s) => validIds.has(s.pain_id));
    }

    return new Response(JSON.stringify({
      deal_id: dealId,
      deal: {
        name:          dealFields[F.DEAL_NAME] ?? "",
        company_name:  companyName,
        amount:        dealFields[F.DEAL_AMOUNT] ?? null,
        stage:         dealFields[F.DEAL_STAGE] ?? "",
        contacts_info: dealFields[F.DEAL_CONTACTS] ?? "",
        pae:           dealFields[F.DEAL_PAE] ?? "",
      },
      emails,
      calls,
      suggestions,
      stats: { email_count: emails.length, call_count: calls.length },
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("airtable-deal-fetch error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
