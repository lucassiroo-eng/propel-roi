import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { azureFetch } from "../_shared/azureFetch.ts";

async function callAzureText(systemPrompt: string, userMessage: string): Promise<string | null> {
  try {
    const res = await azureFetch({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    if (!res.ok) {
      console.error("Azure AI error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const textBlock = data.content?.find((b: any) => b.type === "text");
    return textBlock?.text ?? null;
  } catch (err) {
    console.error("Azure call failed:", err);
    return null;
  }
}

// Fallback: Lovable AI Gateway
async function callLovableAIText(systemPrompt: string, userMessage: string): Promise<string | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Lovable AI error:", res.status, body);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("Lovable AI call failed:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check — allow unauthenticated requests (preview mode)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader && !authHeader.endsWith(Deno.env.get("SUPABASE_ANON_KEY")!)) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    const { session_id, tone } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session } = await supabaseAdmin
      .from("roi_sessions")
      .select("*, prospects(*)")
      .eq("id", session_id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only enforce ownership if user is authenticated
    if (userId && session.pae_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prospect = session.prospects as any;
    const companyName = prospect?.company_name ?? "your company";
    const contactName = prospect?.contact_name ?? "";
    const roiEur = session.roi_eur ?? 0;
    const roiPct = session.roi_pct ?? 0;
    const paybackMonths = session.payback_months ?? 0;
    const totalBenefit = session.total_annual_benefit_eur ?? 0;
    const annualCost = session.factorial_annual_cost_eur ?? 0;
    const selectedPains = session.selected_pains ?? [];
    const offering = session.selected_offering as any;
    const toneGuide = tone || "professional, warm, brief";

    const fallbackDraft = `Hi ${contactName || "there"},

Thank you for taking the time to explore how Factorial can help ${companyName}.

Based on our analysis, we identified €${Number(totalBenefit).toLocaleString("es-ES", { maximumFractionDigits: 0 })} in potential annual benefits across ${selectedPains.length} key areas, with a projected ROI of ${Number(roiPct).toFixed(0)}% and payback in ${Number(paybackMonths).toFixed(1)} months.

I've attached the full ROI report for your review. I'd love to schedule a follow-up to walk through the findings together.

Best regards`;

    const prospectCountry = prospect?.country ?? "";
    const emailLang = prospectCountry === "ES" ? "Spanish" : prospectCountry === "FR" ? "French" : "English";

    const systemPrompt = `You are a Factorial HR sales consultant drafting a follow-up email to a prospect.

Tone: ${toneGuide}

Rules:
- Write the email body ONLY (no subject line)
- Write the entire email in ${emailLang}
- Use the EXACT numbers provided — never recompute or invent figures
- Keep it under 150 words
- Include the key ROI figures naturally in the text
- End with a soft call-to-action to schedule a follow-up
- Do not include a signature (the app adds it)`;

    const userMessage = `Draft an email for:
- Company: ${companyName}
- Contact: ${contactName || "the prospect"}
- ${selectedPains.length} pains addressed
- Total annual benefit: €${Number(totalBenefit).toLocaleString("es-ES", { maximumFractionDigits: 0 })}
- Annual cost: €${Number(annualCost).toLocaleString("es-ES", { maximumFractionDigits: 0 })}
- Net ROI: €${Number(roiEur).toLocaleString("es-ES", { maximumFractionDigits: 0 })}
- ROI %: ${Number(roiPct).toFixed(0)}%
- Payback: ${Number(paybackMonths).toFixed(1)} months
- Bundle: ${offering?.bundle_name ?? offering?.tier ?? "Factorial"}`;

    // Try Azure first, fallback to Lovable AI, then static template
    let draft = await callAzureText(systemPrompt, userMessage);
    if (!draft) {
      console.log("Azure failed, falling back to Lovable AI Gateway");
      draft = await callLovableAIText(systemPrompt, userMessage);
    }
    if (!draft) {
      draft = fallbackDraft;
    }

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ai-assist-email-draft error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
