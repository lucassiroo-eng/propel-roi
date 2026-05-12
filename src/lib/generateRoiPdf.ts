import jsPDF from "jspdf";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG, CATEGORY_COLORS } from "@/lib/moduleCatalog";
import { getEffectiveHours, getCountForEntry, MODULE_HOURS, type Stakeholder, type RoiMultipliers } from "@/lib/moduleHours";

const CORAL  = "#FF355E";
const DARK   = "#1E1E2F";
const DARK2  = "#2D2B55";
const GRAY   = "#6B7280";
const GRAY_S = "#9CA3AF";
const LINE   = "#E5E7EB";
const GREEN  = "#059669";
const RED    = "#DC2626";

const CAT_BG: Record<string, string> = {
  "Core HR": "#F3F4F6", "Time": "#FFFBEB", "Payroll & Benefits": "#FFF7ED",
  "Talent": "#FFF1F2", "Finance": "#F0FDFA", "IT": "#F0FDFA",
  "AI": "#FFF1F2", "Integrations": "#EEF2FF",
};

function rgb(c: string): [number, number, number] {
  const s = c.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function eur(n: number): string { return "€" + Math.round(n).toLocaleString("es-ES"); }
function tr(t: string, m: number): string { return t.length <= m ? t : t.substring(0, m - 1) + "…"; }
function catColor(id: string): string { const m = MODULE_CATALOG.find(x => x.id === id); return m?.color ?? CATEGORY_COLORS[m?.category ?? ""] ?? GRAY; }
function catName(id: string): string { return MODULE_CATALOG.find(x => x.id === id)?.category ?? ""; }
function catBg(id: string): string { return CAT_BG[catName(id)] ?? "#FAFAFA"; }

interface ModRow { id: string; label: string; cat: string; color: string; hrs: number; money: number; }

export interface RoiPdfData {
  companyName: string; contactName: string; contactEmail: string; seats: number;
  headcounts: { employee: number; hr: number; manager: number };
  configModules: string[]; moduleSuggestions: ModuleSuggestion[];
  roiConfig: RoiConfig; bundleName: string; bundleAnnual: number; discountPct: number;
}

function gradient(doc: jsPDF, x: number, y: number, w: number, ht: number, c1: [number,number,number], c2: [number,number,number]) {
  const n = 50, sw = w / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    doc.setFillColor(
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    );
    doc.rect(x + i * sw, y, sw + 0.3, ht, "F");
  }
}

export function generateRoiPdf(data: RoiPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, mx = 18, cw = W - mx * 2;
  let y = 0;

  const mults: RoiMultipliers = {
    headcounts: data.headcounts,
    onboardings_per_year: data.roiConfig.onboardings_per_year,
    expense_submitters: data.roiConfig.expense_submitters,
  };

  // ── Compute ──
  const rows: ModRow[] = [];
  for (const id of data.configModules) {
    const hrs = getEffectiveHours(id, data.roiConfig.hours_overrides);
    let mh = 0, mm = 0;
    for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
      const e = MODULE_HOURS.find(x => x.module_id === id && x.stakeholder === s);
      const c = e ? getCountForEntry(e, mults) : data.headcounts[s];
      const hours = hrs[s] * c;
      mh += hours; mm += hours * data.roiConfig.hourly_costs[s];
    }
    if (mh > 0) {
      const cat = MODULE_CATALOG.find(m => m.id === id);
      rows.push({ id, label: cat?.label ?? id, cat: catName(id), color: catColor(id), hrs: mh, money: mm });
    }
  }

  const totHrs = rows.reduce((s, r) => s + r.hrs, 0);
  const totMoney = rows.reduce((s, r) => s + r.money, 0);
  const annSave = totMoney * 12;
  const cost = data.bundleAnnual * (1 - data.discountPct / 100);
  const net = annSave - cost;
  const roiPct = cost > 0 ? Math.round((net / cost) * 100) : 0;
  const paybackMo = totMoney > 0 ? cost / totMoney : 0;

  const sorted = [...rows].sort((a, b) => b.money - a.money);
  const top3 = new Set(sorted.slice(0, 3).map(r => r.id));
  const prio = sorted.slice(0, 3).map(r => ({
    ...r, quote: data.moduleSuggestions.find(s => s.module_id === r.id)?.quote ?? "",
  }));

  const { employee: emp, manager: mgr, hr: hrC } = data.headcounts;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const nR = rows.length;
  const rH = nR > 12 ? 6 : nR > 9 ? 6.8 : 7.5;

  // ── Coral left accent ──
  doc.setFillColor(...rgb(CORAL));
  doc.rect(0, 0, 3.5, H, "F");

  // ════════════════════════════════════════════
  // 1. HEADER — logo + company
  // ════════════════════════════════════════════
  // Warm wash
  doc.setFillColor(255, 252, 249);
  doc.rect(3.5, 0, W - 3.5, 34, "F");

  // Logo
  doc.setFillColor(...rgb(CORAL));
  doc.circle(mx + 6, 14, 6, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(mx + 6, 14, 2.2, "F");
  doc.setTextColor(...rgb(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("factorial", mx + 15, 16.5);

  // Right: company
  doc.setFontSize(12);
  doc.text(tr(data.companyName, 30), W - mx, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...rgb(GRAY));
  doc.text(`${data.seats} employees  ·  ${emp} ICs  ·  ${mgr} Mgrs  ·  ${hrC} HR`, W - mx, 19, { align: "right" });
  doc.setFontSize(6.5);
  doc.setTextColor(...rgb(GRAY_S));
  doc.text(today, W - mx, 24, { align: "right" });

  // Separator
  doc.setFillColor(...rgb(CORAL));
  doc.rect(mx, 30, cw, 0.5, "F");

  y = 36;

  // ════════════════════════════════════════════
  // 2. HERO BANNER — dark gradient, ROI as centerpiece
  // ════════════════════════════════════════════
  const heroH = 28;
  gradient(doc, mx, y, cw, heroH, rgb(DARK), rgb(DARK2));
  doc.setFillColor(...rgb(CORAL));
  doc.roundedRect(mx, y, cw, heroH, 4, 4, "F");
  gradient(doc, mx, y + 2, cw, heroH - 2, rgb(DARK), rgb(DARK2));

  // Left: savings
  doc.setTextColor(...rgb(GRAY_S));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("ANNUAL SAVINGS", mx + 10, y + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...rgb("#4ADE80"));
  doc.text(eur(annSave), mx + 10, y + 20);

  // Center: net benefit
  const cx = mx + cw / 2;
  doc.setTextColor(...rgb(GRAY_S));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("NET BENEFIT / YEAR", cx, y + 9, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(`${eur(net)}/yr`, cx, y + 20, { align: "center" });

  // Right: ROI — the hero
  doc.setTextColor(...rgb(GRAY_S));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("ROI", W - mx - 10, y + 9, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...rgb(CORAL));
  doc.text(`${roiPct}%`, W - mx - 10, y + 22, { align: "right" });

  y += heroH + 7;

  // Small meta line
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY_S));
  doc.text(`${eur(cost)}/yr system cost  ·  Payback ${paybackMo.toFixed(1)} months  ·  ${totHrs.toFixed(0)} hours saved/month`, mx, y);

  y += 7;

  // ════════════════════════════════════════════
  // 3. PRIORITY MODULES — 3 cards, quote-focused (no repeated €)
  // ════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(DARK));
  doc.text("Key Opportunities", mx, y + 2);
  y += 6;

  const cardW = (cw - 8) / 3;
  const cardH = 40;

  prio.forEach((pm, i) => {
    const px = mx + i * (cardW + 4);
    const cc = pm.color;

    // Shadow
    doc.setFillColor(232, 232, 237);
    doc.roundedRect(px + 0.4, y + 0.5, cardW, cardH, 3, 3, "F");

    // Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.3);
    doc.roundedRect(px, y, cardW, cardH, 3, 3, "FD");

    // Top bar (category color)
    doc.setFillColor(...rgb(cc));
    doc.roundedRect(px, y, cardW, 3, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(px, y + 1.5, cardW, 2, "F");

    // Rank
    doc.setFillColor(...rgb(cc));
    doc.circle(px + 7.5, y + 8.5, 3.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(String(i + 1), px + 7.5, y + 9.7, { align: "center" });

    // Name + category
    doc.setTextColor(...rgb(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(tr(pm.label, 18), px + 13.5, y + 9.5);
    doc.setFontSize(5);
    doc.setTextColor(...rgb(cc));
    doc.text(pm.cat.toUpperCase(), px + 13.5, y + 13);

    // Quote — the main content of the card
    if (pm.quote) {
      doc.setTextColor(...rgb(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      const ql = doc.splitTextToSize(`"${tr(pm.quote, 130)}"`, cardW - 12) as string[];
      doc.text(ql.slice(0, 5), px + 6, y + 19);
    }

    // Bottom strip
    const sH = 8;
    const sY = y + cardH - sH;
    doc.setFillColor(...rgb(catBg(pm.id)));
    doc.roundedRect(px, sY, cardW, sH, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(px, sY, cardW, 1, "F");
    doc.setTextColor(...rgb(cc));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`${pm.hrs.toFixed(0)}h/mo saved`, px + cardW / 2, sY + 5.5, { align: "center" });
  });

  y += cardH + 8;

  // ════════════════════════════════════════════
  // 4. MODULE TABLE (with integrated totals)
  // ════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(DARK));
  doc.text("Module Breakdown", mx, y + 2);
  y += 6;

  const aW = 3;
  const c1 = mx + aW + 3;
  const cCat = mx + cw * 0.48;
  const colH = mx + cw * 0.72;
  const colE = mx + cw - 3;
  const thH = 7.5;

  // Header
  doc.setFillColor(...rgb(DARK));
  doc.roundedRect(mx, y, cw, thH, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("MODULE", c1, y + 5);
  doc.text("CATEGORY", cCat, y + 5);
  doc.text("HOURS/MO", colH, y + 5, { align: "right" });
  doc.text("€ SAVED/MO", colE, y + 5, { align: "right" });
  y += thH + 0.5;

  rows.forEach((r, i) => {
    if (y > 262) { doc.addPage(); y = 12; doc.setFillColor(...rgb(CORAL)); doc.rect(0, 0, 3.5, H, "F"); }
    const isPrio = top3.has(r.id);

    if (isPrio) {
      doc.setFillColor(...rgb(catBg(r.id)));
    } else {
      doc.setFillColor(i % 2 === 0 ? 251 : 255, i % 2 === 0 ? 251 : 255, i % 2 === 0 ? 253 : 255);
    }
    doc.rect(mx, y, cw, rH, "F");

    // Accent bar
    doc.setFillColor(...rgb(r.color));
    doc.rect(mx, y, aW, rH, "F");

    const ty = y + rH / 2 + 1;

    // Name
    doc.setTextColor(...rgb(DARK));
    doc.setFont("helvetica", isPrio ? "bold" : "normal");
    doc.setFontSize(6.5);
    doc.text(tr(r.label, 30), c1, ty);

    // Category
    doc.setFontSize(5.5);
    doc.setTextColor(...rgb(r.color));
    doc.setFont("helvetica", "bold");
    doc.text(r.cat, cCat, ty);

    // Hours
    doc.setTextColor(...rgb(GRAY));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`${r.hrs.toFixed(1)}h`, colH, ty, { align: "right" });

    // €
    doc.setTextColor(...rgb(r.color));
    doc.setFont("helvetica", "bold");
    doc.text(eur(Math.round(r.money)), colE, ty, { align: "right" });

    doc.setDrawColor(240, 240, 243);
    doc.setLineWidth(0.12);
    doc.line(mx + aW, y + rH, W - mx, y + rH);

    y += rH;
  });

  // ── Totals row (integrated into table) ──
  y += 1;
  if (y > 268) { doc.addPage(); y = 12; doc.setFillColor(...rgb(CORAL)); doc.rect(0, 0, 3.5, H, "F"); }

  const totRowH = 10;
  doc.setFillColor(...rgb(DARK));
  doc.roundedRect(mx, y, cw, totRowH, 2, 2, "F");

  doc.setFillColor(...rgb(CORAL));
  doc.rect(mx, y, aW, totRowH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TOTAL", c1, y + totRowH / 2 + 1);

  doc.text(`${totHrs.toFixed(0)}h`, colH, y + totRowH / 2 + 1, { align: "right" });

  doc.setTextColor(...rgb("#4ADE80"));
  doc.setFontSize(8);
  doc.text(`${eur(Math.round(totMoney))}/mo`, colE, y + totRowH / 2 + 1, { align: "right" });

  y += totRowH + 10;

  // ════════════════════════════════════════════
  // 5. BOTTOM LINE — single elegant summary
  // ════════════════════════════════════════════
  if (y > 270) { doc.addPage(); y = 12; doc.setFillColor(...rgb(CORAL)); doc.rect(0, 0, 3.5, H, "F"); }

  const blH = 12;
  doc.setFillColor(255, 252, 249);
  doc.setDrawColor(...rgb(LINE));
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, cw, blH, 3, 3, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY));

  const third = cw / 3;
  // Savings
  doc.text("Annual savings", mx + third / 2, y + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(GREEN));
  doc.setFontSize(9);
  doc.text(eur(annSave), mx + third / 2, y + 9.5, { align: "center" });

  // Cost
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY));
  doc.setFontSize(7);
  doc.text("System cost", mx + third * 1.5, y + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(RED));
  doc.setFontSize(9);
  doc.text(`-${eur(cost)}`, mx + third * 1.5, y + 9.5, { align: "center" });

  // Net
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY));
  doc.setFontSize(7);
  doc.text("Net benefit", mx + third * 2.5, y + 4.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(net >= 0 ? GREEN : RED));
  doc.setFontSize(9);
  doc.text(`${eur(net)}/yr`, mx + third * 2.5, y + 9.5, { align: "center" });

  // ════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════
  doc.setDrawColor(...rgb(LINE));
  doc.setLineWidth(0.2);
  doc.line(mx, H - 12, W - mx, H - 12);
  doc.setFillColor(...rgb(CORAL));
  doc.rect(0, 0, 3.5, H, "F");
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY_S));
  doc.text("Prepared by Factorial · Confidential", mx, H - 7.5);
  doc.text(today, W - mx, H - 7.5, { align: "right" });

  return doc;
}
