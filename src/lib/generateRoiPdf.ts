import jsPDF from "jspdf";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG, CATEGORY_COLORS } from "@/lib/moduleCatalog";
import { getEffectiveHours, getCountForEntry, MODULE_HOURS, type Stakeholder, type RoiMultipliers } from "@/lib/moduleHours";

// ── Factorial brand palette ──
const CORAL      = "#FF355E";
const CREAM      = "#FFF8F0";
const CREAM_WARM = "#FFF3E8";
const DARK       = "#1A1A2E";
const GRAY       = "#6B7280";
const GRAY_SOFT  = "#9CA3AF";
const WHITE      = "#FFFFFF";
const GREEN      = "#16A34A";
const GREEN_BG   = "#ECFDF5";
const GREEN_BDR  = "#D1FAE5";
const RED        = "#DC2626";
const RED_BG     = "#FFF1F2";
const RED_BDR    = "#FECDD3";
const PURPLE     = "#7C3AED";
const PURPLE_BG  = "#F5F3FF";
const PURPLE_BDR = "#DDD6FE";
const BORDER     = "#E5E7EB";

const CAT_BG: Record<string, string> = {
  "Core HR":            "#F3F4F6",
  "Time":               "#FFFBEB",
  "Payroll & Benefits": "#FFF7ED",
  "Talent":             "#FFF1F2",
  "Finance":            "#F0FDFA",
  "IT":                 "#F0FDFA",
  "AI":                 "#FFF1F2",
  "Integrations":       "#EEF2FF",
};

function hex(c: string): [number, number, number] {
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

function trunc(t: string, mx: number): string {
  return t.length <= mx ? t : t.substring(0, mx - 1) + "…";
}

function getCatColor(moduleId: string): string {
  const mod = MODULE_CATALOG.find(m => m.id === moduleId);
  return mod?.color ?? CATEGORY_COLORS[mod?.category ?? ""] ?? GRAY;
}

function getCat(moduleId: string): string {
  return MODULE_CATALOG.find(m => m.id === moduleId)?.category ?? "Core HR";
}

function getCatBg(moduleId: string): string {
  return CAT_BG[getCat(moduleId)] ?? "#FAFAFA";
}

interface PdfModuleRow {
  moduleId: string;
  label: string;
  category: string;
  categoryColor: string;
  monthlyHours: number;
  monthlyMoney: number;
}

export interface RoiPdfData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  seats: number;
  headcounts: { employee: number; hr: number; manager: number };
  configModules: string[];
  moduleSuggestions: ModuleSuggestion[];
  roiConfig: RoiConfig;
  bundleName: string;
  bundleAnnual: number;
  discountPct: number;
}

export function generateRoiPdf(data: RoiPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const mx = 16;
  const cw = W - mx * 2;

  const multipliers: RoiMultipliers = {
    headcounts: data.headcounts,
    onboardings_per_year: data.roiConfig.onboardings_per_year,
    expense_submitters: data.roiConfig.expense_submitters,
  };

  // ── Compute module rows ──
  const moduleRows: PdfModuleRow[] = [];
  for (const modId of data.configModules) {
    const hours = getEffectiveHours(modId, data.roiConfig.hours_overrides);
    let modHours = 0;
    let modMoney = 0;
    for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
      const entry = MODULE_HOURS.find(e => e.module_id === modId && e.stakeholder === s);
      const count = entry ? getCountForEntry(entry, multipliers) : data.headcounts[s];
      const h = hours[s] * count;
      modHours += h;
      modMoney += h * data.roiConfig.hourly_costs[s];
    }
    if (modHours > 0) {
      const catalog = MODULE_CATALOG.find(m => m.id === modId);
      moduleRows.push({
        moduleId: modId,
        label: catalog?.label ?? modId,
        category: getCat(modId),
        categoryColor: getCatColor(modId),
        monthlyHours: modHours,
        monthlyMoney: modMoney,
      });
    }
  }

  const totalMonthlyHours = moduleRows.reduce((s, r) => s + r.monthlyHours, 0);
  const totalMonthlyMoney = moduleRows.reduce((s, r) => s + r.monthlyMoney, 0);
  const totalAnnualSavings = totalMonthlyMoney * 12;
  const discountedCost = data.bundleAnnual * (1 - data.discountPct / 100);
  const netBenefit = totalAnnualSavings - discountedCost;
  const roiPct = discountedCost > 0 ? (totalAnnualSavings / discountedCost) * 100 : 0;
  const roiMultiple = discountedCost > 0 ? totalMonthlyMoney / (discountedCost / 12) : 0;

  // Top 3 priority modules (highest savings)
  const sortedByMoney = [...moduleRows].sort((a, b) => b.monthlyMoney - a.monthlyMoney);
  const top3Ids = new Set(sortedByMoney.slice(0, 3).map(r => r.moduleId));
  const priorityModules = sortedByMoney.slice(0, 3).map(r => ({
    ...r,
    quote: data.moduleSuggestions.find(s => s.module_id === r.moduleId)?.quote ?? "",
  }));

  const nRows = moduleRows.length;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // ── Adaptive row height ──
  const fixedH = 52 + 34 + 18 + 10 + 42 + 10 + 8 + nRows * 7 + 14 + 10 + 18 + 10 + 16 + 14;
  const slack = H - fixedH;
  const rowH = Math.max(6.5, Math.min(9, 7 + (slack > 60 ? Math.min(2, slack * 0.015) : 0)));
  const cardH = Math.max(38, Math.min(48, 42 + (slack > 40 ? 4 : 0)));

  let y = 0;

  // ── Subtle warm tint on top ──
  doc.setFillColor(255, 248, 238);
  doc.rect(0, 0, W, H * 0.35, "F");

  // ════════════════════════════════════════════
  // 1. HEADER
  // ════════════════════════════════════════════
  const hdrH = 44;
  // Coral accent line
  doc.setFillColor(...hex(CORAL));
  doc.rect(0, hdrH, W, 1.5, "F");

  // Logo: coral dot + "factorial"
  doc.setFillColor(...hex(CORAL));
  doc.circle(mx + 5, 15, 5, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(mx + 5, 15, 1.8, "F");
  doc.setTextColor(...hex(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("factorial", mx + 13, 17.5);

  // Right side: company + subtitle
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...hex(DARK));
  doc.text(trunc(data.companyName, 36), W - mx, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hex(GRAY));
  doc.text("ROI Analysis", W - mx, 20, { align: "right" });

  // Subtitle line
  const emp = data.headcounts.employee;
  const mgr = data.headcounts.manager;
  const hr = data.headcounts.hr;
  doc.setFontSize(7);
  doc.text(`${data.seats} employees  ·  ${emp} ICs  ·  ${mgr} Managers  ·  ${hr} HR`, mx, 30);

  if (data.contactEmail) {
    doc.setFontSize(6.5);
    doc.text(trunc(data.contactEmail, 45), W - mx, 26, { align: "right" });
  }

  y = hdrH + 6;

  // ════════════════════════════════════════════
  // 2. KPI CARDS (3)
  // ════════════════════════════════════════════
  const kpiW = (cw - 8) / 3;
  const kpiH = 30;
  const kpis = [
    { label: "AHORROS ANUALES", value: `€${fmtEur(totalAnnualSavings)}`, color: GREEN, bg: GREEN_BG, bdr: GREEN_BDR },
    { label: "COSTE DEL SISTEMA", value: `€${fmtEur(discountedCost)}/yr`, color: CORAL, bg: RED_BG, bdr: RED_BDR },
    { label: "ROI", value: `${roiPct.toFixed(0)}%`, color: PURPLE, bg: PURPLE_BG, bdr: PURPLE_BDR },
  ];

  kpis.forEach((k, i) => {
    const x = mx + i * (kpiW + 4);

    // Card with colored border
    doc.setFillColor(...hex(k.bg));
    doc.setDrawColor(...hex(k.bdr));
    doc.setLineWidth(0.6);
    doc.roundedRect(x, y, kpiW, kpiH, 4, 4, "FD");

    // Colored top accent strip
    doc.setFillColor(...hex(k.color));
    doc.roundedRect(x, y, kpiW, 3, 4, 4, "F");
    doc.setFillColor(...hex(k.bg));
    doc.rect(x, y + 2, kpiW, 2, "F");

    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex(GRAY_SOFT));
    doc.text(k.label, x + kpiW / 2, y + 11, { align: "center" });

    // Value
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex(k.color));
    doc.text(k.value, x + kpiW / 2, y + 23, { align: "center" });
  });

  y += kpiH + 6;

  // ════════════════════════════════════════════
  // 3. INTRO BOX
  // ════════════════════════════════════════════
  const introH = 14;
  doc.setFillColor(...hex(CREAM_WARM));
  doc.setDrawColor(...hex(BORDER));
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, cw, introH, 3, 3, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hex(DARK));
  const introText = `Personalized ROI analysis for ${data.companyName} — ${data.seats} employees (${emp} ICs · ${mgr} Managers · ${hr} HR). Identifying highest-impact modules with time and cost savings.`;
  const introLines = doc.splitTextToSize(introText, cw - 12);
  doc.text(introLines, mx + 6, y + 6);

  y += introH + 6;

  // ════════════════════════════════════════════
  // 4. PRIORITY MODULES (3 cards with category colors)
  // ════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hex(DARK));
  doc.text("Priority Modules", mx, y + 3);
  y += 7;

  const cardW = (cw - 6) / 3;

  priorityModules.forEach((pm, i) => {
    const cx = mx + i * (cardW + 3);
    const catColor = pm.categoryColor;
    const catBg = getCatBg(pm.moduleId);

    // Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...hex(BORDER));
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y, cardW, cardH, 3, 3, "FD");

    // Category color TOP bar
    doc.setFillColor(...hex(catColor));
    doc.roundedRect(cx, y, cardW, 3.5, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y + 2, cardW, 2, "F");

    // Rank circle
    doc.setFillColor(...hex(catColor));
    doc.circle(cx + 7, y + 8.5, 3.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(i + 1), cx + 7, y + 9.7, { align: "center" });

    // Module name
    doc.setTextColor(...hex(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(trunc(pm.label, 20), cx + 13, y + 9.5);

    // Category tag
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...hex(catColor));
    doc.text(pm.category.toUpperCase(), cx + 13, y + 13.5);

    // Stats line
    doc.setTextColor(...hex(catColor));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(`${pm.monthlyHours.toFixed(0)}h/mo · €${fmtEur(pm.monthlyMoney)}/mo`, cx + 6, y + 19);

    // Divider
    doc.setDrawColor(...hex(catColor));
    doc.setLineWidth(0.2);
    const divAlpha = 0.3;
    doc.line(cx + 6, y + 21.5, cx + cardW - 6, y + 21.5);

    // Quote
    if (pm.quote) {
      doc.setTextColor(...hex(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(5.8);
      const maxW = cardW - 12;
      const lines = doc.splitTextToSize(`“${trunc(pm.quote, 120)}”`, maxW) as string[];
      const maxLines = Math.floor((cardH - 32) / 3);
      const trimmed = lines.slice(0, Math.max(2, maxLines));
      doc.text(trimmed, cx + 6, y + 25.5);
    }

    // Bottom strip with category bg + large € value
    const stripH = 10;
    const stripY = y + cardH - stripH;
    doc.setFillColor(...hex(catBg));
    doc.roundedRect(cx, stripY, cardW, stripH, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, stripY, cardW, 2, "F");

    doc.setTextColor(...hex(catColor));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`€${fmtEur(pm.monthlyMoney)}/mo`, cx + cardW / 2, stripY + 7.5, { align: "center" });
  });

  y += cardH + 7;

  // ════════════════════════════════════════════
  // 5. MODULE TABLE with category accent bars
  // ════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hex(DARK));
  doc.text("Full Module Breakdown", mx, y + 3);
  y += 7;

  const accentW = 3;
  const col1 = mx + accentW + 3;
  const colHrs = mx + cw * 0.70;
  const colEur = mx + cw - 3;
  const tblHdrH = 7.5;

  // Table header
  doc.setFillColor(...hex(DARK));
  doc.roundedRect(mx, y, cw, tblHdrH, 2.5, 2.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("MODULE", col1, y + 5);
  doc.text("HOURS/MO", colHrs, y + 5, { align: "right" });
  doc.text("€ RETURN/MO", colEur, y + 5, { align: "right" });
  y += tblHdrH + 1;

  moduleRows.forEach((row, i) => {
    if (y > 265) { doc.addPage(); y = 15; }

    const catColor = row.categoryColor;
    const isPriority = top3Ids.has(row.moduleId);

    // Row background: priority rows get category bg, others alternate
    if (isPriority) {
      doc.setFillColor(...hex(getCatBg(row.moduleId)));
    } else if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(mx, y - 0.5, cw, rowH, "F");

    // Category color left accent bar
    doc.setFillColor(...hex(catColor));
    doc.rect(mx, y - 0.5, accentW, rowH, "F");

    // Module name (bold for priority)
    doc.setTextColor(...hex(DARK));
    doc.setFont("helvetica", isPriority ? "bold" : "normal");
    doc.setFontSize(7);
    doc.text(trunc(row.label, 38), col1, y + rowH / 2 + 0.5);

    // Hours
    doc.setTextColor(...hex(GRAY));
    doc.setFont("helvetica", "normal");
    doc.text(`${row.monthlyHours.toFixed(1)}h`, colHrs, y + rowH / 2 + 0.5, { align: "right" });

    // € Return in category color
    doc.setTextColor(...hex(catColor));
    doc.setFont("helvetica", "bold");
    doc.text(`€${fmtEur(Math.round(row.monthlyMoney))}`, colEur, y + rowH / 2 + 0.5, { align: "right" });

    // Bottom border
    doc.setDrawColor(...hex(BORDER));
    doc.setLineWidth(0.2);
    doc.line(mx + accentW, y + rowH - 0.5, W - mx, y + rowH - 0.5);

    y += rowH;
  });

  y += 2;

  // ════════════════════════════════════════════
  // 6. TOTALS BAR (dark gradient simulation)
  // ════════════════════════════════════════════
  if (y > 262) { doc.addPage(); y = 15; }

  const totH = 14;

  // Simulate gradient: dark → purple
  const steps = 30;
  const stepW = cw / steps;
  const c1 = hex(DARK);
  const c2 = hex("#2D1B69");
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    doc.setFillColor(
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    );
    doc.rect(mx + i * stepW, y, stepW + 0.5, totH, "F");
  }
  // Round corners by overlaying
  doc.setFillColor(255, 255, 255);
  // Top-left corner
  doc.rect(mx, y, 3, 3, "F");
  doc.setFillColor(...hex(DARK));
  doc.circle(mx + 3, y + 3, 3, "F");
  doc.rect(mx + 3, y, 3, 3, "F");
  doc.rect(mx, y + 3, 3, 3, "F");
  // Top-right corner
  doc.setFillColor(255, 255, 255);
  doc.rect(mx + cw - 3, y, 3, 3, "F");
  doc.setFillColor(...c2);
  doc.circle(mx + cw - 3, y + 3, 3, "F");
  doc.rect(mx + cw - 6, y, 3, 3, "F");
  doc.rect(mx + cw - 3, y + 3, 3, 3, "F");
  // Bottom-left corner
  doc.setFillColor(255, 255, 255);
  doc.rect(mx, y + totH - 3, 3, 3, "F");
  doc.setFillColor(...hex(DARK));
  doc.circle(mx + 3, y + totH - 3, 3, "F");
  doc.rect(mx + 3, y + totH - 3, 3, 3, "F");
  doc.rect(mx, y + totH - 6, 3, 3, "F");
  // Bottom-right corner
  doc.setFillColor(255, 255, 255);
  doc.rect(mx + cw - 3, y + totH - 3, 3, 3, "F");
  doc.setFillColor(...c2);
  doc.circle(mx + cw - 3, y + totH - 3, 3, "F");
  doc.rect(mx + cw - 6, y + totH - 3, 3, 3, "F");
  doc.rect(mx + cw - 3, y + totH - 6, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);

  // Left: bundle price
  doc.text("BUNDLE PRICE/YR", col1 - 2, y + 4.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`€${fmtEur(discountedCost)}`, col1 - 2, y + 11);

  // Center: total return
  const midX = mx + cw * 0.45;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("TOTAL RETURN/MO", midX, y + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`${totalMonthlyHours.toFixed(0)}h  ·  €${fmtEur(Math.round(totalMonthlyMoney))}`, midX, y + 11, { align: "center" });

  // Right: ROI
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("ROI", colEur, y + 4.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${roiPct.toFixed(0)}%`, colEur, y + 11.5, { align: "right" });

  y += totH + 6;

  // ════════════════════════════════════════════
  // 7. NET BENEFIT STRIP (3 pills)
  // ════════════════════════════════════════════
  if (y > 258) { doc.addPage(); y = 15; }

  const pillW = (cw - 8) / 3;
  const pillH = 20;
  const pills = [
    { label: "Ahorros anuales", value: `€${fmtEur(totalAnnualSavings)}`, color: GREEN, bg: GREEN_BG, bdr: GREEN_BDR },
    { label: "Coste anual", value: `-€${fmtEur(discountedCost)}`, color: RED, bg: RED_BG, bdr: RED_BDR },
    { label: "Beneficio neto", value: `€${fmtEur(netBenefit)}/yr`,
      color: netBenefit >= 0 ? GREEN : RED,
      bg: netBenefit >= 0 ? GREEN_BG : RED_BG,
      bdr: netBenefit >= 0 ? GREEN_BDR : RED_BDR },
  ];

  pills.forEach((p, i) => {
    const px = mx + i * (pillW + 4);

    doc.setFillColor(...hex(p.bg));
    doc.setDrawColor(...hex(p.bdr));
    doc.setLineWidth(0.5);
    doc.roundedRect(px, y, pillW, pillH, 4, 4, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hex(GRAY_SOFT));
    doc.text(p.label, px + pillW / 2, y + 6.5, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex(p.color));
    doc.text(p.value, px + pillW / 2, y + 16, { align: "center" });
  });

  // ════════════════════════════════════════════
  // 8. FOOTER
  // ════════════════════════════════════════════
  doc.setDrawColor(...hex(BORDER));
  doc.setLineWidth(0.3);
  doc.line(mx, H - 12, W - mx, H - 12);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hex(GRAY_SOFT));
  doc.text("Prepared by Factorial · Confidential", mx, H - 8);
  doc.text(today, W - mx, H - 8, { align: "right" });

  return doc;
}
