import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { jsPDF } from "npm:jspdf@2.5.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function fmtEur(n: number): string {
  return "€" + Math.round(n).toLocaleString("es-ES");
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
    const roiPct = session.roi_pct ?? 0;
    const paybackMonths = session.payback_months ?? 0;
    const netBenefit = totalBenefit - annualCost;
    const hourlyCost = countryDefaults?.avg_loaded_hourly_cost_eur ?? 30;
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const tier = offering?.tier ?? "business";
    const billing = offering?.billing ?? "yearly";
    const bundleName = offering?.bundle_name ?? tier.charAt(0).toUpperCase() + tier.slice(1);

    // ─── Factorial brand palette ───
    const coral: [number, number, number] = [255, 53, 94];
    const coralLight: [number, number, number] = [255, 241, 242];
    const dark: [number, number, number] = [26, 26, 46];
    const gray: [number, number, number] = [107, 114, 128];
    const graySoft: [number, number, number] = [156, 163, 175];
    const greenVal: [number, number, number] = [22, 163, 106];
    const greenBg: [number, number, number] = [236, 253, 245];
    const redCost: [number, number, number] = [220, 38, 38];
    const redBg: [number, number, number] = [255, 241, 242];
    const border: [number, number, number] = [229, 231, 235];
    const warmBg: [number, number, number] = [255, 248, 240];
    const purpleVal: [number, number, number] = [124, 58, 237];
    const purpleBg: [number, number, number] = [245, 243, 255];

    // ─── Build PDF ───
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const mx = 18;
    const contentW = W - 2 * mx;
    let y = 0;

    // ─── Header ───
    doc.setFillColor(...warmBg);
    doc.rect(0, 0, W, 48, "F");

    // Coral accent line
    doc.setFillColor(...coral);
    doc.rect(0, 46, W, 2, "F");

    // Logo: coral dot + "factorial"
    doc.setFillColor(...coral);
    doc.circle(mx + 5, 18, 5, "F");
    doc.setFillColor(255, 255, 255);
    doc.circle(mx + 5, 18, 1.8, "F");
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("factorial", mx + 13, 20);

    // Right side
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(companyName, W - mx, 16, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text("ROI Analysis", W - mx, 22, { align: "right" });
    const countryLabel = country === "FR" ? "France" : "Spain";
    doc.text(`${countryLabel} · ${seats} employees`, W - mx, 27, { align: "right" });

    y = 56;

    // ─── KPI Cards ───
    const cardW = (contentW - 8) / 3;
    const cardH = 22;

    const kpis: Array<{ label: string; value: string; color: [number, number, number]; bg: [number, number, number] }> = [
      { label: "AHORROS ANUALES", value: fmtEur(totalBenefit), color: greenVal, bg: greenBg },
      { label: "COSTE DEL SISTEMA", value: `${fmtEur(annualCost)}/yr`, color: coral, bg: coralLight },
      { label: "ROI", value: `${Math.round(roiPct)}%`, color: purpleVal, bg: purpleBg },
    ];

    kpis.forEach((kpi, i) => {
      const x = mx + i * (cardW + 4);
      doc.setFillColor(...kpi.bg);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, cardW, cardH, 3, 3, "FD");
      // Top accent
      doc.setFillColor(...kpi.color);
      doc.rect(x + 4, y, cardW - 8, 1.5, "F");
      // Label
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...graySoft);
      doc.text(kpi.label, x + cardW / 2, y + 8, { align: "center" });
      // Value
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...kpi.color);
      doc.text(kpi.value, x + cardW / 2, y + 17, { align: "center" });
    });

    y += cardH + 8;

    // ─── Intro box ───
    doc.setFillColor(...warmBg);
    doc.setDrawColor(...border);
    doc.roundedRect(mx, y, contentW, 12, 2, 2, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    const introText = `ROI analysis for ${companyName} — ${seats} employees (${sector}). Payback: ${Number(paybackMonths).toFixed(1)} months.`;
    doc.text(introText, mx + 4, y + 7);
    y += 18;

    // ─── Pains table ───
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text("Pains Addressed", mx, y);
    y += 6;

    const colX = [mx, mx + 8, mx + 8 + 90, mx + 8 + 90 + 32];
    const colW_ = [8, 90, 32, contentW - 8 - 90 - 32];

    // Table header
    doc.setFillColor(...dark);
    doc.roundedRect(mx, y, contentW, 7, 2, 2, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("#", colX[0] + 2, y + 4.5);
    doc.text("PAIN", colX[1] + 2, y + 4.5);
    doc.text("MODULE", colX[2] + 2, y + 4.5);
    doc.text("BENEFIT/YR", colX[3] + colW_[3] - 2, y + 4.5, { align: "right" });
    y += 9;

    const selectedPains = session.selected_pains ?? [];
    selectedPains.forEach((painId: string, i: number) => {
      const painData = pains.find((p: any) => p.pain_id === painId);
      const libPain = painMap[painId];
      const override = (session.pain_overrides as any)?.[painId];
      const benefit = override?.annual_benefit ?? painData?.annual_benefit ?? 0;
      const painStatement = libPain?.pain_statement ?? painData?.pain_statement ?? painId;
      const module_ = libPain?.primary_module ?? painData?.primary_module ?? "—";

      if (y > 262) { doc.addPage(); y = 15; }

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      const wrappedLines = doc.splitTextToSize(painStatement, colW_[1] - 4);
      const rowH = Math.max(6, wrappedLines.length * 3.5 + 2.5);

      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(mx, y - 0.5, contentW, rowH, "F");
      }

      doc.setTextColor(...dark);
      doc.text(`${i + 1}`, colX[0] + 2, y + 3.5);
      doc.text(wrappedLines, colX[1] + 2, y + 3.5);
      doc.setTextColor(...gray);
      doc.text(module_.substring(0, 18), colX[2] + 2, y + 3.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...greenVal);
      doc.text(fmtEur(benefit), colX[3] + colW_[3] - 2, y + 3.5, { align: "right" });

      doc.setDrawColor(240, 240, 242);
      doc.setLineWidth(0.15);
      doc.line(mx, y + rowH - 0.5, W - mx, y + rowH - 0.5);

      y += rowH;
    });

    // Total row
    if (y > 262) { doc.addPage(); y = 15; }
    doc.setFillColor(...coral);
    doc.roundedRect(mx, y + 1, contentW, 8, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Total Annual Benefit", colX[1] + 2, y + 6);
    doc.setFontSize(10);
    doc.text(fmtEur(totalBenefit), colX[3] + colW_[3] - 2, y + 6.5, { align: "right" });
    y += 14;

    // ─── Offering card ───
    if (y > 252) { doc.addPage(); y = 15; }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text("Offering", mx, y);
    y += 5;

    doc.setFillColor(...coralLight);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(mx, y, contentW, 18, 3, 3, "FD");
    doc.setFillColor(...coral);
    doc.rect(mx + 2, y, contentW - 4, 1.5, "F");

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...coral);
    doc.text(bundleName, mx + 6, y + 8);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(`${tier.charAt(0).toUpperCase() + tier.slice(1)} · ${billing}`, mx + 6, y + 13);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(`${fmtEur(annualCost)}/yr`, W - mx - 6, y + 10, { align: "right" });

    y += 24;

    // ─── Net benefit strip ───
    if (y > 256) { doc.addPage(); y = 15; }
    const pillW = (contentW - 6) / 3;
    const pillH = 16;

    const pills: Array<{ label: string; value: string; color: [number, number, number]; bg: [number, number, number] }> = [
      { label: "Ahorros anuales", value: fmtEur(totalBenefit), color: greenVal, bg: greenBg },
      { label: "Coste anual", value: `-${fmtEur(annualCost)}`, color: redCost, bg: redBg },
      { label: "Beneficio neto", value: `${fmtEur(netBenefit)}/yr`, color: netBenefit >= 0 ? greenVal : redCost, bg: netBenefit >= 0 ? greenBg : redBg },
    ];

    pills.forEach((p, i) => {
      const x = mx + i * (pillW + 3);
      doc.setFillColor(...p.bg);
      doc.setDrawColor(...border);
      doc.roundedRect(x, y, pillW, pillH, 3, 3, "FD");
      doc.setFontSize(5.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...graySoft);
      doc.text(p.label, x + pillW / 2, y + 5, { align: "center" });
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...p.color);
      doc.text(p.value, x + pillW / 2, y + 12, { align: "center" });
    });

    y += pillH + 6;

    // ─── Methodology ───
    if (y > 270) { doc.addPage(); y = 15; }
    doc.setDrawColor(...border);
    doc.setLineWidth(0.2);
    doc.line(mx, y, W - mx, y);
    y += 3;
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...graySoft);
    const methText = `Benefits calculated using country-specific labor cost benchmarks (${fmtEur(hourlyCost)}/hr for ${country}). All figures annual estimates for ${seats} employees. ROI = (Benefit - Cost) / Cost × 100.`;
    const methLines = doc.splitTextToSize(methText, contentW);
    doc.text(methLines, mx, y);

    // ─── Footer ───
    doc.setFontSize(5.5);
    doc.setTextColor(...graySoft);
    doc.text("Prepared by Factorial · Confidential", mx, 288);
    doc.text(dateStr, W - mx, 288, { align: "right" });

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
          roi_eur: totalBenefit - annualCost,
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
