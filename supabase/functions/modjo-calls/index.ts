const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODJO_URL = "https://api.modjo.ai/v1/calls/exports";

async function modjoFetch(body: Record<string, unknown>): Promise<any> {
  const key = Deno.env.get("MODJO_API_KEY");
  if (!key) throw new Error("MODJO_API_KEY not set");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(MODJO_URL, {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Modjo ${res.status}: ${text.slice(0, 300)}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, companyName, dateFrom, dateTo, callId } = await req.json();

    if (mode === "search") {
      if (!companyName || companyName.length < 3) {
        return new Response(JSON.stringify({ error: "companyName must be at least 3 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const now = new Date();
      const start = dateFrom ?? new Date(now.getTime() - 90 * 86400000).toISOString();
      const end = dateTo ?? now.toISOString();

      const data = await modjoFetch({
        pagination: { page: 1, perPage: 20 },
        filters: {
          callTitle: companyName,
          callStartDateRange: { start, end },
        },
        relations: { deal: true, users: true, summary: true },
      });

      const calls = (data.values ?? []).map((c: any) => ({
        callId: c.callId,
        title: c.title ?? "",
        date: c.callStartDate ?? c.date ?? "",
        duration: c.duration ?? 0,
        users: (c.relations?.users ?? []).map((u: any) => ({ name: `${u.firstname ?? ""} ${u.lastname ?? ""}`.trim(), email: u.email })),
        deal: c.relations?.deal ? { name: c.relations.deal.name, crmId: c.relations.deal.dealCrmId } : null,
        summary: c.relations?.summary?.content ?? null,
      }));

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

      const data = await modjoFetch({
        pagination: { page: 1, perPage: 1 },
        filters: { callIds: [callId] },
        relations: { transcript: true, speakers: true, summary: true },
      });

      const call = data.values?.[0];
      if (!call) {
        return new Response(JSON.stringify({ error: "Call not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const speakers: Record<number, string> = {};
      for (const s of call.relations?.speakers ?? []) {
        speakers[s.speakerId] = `${s.firstname ?? ""} ${s.lastname ?? ""}`.trim() || `Speaker ${s.speakerId}`;
      }

      const segments = call.relations?.transcript ?? [];
      const transcript = segments
        .map((seg: any) => `${speakers[seg.speakerId] ?? "Unknown"}: ${seg.content}`)
        .join("\n");

      return new Response(JSON.stringify({
        transcript,
        summary: call.relations?.summary?.content ?? null,
      }), {
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
