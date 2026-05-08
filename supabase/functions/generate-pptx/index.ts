import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import pptxgen from "npm:pptxgenjs@3.12.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const RED = "FF355E";
const MIDNIGHT = "25253D";
const GRAY = "64748B";
const LIGHT_BG = "F8FAFC";
const WHITE = "FFFFFF";

function fmtEur(n: number): string {
  return "€" + Number(n).toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error: sessErr } = await supabaseAdmin
      .from("roi_sessions")
      .select("*, prospects(*)")
      .eq("id", session_id)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.pae_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prospect = session.prospects as any;
    const snapshot = session.snapshot as any;
    const pains = snapshot?.pains ?? [];
    const offering = session.selected_offering as any;

    const { data: countryDefaults } = await supabaseAdmin
      .from("country_defaults")
      .select("*")
      .eq("country", prospect?.country ?? "ES")
      .single();

    const { data: painLibrary } = await supabaseAdmin
      .from("pain_library")
      .select("pain_id, pain_statement, primary_module")
      .eq("is_archived", false);

    const painMap: Record<string, any> = {};
    (painLibrary ?? []).forEach((p: any) => { painMap[p.pain_id] = p; });

    const companyName = prospect?.company_name ?? "Untitled";
    const country = prospect?.country ?? "ES";
    const seats = prospect?.seats ?? 0;
    const sector = prospect?.sector ?? "—";
    const totalBenefit = session.total_annual_benefit_eur ?? 0;
    const annualCost = session.factorial_annual_cost_eur ?? 0;
    const roiEur = session.roi_eur ?? 0;
    const roiPct = session.roi_pct ?? 0;
    const paybackMonths = session.payback_months ?? 0;
    const hourlyCost = countryDefaults?.avg_loaded_hourly_cost_eur ?? 30;
    const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const tier = offering?.tier ?? "business";
    const billing = offering?.billing ?? "yearly";
    const bundleName = offering?.bundle_name ?? tier.charAt(0).toUpperCase() + tier.slice(1);
    const countryLabel = country === "FR" ? "France" : "Spain";
    const selectedPains: string[] = session.selected_pains ?? [];

    // ─── Build PPTX ───
    const pres = new pptxgen();
    pres.layout = "LAYOUT_16x9";
    pres.author = user.email ?? "Propel ROI";
    pres.title = `ROI Proposal — ${companyName}`;

    // Logo as SVG base64
    const logoData = "image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzE0IiBoZWlnaHQ9IjcxNCIgdmlld0JveD0iMCAwIDcxNCA3MTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik01ODEuNzg0IDYzNC4zNjJDNTIwLjQxNCA2ODQuMTYgNDQyLjE5MiA3MTQgMzU3IDcxNEMyNzEuODA4IDcxNCAxOTMuNTg2IDY4NC4xNiAxMzIuMjE2IDYzNC4zNjJDMTkzLjU4NiA1ODQuNTYzIDI3MS44MDggNTU0LjcyMyAzNTcgNTU0LjcyM0M0NDIuMTkyIDU1NC43MjMgNTIwLjQxNCA1ODQuNTYzIDU4MS43ODQgNjM0LjM2MloiIGZpbGw9IiNGRjM1NUUiPjwvcGF0aD4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMzAuMjU4IDU0OC4xOTJDODYuNjgwNyA0OTYuNTY1IDYwLjQxNTQgNDI5Ljg1IDYwLjQxNTQgMzU3QzYwLjQxNTQgMTkzLjIwMSAxOTMuMjAxIDYwLjQxNTQgMzU3IDYwLjQxNTRDNTIwLjc5OSA2MC40MTU0IDY1My41ODUgMTkzLjIwMSA2NTMuNTg1IDM1N0M2NTMuNTg1IDQyOS44NSA2MjcuMzE5IDQ5Ni41NjUgNTgzLjc0MiA1NDguMTkyQzU5OC43MzUgNTU3LjU2IDYxMy4xMDUgNTY3LjgyNyA2MjYuNzczIDU3OC45MThMNjMyLjc0NCA1ODMuNzYzQzY4My41MTMgNTIyLjA5OSA3MTQgNDQzLjExIDcxNCAzNTdDNzE0IDE1OS44MzQgNTU0LjE2NiAwIDM1NyAwQzE1OS44MzQgMCAwIDE1OS44MzQgMCAzNTdDMCA0NDMuMTEgMzAuNDg3IDUyMi4wOTkgODEuMjU2MSA1ODMuNzYzTDg3LjIyNyA1NzguOTE4QzEwMC44OTUgNTY3LjgyNyAxMTUuMjY1IDU1Ny41NiAxMzAuMjU4IDU0OC4xOTJaIiBmaWxsPSIjRkYzNTVFIj48L3BhdGg+CjxwYXRoIGQ9Ik00ODguODE1IDM0Ni4wMTVDNDg4LjgxNSA0MTguODE1IDQyOS44IDQ3Ny44MzEgMzU3IDQ3Ny44MzFDMjg0LjIgNDc3LjgzMSAyMjUuMTg1IDQxOC44MTUgMjI1LjE4NSAzNDYuMDE1QzIyNS4xODUgMjczLjIxNiAyODQuMiAyMTQuMiAzNTcgMjE0LjJDNDI5LjggMjE0LjIgNDg4LjgxNSAyNzMuMjE2IDQ4OC44MTUgMzQ2LjAxNVoiIGZpbGw9IiNGRjM1NUUiPjwvcGF0aD4KPC9zdmc+";

    // ── Slide 1: Title ──
    const s1 = pres.addSlide();
    s1.background = { color: MIDNIGHT };
    s1.addImage({ data: logoData, x: 0.6, y: 0.5, w: 0.7, h: 0.7 });
    s1.addText("ROI Proposal", {
      x: 0.5, y: 1.8, w: 9, h: 1,
      fontSize: 40, fontFace: "DM Sans", color: WHITE, bold: true,
    });
    s1.addText(companyName, {
      x: 0.5, y: 2.7, w: 9, h: 0.7,
      fontSize: 28, fontFace: "DM Sans", color: RED,
    });
    s1.addText([
      { text: `${countryLabel}  ·  ${seats} employees  ·  ${sector}`, options: { breakLine: true } },
      { text: date, options: { breakLine: true } },
      { text: `Prepared by ${user.email}` },
    ], {
      x: 0.5, y: 3.8, w: 9, h: 1.2,
      fontSize: 14, fontFace: "DM Sans", color: GRAY,
    });

    // ── Slide 2: ROI Summary ──
    const s2 = pres.addSlide();
    s2.background = { color: WHITE };
    s2.addText("Return on Investment", {
      x: 0.5, y: 0.3, w: 9, h: 0.7,
      fontSize: 28, fontFace: "DM Sans", color: MIDNIGHT, bold: true,
    });

    const kpis = [
      { label: "Net ROI", value: fmtEur(roiEur) },
      { label: "ROI %", value: `${Number(roiPct).toFixed(0)}%` },
      { label: "Payback", value: `${Number(paybackMonths).toFixed(1)} months` },
    ];
    kpis.forEach((kpi, i) => {
      const x = 0.5 + i * 3.1;
      s2.addShape(pres.shapes.RECTANGLE, {
        x, y: 1.3, w: 2.8, h: 1.8,
        fill: { color: LIGHT_BG },
      });
      s2.addText(kpi.value, {
        x, y: 1.5, w: 2.8, h: 0.9,
        fontSize: 32, fontFace: "DM Sans", color: RED, bold: true, align: "center",
      });
      s2.addText(kpi.label, {
        x, y: 2.3, w: 2.8, h: 0.5,
        fontSize: 14, fontFace: "DM Sans", color: GRAY, align: "center",
      });
    });

    // Cost vs Benefit bar
    s2.addText(`Total Annual Benefit: ${fmtEur(totalBenefit)}`, {
      x: 0.5, y: 3.6, w: 5, h: 0.5,
      fontSize: 16, fontFace: "DM Sans", color: MIDNIGHT, bold: true,
    });
    s2.addText(`Annual Cost (${bundleName}): ${fmtEur(annualCost)}`, {
      x: 0.5, y: 4.1, w: 5, h: 0.5,
      fontSize: 16, fontFace: "DM Sans", color: GRAY,
    });

    // ── Slide 3: Pains Breakdown ──
    const s3 = pres.addSlide();
    s3.background = { color: WHITE };
    s3.addText("Pains Addressed", {
      x: 0.5, y: 0.3, w: 9, h: 0.7,
      fontSize: 28, fontFace: "DM Sans", color: MIDNIGHT, bold: true,
    });

    const headerRow = [
      { text: "#", options: { bold: true, color: WHITE, fill: { color: MIDNIGHT }, fontSize: 11 } },
      { text: "Pain", options: { bold: true, color: WHITE, fill: { color: MIDNIGHT }, fontSize: 11 } },
      { text: "Module", options: { bold: true, color: WHITE, fill: { color: MIDNIGHT }, fontSize: 11 } },
      { text: "Annual Benefit", options: { bold: true, color: WHITE, fill: { color: MIDNIGHT }, fontSize: 11, align: "right" as const } },
    ];

    const dataRows = selectedPains.map((painId: string, i: number) => {
      const painData = pains.find((p: any) => p.pain_id === painId);
      const libPain = painMap[painId];
      const override = (session.pain_overrides as any)?.[painId];
      const benefit = override?.annual_benefit ?? painData?.annual_benefit ?? 0;
      const painStatement = libPain?.pain_statement ?? painData?.pain_statement ?? painId;
      const module = libPain?.primary_module ?? painData?.primary_module ?? "—";
      const rowFill = i % 2 === 0 ? LIGHT_BG : WHITE;

      return [
        { text: `${i + 1}`, options: { fontSize: 10, fill: { color: rowFill } } },
        { text: painStatement, options: { fontSize: 10, fill: { color: rowFill } } },
        { text: module, options: { fontSize: 10, fill: { color: rowFill } } },
        { text: fmtEur(benefit), options: { fontSize: 10, fill: { color: rowFill }, align: "right" as const, bold: true } },
      ];
    });

    // Total row
    dataRows.push([
      { text: "", options: { fontSize: 10, fill: { color: MIDNIGHT } } },
      { text: "Total Annual Benefit", options: { fontSize: 12, bold: true, color: WHITE, fill: { color: MIDNIGHT } } },
      { text: "", options: { fontSize: 10, fill: { color: MIDNIGHT } } },
      { text: fmtEur(totalBenefit), options: { fontSize: 12, bold: true, color: RED, fill: { color: MIDNIGHT }, align: "right" as const } },
    ]);

    s3.addTable([headerRow, ...dataRows], {
      x: 0.5, y: 1.1, w: 9,
      colW: [0.5, 4.5, 2, 2],
      border: { pt: 0.5, color: "E2E8F0" },
      fontSize: 10,
      fontFace: "DM Sans",
      color: MIDNIGHT,
    });

    // ── Slide 4: Recommended Setup ──
    const s4 = pres.addSlide();
    s4.background = { color: WHITE };
    s4.addText("Recommended Setup", {
      x: 0.5, y: 0.3, w: 9, h: 0.7,
      fontSize: 28, fontFace: "DM Sans", color: MIDNIGHT, bold: true,
    });

    s4.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.3, w: 9, h: 2.5,
      fill: { color: LIGHT_BG },
    });
    s4.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: 1.3, w: 0.08, h: 2.5,
      fill: { color: RED },
    });

    s4.addText(bundleName, {
      x: 1, y: 1.5, w: 8, h: 0.7,
      fontSize: 28, fontFace: "DM Sans", color: RED, bold: true,
    });
    s4.addText(`${tier.charAt(0).toUpperCase() + tier.slice(1)} plan  ·  ${billing} billing`, {
      x: 1, y: 2.2, w: 8, h: 0.5,
      fontSize: 16, fontFace: "DM Sans", color: GRAY,
    });
    s4.addText(`Annual cost: ${fmtEur(annualCost)}`, {
      x: 1, y: 2.8, w: 8, h: 0.5,
      fontSize: 18, fontFace: "DM Sans", color: MIDNIGHT, bold: true,
    });

    // Methodology
    s4.addText("Methodology", {
      x: 0.5, y: 4.2, w: 9, h: 0.4,
      fontSize: 10, fontFace: "DM Sans", color: GRAY, bold: true,
    });
    s4.addText(
      `Benefits are calculated using country-specific labor cost benchmarks (${fmtEur(hourlyCost)}/hr for ${country}). All figures are annual estimates based on ${seats} employees. ROI = (Total Benefit - Cost) / Cost x 100.`,
      {
        x: 0.5, y: 4.5, w: 9, h: 0.8,
        fontSize: 9, fontFace: "DM Sans", color: GRAY,
      }
    );

    // ── Slide 5: Thank You ──
    const s5 = pres.addSlide();
    s5.background = { color: MIDNIGHT };
    s5.addImage({ data: logoData, x: 4.15, y: 1.2, w: 1.7, h: 1.7 });
    s5.addText("Thank you", {
      x: 0.5, y: 3.2, w: 9, h: 0.8,
      fontSize: 36, fontFace: "DM Sans", color: WHITE, bold: true, align: "center",
    });
    s5.addText(user.email ?? "", {
      x: 0.5, y: 4.0, w: 9, h: 0.5,
      fontSize: 14, fontFace: "DM Sans", color: GRAY, align: "center",
    });
    s5.addText(`Generated by Propel ROI  ·  ${date}  ·  Confidential`, {
      x: 0.5, y: 4.8, w: 9, h: 0.4,
      fontSize: 10, fontFace: "DM Sans", color: GRAY, align: "center",
    });

    // ─── Output ───
    const pptxBuffer = await pres.write({ outputType: "arraybuffer" }) as ArrayBuffer;
    const pptxBytes = new Uint8Array(pptxBuffer);

    const fileName = `roi-${session_id}-${Date.now()}.pptx`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("roi-pdfs")
      .upload(fileName, pptxBytes, {
        contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabaseAdmin.storage
      .from("roi-pdfs")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({ pptx_url: urlData.publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-pptx error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
