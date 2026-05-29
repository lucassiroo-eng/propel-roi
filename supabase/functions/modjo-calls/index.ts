const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const V2 = "https://api.modjo.ai/v2";

function getKey(): string {
  const key = Deno.env.get("MODJO_V2_API_KEY") ?? Deno.env.get("MODJO_API_KEY");
  if (!key) throw new Error("MODJO_V2_API_KEY not set");
  return key;
}

async function v2Get(key: string, path: string): Promise<any> {
  const res = await fetch(`${V2}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Modjo v2 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, companyName, callId } = await req.json();
    const key = getKey();

    if (mode === "search") {
      if (!companyName || companyName.length < 2) {
        return new Response(JSON.stringify({ error: "companyName required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Search deals by name
      const deals = await v2Get(key, `/deals?name=${encodeURIComponent(companyName)}&size=5`);
      const matchedDeals = deals.data ?? [];

      // 2. Collect unique account IDs from deals
      const accountIds = new Set<number>();
      for (const deal of matchedDeals) {
        if (deal.accountId) accountIds.add(deal.accountId);
      }

      // 3. If no accountId from deals, search accounts directly
      if (accountIds.size === 0) {
        const words = companyName.replace(/\s*-\s*from\s.*/i, "").trim();
        const noise = new Set(["s.l.", "s.a.", "sl", "sa", "sas", "srl", "gmbh", "ltd", "inc"]);
        const keyword = words.split(/[\s\-·,]+/)
          .filter((w: string) => w.length >= 3 && !noise.has(w.toLowerCase()))
          .sort((a: string, b: string) => b.length - a.length)[0];
        if (keyword) {
          const accounts = await v2Get(key, `/accounts?name=${encodeURIComponent(keyword)}&size=5`);
          for (const acc of accounts.data ?? []) {
            accountIds.add(acc.id);
          }
        }
      }

      // 4. Fetch calls for each account
      const dealIds = new Set(matchedDeals.map((d: any) => d.id));
      const callMap = new Map<number, any>();

      for (const accId of accountIds) {
        const callsRes = await v2Get(key, `/calls?account_id=${accId}&expand=deal,users&size=50`);
        for (const c of callsRes.data ?? []) {
          if (callMap.has(c.id)) continue;
          // If we matched specific deals, filter calls to those deals
          if (dealIds.size > 0 && c.deal && !dealIds.has(c.deal.id)) continue;
          callMap.set(c.id, {
            callId: c.id,
            title: c.name ?? "",
            date: c.date ?? "",
            duration: c.duration ?? 0,
            users: (c.users ?? []).map((u: any) => ({
              name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
              email: u.email,
            })),
            deal: c.deal ? { name: c.deal.name, crmId: c.deal.crmId } : null,
            summary: null,
          });
        }
      }

      const calls = [...callMap.values()].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

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

      const [trRes, sumRes] = await Promise.all([
        v2Get(key, `/calls/${callId}/transcript`),
        v2Get(key, `/calls/${callId}/summaries`).catch(() => ({ data: [] })),
      ]);

      const segments = trRes.data ?? [];
      const transcript = segments
        .map((s: any) => `${s.speaker?.name ?? "Unknown"}: ${s.content}`)
        .join("\n");

      const firstSummary = (sumRes.data ?? [])[0];
      const summary = firstSummary?.answer ?? null;

      if (!transcript) {
        return new Response(JSON.stringify({ error: "No transcript found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ transcript, summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("modjo-calls error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
