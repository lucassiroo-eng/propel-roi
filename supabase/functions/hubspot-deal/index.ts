import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HUBSPOT_BASE = "https://api.hubapi.com";

function extractDealId(url: string): string | null {
  let m = url.match(/\/deal\/(\d+)/);
  if (m) return m[1];
  m = url.match(/\/record\/0-3\/(\d+)/);
  if (m) return m[1];
  m = url.match(/\/(\d{5,})\/?(?:\?|$)/);
  if (m) return m[1];
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { deal_url } = await req.json();
    if (!deal_url) throw new Error("deal_url is required");

    const dealId = extractDealId(deal_url);
    if (!dealId) throw new Error("Could not extract deal ID from URL: " + deal_url);

    const token = Deno.env.get("HUBSPOT_PAT_TOKEN");
    if (!token) throw new Error("HUBSPOT_PAT_TOKEN not configured");

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Fetch deal with contact_id property and company associations
    const dealRes = await fetch(
      `${HUBSPOT_BASE}/crm/v3/objects/deals/${dealId}?properties=dealname,amount,hubspot_owner_id,contact_id,revised_number_of_emloyeess,dealstage,closedate&associations=companies`,
      { headers }
    );
    if (!dealRes.ok) {
      const err = await dealRes.text();
      throw new Error(`HubSpot deal fetch failed [${dealRes.status}]: ${err}`);
    }
    const deal = await dealRes.json();

    const result: Record<string, any> = {
      deal_name: deal.properties?.dealname ?? "",
      amount: deal.properties?.amount ?? null,
      employees: deal.properties?.revised_number_of_emloyeess ?? null,
      deal_stage: deal.properties?.dealstage ?? null,
      close_date: deal.properties?.closedate ?? null,
    };

    // Fetch associated company with custom HubSpot properties
    const companyAssoc = deal.associations?.companies?.results?.[0];
    if (companyAssoc) {
      const compRes = await fetch(
        `${HUBSPOT_BASE}/crm/v3/objects/companies/${companyAssoc.id}?properties=name,country_qobra_samba,industry,country`,
        { headers }
      );
      if (compRes.ok) {
        const comp = await compRes.json();
        result.company_name = comp.properties?.name ?? "";
        // Market SaMBA country field, fallback to standard country
        result.country = comp.properties?.country_qobra_samba ?? comp.properties?.country ?? "";
        result.industry = comp.properties?.industry ?? "";
      }
    }

    // Fetch contact via deal's contact_id property
    const contactId = deal.properties?.contact_id;
    if (contactId) {
      const contRes = await fetch(
        `${HUBSPOT_BASE}/crm/v3/objects/contacts/${contactId}?properties=firstname,lastname,email`,
        { headers }
      );
      if (contRes.ok) {
        const cont = await contRes.json();
        result.contact_name = [cont.properties?.firstname, cont.properties?.lastname].filter(Boolean).join(" ");
        result.contact_email = cont.properties?.email ?? "";
      }
    }

    // Fetch notes associated with the deal
    const notesAssocRes = await fetch(
      `${HUBSPOT_BASE}/crm/v3/objects/deals/${dealId}/associations/notes`,
      { headers }
    );
    if (notesAssocRes.ok) {
      const notesAssoc = await notesAssocRes.json();
      const noteIds: string[] = (notesAssoc.results ?? []).map((r: any) => r.id);
      if (noteIds.length > 0) {
        // Fetch each note's body content
        const notesFetches = noteIds.slice(0, 20).map(async (noteId: string) => {
          const noteRes = await fetch(
            `${HUBSPOT_BASE}/crm/v3/objects/notes/${noteId}?properties=hs_note_body,hs_createdate,hs_timestamp`,
            { headers }
          );
          if (noteRes.ok) {
            const note = await noteRes.json();
            return {
              id: note.id,
              body: note.properties?.hs_note_body ?? "",
              created_at: note.properties?.hs_timestamp ?? note.properties?.hs_createdate ?? "",
            };
          }
          return null;
        });
        const notes = (await Promise.all(notesFetches)).filter(Boolean);
        // Sort by date descending
        notes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        result.notes = notes;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("hubspot-deal error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
