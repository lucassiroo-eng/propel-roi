import jsPDF from "jspdf";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG, CATEGORY_COLORS } from "@/lib/moduleCatalog";
import { getEffectiveHours, getCountForEntry, MODULE_HOURS, type Stakeholder, type RoiMultipliers } from "@/lib/moduleHours";

// ── Factorial brand palette ──
const CORAL      = "#FF355E";
const CREAM      = "#FFF8F0";
const DARK       = "#1E1E2F";
const DARK2      = "#2D2B55";
const GRAY       = "#6B7280";
const GRAY_SOFT  = "#9CA3AF";
const GRAY_LINE  = "#E5E7EB";
const WHITE      = "#FFFFFF";
const GREEN      = "#059669";
const GREEN_BG   = "#ECFDF5";
const GREEN_BDR  = "#A7F3D0";
const RED        = "#DC2626";
const RED_BG     = "#FEF2F2";
const RED_BDR    = "#FECACA";
const PURPLE     = "#7C3AED";
const PURPLE_BG  = "#F5F3FF";

const CAT_BG: Record<string, string> = {
  "Core HR": "#F3F4F6", "Time": "#FFFBEB", "Payroll & Benefits": "#FFF7ED",
  "Talent": "#FFF1F2", "Finance": "#F0FDFA", "IT": "#F0FDFA",
  "AI": "#FFF1F2", "Integrations": "#EEF2FF",
};

function h(c: string): [number, number, number] {
  const s = c.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function eur(n: number): string { return "€" + Math.round(n).toLocaleString("es-ES"); }
function trunc(t: string, m: number): string { return t.length <= m ? t : t.substring(0, m - 1) + "…"; }

function catColor(id: string): string {
  const mod = MODULE_CATALOG.find(m => m.id === id);
  return mod?.color ?? CATEGORY_COLORS[mod?.category ?? ""] ?? GRAY;
}
function catName(id: string): string { return MODULE_CATALOG.find(m => m.id === id)?.category ?? ""; }
function catBg(id: string): string { return CAT_BG[catName(id)] ?? "#FAFAFA"; }

interface ModRow { moduleId: string; label: string; cat: string; color: string; hrs: number; money: number; }

export interface RoiPdfData {
  companyName: string; contactName: string; contactEmail: string; seats: number;
  headcounts: { employee: number; hr: number; manager: number };
  configModules: string[]; moduleSuggestions: ModuleSuggestion[];
  roiConfig: RoiConfig; bundleName: string; bundleAnnual: number; discountPct: number;
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
      rows.push({ moduleId: id, label: cat?.label ?? id, cat: catName(id), color: catColor(id), hrs: mh, money: mm });
    }
  }

  const totHrs = rows.reduce((s, r) => s + r.hrs, 0);
  const totMoney = rows.reduce((s, r) => s + r.money, 0);
  const annSave = totMoney * 12;
  const cost = data.bundleAnnual * (1 - data.discountPct / 100);
  const net = annSave - cost;
  const roiPct = cost > 0 ? (annSave / cost) * 100 : 0;
  const roiX = cost > 0 ? totMoney / (cost / 12) : 0;

  const sorted = [...rows].sort((a, b) => b.money - a.money);
  const top3 = new Set(sorted.slice(0, 3).map(r => r.moduleId));
  const prio = sorted.slice(0, 3).map(r => ({
    ...r, quote: data.moduleSuggestions.find(s => s.module_id === r.moduleId)?.quote ?? "",
  }));

  const { employee: emp, manager: mgr, hr: hrC } = data.headcounts;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Adaptive row sizing
  const nR = rows.length;
  const rH = nR > 12 ? 6.2 : nR > 9 ? 7 : 7.8;

  // ════════════════════════════════════════════
  // BACKGROUND — subtle warm wash at top
  // ════════════════════════════════════════════
  doc.setFillColor(255, 252, 249);
  doc.rect(0, 0, W, 55, "F");

  // Left edge coral accent strip (3mm)
  doc.setFillColor(...h(CORAL));
  doc.rect(0, 0, 3, H, "F");

  // ════════════════════════════════════════════
  // 1. HEADER
  // ════════════════════════════════════════════
  // Logo mark
  doc.setFillColor(...h(CORAL));
  doc.circle(mx + 7, 16, 7, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(mx + 7, 16, 2.5, "F");

  doc.setTextColor(...h(DARK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("factorial", mx + 17, 19);

  // Company block (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(trunc(data.companyName, 30), W - mx, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...h(GRAY));
  doc.text("ROI Analysis", W - mx, 21, { align: "right" });
  if (data.contactEmail) {
    doc.setFontSize(6.5);
    doc.text(trunc(data.contactEmail, 40), W - mx, 26, { align: "right" });
  }

  // Employee breakdown below logo
  doc.setFontSize(7);
  doc.setTextColor(...h(GRAY_SOFT));
  doc.text(`${data.seats} employees  ·  ${emp} ICs  ·  ${mgr} Managers  ·  ${hrC} HR`, mx, 30);

  // Thin coral line separator
  doc.setFillColor(...h(CORAL));
  doc.rect(mx, 35, cw, 0.6, "F");

  y = 40;

  // ════════════════════════════════════════════
  // 2. KPI HERO CARDS
  // ════════════════════════════════════════════
  const kW = (cw - 10) / 3;
  const kH = 32;

  const kpis: { label: string; val: string; color: string; bg: string; bdr: string }[] = [
    { label: "ANNUAL SAVINGS", val: eur(annSave), color: GREEN, bg: GREEN_BG, bdr: GREEN_BDR },
    { label: "SYSTEM COST", val: `${eur(cost)}/yr`, color: "#EA580C", bg: "#FFF7ED", bdr: "#FED7AA" },
    { label: "ROI", val: `${roiPct.toFixed(0)}%`, color: PURPLE, bg: PURPLE_BG, bdr: "#DDD6FE" },
  ];

  kpis.forEach((k, i) => {
    const x = mx + i * (kW + 5);

    // Shadow
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(x + 0.5, y + 0.8, kW, kH, 4, 4, "F");

    // Card body
    doc.setFillColor(...h(k.bg));
    doc.setDrawColor(...h(k.bdr));
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, kW, kH, 4, 4, "FD");

    // Wide colored top bar (full width, clipped to rounded)
    doc.setFillColor(...h(k.color));
    doc.roundedRect(x, y, kW, 4, 4, 4, "F");
    doc.setFillColor(...h(k.bg));
    doc.rect(x, y + 2.5, kW, 2, "F");

    // Label
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...h(GRAY_SOFT));
    doc.text(k.label, x + kW / 2, y + 11, { align: "center" });

    // Value — BIG
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...h(k.color));
    doc.text(k.val, x + kW / 2, y + 25, { align: "center" });
  });

  y += kH + 8;

  // ════════════════════════════════════════════
  // 3. PRIORITY MODULES (3 cards)
  // ════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...h(DARK));
  doc.text("Priority Modules", mx, y + 2);
  y += 6;

  const cW = (cw - 8) / 3;
  const cH = 44;

  prio.forEach((pm, i) => {
    const cx = mx + i * (cW + 4);
    const cc = pm.color;
    const cb = catBg(pm.moduleId);

    // Shadow
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(cx + 0.4, y + 0.6, cW, cH, 3.5, 3.5, "F");

    // Card body
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...h(GRAY_LINE));
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cW, cH, 3.5, 3.5, "FD");

    // Top accent bar (category color)
    doc.setFillColor(...h(cc));
    doc.roundedRect(cx, y, cW, 3.5, 3.5, 3.5, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y + 2, cW, 2, "F");

    // Rank circle
    doc.setFillColor(...h(cc));
    doc.circle(cx + 8, y + 9, 3.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(String(i + 1), cx + 8, y + 10.3, { align: "center" });

    // Module name
    doc.setTextColor(...h(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(trunc(pm.label, 19), cx + 14, y + 10);

    // Category tag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    doc.setTextColor(...h(cc));
    doc.text(pm.cat.toUpperCase(), cx + 14, y + 14);

    // Stats
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...h(cc));
    doc.text(`${pm.hrs.toFixed(0)}h/mo · ${eur(pm.money)}/mo`, cx + 6, y + 20);

    // Thin divider
    doc.setDrawColor(...h(cc));
    doc.setLineWidth(0.15);
    doc.line(cx + 6, y + 22, cx + cW - 6, y + 22);

    // Quote
    if (pm.quote) {
      doc.setTextColor(...h(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(5.5);
      const ql = doc.splitTextToSize(`“${trunc(pm.quote, 110)}”`, cW - 12) as string[];
      doc.text(ql.slice(0, 3), cx + 6, y + 26);
    }

    // Bottom value strip
    const sH = 10;
    const sY = y + cH - sH;
    doc.setFillColor(...h(cb));
    doc.roundedRect(cx, sY, cW, sH, 3.5, 3.5, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, sY, cW, 1.5, "F");

    doc.setTextColor(...h(cc));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`${eur(pm.money)}/mo`, cx + cW / 2, sY + 7.5, { align: "center" });
  });

  y += cH + 8;

  // ════════════════════════════════════════════
  // 4. MODULE TABLE
  // ════════════════════════════════════════════
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...h(DARK));
  doc.text("Full Module Breakdown", mx, y + 2);
  y += 6;

  const aW = 3;
  const c1 = mx + aW + 3;
  const cHr = mx + cw * 0.72;
  const cEu = mx + cw - 3;
  const thH = 8;

  // Header
  doc.setFillColor(...h(DARK));
  doc.roundedRect(mx, y, cw, thH, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("MODULE", c1, y + 5.2);
  doc.text("HOURS/MO", cHr, y + 5.2, { align: "right" });
  doc.text("€ RETURN/MO", cEu, y + 5.2, { align: "right" });
  y += thH + 0.5;

  rows.forEach((r, i) => {
    if (y > 268) { doc.addPage(); y = 12; }
    const isPrio = top3.has(r.moduleId);

    // Row bg
    if (isPrio) {
      doc.setFillColor(...h(catBg(r.moduleId)));
    } else {
      doc.setFillColor(i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 252 : 255, i % 2 === 0 ? 254 : 255);
    }
    doc.rect(mx, y, cw, rH, "F");

    // Category accent bar
    doc.setFillColor(...h(r.color));
    doc.rect(mx, y, aW, rH, "F");

    // Module name
    doc.setTextColor(...h(DARK));
    doc.setFont("helvetica", isPrio ? "bold" : "normal");
    doc.setFontSize(6.8);
    doc.text(trunc(r.label, 36), c1, y + rH / 2 + 1);

    // Hours
    doc.setTextColor(...h(GRAY));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(`${r.hrs.toFixed(1)}h`, cHr, y + rH / 2 + 1, { align: "right" });

    // € in category color
    doc.setTextColor(...h(r.color));
    doc.setFont("helvetica", "bold");
    doc.text(eur(Math.round(r.money)), cEu, y + rH / 2 + 1, { align: "right" });

    // Separator
    doc.setDrawColor(240, 240, 243);
    doc.setLineWidth(0.15);
    doc.line(mx + aW, y + rH, W - mx, y + rH);

    y += rH;
  });

  y += 3;

  // ════════════════════════════════════════════
  // 5. TOTALS BAR
  // ════════════════════════════════════════════
  if (y > 260) { doc.addPage(); y = 12; }
  const tH = 16;

  // Dark-to-purple via stepped rects
  const nSteps = 40;
  const sW = cw / nSteps;
  const dc = h(DARK), pc = h(DARK2);
  for (let i = 0; i < nSteps; i++) {
    const t = i / (nSteps - 1);
    doc.setFillColor(
      Math.round(dc[0] + (pc[0] - dc[0]) * t),
      Math.round(dc[1] + (pc[1] - dc[1]) * t),
      Math.round(dc[2] + (pc[2] - dc[2]) * t),
    );
    doc.rect(mx + i * sW, y, sW + 0.3, tH, "F");
  }
  // Clean round corners by overlaying white arcs
  // top-left
  doc.setFillColor(255, 255, 255);
  doc.rect(mx, y, 4, 4, "F");
  doc.setFillColor(...dc);
  doc.circle(mx + 4, y + 4, 4, "F");
  doc.rect(mx + 4, y, 4, 4, "F");
  doc.rect(mx, y + 4, 4, 4, "F");
  // top-right
  doc.setFillColor(255, 255, 255);
  doc.rect(mx + cw - 4, y, 4, 4, "F");
  doc.setFillColor(...pc);
  doc.circle(mx + cw - 4, y + 4, 4, "F");
  doc.rect(mx + cw - 8, y, 4, 4, "F");
  doc.rect(mx + cw - 4, y + 4, 4, 4, "F");
  // bottom-left
  doc.setFillColor(255, 255, 255);
  doc.rect(mx, y + tH - 4, 4, 4, "F");
  doc.setFillColor(...dc);
  doc.circle(mx + 4, y + tH - 4, 4, "F");
  doc.rect(mx + 4, y + tH - 4, 4, 4, "F");
  doc.rect(mx, y + tH - 8, 4, 4, "F");
  // bottom-right
  doc.setFillColor(255, 255, 255);
  doc.rect(mx + cw - 4, y + tH - 4, 4, 4, "F");
  doc.setFillColor(...pc);
  doc.circle(mx + cw - 4, y + tH - 4, 4, "F");
  doc.rect(mx + cw - 8, y + tH - 4, 4, 4, "F");
  doc.rect(mx + cw - 4, y + tH - 8, 4, 4, "F");

  // Coral highlight line at top
  doc.setFillColor(...h(CORAL));
  doc.rect(mx + 4, y, cw - 8, 1.2, "F");

  doc.setTextColor(255, 255, 255);

  // Bundle price
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("BUNDLE PRICE/YR", mx + 8, y + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(eur(cost), mx + 8, y + 12.5);

  // Total return
  const mid = mx + cw * 0.42;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("TOTAL RETURN/MO", mid, y + 5.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...h("#4ADE80"));
  doc.text(`${totHrs.toFixed(0)}h · ${eur(Math.round(totMoney))}`, mid, y + 12.5, { align: "center" });

  // ROI
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("ROI", mx + cw - 8, y + 5.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...h(CORAL));
  doc.text(`${roiX.toFixed(1)}x`, mx + cw - 8, y + 13.5, { align: "right" });

  y += tH + 7;

  // ════════════════════════════════════════════
  // 6. NET BENEFIT PILLS
  // ════════════════════════════════════════════
  if (y > 262) { doc.addPage(); y = 12; }

  const pW = (cw - 10) / 3;
  const pH = 22;
  const pills: { label: string; val: string; color: string; bg: string; bdr: string }[] = [
    { label: "Ahorros anuales", val: eur(annSave), color: GREEN, bg: GREEN_BG, bdr: GREEN_BDR },
    { label: "Coste anual", val: `-${eur(cost)}`, color: RED, bg: RED_BG, bdr: RED_BDR },
    { label: "Beneficio neto", val: `${eur(net)}/yr`, color: net >= 0 ? GREEN : RED, bg: net >= 0 ? GREEN_BG : RED_BG, bdr: net >= 0 ? GREEN_BDR : RED_BDR },
  ];

  pills.forEach((p, i) => {
    const px = mx + i * (pW + 5);

    // Shadow
    doc.setFillColor(232, 232, 238);
    doc.roundedRect(px + 0.4, y + 0.6, pW, pH, 4, 4, "F");

    doc.setFillColor(...h(p.bg));
    doc.setDrawColor(...h(p.bdr));
    doc.setLineWidth(0.5);
    doc.roundedRect(px, y, pW, pH, 4, 4, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...h(GRAY_SOFT));
    doc.text(p.label, px + pW / 2, y + 7, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...h(p.color));
    doc.text(p.val, px + pW / 2, y + 17.5, { align: "center" });
  });

  // ════════════════════════════════════════════
  // 7. FOOTER
  // ════════════════════════════════════════════
  doc.setDrawColor(...h(GRAY_LINE));
  doc.setLineWidth(0.2);
  doc.line(mx, H - 13, W - mx, H - 13);

  // Left edge continues to footer
  doc.setFillColor(...h(CORAL));
  doc.rect(0, 0, 3, H, "F");

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...h(GRAY_SOFT));
  doc.text("Prepared by Factorial · Confidential", mx, H - 8);
  doc.text(today, W - mx, H - 8, { align: "right" });

  return doc;
}
