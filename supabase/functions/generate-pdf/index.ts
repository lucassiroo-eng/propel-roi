import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsPDF } from "npm:jspdf@2.5.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Fetch pain library for full pain statements
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

    // ─── Build PDF ───
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const marginL = 20;
    const marginR = 20;
    const contentW = W - marginL - marginR;
    let y = 20;

    const purple = [124, 58, 237]; // #7c3aed
    const darkText = [30, 41, 59]; // #1e293b
    const grayText = [100, 116, 139]; // #64748b
    const lightBg = [248, 250, 252]; // #f8fafc
    const lavenderBg = [250, 245, 255]; // #faf5ff

    // ─── Header ───
    doc.setFontSize(22);
    doc.setTextColor(...purple);
    doc.setFont("helvetica", "bold");
    doc.text("Propel ROI", marginL, y);

    doc.setFontSize(10);
    doc.setTextColor(...grayText);
    doc.setFont("helvetica", "normal");
    doc.text("Return on Investment Report", marginL, y + 7);

    // Right-aligned meta
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text(companyName, W - marginR, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayText);
    const countryLabel = country === "FR" ? "France" : "Spain";
    doc.text(`${countryLabel} · ${seats} employees · ${sector}`, W - marginR, y + 5, { align: "right" });
    doc.text(date, W - marginR, y + 10, { align: "right" });
    doc.setFontSize(9);
    doc.text(`Prepared by ${user.email}`, W - marginR, y + 15, { align: "right" });

    y += 22;
    // Purple line
    doc.setDrawColor(...purple);
    doc.setLineWidth(0.6);
    doc.line(marginL, y, W - marginR, y);
    y += 12;

    // ─── Hero cards ───
    const cardW = (contentW - 8) / 3; // 3 cards with 4mm gaps
    const cardH = 28;
    const heroValues = [
      { value: fmtEur(roiEur), label: "Net ROI" },
      { value: `${Number(roiPct).toFixed(0)}%`, label: "ROI" },
      { value: `${Number(paybackMonths).toFixed(1)} mo`, label: "Payback" },
    ];

    heroValues.forEach((card, i) => {
      const x = marginL + i * (cardW + 4);
      doc.setFillColor(...lightBg);
      doc.roundedRect(x, y, cardW, cardH, 3, 3, "F");

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...purple);
      doc.text(card.value, x + cardW / 2, y + 14, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...grayText);
      doc.text(card.label, x + cardW / 2, y + 22, { align: "center" });
    });

    y += cardH + 12;

    // ─── Pains table ───
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text("Pains Addressed", marginL, y);
    y += 8;

    // Table header
    const colX = [marginL, marginL + 8, marginL + 8 + 95, marginL + 8 + 95 + 35];
    const colW = [8, 95, 35, contentW - 8 - 95 - 35];

    doc.setFillColor(241, 245, 249);
    doc.rect(marginL, y, contentW, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...grayText);
    doc.text("#", colX[0] + 2, y + 5.5);
    doc.text("PAIN", colX[1] + 2, y + 5.5);
    doc.text("MODULE", colX[2] + 2, y + 5.5);
    doc.text("ANNUAL BENEFIT", colX[3] + colW[3] - 2, y + 5.5, { align: "right" });
    y += 10;

    const selectedPains = session.selected_pains ?? [];
    selectedPains.forEach((painId: string, i: number) => {
      const painData = pains.find((p: any) => p.pain_id === painId);
      const libPain = painMap[painId];
      const override = (session.pain_overrides as any)?.[painId];
      const benefit = override?.annual_benefit ?? painData?.annual_benefit ?? 0;
      const painStatement = libPain?.pain_statement ?? painData?.pain_statement ?? painId;
      const module = libPain?.primary_module ?? painData?.primary_module ?? "—";

      // Check if we need a new page
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Wrap long pain text
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkText);
      const wrappedLines = doc.splitTextToSize(painStatement, colW[1] - 4);
      const rowH = Math.max(7, wrappedLines.length * 4.5 + 3);

      // Alternating row bg
      if (i % 2 === 0) {
        doc.setFillColor(252, 252, 253);
        doc.rect(marginL, y - 1, contentW, rowH, "F");
      }

      doc.text(`${i + 1}`, colX[0] + 2, y + 4);
      doc.text(wrappedLines, colX[1] + 2, y + 4);
      doc.text(module, colX[2] + 2, y + 4);
      doc.setFont("helvetica", "bold");
      doc.text(fmtEur(benefit), colX[3] + colW[3] - 2, y + 4, { align: "right" });

      // Row separator
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(marginL, y + rowH - 1, W - marginR, y + rowH - 1);

      y += rowH;
    });

    // Total row
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFillColor(...lightBg);
    doc.rect(marginL, y, contentW, 9, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text("Total Annual Benefit", colX[1] + 2, y + 6);
    doc.setTextColor(...purple);
    doc.setFontSize(12);
    doc.text(fmtEur(totalBenefit), colX[3] + colW[3] - 2, y + 6.5, { align: "right" });
    y += 16;

    // ─── Offering section ───
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text("Recommended Setup", marginL, y);
    y += 8;

    doc.setFillColor(...lavenderBg);
    doc.setDrawColor(233, 213, 255);
    doc.roundedRect(marginL, y, contentW, 28, 3, 3, "FD");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...purple);
    doc.text(bundleName, marginL + 8, y + 10);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayText);
    doc.text(`${tier.charAt(0).toUpperCase() + tier.slice(1)} · ${billing} billing`, marginL + 8, y + 17);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkText);
    doc.text(`Annual cost: ${fmtEur(annualCost)}`, marginL + 8, y + 24);

    y += 36;

    // ─── Methodology ───
    if (y > 265) { doc.addPage(); y = 20; }
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, W - marginR, y);
    y += 5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184);
    doc.text("Methodology notes:", marginL, y);
    doc.setFont("helvetica", "normal");
    const methText = `Benefits are calculated using country-specific labor cost benchmarks (${fmtEur(hourlyCost)}/hr loaded cost for ${country}). Time savings use a 52-week year. All figures are annual estimates based on ${seats} employees. ROI = (Total Benefit - Cost) / Cost x 100. Payback = Cost / (Total Benefit / 12).`;
    const methLines = doc.splitTextToSize(methText, contentW);
    doc.text(methLines, marginL, y + 4);

    y += methLines.length * 3.5 + 8;

    // ─── Footer ───
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated by Propel ROI · ${date} · Confidential`, W / 2, 285, { align: "center" });

    // ─── Output ───
    const pdfArrayBuffer = doc.output("arraybuffer");
    const pdfBytes = new Uint8Array(pdfArrayBuffer);

    const fileName = `roi-${session_id}-${Date.now()}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("roi-pdfs")
      .upload(fileName, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabaseAdmin.storage
      .from("roi-pdfs")
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    await supabaseAdmin
      .from("roi_sessions")
      .update({
        pdf_url: pdfUrl,
        status: "generated",
        snapshot: {
          pains,
          offering,
          prospect: { company_name: companyName, country, seats, sector },
          country_defaults: countryDefaults,
          computed_at: new Date().toISOString(),
          total_annual_benefit_eur: totalBenefit,
          factorial_annual_cost_eur: annualCost,
          roi_eur: roiEur,
          roi_pct: roiPct,
          payback_months: paybackMonths,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    return new Response(JSON.stringify({ pdf_url: pdfUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("generate-pdf error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
