// Propel ROI — Cloudflare Worker proxy
// Routes: POST /airtable, POST /hubspot, POST /ai
// Secrets needed: AIRTABLE_PAT, HUBSPOT_API_KEY, AZURE_AI_KEY

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ─── Airtable config ──────────────────────────────────────────
const AIRTABLE_BASE   = "appIfs2C59eVeLK4F";
const EMAILS_TABLE    = "tbltDfeem4cNwMSH5";
const CALLS_TABLE     = "tblWIll52EKR6uNXL";
const DEALS_TABLE     = "tblulFcSI0mDBw4lC";
const COMPANIES_TABLE = "tbluzghXeuw8yz0Qp";

const F = {
  EMAIL_DATE:      "fldnjzpuJ1EQA07fs",
  EMAIL_SUBJECT:   "flde9kJJBWnvGLFUJ",
  EMAIL_BODY:      "fldfMJGnnztv22QOU",
  EMAIL_BODY_RAW:  "fldpI4RZHIaGGmypO",
  EMAIL_DIRECTION: "fldgVFAB67dnusgrc",
  EMAIL_FROM:      "fldNCbgEgv9OnRzBz",
  CALL_DATE:       "fldprzFHalU4krLd9",
  CALL_TRANSCRIPT: "fldlwhTfx6cRJmAWk",
  CALL_DURATION:   "fld5daifQ2AIbRyDw",
  CALL_OWNER:      "fldeQ0Krs1q4goD3w",
  DEAL_ID:         "fldrcgvqiDVDL3kjy",
  DEAL_NAME:       "fldmzbnbry8FhewfQ",
  DEAL_AMOUNT:     "fldZpeaD7omYo5e1t",
  DEAL_STAGE:      "fldR0leyMGyTt6D0V",
  DEAL_CONTACTS:   "fldAWYnaWPT082VvP",
  DEAL_PAE:        "fldumEE2afuU3K0nn",
  DEAL_EMAILS:     "fldyjtBPuOzC55vhB",
  DEAL_CALLS:      "fldkhI54DtjnRqsNp",
  DEAL_COMPANY:    "fldnUWd12DHIvcqtN",
  COMPANY_NAME:    "fldlZRwUM2Yut46fg",
};

function extractDealId(urlOrId) {
  const m = urlOrId.match(/\/(\d{6,})\/?(?:\?.*)?$/);
  if (m) return m[1];
  if (/^\d+$/.test(urlOrId.trim())) return urlOrId.trim();
  return urlOrId.trim();
}

async function airtableGet(token, tableId, formula, fieldIds) {
  const p = new URLSearchParams({ filterByFormula: formula, pageSize: "100", returnFieldsByFieldId: "true" });
  fieldIds.forEach((f, i) => p.append(`fields[${i}]`, f));
  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}?${p}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Airtable ${tableId}: ${res.status}`);
  return (await res.json()).records ?? [];
}

async function airtableGetByIds(token, tableId, ids, fieldIds) {
  if (!ids.length) return [];
  const formula = ids.length === 1
    ? `RECORD_ID()="${ids[0]}"`
    : `OR(${ids.map(id => `RECORD_ID()="${id}"`).join(",")})`;
  return airtableGet(token, tableId, formula, fieldIds);
}

async function handleAirtable(body, env) {
  const { deal_url } = body;
  if (!deal_url) return json({ error: "deal_url required" }, 400);

  const token = env.AIRTABLE_PAT;
  if (!token) return json({ error: "AIRTABLE_PAT not configured" }, 500);

  const dealId = extractDealId(deal_url);

  const dealRecords = await airtableGet(token, DEALS_TABLE, `{deal_id}="${dealId}"`,
    [F.DEAL_ID, F.DEAL_NAME, F.DEAL_AMOUNT, F.DEAL_STAGE, F.DEAL_CONTACTS, F.DEAL_PAE, F.DEAL_EMAILS, F.DEAL_CALLS, F.DEAL_COMPANY]);

  const dealFields = dealRecords[0]?.fields ?? {};
  const emailIds = dealFields[F.DEAL_EMAILS] ?? [];
  const callIds  = dealFields[F.DEAL_CALLS] ?? [];
  const compIds  = dealFields[F.DEAL_COMPANY] ?? [];

  const [emailRecs, callRecs, compRecs] = await Promise.all([
    airtableGetByIds(token, EMAILS_TABLE, emailIds,
      [F.EMAIL_DATE, F.EMAIL_SUBJECT, F.EMAIL_BODY, F.EMAIL_BODY_RAW, F.EMAIL_DIRECTION, F.EMAIL_FROM]),
    airtableGetByIds(token, CALLS_TABLE, callIds,
      [F.CALL_DATE, F.CALL_TRANSCRIPT, F.CALL_DURATION, F.CALL_OWNER]),
    airtableGetByIds(token, COMPANIES_TABLE, compIds.slice(0, 1),
      [F.COMPANY_NAME]),
  ]);

  const companyName = compRecs[0]?.fields?.[F.COMPANY_NAME]
    ?? (dealFields[F.DEAL_NAME] ?? "").split(/\s*[-–]\s*(from|de)\s/i)[0].trim();

  const emails = emailRecs
    .map(r => ({
      date:      r.fields[F.EMAIL_DATE] ?? "",
      subject:   r.fields[F.EMAIL_SUBJECT] ?? "",
      body:      r.fields[F.EMAIL_BODY] ?? r.fields[F.EMAIL_BODY_RAW] ?? "",
      direction: r.fields[F.EMAIL_DIRECTION] ?? "",
      from:      r.fields[F.EMAIL_FROM] ?? "",
    }))
    .filter(e => e.body || e.subject)
    .sort((a, b) => a.date.localeCompare(b.date));

  const calls = callRecs
    .map(r => ({
      date:             r.fields[F.CALL_DATE] ?? "",
      transcript:       r.fields[F.CALL_TRANSCRIPT] ?? "",
      duration_seconds: r.fields[F.CALL_DURATION] ?? 0,
      owner:            r.fields[F.CALL_OWNER] ?? "",
    }))
    .filter(c => c.transcript)
    .sort((a, b) => a.date.localeCompare(b.date));

  return json({
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
    stats: { email_count: emails.length, call_count: calls.length },
  });
}

// ─── HubSpot ──────────────────────────────────────────────────
async function handleHubspot(body, env) {
  const { deal_url } = body;
  if (!deal_url) return json({ error: "deal_url required" }, 400);

  const token = env.HUBSPOT_API_KEY;
  if (!token) return json({ error: "HUBSPOT_API_KEY not configured" }, 500);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const BASE = "https://api.hubapi.com";

  // Extract deal ID
  let dealId = null;
  let m = deal_url.match(/\/deal\/(\d+)/);
  if (m) dealId = m[1];
  if (!dealId) { m = deal_url.match(/\/record\/0-3\/(\d+)/); if (m) dealId = m[1]; }
  if (!dealId) { m = deal_url.match(/\/(\d{5,})\/?(?:\?|$)/); if (m) dealId = m[1]; }
  if (!dealId) return json({ error: "Could not extract deal ID" }, 400);

  // Fetch deal
  const dealRes = await fetch(
    `${BASE}/crm/v3/objects/deals/${dealId}?properties=dealname,amount,hubspot_owner_id,contact_id,revised_number_of_emloyeess&associations=companies`,
    { headers }
  );
  if (!dealRes.ok) {
    const err = await dealRes.text();
    return json({ error: `HubSpot deal fetch failed [${dealRes.status}]: ${err}` }, dealRes.status);
  }
  const deal = await dealRes.json();

  const result = {
    deal_name: deal.properties?.dealname ?? "",
    amount: deal.properties?.amount ?? null,
    employees: deal.properties?.revised_number_of_emloyeess ?? null,
  };

  // Company
  const compAssoc = deal.associations?.companies?.results?.[0];
  if (compAssoc) {
    const compRes = await fetch(
      `${BASE}/crm/v3/objects/companies/${compAssoc.id}?properties=name,country_qobra_samba,industry,country`,
      { headers }
    );
    if (compRes.ok) {
      const comp = await compRes.json();
      result.company_name = comp.properties?.name ?? "";
      result.country = comp.properties?.country_qobra_samba ?? comp.properties?.country ?? "";
      result.industry = comp.properties?.industry ?? "";
    }
  }

  // Contact
  const contactId = deal.properties?.contact_id;
  if (contactId) {
    const contRes = await fetch(
      `${BASE}/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email`,
      { headers }
    );
    if (contRes.ok) {
      const cont = await contRes.json();
      result.contact_name = [cont.properties?.firstname, cont.properties?.lastname].filter(Boolean).join(" ");
      result.contact_email = cont.properties?.email ?? "";
    }
  }

  // Notes
  const notesRes = await fetch(`${BASE}/crm/v3/objects/deals/${dealId}/associations/notes`, { headers });
  if (notesRes.ok) {
    const notesAssoc = await notesRes.json();
    const noteIds = (notesAssoc.results ?? []).map(r => r.id);
    if (noteIds.length > 0) {
      const fetches = noteIds.slice(0, 20).map(async (noteId) => {
        const nr = await fetch(
          `${BASE}/crm/v3/objects/notes/${noteId}?properties=hs_note_body,hs_createdate,hs_timestamp`,
          { headers }
        );
        if (nr.ok) {
          const note = await nr.json();
          return {
            id: note.id,
            body: note.properties?.hs_note_body ?? "",
            created_at: note.properties?.hs_timestamp ?? note.properties?.hs_createdate ?? "",
          };
        }
        return null;
      });
      const notes = (await Promise.all(fetches)).filter(Boolean);
      notes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      result.notes = notes;
    }
  }

  return json(result);
}

// ─── Azure AI proxy ───────────────────────────────────────────
async function handleAI(body, env) {
  const apiKey = env.AZURE_AI_KEY;
  if (!apiKey) return json({ error: "AZURE_AI_KEY not configured" }, 500);

  // Pass through the request body to Azure Anthropic
  const res = await fetch(
    "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: body.model ?? "claude-opus-4-6",
        max_tokens: body.max_tokens ?? 1024,
        temperature: body.temperature ?? 0,
        system: body.system ?? "",
        messages: body.messages ?? [],
        tools: body.tools,
        tool_choice: body.tool_choice,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return json({ error: `Azure AI error [${res.status}]: ${err}` }, res.status);
  }

  const data = await res.json();
  return json(data);
}

// ─── Router ───────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    try {
      if (path === "/airtable") return await handleAirtable(body, env);
      if (path === "/hubspot")  return await handleHubspot(body, env);
      if (path === "/ai")       return await handleAI(body, env);
      return json({ error: `Unknown route: ${path}`, routes: ["/airtable", "/hubspot", "/ai"] }, 404);
    } catch (err) {
      console.error(`${path} error:`, err);
      return json({ error: err.message }, 500);
    }
  },
};
