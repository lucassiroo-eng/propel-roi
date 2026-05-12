import jsPDF from "jspdf";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { getEffectiveHours, getCountForEntry, MODULE_HOURS, type Stakeholder, type RoiMultipliers } from "@/lib/moduleHours";

const PURPLE = "#4C1FD4";
const PURPLE_LIGHT = "#EDE9FB";
const PURPLE_MID = "#7B61FF";
const DARK = "#1A1A2E";
const GRAY = "#6B7280";
const GRAY_LIGHT = "#F3F4F6";
const WHITE = "#FFFFFF";
const GREEN = "#059669";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function fmtEur(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 0 });
}

interface PdfModuleRow {
  moduleId: string;
  label: string;
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

function drawFactorialLogo(doc: jsPDF, x: number, y: number, size: number) {
  const r = size / 2;
  const cx = x + r;
  const cy = y + r;
  const [pr, pg, pb] = hexToRgb(PURPLE);

  doc.setDrawColor(pr, pg, pb);
  doc.setLineWidth(size * 0.08);
  doc.circle(cx, cy, r, "S");

  doc.setFillColor(pr, pg, pb);
  doc.circle(cx, cy, r * 0.37, "F");

  const petalR = r * 0.42;
  const petalY = cy + r * 0.55;
  doc.ellipse(cx, petalY, petalR, petalR * 0.3, "F");
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: "F" | "S" | "FD") {
  doc.roundedRect(x, y, w, h, r, r, style);
}

export function generateRoiPdf(data: RoiPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210;
  const ph = 297;
  const mx = 15;
  const contentW = pw - mx * 2;
  let curY = 0;

  const multipliers: RoiMultipliers = {
    headcounts: data.headcounts,
    onboardings_per_year: data.roiConfig.onboardings_per_year,
    expense_submitters: data.roiConfig.expense_submitters,
  };

  // Compute module rows
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
      moduleRows.push({ moduleId: modId, label: catalog?.label ?? modId, monthlyHours: modHours, monthlyMoney: modMoney });
    }
  }

  const totalMonthlyHours = moduleRows.reduce((s, r) => s + r.monthlyHours, 0);
  const totalMonthlyMoney = moduleRows.reduce((s, r) => s + r.monthlyMoney, 0);
  const totalAnnualSavings = totalMonthlyMoney * 12;
  const discountedCost = data.bundleAnnual * (1 - data.discountPct / 100);
  const monthlyCost = discountedCost / 12;
  const roiMultiple = monthlyCost > 0 ? totalMonthlyMoney / monthlyCost : 0;

  // Top 3 priority modules (those with quotes, sorted by savings)
  const priorityModules = moduleRows
    .filter(r => data.moduleSuggestions.find(s => s.module_id === r.moduleId)?.quote)
    .sort((a, b) => b.monthlyMoney - a.monthlyMoney)
    .slice(0, 3)
    .map(r => ({
      ...r,
      quote: data.moduleSuggestions.find(s => s.module_id === r.moduleId)!.quote,
    }));

  // If less than 3 with quotes, fill with top modules without quotes
  if (priorityModules.length < 3) {
    const existing = new Set(priorityModules.map(p => p.moduleId));
    const extra = moduleRows
      .filter(r => !existing.has(r.moduleId))
      .sort((a, b) => b.monthlyMoney - a.monthlyMoney);
    for (const r of extra) {
      if (priorityModules.length >= 3) break;
      const quote = data.moduleSuggestions.find(s => s.module_id === r.moduleId)?.quote ?? "";
      priorityModules.push({ ...r, quote });
    }
  }

  // ════════════════════════════════════════════
  // HEADER BAR
  // ════════════════════════════════════════════
  const headerH = 22;
  doc.setFillColor(...hexToRgb(PURPLE));
  doc.rect(0, 0, pw, headerH, "F");

  // Factorial logo (simplified mark)
  drawFactorialLogo(doc, mx, 5, 12);

  // "Factorial" text
  doc.setTextColor(...hexToRgb(WHITE));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Factorial", mx + 16, 13);

  // Company name on the right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(data.companyName, pw - mx, 10, { align: "right" });
  doc.setFontSize(7.5);
  doc.text("ROI Analysis", pw - mx, 15, { align: "right" });

  curY = headerH + 6;

  // ════════════════════════════════════════════
  // INTRO BLOCK
  // ════════════════════════════════════════════
  doc.setFillColor(...hexToRgb(PURPLE_LIGHT));
  drawRoundedRect(doc, mx, curY, contentW, 20, 2.5, "F");

  doc.setTextColor(...hexToRgb(DARK));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const introLine1 = `Factorial's consulting team has prepared a personalized ROI analysis for ${data.companyName}, based on ${data.seats} employees:`;
  const introLine2 = `${data.headcounts.employee} Individual Contributors  ·  ${data.headcounts.manager} Managers  ·  ${data.headcounts.hr} HR Staff`;
  const contactLine = [data.contactName, data.contactEmail].filter(Boolean).join("  ·  ");

  doc.text(introLine1, mx + 4, curY + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(introLine2, mx + 4, curY + 11.5);

  if (contactLine) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...hexToRgb(GRAY));
    doc.text(contactLine, mx + 4, curY + 16.5);
  }

  curY += 24;

  // ════════════════════════════════════════════
  // PRIORITY MODULES (3 CARDS)
  // ════════════════════════════════════════════
  doc.setTextColor(...hexToRgb(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Priority Modules", mx, curY + 3);
  curY += 7;

  const cardW = (contentW - 6) / 3;
  const cardH = 38;
  const cardGap = 3;

  priorityModules.forEach((pm, i) => {
    const cx = mx + i * (cardW + cardGap);

    // Card background
    doc.setFillColor(...hexToRgb(WHITE));
    doc.setDrawColor(...hexToRgb(PURPLE));
    doc.setLineWidth(0.4);
    drawRoundedRect(doc, cx, curY, cardW, cardH, 2, "FD");

    // Number badge
    const badgeR = 4;
    doc.setFillColor(...hexToRgb(PURPLE));
    doc.circle(cx + 7, curY + 7, badgeR, "F");
    doc.setTextColor(...hexToRgb(WHITE));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(String(i + 1), cx + 7, curY + 8.2, { align: "center" });

    // Module name
    doc.setTextColor(...hexToRgb(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const nameTrimmed = pm.label.length > 22 ? pm.label.substring(0, 20) + "…" : pm.label;
    doc.text(nameTrimmed, cx + 13, curY + 8);

    // Savings badge
    doc.setTextColor(...hexToRgb(GREEN));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text(`${pm.monthlyHours.toFixed(0)}h/mo · €${fmtEur(pm.monthlyMoney)}/mo`, cx + 4, curY + 14.5);

    // Quote
    if (pm.quote) {
      doc.setTextColor(...hexToRgb(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      const maxQuoteWidth = cardW - 8;
      const lines = doc.splitTextToSize(`"${pm.quote}"`, maxQuoteWidth) as string[];
      const maxLines = 4;
      const trimmed = lines.slice(0, maxLines);
      if (lines.length > maxLines) {
        trimmed[maxLines - 1] = trimmed[maxLines - 1].replace(/\s*$/, "") + "…\"";
      }
      doc.text(trimmed, cx + 4, curY + 19.5);
    }
  });

  curY += cardH + 6;

  // ════════════════════════════════════════════
  // FULL MODULES TABLE
  // ════════════════════════════════════════════
  doc.setTextColor(...hexToRgb(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Full Module Breakdown", mx, curY + 3);
  curY += 7;

  // Table header
  const col1X = mx;
  const col2X = mx + contentW * 0.55;
  const col3X = mx + contentW * 0.78;
  const rowH = 5.8;

  doc.setFillColor(...hexToRgb(PURPLE));
  drawRoundedRect(doc, mx, curY, contentW, rowH + 1, 1.5, "F");

  doc.setTextColor(...hexToRgb(WHITE));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Module", col1X + 3, curY + 4);
  doc.text("Hours saved/mo", col2X, curY + 4, { align: "right" });
  doc.text("€ Return/mo", col3X + contentW * 0.22 - 3, curY + 4, { align: "right" });

  curY += rowH + 1.5;

  // Table rows
  moduleRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(...hexToRgb(GRAY_LIGHT));
      doc.rect(mx, curY - 0.5, contentW, rowH, "F");
    }

    doc.setTextColor(...hexToRgb(DARK));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(row.label, col1X + 3, curY + 3.5);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(GRAY));
    doc.text(`${row.monthlyHours.toFixed(1)}h`, col2X, curY + 3.5, { align: "right" });

    doc.setTextColor(...hexToRgb(GREEN));
    doc.text(`€${fmtEur(Math.round(row.monthlyMoney))}`, col3X + contentW * 0.22 - 3, curY + 3.5, { align: "right" });

    curY += rowH;
  });

  // ════════════════════════════════════════════
  // TOTAL ROW (highlighted)
  // ════════════════════════════════════════════
  curY += 1;
  const totalRowH = 12;
  doc.setFillColor(...hexToRgb(PURPLE));
  drawRoundedRect(doc, mx, curY, contentW, totalRowH, 2, "F");

  doc.setTextColor(...hexToRgb(WHITE));
  doc.setFont("helvetica", "bold");

  // Left: bundle price
  doc.setFontSize(7);
  doc.text("Bundle price", col1X + 3, curY + 4);
  doc.setFontSize(9);
  doc.text(`€${fmtEur(Math.round(discountedCost))}/yr`, col1X + 3, curY + 9.5);

  // Center: total return
  const centerX = mx + contentW / 2;
  doc.setFontSize(7);
  doc.text("Total return/mo", centerX, curY + 4, { align: "center" });
  doc.setFontSize(9);
  doc.text(`${totalMonthlyHours.toFixed(0)}h → €${fmtEur(Math.round(totalMonthlyMoney))}`, centerX, curY + 9.5, { align: "center" });

  // Right: ROI
  const rightX = mx + contentW - 3;
  doc.setFontSize(7);
  doc.text("ROI", rightX, curY + 4, { align: "right" });
  doc.setFontSize(14);
  doc.text(`${roiMultiple.toFixed(1)}x`, rightX, curY + 10.5, { align: "right" });

  curY += totalRowH + 4;

  // ════════════════════════════════════════════
  // ANNUAL SUMMARY BAR
  // ════════════════════════════════════════════
  doc.setFillColor(...hexToRgb(PURPLE_LIGHT));
  drawRoundedRect(doc, mx, curY, contentW, 10, 2, "F");

  doc.setTextColor(...hexToRgb(PURPLE));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const annualText = `Annual savings: €${fmtEur(Math.round(totalAnnualSavings))}  ·  Annual cost: €${fmtEur(Math.round(discountedCost))}  ·  Net benefit: €${fmtEur(Math.round(totalAnnualSavings - discountedCost))}/yr`;
  doc.text(annualText, mx + contentW / 2, curY + 6.5, { align: "center" });

  curY += 14;

  // ════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════
  const footerY = ph - 8;
  doc.setDrawColor(...hexToRgb(GRAY_LIGHT));
  doc.setLineWidth(0.3);
  doc.line(mx, footerY - 3, pw - mx, footerY - 3);

  doc.setTextColor(...hexToRgb(GRAY));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("Prepared by Factorial · Confidential", mx, footerY);
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  doc.text(today, pw - mx, footerY, { align: "right" });

  return doc;
}
