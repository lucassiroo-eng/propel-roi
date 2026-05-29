const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const V1_URL = "https://api.modjo.ai/v1/calls/exports";
const V2_URL = "https://api.modjo.ai/v2";

function getKeys() {
  const v1 = Deno.env.get("MODJO_API_KEY");
  const v2 = Deno.env.get("MODJO_V2_API_KEY") ?? v1;
  if (!v1) throw new Error("MODJO_API_KEY not set");
  return { v1: v1!, v2: v2! };
}

async function v1Search(key: string, query: string, dateFrom?: string, dateTo?: string) {
  const now = new Date();
  const start = dateFrom ?? new Date(now.getTime() - 90 * 86400000).toISOString();
  const end = dateTo ?? now.toISOString();

  const res = await fetch(V1_URL, {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      pagination: { page: 1, perPage: 20 },
      filters: { callTitle: query, callStartDateRange: { start, end } },
      relations: { deal: true, users: true, summary: true },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Modjo v1 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();

  return (data.values ?? []).map((c: any) => ({
    callId: c.callId,
    title: c.title ?? "",
    date: c.callStartDate ?? c.date ?? "",
    duration: c.duration ?? 0,
    users: (c.relations?.users ?? []).map((u: any) => ({
      name: `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim(),
      email: u.email,
    })),
    deal: c.relations?.deal
      ? { name: c.relations.deal.name, crmId: c.relations.deal.dealCrmId }
      : null,
    summary: c.relations?.summary?.content ?? null,
  }));
}

async function v2Transcript(key: string, callId: number) {
  const [trRes, sumRes] = await Promise.all([
    fetch(`${V2_URL}/calls/${callId}/transcript`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
    }),
    fetch(`${V2_URL}/calls/${callId}/summaries`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    }),
  ]);

  if (!trRes.ok) throw new Error(`Modjo v2 transcript ${trRes.status}: ${(await trRes.text()).slice(0, 300)}`);
  const trData = await trRes.json();
  const segments = trData.data ?? [];
  const transcript = segments
    .map((s: any) => `${s.speaker?.name ?? "Unknown"}: ${s.content}`)
    .join("\n");

  let summary: string | null = null;
  if (sumRes.ok) {
    const sumData = await sumRes.json();
    const first = (sumData.data ?? [])[0];
    if (first?.answer) summary = first.answer;
  }

  return { transcript, summary };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, companyName, dateFrom, dateTo, callId } = await req.json();
    const keys = getKeys();

    if (mode === "search") {
      if (!companyName || companyName.length < 3) {
        return new Response(JSON.stringify({ error: "companyName must be at least 3 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const calls = await v1Search(keys.v1, companyName, dateFrom, dateTo);
      return new Response(JSON.stringify({ calls }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "transcript") {
      if (!callId) {
        return new Response(JSON.stringify({ error: "callId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await v2Transcript(keys.v2, callId);
      if (!result.transcript) {
        return new Response(JSON.stringify({ error: "No transcript found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use 'search' or 'transcript'" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("modjo-calls error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
