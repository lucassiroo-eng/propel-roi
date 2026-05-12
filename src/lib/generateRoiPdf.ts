import jsPDF from "jspdf";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG, CATEGORY_COLORS } from "@/lib/moduleCatalog";
import { getEffectiveHours, getCountForEntry, MODULE_HOURS, type Stakeholder, type RoiMultipliers } from "@/lib/moduleHours";

const CORAL = "#FF355E";
const CORAL_LIGHT = "#FFF1F2";
const CREAM = "#FFF8F0";
const DARK = "#1A1A2E";
const GRAY = "#6B7280";
const GRAY_SOFT = "#9CA3AF";
const GRAY_LIGHT = "#F3F4F6";
const WHITE = "#FFFFFF";
const GREEN = "#16A36A";
const GREEN_BG = "#ECFDF5";
const RED = "#DC2626";
const RED_BG = "#FEF2F2";

function hex(c: string): [number, number, number] {
  const h = c.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

function getCategoryColor(moduleId: string): string {
  const mod = MODULE_CATALOG.find(m => m.id === moduleId);
  return mod?.color ?? CATEGORY_COLORS[mod?.category ?? ""] ?? GRAY;
}

function getCategory(moduleId: string): string {
  return MODULE_CATALOG.find(m => m.id === moduleId)?.category ?? "";
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
  const mx = 16;
  const cw = W - mx * 2;
  let y = 0;

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
        category: getCategory(modId),
        categoryColor: getCategoryColor(modId),
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
  const roiMultiple = discountedCost > 0 ? totalMonthlyMoney / (discountedCost / 12) : 0;
  const roiPct = discountedCost > 0 ? (netBenefit / discountedCost) * 100 : 0;
  const paybackMonths = totalMonthlyMoney > 0 ? discountedCost / totalMonthlyMoney : 0;

  // Top 3 priority modules
  const priorityModules = moduleRows
    .sort((a, b) => b.monthlyMoney - a.monthlyMoney)
    .slice(0, 3)
    .map(r => ({
      ...r,
      quote: data.moduleSuggestions.find(s => s.module_id === r.moduleId)?.quote ?? "",
    }));

  // ════════════════════════════════════════════
  // PAGE 1 — HEADER
  // ════════════════════════════════════════════
  doc.setFillColor(...hex(CREAM));
  doc.rect(0, 0, W, 52, "F");
  doc.setFillColor(...hex(CORAL));
  doc.rect(0, 50, W, 2, "F");

  // Factorial logo mark
  doc.setFillColor(...hex(CORAL));
  doc.circle(mx + 5, 16, 5, "F");
  doc.setFillColor(...hex(WHITE));
  doc.circle(mx + 5, 16, 1.8, "F");

  doc.setTextColor(...hex(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("factorial", mx + 13, 18.5);

  // Title
  doc.setFontSize(9);
  doc.setTextColor(...hex(CORAL));
  doc.text("ROI ANALYSIS", mx, 30);

  doc.setFontSize(18);
  doc.setTextColor(...hex(DARK));
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName, mx, 39);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hex(GRAY));
  const subtitleParts = [`${data.seats} employees`];
  if (data.headcounts.hr > 0) subtitleParts.push(`${data.headcounts.hr} HR`);
  if (data.headcounts.manager > 0) subtitleParts.push(`${data.headcounts.manager} managers`);
  doc.text(subtitleParts.join("  ·  "), mx, 45);

  // Date on right
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  doc.text(today, W - mx, 45, { align: "right" });

  y = 60;

  // ════════════════════════════════════════════
  // KPI CARDS (3)
  // ════════════════════════════════════════════
  const kpiW = (cw - 8) / 3;
  const kpiH = 26;
  const kpis = [
    { label: "ANNUAL SAVINGS", value: `€${fmtEur(totalAnnualSavings)}`, sub: `${totalMonthlyHours.toFixed(0)}h/mo saved`, color: GREEN, bg: GREEN_BG },
    { label: "SYSTEM COST", value: `€${fmtEur(discountedCost)}/yr`, sub: `€${fmtEur(Math.round(discountedCost / 12))}/mo`, color: CORAL, bg: CORAL_LIGHT },
    { label: "RETURN ON INVESTMENT", value: `${roiMultiple.toFixed(1)}x`, sub: `Payback: ${paybackMonths.toFixed(1)} months`, color: "#7C3AED", bg: "#F5F3FF" },
  ];

  kpis.forEach((k, i) => {
    const x = mx + i * (kpiW + 4);
    doc.setFillColor(...hex(k.bg));
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, y, kpiW, kpiH, 3, 3, "FD");

    // Top accent bar
    doc.setFillColor(...hex(k.color));
    doc.roundedRect(x, y, kpiW, 2.5, 3, 3, "F");
    doc.setFillColor(...hex(k.bg));
    doc.rect(x, y + 1.5, kpiW, 1.5, "F");

    // Label
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex(GRAY_SOFT));
    doc.text(k.label, x + kpiW / 2, y + 8.5, { align: "center" });

    // Value
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex(k.color));
    doc.text(k.value, x + kpiW / 2, y + 17, { align: "center" });

    // Sub
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hex(GRAY_SOFT));
    doc.text(k.sub, x + kpiW / 2, y + 22, { align: "center" });
  });

  y += kpiH + 10;

  // ════════════════════════════════════════════
  // PRIORITY MODULES (3 cards)
  // ════════════════════════════════════════════
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hex(DARK));
  doc.text("Top Impact Modules", mx, y);
  y += 6;

  const cardW = (cw - 6) / 3;
  const cardH = 42;

  priorityModules.forEach((pm, i) => {
    const cx = mx + i * (cardW + 3);
    const catColor = pm.categoryColor;

    // Card bg with border
    doc.setFillColor(...hex(WHITE));
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, cardH, 2.5, 2.5, "FD");

    // Category color top bar
    doc.setFillColor(...hex(catColor));
    doc.roundedRect(cx, y, cardW, 3, 2.5, 2.5, "F");
    doc.setFillColor(...hex(WHITE));
    doc.rect(cx, y + 1.5, cardW, 2, "F");

    // Rank badge
    doc.setFillColor(...hex(catColor));
    doc.circle(cx + 7, y + 8, 3.5, "F");
    doc.setTextColor(...hex(WHITE));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(i + 1), cx + 7, y + 9.2, { align: "center" });

    // Module name
    doc.setTextColor(...hex(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const name = pm.label.length > 20 ? pm.label.substring(0, 18) + "…" : pm.label;
    doc.text(name, cx + 13, y + 9);

    // Category label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...hex(catColor));
    doc.text(pm.category.toUpperCase(), cx + 13, y + 13);

    // Savings
    doc.setFillColor(...hex(GREEN_BG));
    doc.roundedRect(cx + 3, y + 16, cardW - 6, 6, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...hex(GREEN));
    doc.text(`${pm.monthlyHours.toFixed(0)}h/mo  ·  €${fmtEur(pm.monthlyMoney)}/mo`, cx + cardW / 2, y + 20, { align: "center" });

    // Quote
    if (pm.quote) {
      doc.setTextColor(...hex(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      const lines = doc.splitTextToSize(`"${pm.quote}"`, cardW - 8) as string[];
      const maxLines = 4;
      const trimmed = lines.slice(0, maxLines);
      if (lines.length > maxLines) {
        trimmed[maxLines - 1] = trimmed[maxLines - 1].replace(/\s*$/, "") + "…\"";
      }
      doc.text(trimmed, cx + 4, y + 27);
    }

    // Bottom strip with category color
    doc.setFillColor(...hex(catColor));
    const stripY = y + cardH - 2.5;
    doc.roundedRect(cx, stripY, cardW, 2.5, 2.5, 2.5, "F");
    doc.setFillColor(...hex(WHITE));
    doc.rect(cx, stripY, cardW, 1, "F");
  });

  y += cardH + 10;

  // ════════════════════════════════════════════
  // MODULE BREAKDOWN TABLE
  // ════════════════════════════════════════════
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hex(DARK));
  doc.text("Full Module Breakdown", mx, y);
  y += 6;

  // Column positions
  const accentW = 3;
  const col1 = mx + accentW + 2;
  const colCat = mx + accentW + 70;
  const colHrs = mx + cw * 0.72;
  const colEur = mx + cw - 2;
  const rowH = 7;

  // Table header
  doc.setFillColor(...hex(DARK));
  doc.roundedRect(mx, y, cw, rowH + 1, 2, 2, "F");
  doc.setTextColor(...hex(WHITE));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("MODULE", col1, y + 5);
  doc.text("CATEGORY", colCat, y + 5);
  doc.text("HOURS/MO", colHrs, y + 5, { align: "right" });
  doc.text("€ RETURN/MO", colEur, y + 5, { align: "right" });
  y += rowH + 2;

  // Table rows
  moduleRows.forEach((row, i) => {
    if (y > 262) { doc.addPage(); y = 15; }

    const catColor = row.categoryColor;

    // Alternating bg
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(mx, y - 0.5, cw, rowH, "F");
    }

    // Category color accent bar
    doc.setFillColor(...hex(catColor));
    doc.rect(mx, y - 0.5, accentW, rowH, "F");

    // Module name
    doc.setTextColor(...hex(DARK));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(row.label, col1, y + 4);

    // Category
    doc.setFontSize(6);
    doc.setTextColor(...hex(catColor));
    doc.setFont("helvetica", "bold");
    doc.text(row.category, colCat, y + 4);

    // Hours
    doc.setTextColor(...hex(GRAY));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`${row.monthlyHours.toFixed(1)}h`, colHrs, y + 4, { align: "right" });

    // € return in category color
    doc.setTextColor(...hex(catColor));
    doc.setFont("helvetica", "bold");
    doc.text(`€${fmtEur(Math.round(row.monthlyMoney))}`, colEur, y + 4, { align: "right" });

    // Separator
    doc.setDrawColor(240, 240, 242);
    doc.setLineWidth(0.15);
    doc.line(mx + accentW, y + rowH - 0.5, W - mx, y + rowH - 0.5);

    y += rowH;
  });

  // ════════════════════════════════════════════
  // TOTALS BAR (dark)
  // ════════════════════════════════════════════
  y += 2;
  if (y > 260) { doc.addPage(); y = 15; }

  const totH = 14;
  doc.setFillColor(...hex(DARK));
  doc.roundedRect(mx, y, cw, totH, 3, 3, "F");

  // Coral accent at top
  doc.setFillColor(...hex(CORAL));
  doc.roundedRect(mx, y, cw, 2.5, 3, 3, "F");
  doc.setFillColor(...hex(DARK));
  doc.rect(mx, y + 1.5, cw, 1.5, "F");

  doc.setTextColor(...hex(WHITE));
  doc.setFont("helvetica", "bold");

  // Left: total hours
  doc.setFontSize(6.5);
  doc.text("TOTAL HOURS SAVED", mx + 6, y + 6.5);
  doc.setFontSize(11);
  doc.text(`${totalMonthlyHours.toFixed(0)}h/mo`, mx + 6, y + 12);

  // Center: total € return
  const ctrX = mx + cw / 2;
  doc.setFontSize(6.5);
  doc.text("TOTAL RETURN", ctrX, y + 6.5, { align: "center" });
  doc.setFontSize(11);
  doc.setTextColor(...hex(GREEN));
  doc.text(`€${fmtEur(Math.round(totalMonthlyMoney))}/mo`, ctrX, y + 12, { align: "center" });

  // Right: ROI
  doc.setTextColor(...hex(WHITE));
  doc.setFontSize(6.5);
  doc.text("ROI", mx + cw - 6, y + 6.5, { align: "right" });
  doc.setFontSize(16);
  doc.setTextColor(...hex(CORAL));
  doc.text(`${roiMultiple.toFixed(1)}x`, mx + cw - 6, y + 12.5, { align: "right" });

  y += totH + 8;

  // ════════════════════════════════════════════
  // NET BENEFIT STRIP (3 pills)
  // ════════════════════════════════════════════
  if (y > 256) { doc.addPage(); y = 15; }

  const pillW = (cw - 6) / 3;
  const pillH = 18;
  const pills = [
    { label: "Annual Savings", value: `€${fmtEur(totalAnnualSavings)}`, color: GREEN, bg: GREEN_BG },
    { label: "Annual Cost", value: `-€${fmtEur(discountedCost)}`, color: RED, bg: RED_BG },
    { label: "Net Benefit", value: `€${fmtEur(netBenefit)}/yr`, color: netBenefit >= 0 ? GREEN : RED, bg: netBenefit >= 0 ? GREEN_BG : RED_BG },
  ];

  pills.forEach((p, i) => {
    const px = mx + i * (pillW + 3);
    doc.setFillColor(...hex(p.bg));
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(px, y, pillW, pillH, 3, 3, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...hex(GRAY_SOFT));
    doc.text(p.label, px + pillW / 2, y + 6, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hex(p.color));
    doc.text(p.value, px + pillW / 2, y + 14, { align: "center" });
  });

  y += pillH + 8;

  // ════════════════════════════════════════════
  // OFFERING BOX
  // ════════════════════════════════════════════
  if (y > 260) { doc.addPage(); y = 15; }

  doc.setFillColor(...hex(CREAM));
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(mx, y, cw, 16, 3, 3, "FD");

  doc.setFillColor(...hex(CORAL));
  doc.roundedRect(mx, y, cw, 2.5, 3, 3, "F");
  doc.setFillColor(...hex(CREAM));
  doc.rect(mx, y + 1.5, cw, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...hex(CORAL));
  doc.text(data.bundleName, mx + 6, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...hex(GRAY));
  doc.text(`${data.configModules.length} modules · ROI ${Math.round(roiPct)}% · Payback ${paybackMonths.toFixed(1)} months`, mx + 6, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...hex(DARK));
  doc.text(`€${fmtEur(discountedCost)}/yr`, W - mx - 6, y + 10, { align: "right" });

  y += 22;

  // ════════════════════════════════════════════
  // METHODOLOGY NOTE
  // ════════════════════════════════════════════
  if (y > 275) { doc.addPage(); y = 15; }

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(mx, y, W - mx, y);
  y += 3;

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hex(GRAY_SOFT));
  const methText = `Savings estimated from hours saved per module × blended hourly cost. Figures are monthly projections annualized. Module hours based on employee count, HR headcount, and manager headcount.`;
  const methLines = doc.splitTextToSize(methText, cw);
  doc.text(methLines, mx, y);

  // ════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════
  doc.setFontSize(6);
  doc.setTextColor(...hex(GRAY_SOFT));
  doc.text("Prepared by Factorial · Confidential", mx, 290);
  doc.text(today, W - mx, 290, { align: "right" });

  return doc;
}
