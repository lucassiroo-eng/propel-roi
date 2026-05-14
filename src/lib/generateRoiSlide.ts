import type { RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { moduleLabel } from "@/lib/offeringEngine";
import {
  getEffectiveHours, getCountForEntry, MODULE_HOURS, SAVINGS_DESCRIPTIONS,
  type Stakeholder, type RoiMultipliers,
} from "@/lib/moduleHours";

const PILL_COLORS = ["#4B5563", "#F97316", "#0F766E", "#E11D48", "#DB2777", "#059669", "#7C3AED", "#C026D3"];

function fmtEur(n: number): string {
  const rounded = Math.round(n);
  const s = Math.abs(rounded).toString();
  let result = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) result += ".";
    result += s[i];
  }
  return (rounded < 0 ? "-€" : "€") + result;
}

const FACTORIAL_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 28" width="120" height="28"><text x="0" y="22" font-family="Inter,sans-serif" font-weight="800" font-size="22" fill="#FF355E">factorial</text></svg>`;

const FACTORIAL_LOGO_DATA_URI = "data:image/svg+xml," + encodeURIComponent(FACTORIAL_LOGO_SVG);

function fmtDate(lang: string): string {
  const d = new Date();
  const months: Record<string, string[]> = {
    es: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
    en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
    fr: ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],
  };
  const m = (months[lang] ?? months.es)[d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
}

export interface RoiSlideInput {
  companyName: string;
  companyLogoUrl?: string;
  country: string;
  language: string;
  configModules: string[];
  roiConfig: RoiConfig;
  annualCost: number;
}

export interface RoiSlideModule {
  id: string;
  name: string;
  hours_per_month: number;
  annual_savings: number;
}

export interface RoiSlideHighlight {
  module_name: string;
  benefit: string;
}

export interface RoiSlideData {
  company_name: string;
  company_logo_url?: string;
  date: string;
  language: string;
  modules: RoiSlideModule[];
  total_hours: number;
  total_annual_savings: number;
  annual_cost: number;
  roi_percent: number;
  payback_months: number;
  highlights: RoiSlideHighlight[];
  total_employees: number;
  hr_count: number;
  manager_count: number;
  onboardings: number;
}

export function buildRoiSlideData(input: RoiSlideInput): RoiSlideData {
  const { roiConfig, configModules, annualCost } = input;
  const { headcounts, hourly_costs } = roiConfig;
  const multipliers: RoiMultipliers = {
    headcounts,
    onboardings_per_year: roiConfig.onboardings_per_year,
    expense_submitters: roiConfig.expense_submitters,
  };

  const modules: RoiSlideModule[] = [];
  let totalHours = 0;
  let totalSavings = 0;

  for (const modId of configModules) {
    const hours = getEffectiveHours(modId, roiConfig.hours_overrides);
    let modHours = 0;
    let modMoney = 0;
    for (const s of ["employee", "hr", "manager"] as Stakeholder[]) {
      const entry = MODULE_HOURS.find(e => e.module_id === modId && e.stakeholder === s);
      const count = entry ? getCountForEntry(entry, multipliers) : headcounts[s];
      const h = hours[s] * count;
      modHours += h;
      modMoney += h * hourly_costs[s];
    }
    if (modHours > 0) {
      const catalog = MODULE_CATALOG.find(m => m.id === modId);
      modules.push({
        id: modId,
        name: catalog?.label ?? moduleLabel(modId),
        hours_per_month: Math.round(modHours),
        annual_savings: Math.round(modMoney * 12),
      });
      totalHours += modHours;
      totalSavings += modMoney * 12;
    }
  }

  const roiPercent = annualCost > 0 ? Math.round(((totalSavings - annualCost) / annualCost) * 100) : 0;
  const paybackMonths = totalSavings > 0 ? Math.max(1, Math.round((annualCost / totalSavings) * 12)) : 0;

  const highlights: RoiSlideHighlight[] = [...modules]
    .sort((a, b) => b.annual_savings - a.annual_savings)
    .slice(0, 3)
    .map(m => {
      const desc = SAVINGS_DESCRIPTIONS[m.id];
      const raw = desc?.hr ?? desc?.employee ?? desc?.manager ?? "";
      const firstSentence = raw.split(/\.\s/)[0];
      const benefit = firstSentence.length > 90
        ? firstSentence.substring(0, 87) + "..."
        : firstSentence + (firstSentence.endsWith(".") ? "" : ".");
      return { module_name: m.name, benefit };
    })
    .filter(h => h.benefit.length > 1);

  return {
    company_name: input.companyName,
    company_logo_url: input.companyLogoUrl,
    date: fmtDate(input.language),
    language: input.language,
    modules,
    total_hours: Math.round(totalHours),
    total_annual_savings: Math.round(totalSavings),
    annual_cost: Math.round(annualCost),
    roi_percent: roiPercent,
    payback_months: paybackMonths,
    highlights,
    total_employees: headcounts.employee,
    hr_count: headcounts.hr,
    manager_count: headcounts.manager,
    onboardings: roiConfig.onboardings_per_year ?? 0,
  };
}

export function generateUserPrompt(data: RoiSlideData): string {
  return JSON.stringify(data, null, 2);
}

export function generateRoiSlideHtml(data: RoiSlideData): string {
  const lang = data.language ?? "es";
  const i18n: Record<string, Record<string, string>> = {
    es: {
      title_prefix: "ROI esperado de",
      subtitle_prefix: "Análisis de retorno de inversión para",
      col_modules: "Módulos",
      col_hours: "Horas / mes",
      col_savings: "Ahorro / año",
      total_label: "Ahorro Total",
      kpi_savings: "Total Ahorros Anuales",
      kpi_cost: "Coste Anual de Factorial",
      kpi_roi: "ROI Anual",
      payback: "retorno en",
      months: "meses",
      highlights_title: "Impacto por módulo",
      footer: `Estimación basada en un estudio de la consultoría interna de Factorial, contando con ${data.total_employees} usuarios, ${data.hr_count} administrador${data.hr_count > 1 ? "es" : ""} de RRHH, ${data.manager_count} gerentes y ${data.onboardings} altas al año.`,
    },
    en: {
      title_prefix: "Expected ROI of",
      subtitle_prefix: "ROI analysis for",
      col_modules: "Modules",
      col_hours: "Hours / month",
      col_savings: "Savings / year",
      total_label: "Total Savings",
      kpi_savings: "Total Annual Savings",
      kpi_cost: "Annual Factorial Cost",
      kpi_roi: "Annual ROI",
      payback: "payback in",
      months: "months",
      highlights_title: "Impact per module",
      footer: `Estimate based on Factorial's internal consulting study, with ${data.total_employees} users, ${data.hr_count} HR admin${data.hr_count > 1 ? "s" : ""}, ${data.manager_count} managers and ${data.onboardings} annual hires.`,
    },
    fr: {
      title_prefix: "ROI attendu de",
      subtitle_prefix: "Analyse du retour sur investissement pour",
      col_modules: "Modules",
      col_hours: "Heures / mois",
      col_savings: "Économies / an",
      total_label: "Économies Totales",
      kpi_savings: "Économies Annuelles Totales",
      kpi_cost: "Coût Annuel Factorial",
      kpi_roi: "ROI Annuel",
      payback: "retour en",
      months: "mois",
      highlights_title: "Impact par module",
      footer: `Estimation basée sur une étude du cabinet interne de Factorial, avec ${data.total_employees} utilisateurs, ${data.hr_count} administrateur${data.hr_count > 1 ? "s" : ""} RH, ${data.manager_count} managers et ${data.onboardings} recrutements par an.`,
    },
  };
  const t = i18n[lang] ?? i18n.es;

  const mc = data.modules.length;
  const rowPad = mc <= 3 ? 16 : mc <= 5 ? 12 : mc <= 7 ? 9 : 7;
  const pillPadV = mc <= 3 ? 9 : mc <= 5 ? 7 : 5;
  const pillPadH = mc <= 3 ? 20 : mc <= 5 ? 17 : 14;
  const pillFont = mc <= 3 ? 15 : mc <= 5 ? 14 : 12;
  const cellFont = mc <= 3 ? 18 : mc <= 5 ? 16 : 15;
  const dotSize = mc <= 3 ? 8 : 6;
  const totalFont = mc <= 3 ? 24 : mc <= 5 ? 22 : 20;
  const totalLabelFont = mc <= 3 ? 17 : mc <= 5 ? 16 : 15;

  const moduleRows = data.modules.map((m, i) => {
    const color = PILL_COLORS[i % PILL_COLORS.length];
    return `          <tr>
            <td><span class="pill" style="background:${color};"><span class="dot"></span>${escHtml(m.name)}</span></td>
            <td>${m.hours_per_month}h</td>
            <td>${fmtEur(m.annual_savings)}</td>
          </tr>`;
  }).join("\n");

  const highlightCards = data.highlights.map((h, i) => {
    const color = PILL_COLORS[i % PILL_COLORS.length];
    return `      <div class="quote-card" style="border-color: ${color};">
        <div class="quote-icon" style="background:${color};">&#x2713;</div>
        <div class="quote-body">
          <div class="quote-text"><span class="who">${escHtml(h.module_name)}</span></div>
          <span class="quote-action" style="color: ${color};">${escHtml(h.benefit)}</span>
        </div>
      </div>`;
  }).join("\n\n");

  const brandHtml = data.company_logo_url
    ? `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${escHtml(data.company_logo_url)}" alt="${escHtml(data.company_name)}">
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_DATA_URI}" alt="Factorial">`
    : `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_DATA_URI}" alt="Factorial">`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1440">
<title>ROI Slide — ${escHtml(data.company_name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh; }

  .slide {
    width: 1440px; height: 810px; background: #fff; border-top: 4px solid #374151;
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto 1fr auto;
    overflow: hidden;
  }

  .header {
    grid-column: 1 / -1;
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 44px 18px 44px;
    border-bottom: 1px solid #F3F4F6;
  }
  .header-left .title { font-size: 34px; font-weight: 800; font-style: italic; color: #1F2937; line-height: 1.15; }
  .header-left .title .accent { color: #FF355E; }
  .header-left .subtitle { font-size: 13px; color: #6B7280; margin-top: 2px; font-weight: 500; }
  .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
  .header-date { font-size: 12px; color: #9CA3AF; font-weight: 500; }
  .header-brand { display: flex; align-items: center; gap: 14px; }
  .header-brand .company-name { font-size: 17px; font-weight: 700; color: #1F2937; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .header-brand .brand-divider { width: 1px; height: 24px; background: #D1D5DB; }
  .header-brand img { height: 22px; object-fit: contain; }

  .card-area {
    grid-row: 2 / 4;
    display: flex; flex-direction: column; justify-content: center; gap: 14px;
    padding: 24px 20px 24px 36px;
  }
  .kpi-card {
    background: linear-gradient(145deg, #FF355E 0%, #FF5C7F 100%);
    border-radius: 18px;
    padding: 20px 16px; text-align: center;
    flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
    box-shadow: 0 6px 20px rgba(255, 53, 94, 0.2);
    position: relative;
    overflow: hidden;
  }
  .kpi-card::before {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 80px; height: 80px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
  }
  .kpi-icon svg { width: 38px; height: 38px; fill: none; stroke: rgba(255,255,255,0.95); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .kpi-label { color: #fff; font-size: 17px; font-weight: 700; margin: 6px 0 10px 0; letter-spacing: 0.02em; }
  .kpi-value-box { background: #fff; border-radius: 12px; padding: 10px 28px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .kpi-value { color: #FF355E; font-size: 23px; font-weight: 800; white-space: nowrap; font-variant-numeric: tabular-nums; }

  .right-col {
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  .table-section {
    padding: 16px 44px 0 48px;
    flex: 1;
    display: flex; flex-direction: column; justify-content: center;
  }
  .module-table { width: 100%; border-collapse: collapse; }
  .module-table thead th {
    color: #9CA3AF; font-size: ${mc <= 5 ? 12 : 10}px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0 ${mc <= 5 ? 14 : 10}px 0; text-align: left;
    border-bottom: 1px solid #F3F4F6;
  }
  .module-table thead th:nth-child(2) { text-align: center; width: 120px; }
  .module-table thead th:nth-child(3) { text-align: right; width: 120px; }

  .module-table tbody tr { transition: background 0.15s; }
  .module-table tbody tr:hover { background: #FAFAFA; }
  .module-table tbody td { padding: ${rowPad}px 0; vertical-align: middle; border-bottom: 1px solid #F9FAFB; font-variant-numeric: tabular-nums; }
  .module-table tbody td:nth-child(2) { text-align: center; font-size: ${cellFont}px; color: #374151; font-weight: 600; width: 120px; }
  .module-table tbody td:nth-child(3) { text-align: right; font-size: ${cellFont}px; color: #374151; font-weight: 600; width: 120px; }

  .pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: ${pillPadV}px ${pillPadH}px; border-radius: 20px;
    color: #fff; font-weight: 700; font-size: ${pillFont}px; white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .pill .dot { width: ${dotSize}px; height: ${dotSize}px; border-radius: 50%; background: rgba(255,255,255,0.5); }

  .total-row td { padding-top: ${rowPad + 4}px !important; border-top: 2px solid #E5E7EB; border-bottom: none; }
  .total-row .total-label { font-size: ${totalLabelFont}px; font-weight: 700; color: #1F2937; }
  .total-row .total-hours { font-size: ${totalLabelFont + 1}px; font-weight: 700; color: #374151; text-align: center; font-variant-numeric: tabular-nums; }
  .total-row .total-savings { font-size: ${totalFont}px; font-weight: 800; color: #FF355E; text-align: right; font-variant-numeric: tabular-nums; }

  .quotes-section {
    padding: 18px 44px 14px 48px;
    border-top: 1px solid #F3F4F6;
    display: flex; flex-direction: column; gap: 10px;
    flex: 0 0 auto;
  }
  .quotes-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; margin-bottom: 4px; }
  .quote-card {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 18px;
    border-radius: 12px;
    background: #F9FAFB;
    border-left: 4px solid;
    transition: transform 0.15s;
  }
  .quote-card:hover { transform: translateX(2px); }
  .quote-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; color: #fff; }
  .quote-body { flex: 1; }
  .quote-text { font-size: 14px; color: #374151; line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .quote-text .who { font-weight: 700; }
  .quote-text .pain { font-style: italic; color: #4B5563; }
  .quote-action { font-size: 13px; font-weight: 600; margin-top: 3px; display: block; }

  .footer { grid-column: 2 / 3; padding: 0 44px 24px 48px; align-self: end; }
  .footer p { color: #B0B8C4; font-size: 9px; line-height: 1.3; }
</style>
</head>
<body>
<div class="slide">

  <div class="header">
    <div class="header-left">
      <div class="title">${t.title_prefix} <span class="accent">${data.roi_percent}%</span></div>
      <div class="subtitle">${t.subtitle_prefix} ${escHtml(data.company_name)}</div>
    </div>
    <div class="header-right">
      <div class="header-date">${escHtml(data.date)}</div>
      <div class="header-brand">
        ${brandHtml}
      </div>
    </div>
  </div>

  <div class="card-area">
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="8" width="4" height="12" rx="1"/><rect x="17" y="4" width="4" height="16" rx="1"/></svg>
      </div>
      <div class="kpi-label">${t.kpi_savings}</div>
      <div class="kpi-value-box"><span class="kpi-value">${fmtEur(data.total_annual_savings)}</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>
      </div>
      <div class="kpi-label">${t.kpi_cost}</div>
      <div class="kpi-value-box"><span class="kpi-value">${fmtEur(data.annual_cost)}</span></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon">
        <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="4" y1="10" x2="20" y2="10"/><rect x="8" y="13" width="3" height="3" rx="0.5"/><rect x="13" y="13" width="3" height="3" rx="0.5"/></svg>
      </div>
      <div class="kpi-label">${t.kpi_roi}</div>
      <div class="kpi-value-box"><span class="kpi-value">${data.roi_percent}% &middot; ${t.payback} ${data.payback_months} ${t.months}</span></div>
    </div>
  </div>

  <div class="right-col">

    <div class="table-section">
      <table class="module-table">
        <thead>
          <tr>
            <th>${t.col_modules}</th>
            <th>${t.col_hours}</th>
            <th>${t.col_savings}</th>
          </tr>
        </thead>
        <tbody>
${moduleRows}
          <tr class="total-row">
            <td class="total-label">${t.total_label}</td>
            <td class="total-hours">${data.total_hours}h</td>
            <td class="total-savings">${fmtEur(data.total_annual_savings)}</td>
          </tr>
        </tbody>
      </table>
    </div>

${data.highlights.length > 0 ? `    <div class="quotes-section">
      <div class="quotes-title">${t.highlights_title}</div>

${highlightCards}
    </div>` : ""}

  </div>

  <div class="footer">
    <p>${t.footer}</p>
  </div>

</div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── PDF generation: render in hidden iframe, capture with html2canvas + jsPDF ──

let html2canvasLoaded: Promise<any> | null = null;

function loadHtml2Canvas(): Promise<any> {
  if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);
  if (html2canvasLoaded) return html2canvasLoaded;
  html2canvasLoaded = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve((window as any).html2canvas);
    s.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(s);
  });
  return html2canvasLoaded;
}

export async function generateRoiSlidePdf(data: RoiSlideData): Promise<void> {
  const [{ default: jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    loadHtml2Canvas(),
  ]);

  const html = generateRoiSlideHtml(data);

  // Inject a font-preload script that blocks until Inter is fully loaded,
  // and swap to a white background with no centering wrapper.
  const fontReadyScript = `
    <script>
      document.fonts.ready.then(function() {
        // Force the browser to lay out text with the loaded font
        document.body.offsetHeight;
        window.__fontsReady = true;
      });
    </script>
  `;
  const captureHtml = html
    .replace(
      "background: #f3f4f6; display: flex; justify-content: center; align-items: center; min-height: 100vh;",
      "background: #fff; margin: 0; padding: 0;",
    )
    .replace("</head>", fontReadyScript + "</head>");

  // Use an offscreen-but-visible iframe so the browser actually renders & rasterises fonts.
  // opacity:0 prevents painting pixels but the browser still loads fonts;
  // moving it offscreen with left:-9999px ensures it is invisible to the user.
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:1440px;height:810px;border:none;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  try {
    // 1. Wait for the iframe document to load
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = captureHtml;
    });

    const iframeDoc = iframe.contentDocument!;
    const iframeWin = iframe.contentWindow!;

    // 2. Wait for fonts to be ready inside the iframe (with a timeout fallback)
    await Promise.race([
      iframeDoc.fonts.ready,
      new Promise(r => setTimeout(r, 5000)),
    ]);

    // Also wait for the in-page script to confirm fonts are laid out
    await new Promise<void>((resolve) => {
      const check = () => {
        if ((iframeWin as any).__fontsReady) { resolve(); return; }
        setTimeout(check, 100);
      };
      check();
      // Hard timeout so we never hang
      setTimeout(resolve, 5000);
    });

    // Small extra delay for any final paint/reflow after font swap
    await new Promise(r => setTimeout(r, 300));

    const slide = iframeDoc.querySelector(".slide") as HTMLElement;
    if (!slide) throw new Error("Slide element not found");

    const canvas = await html2canvas(slide, {
      width: 1440,
      height: 810,
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      // Ensure html2canvas uses the iframe's own window so it picks up loaded fonts
      windowWidth: 1440,
      windowHeight: 810,
      onclone: (clonedDoc: Document) => {
        // Force a reflow in the cloned document so font metrics are correct
        clonedDoc.body.offsetHeight;
      },
    });

    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1440, 810] });
    pdf.addImage(img, "PNG", 0, 0, 1440, 810);
    pdf.save(`ROI-Slide-${data.company_name || "report"}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}
