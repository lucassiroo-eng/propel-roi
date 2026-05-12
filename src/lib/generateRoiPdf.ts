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

function grad(doc: jsPDF, x: number, y: number, w: number, ht: number, c1: [number,number,number], c2: [number,number,number]) {
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
  const payback = totMoney > 0 ? cost / totMoney : 0;

  const sorted = [...rows].sort((a, b) => b.money - a.money);
  const top3 = new Set(sorted.slice(0, 3).map(r => r.id));
  const prio = sorted.slice(0, 3).map(r => ({
    ...r, quote: data.moduleSuggestions.find(s => s.module_id === r.id)?.quote ?? "",
  }));

  const { employee: emp, manager: mgr, hr: hrC } = data.headcounts;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const nR = rows.length;
  const rH = nR > 12 ? 5.8 : nR > 9 ? 6.5 : 7.2;

  // ── Left accent ──
  doc.setFillColor(...rgb(CORAL));
  doc.rect(0, 0, 3.5, H, "F");

  // ════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════
  doc.setFillColor(255, 252, 249);
  doc.rect(3.5, 0, W - 3.5, 30, "F");

  doc.setFillColor(...rgb(CORAL));
  doc.circle(mx + 5.5, 13, 5.5, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(mx + 5.5, 13, 2, "F");
  doc.setTextColor(...rgb(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("factorial", mx + 14, 15.5);

  doc.setFontSize(11);
  doc.text(tr(data.companyName, 30), W - mx, 12, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...rgb(GRAY));
  doc.text(`${data.seats} emp  ·  ${emp} ICs  ·  ${mgr} Mgrs  ·  ${hrC} HR  ·  ${today}`, W - mx, 18, { align: "right" });

  doc.setFillColor(...rgb(CORAL));
  doc.rect(mx, 26, cw, 0.4, "F");

  y = 32;

  // ════════════════════════════════════════════
  // HERO — one dark banner, the executive summary
  // ════════════════════════════════════════════
  const heroH = 22;
  doc.setFillColor(...rgb(CORAL));
  doc.roundedRect(mx, y, cw, heroH, 3, 3, "F");
  grad(doc, mx, y + 1.5, cw, heroH - 1.5, rgb(DARK), rgb(DARK2));

  // ROI — THE number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...rgb(CORAL));
  doc.text(`${roiPct}%`, mx + 12, y + 16);
  doc.setFontSize(8);
  doc.setTextColor(...rgb(GRAY_S));
  doc.text("ROI", mx + 12, y + 6.5);

  // Single context line
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  const summary = `${eur(annSave)} savings  −  ${eur(cost)} cost  =  ${eur(net)} net/yr  ·  Payback ${payback.toFixed(1)} mo`;
  doc.text(summary, W - mx - 8, y + 13, { align: "right" });

  y += heroH + 8;

  // ════════════════════════════════════════════
  // KEY OPPORTUNITIES — 3 quote cards
  // ════════════════════════════════════════════
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(DARK));
  doc.text("Key Opportunities", mx, y + 2);
  y += 6;

  const cardW = (cw - 8) / 3;
  const cardH = nR > 10 ? 34 : 38;

  prio.forEach((pm, i) => {
    const px = mx + i * (cardW + 4);
    const cc = pm.color;

    doc.setFillColor(234, 234, 238);
    doc.roundedRect(px + 0.3, y + 0.4, cardW, cardH, 3, 3, "F");

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...rgb(LINE));
    doc.setLineWidth(0.25);
    doc.roundedRect(px, y, cardW, cardH, 3, 3, "FD");

    // Top color bar
    doc.setFillColor(...rgb(cc));
    doc.roundedRect(px, y, cardW, 2.5, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(px, y + 1.2, cardW, 2, "F");

    // Name + category inline
    doc.setTextColor(...rgb(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(tr(pm.label, 22), px + 5, y + 8);
    doc.setFontSize(4.8);
    doc.setTextColor(...rgb(cc));
    doc.text(pm.cat.toUpperCase(), px + 5, y + 11.5);

    // Quote
    if (pm.quote) {
      doc.setTextColor(...rgb(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(5.5);
      const maxLines = cardH > 36 ? 5 : 4;
      const ql = doc.splitTextToSize(`"${tr(pm.quote, 140)}"`, cardW - 10) as string[];
      doc.text(ql.slice(0, maxLines), px + 5, y + 16);
    }

    // Bottom — category bg
    const sY = y + cardH - 6;
    doc.setFillColor(...rgb(catBg(pm.id)));
    doc.roundedRect(px, sY, cardW, 6, 3, 3, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(px, sY, cardW, 0.8, "F");
    doc.setTextColor(...rgb(cc));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.text(`${pm.hrs.toFixed(0)}h/mo saved`, px + cardW / 2, sY + 4, { align: "center" });
  });

  y += cardH + 7;

  // ════════════════════════════════════════════
  // MODULE TABLE
  // ════════════════════════════════════════════
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(DARK));
  doc.text("Module Breakdown", mx, y + 2);
  y += 5.5;

  const aW = 2.5;
  const c1x = mx + aW + 2;
  const cCat = mx + cw * 0.50;
  const cHrs = mx + cw * 0.74;
  const cEur = mx + cw - 2;
  const thH = 7;

  doc.setFillColor(...rgb(DARK));
  doc.roundedRect(mx, y, cw, thH, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("MODULE", c1x, y + 4.8);
  doc.text("CATEGORY", cCat, y + 4.8);
  doc.text("HOURS/MO", cHrs, y + 4.8, { align: "right" });
  doc.text("€ SAVED/MO", cEur, y + 4.8, { align: "right" });
  y += thH + 0.3;

  rows.forEach((r, i) => {
    if (y > 268) { doc.addPage(); y = 10; doc.setFillColor(...rgb(CORAL)); doc.rect(0, 0, 3.5, H, "F"); }
    const isPrio = top3.has(r.id);

    if (isPrio) doc.setFillColor(...rgb(catBg(r.id)));
    else doc.setFillColor(i % 2 === 0 ? 251 : 255, i % 2 === 0 ? 251 : 255, i % 2 === 0 ? 253 : 255);
    doc.rect(mx, y, cw, rH, "F");

    doc.setFillColor(...rgb(r.color));
    doc.rect(mx, y, aW, rH, "F");

    const ty = y + rH / 2 + 0.8;
    doc.setTextColor(...rgb(DARK));
    doc.setFont("helvetica", isPrio ? "bold" : "normal");
    doc.setFontSize(6.2);
    doc.text(tr(r.label, 32), c1x, ty);

    doc.setFontSize(5.2);
    doc.setTextColor(...rgb(r.color));
    doc.setFont("helvetica", "bold");
    doc.text(r.cat, cCat, ty);

    doc.setTextColor(...rgb(GRAY));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(`${r.hrs.toFixed(1)}h`, cHrs, ty, { align: "right" });

    doc.setTextColor(...rgb(r.color));
    doc.setFont("helvetica", "bold");
    doc.text(eur(Math.round(r.money)), cEur, ty, { align: "right" });

    doc.setDrawColor(240, 240, 243);
    doc.setLineWidth(0.1);
    doc.line(mx + aW, y + rH, W - mx, y + rH);
    y += rH;
  });

  // Totals row
  y += 0.5;
  const trH = 8;
  doc.setFillColor(...rgb(DARK));
  doc.roundedRect(mx, y, cw, trH, 1.5, 1.5, "F");
  doc.setFillColor(...rgb(CORAL));
  doc.rect(mx, y, aW, trH, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("TOTAL", c1x, y + trH / 2 + 0.8);
  doc.text(`${totHrs.toFixed(0)}h`, cHrs, y + trH / 2 + 0.8, { align: "right" });
  doc.setTextColor(...rgb("#4ADE80"));
  doc.setFontSize(7);
  doc.text(`${eur(Math.round(totMoney))}/mo`, cEur, y + trH / 2 + 0.8, { align: "right" });

  // ════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════
  doc.setFillColor(...rgb(CORAL));
  doc.rect(0, 0, 3.5, H, "F");
  doc.setDrawColor(...rgb(LINE));
  doc.setLineWidth(0.15);
  doc.line(mx, H - 11, W - mx, H - 11);
  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY_S));
  doc.text("Prepared by Factorial · Confidential", mx, H - 7);
  doc.text(today, W - mx, H - 7, { align: "right" });

  return doc;
}
