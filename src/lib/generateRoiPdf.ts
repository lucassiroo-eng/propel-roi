import jsPDF from "jspdf";
import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG, CATEGORY_COLORS } from "@/lib/moduleCatalog";
import { getEffectiveHours, getCountForEntry, MODULE_HOURS, type Stakeholder, type RoiMultipliers } from "@/lib/moduleHours";

// ── Palette from spec ──
const PINK    = "#FF4F7B";
const PURPLE  = "#4C1FD4";
const GREEN   = "#00C98D";
const DARK    = "#111827";
const GRAY    = "#6B7280";
const GRAY_L  = "#9CA3AF";
const BLUSH   = "#FFF2F5";
const BLUSH_B = "#FFCCD8";
const GREEN_BG = "#E6FAF5";
const GREEN_BD = "#B2EDD8";
const ROW_ALT = "#F9FAFB";
const LINE_C  = "#EFEFEF";

function rgb(c: string): [number, number, number] {
  const s = c.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function eur(n: number): string { return "€" + Math.round(n).toLocaleString("es-ES"); }
function tr(t: string, m: number): string { return t.length <= m ? t : t.substring(0, m - 1) + "…"; }
function catColor(id: string): string { const m = MODULE_CATALOG.find(x => x.id === id); return m?.color ?? CATEGORY_COLORS[m?.category ?? ""] ?? GRAY; }
function catName(id: string): string { return MODULE_CATALOG.find(x => x.id === id)?.category ?? ""; }

function grad(doc: jsPDF, x: number, y: number, w: number, ht: number, c1: [number,number,number], c2: [number,number,number]) {
  const n = 60, sw = w / n;
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

interface ModRow { id: string; label: string; cat: string; color: string; hrs: number; money: number; }

export interface RoiPdfData {
  companyName: string; contactName: string; contactEmail: string; seats: number;
  headcounts: { employee: number; hr: number; manager: number };
  configModules: string[]; moduleSuggestions: ModuleSuggestion[];
  roiConfig: RoiConfig; bundleName: string; bundleAnnual: number; discountPct: number;
}

export function generateRoiPdf(data: RoiPdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, H = 297, mx = 14, cw = W - mx * 2;
  let y = 0;

  const mults: RoiMultipliers = {
    headcounts: data.headcounts,
    onboardings_per_year: data.roiConfig.onboardings_per_year,
    expense_submitters: data.roiConfig.expense_submitters,
  };

  // ── Compute rows ──
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

  const totMoney = rows.reduce((s, r) => s + r.money, 0);
  const annSave = totMoney * 12;
  const cost = data.bundleAnnual * (1 - data.discountPct / 100);
  const net = annSave - cost;
  const roiPct = cost > 0 ? Math.round((net / cost) * 100) : 0;

  const sorted = [...rows].sort((a, b) => b.money - a.money);
  const top3 = sorted.slice(0, 3);
  const top3Ids = new Set(top3.map(r => r.id));
  const prio = top3.map(r => ({
    ...r, quote: data.moduleSuggestions.find(s => s.module_id === r.id)?.quote ?? "",
  }));
  const other = sorted.slice(3);

  const { employee: emp, manager: mgr, hr: hrC } = data.headcounts;
  const seats = data.seats;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  // ════════════════════════════════════════════
  // S1 — HEADER BAND (28mm ≈ 80pt)
  // ════════════════════════════════════════════
  const hdrH = 28;
  grad(doc, 0, 0, W, hdrH, rgb(PINK), rgb(PURPLE));
  // Dark pink accent line at bottom
  doc.setFillColor(...rgb("#D63A62"));
  doc.rect(0, hdrH, W, 0.7, "F");

  // Left: "Factorial" wordmark
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Factorial", mx, 13);

  // Tagline
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 220, 230);
  doc.text("HR · Payroll · People Operations", mx, 18);

  // Right: company + meta
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(tr(data.companyName, 28), W - mx, 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 220, 230);
  doc.text("ROI Analysis · Confidential", W - mx, 17, { align: "right" });
  if (data.contactName || data.contactEmail) {
    doc.setFontSize(6.5);
    const contactLine = [data.contactName, data.contactEmail].filter(Boolean).join(" · ");
    doc.text(tr(contactLine, 50), W - mx, 22, { align: "right" });
  }

  y = hdrH + 0.7;

  // ════════════════════════════════════════════
  // S2 — HERO STRIP (34mm ≈ 98pt)
  // ════════════════════════════════════════════
  const heroH = 30;
  doc.setFillColor(...rgb(BLUSH));
  doc.rect(0, y, W, heroH, "F");
  doc.setDrawColor(...rgb(BLUSH_B));
  doc.setLineWidth(0.3);
  doc.line(0, y + heroH, W, y + heroH);

  // Left: pill badges
  const pills = [`${seats} employees`, `${emp} ICs`, `${mgr} Managers`, `${hrC} HR Staff`];
  let px = mx;
  const pillY = y + 8;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  pills.forEach(label => {
    const tw = doc.getTextWidth(label);
    const pw = tw + 6;
    if (px + pw > mx + cw * 0.36) return;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...rgb(PINK));
    doc.setLineWidth(0.4);
    doc.roundedRect(px, pillY, pw, 5.5, 2.5, 2.5, "FD");
    doc.setTextColor(...rgb(PINK));
    doc.text(label, px + 3, pillY + 3.8);
    px += pw + 2.5;
  });

  // Center: net benefit
  const cx = W / 2;
  doc.setTextColor(...rgb(GREEN));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(`${eur(net)}/yr`, cx, y + 14, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY));
  doc.text("net benefit / year", cx, y + 19.5, { align: "center" });

  // Right: ROI %
  doc.setTextColor(...rgb(PINK));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text(`${roiPct}%`, W - mx, y + 16, { align: "right" });
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(GRAY));
  doc.text("PROJECTED ROI", W - mx, y + 21, { align: "right" });

  y += heroH + 1;

  // ════════════════════════════════════════════
  // S3 — INTRO BOX
  // ════════════════════════════════════════════
  const introText = `Factorial's internal consulting team has prepared a personalized ROI analysis for ${data.companyName}, based on ${seats} employees (${emp} ICs · ${mgr} Managers · ${hrC} HR Staff). The study identifies the highest-impact modules and quantifies time and cost savings per stakeholder.`;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const introLines = doc.splitTextToSize(introText, cw - 10) as string[];
  const introH = introLines.length * 3.8 + 5;

  doc.setFillColor(...rgb(BLUSH));
  doc.setDrawColor(...rgb(BLUSH_B));
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, cw, introH, 2, 2, "FD");
  // Left accent bar
  doc.setFillColor(...rgb(PINK));
  doc.rect(mx, y, 1.2, introH, "F");

  doc.setTextColor(...rgb(DARK));
  doc.text(introLines, mx + 5, y + 4);
  y += introH + 4;

  // ════════════════════════════════════════════
  // S4 — PRIORITY MODULES (3 cards)
  // ════════════════════════════════════════════
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(PINK));
  doc.text("PRIORITY MODULES", mx, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY));
  doc.text(" — Strongest pain signals from discovery", mx + doc.getTextWidth("PRIORITY MODULES") + 1, y + 3);
  y += 6;

  const cardGap = 4;
  const cardW = (cw - cardGap * 2) / 3;
  const stripH = 9;

  // Pre-measure card heights (snug to quote)
  const cardMeta: { lines: string[]; cardH: number }[] = prio.map(pm => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    const ql = pm.quote ? doc.splitTextToSize(`"${tr(pm.quote, 150)}"`, cardW - 8) as string[] : [];
    const quoteH = ql.length * 3.2;
    const cardH = 2 + 12 + 1 + quoteH + 3 + stripH;
    return { lines: ql, cardH };
  });
  const maxCardH = Math.max(...cardMeta.map(m => m.cardH), 38);

  prio.forEach((pm, i) => {
    const cx = mx + i * (cardW + cardGap);
    const { lines: ql } = cardMeta[i];

    // Card body
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...rgb(BLUSH_B));
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, maxCardH, 2, 2, "FD");

    // Pink top bar
    doc.setFillColor(...rgb(PINK));
    doc.roundedRect(cx, y, cardW, 2, 2, 2, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, y + 1, cardW, 1.5, "F");

    // Number circle + module name
    const circY = y + 7;
    doc.setFillColor(...rgb(PINK));
    doc.circle(cx + 6, circY, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(String(i + 1), cx + 6, circY + 1.3, { align: "center" });

    doc.setTextColor(...rgb(DARK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(tr(pm.label, 18), cx + 12, circY + 1.3);

    // Divider
    const divY = y + 12.5;
    doc.setDrawColor(...rgb(PINK));
    doc.setLineWidth(0.2);
    doc.line(cx + 3, divY, cx + cardW - 3, divY);

    // Quote
    if (ql.length > 0) {
      doc.setTextColor(...rgb(GRAY));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text(ql, cx + 4, divY + 4);
    }

    // Bottom strip — hours ONLY here
    const sY = y + maxCardH - stripH;
    doc.setFillColor(...rgb(BLUSH));
    doc.roundedRect(cx, sY, cardW, stripH, 2, 2, "F");
    doc.setFillColor(255, 255, 255);
    doc.rect(cx, sY, cardW, 1, "F");
    doc.setDrawColor(...rgb(BLUSH_B));
    doc.setLineWidth(0.2);
    doc.line(cx, sY + 0.5, cx + cardW, sY + 0.5);

    doc.setTextColor(...rgb(PINK));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`${pm.hrs.toFixed(0)}h saved / month`, cx + cardW / 2, sY + 6, { align: "center" });
  });

  y += maxCardH + 5;

  // ════════════════════════════════════════════
  // S5 — MODULE TABLE (2 columns: Module + € Return/mo)
  // ════════════════════════════════════════════
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rgb(PINK));
  doc.text("FULL MODULE BREAKDOWN", mx, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY));
  doc.text(" — Complete savings analysis", mx + doc.getTextWidth("FULL MODULE BREAKDOWN") + 1, y + 3);
  y += 6;

  const colMod = mx;
  const colModW = cw * 0.72;
  const colEur = mx + cw;
  const thH = 7;
  const rowH = 8;
  const accentW = 1.2;

  // Header row
  doc.setFillColor(...rgb(PINK));
  doc.roundedRect(mx, y, cw, thH, 1.5, 1.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Module", mx + 5, y + 4.8);
  doc.text("€ Return / mo", colEur - 3, y + 4.8, { align: "right" });
  y += thH;

  // All rows (priority first, then others)
  const allRows = [...top3, ...other];
  allRows.forEach((r, i) => {
    if (y > 270) { doc.addPage(); y = 10; }
    const isPrio = top3Ids.has(r.id);

    // Row bg
    if (isPrio) {
      doc.setFillColor(...rgb(BLUSH));
    } else {
      const alt = rgb(ROW_ALT);
      doc.setFillColor(i % 2 === 0 ? 255 : alt[0], i % 2 === 0 ? 255 : alt[1], i % 2 === 0 ? 255 : alt[2]);
    }
    doc.rect(mx, y, cw, rowH, "F");

    // Priority accent bar
    if (isPrio) {
      doc.setFillColor(...rgb(PINK));
      doc.rect(mx, y, accentW, rowH, "F");
    }

    // Row divider
    doc.setDrawColor(...rgb(LINE_C));
    doc.setLineWidth(0.1);
    doc.line(mx, y + rowH, mx + cw, y + rowH);

    const ty = y + rowH / 2 + 1;

    // Module name
    doc.setTextColor(...rgb(DARK));
    doc.setFont("helvetica", isPrio ? "bold" : "normal");
    doc.setFontSize(isPrio ? 7.5 : 7);
    doc.text(tr(r.label, 40), mx + (isPrio ? 4 : 5), ty);

    // € Return in green — appears ONLY here
    doc.setTextColor(...rgb(GREEN));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isPrio ? 7.5 : 7);
    doc.text(eur(Math.round(r.money)), colEur - 3, ty, { align: "right" });

    y += rowH;
  });

  // ════════════════════════════════════════════
  // S6 — TOTALS ROW (19mm ≈ 54pt, solid pink)
  // ════════════════════════════════════════════
  if (y > 264) { doc.addPage(); y = 10; }

  const totH = 16;
  doc.setFillColor(...rgb(PINK));
  doc.roundedRect(mx, y, cw, totH, 2, 2, "F");

  // Left: bundle price
  doc.setTextColor(255, 210, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Bundle price", mx + 6, y + 5);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${eur(cost)}/yr`, mx + 6, y + 12);

  // Right: total return/mo
  doc.setTextColor(255, 210, 220);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Total return / mo", cw + mx - 6, y + 5, { align: "right" });
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${eur(Math.round(totMoney))}/mo`, cw + mx - 6, y + 12, { align: "right" });

  y += totH + 4;

  // ════════════════════════════════════════════
  // S7 — EQUATION LINE (18mm ≈ 50pt)
  // ════════════════════════════════════════════
  if (y > 270) { doc.addPage(); y = 10; }

  const eqH = 12;
  doc.setFillColor(...rgb(GREEN_BG));
  doc.setDrawColor(...rgb(GREEN_BD));
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, cw, eqH, 2, 2, "FD");

  // Build equation centered
  const eqParts = [
    { text: `${eur(annSave)}/yr savings`, color: GREEN, bold: true },
    { text: "  −  ", color: GRAY, bold: false },
    { text: `${eur(cost)} cost`, color: DARK, bold: true },
    { text: "  =  ", color: GRAY, bold: false },
    { text: `${eur(net)} net benefit/yr`, color: "#047857", bold: true },
  ];

  // Measure total width
  let totalW = 0;
  eqParts.forEach(p => {
    doc.setFont("helvetica", p.bold ? "bold" : "normal");
    doc.setFontSize(p.bold && p.color === "#047857" ? 8.5 : 7.5);
    totalW += doc.getTextWidth(p.text);
  });

  let eqX = mx + (cw - totalW) / 2;
  const eqY = y + eqH / 2 + 1.2;
  eqParts.forEach(p => {
    doc.setFont("helvetica", p.bold ? "bold" : "normal");
    doc.setFontSize(p.bold && p.color === "#047857" ? 8.5 : 7.5);
    doc.setTextColor(...rgb(p.color));
    doc.text(p.text, eqX, eqY);
    eqX += doc.getTextWidth(p.text);
  });

  // ════════════════════════════════════════════
  // S8 — FOOTER
  // ════════════════════════════════════════════
  doc.setDrawColor(...rgb(BLUSH_B));
  doc.setLineWidth(0.2);
  doc.line(mx, H - 10, W - mx, H - 10);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...rgb(GRAY_L));
  doc.text("Prepared by Factorial · Confidential · Internal use only", mx, H - 6.5);
  doc.text(today, W - mx, H - 6.5, { align: "right" });

  return doc;
}
