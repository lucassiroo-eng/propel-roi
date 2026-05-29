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
      const dealIds = new Set(matchedDeals.map((d: any) => d.id));
      for (const deal of matchedDeals) {
        if (deal.accountId) accountIds.add(deal.accountId);
      }

      // 3. If no accountId from deals, search accounts with ALL keywords
      if (accountIds.size === 0) {
        const cleaned = companyName.replace(/\s*-\s*from\s.*/i, "").trim();
        const noise = new Set(["s.l.", "s.a.", "sl", "sa", "sas", "srl", "gmbh", "ltd", "inc", "s.l", "s.a"]);
        const keywords = cleaned.split(/[\s\-·,.']+/)
          .filter((w: string) => w.length >= 3 && !noise.has(w.toLowerCase()));

        // Search each keyword in parallel, collect all candidate accounts
        const accountResults = await Promise.all(
          keywords.map(kw =>
            v2Get(key, `/accounts?name=${encodeURIComponent(kw)}&size=5`).catch(() => ({ data: [] }))
          )
        );
        const candidateAccounts = new Map<number, { id: number; name: string; hits: number }>();
        for (const res of accountResults) {
          for (const acc of res.data ?? []) {
            const existing = candidateAccounts.get(acc.id);
            if (existing) {
              existing.hits++;
            } else {
              candidateAccounts.set(acc.id, { id: acc.id, name: acc.name ?? "", hits: 1 });
            }
          }
        }

        if (candidateAccounts.size > 0) {
          // If we matched specific deals, check which accounts have calls linked to those deals
          if (dealIds.size > 0) {
            for (const [accId] of candidateAccounts) {
              const callsRes = await v2Get(key, `/calls?account_id=${accId}&expand=deal&size=10`);
              const hasMatchingDeal = (callsRes.data ?? []).some(
                (c: any) => c.deal && dealIds.has(c.deal.id)
              );
              if (hasMatchingDeal) {
                accountIds.add(accId);
              }
            }
          }

          // If no deal-matched accounts found, add all candidates (sorted by hit count)
          if (accountIds.size === 0) {
            const sorted = [...candidateAccounts.values()].sort((a, b) => b.hits - a.hits);
            for (const acc of sorted) {
              accountIds.add(acc.id);
            }
          }
        }
      }

      // 4. Fetch calls for each account
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
