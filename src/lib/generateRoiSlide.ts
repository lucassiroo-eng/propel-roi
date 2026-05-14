import type { ModuleSuggestion, RoiConfig } from "@/hooks/useWizardSession";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";
import { moduleLabel } from "@/lib/offeringEngine";
import {
  getEffectiveHours, getCountForEntry, MODULE_HOURS,
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

const FACTORIAL_LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAj4AAAB4CAMAAADFcgjGAAAAllBMVEVHcEz/N13/Nl7/N1//NV7/Nl7/NV7/NV3/OGD/NV3/QGD/NGD/NWD/OGD/MGD/NF3/NWD/NV7/NV7/NV7/NF7/NF7/NV3/Nl7/N13/Nl3/M1z/NF7/NVz/NVz/NmD/NV//Nl//M2D/NV7/Nl7/Nl3/NV3/Nl3/M17/NF//Nl7/OFz/Nlz/Nl3/NFz/NF3/NmH/NF//NV7N+JQsAAAAMXRSTlMAn9+f34DvvyBgEEAwQBBwYM+QoIDvn39wr1B/kKBQn49Qb7Cw0I+Qr19AUNBAr1+PqGXYFQAADb1JREFUeNrsnW1zmzgQgAUVaAXizTGxU8dOnLvkrvc6+///3LXTaTgltnaRMKFjPZ8ykxlkSY9XKwFrMZrCtFly18kevyGlurtvDkZEIhTQJh2epFf3BxCRyBmK6l6im+6+EpHIe6r7HjnI2xiDIjbFpkc+nRaRyA9gCDxM5CaGoMh3efboQ1zDIkIUj+iJ3IjIlfPUoz8y5kBXTfWMr8QVLDKORzxD3iVZeywNAJTlscnuuhiAIjbwfFqIVQviPUbfpKcDUC0i18eXHt+jmkKcxzTdKd/iAnZ97PAd3boQFHAiBuVbEbkqigd8iyoFD/1eoLiFvyrgmSUPX6AXEbkaQDLl4Qt0K6alMG3bHkTkHEXVtpWYnrq1qGh78sajlfXl/Cmaux6/IUXEfZdy+nM3QItPpD2/F37tpJfxp1L4lagPb9csDzPrU0gi9LBZE/74yhP1IfgTceAwrz521pyC8OeYEvsvn/u3UZ9xqWtez6mPPUE3hSDhL2BbEYaRGPWh2aNFNqM+u2lbrhX+n0qE8IQY9WEg0SKfT59qcm9vJrt/scOoDweDbzBz6QNy+qj3G+KACrEn6sOixDdUc+mzJ+wJjz9b/5Ur6rNwfZ5Ie8L9McIL6KM+TOCDFi/oL5Ov1x0OdL7pYNSHS44W6Uyp855IUryBNNRLjVEfNusP2bhrzmlh+GYgB5+DsJ9In6ISH0udWsGnmEcfiQMgpqUJu3nR4M+iT9GoXooPxuTWt3UWfTQR78JQOFBNkfnkd8lqaU8RVRu1DKuHbCE1Yh59JJFshQF5QF71+dSjj0ujupcLCoo6xa/IdSHm0UcTS1coTUD42aNNvjR5ijbpl7amFqVhuxOuj2QvXeHLlwrbieZLq2TWLD4lu7Q+mth1hVN6h58SbRqxMLKr10fiK1pwqJqkk4go1a2GsYfPq5AvdyqWxtXrU46bHfOmWlTHMQh8H2H6FS2W99bY1euzHxN8QPkVQ7jxVEChxdIyn6hPTQYfuuCP1CNyGBVw6iMWx7Xro/nbLpD+1ViU39nA4ifn2vXhz2vV43kksMNP5q1PJxbHletT4yu/CCdf0AHtT+61eqGFYr+G2mRfaQ5VIbwp4NBm32grs2B9oM1KQUAPk68+n7mJs0EM8meFr9SC5O/kO2iRJ6+8iNMUh0RaAev2MFzT4g/3bYgOcaC/08DSJ89saupt4ixJkvuspSYwsdgORZPlEM4dfSTKvFs13XfWFV7c+uyHnlN5D0VXM1cvLUg0KSu/frm8Beua5Kcwp66CShP6nAJchr7xvBobhWFvZQNEH6kOSg0nNrvSrU/HXLsk0rwwV69PF9KnUniGzQh9jCKr7YXrAxuH50x9nnr00gf+cfRvnD7AjAk75FDxjn7k1PrQZYQlMPUZrkIIFKIP7MkdLK3PA6KXPra4NgrG6fOZt++CHjkophH1BfQxEp38y9KnkmS92CB96F952DD1eUAvfeCZSGBH6ZPxzgz3iMHhp8ZXPk+vzxdS8H9pfThBVkKgPkbSDdD67NBLHyPJ7o3RR7FSH8iRh+KlT9vJ9dkhTULq84gctkH6PPV0A7Q+Gr30MXTjshuhT8eaUo1cKlby82lqfZ6QA6XPA/LYBOizYzVA6QOSqY9XDsLXhzfxCrlkrAPabmJ9DE6hzyNy2Xjrs2M2QOjziD76gMRp9TGsdLZGNh1LiXxafUBOoc8O+WzZ+ni2sXHqk+Ze+jzjxPqUrBktkYa2kHA1QB+FPmhHiyTGS5+nMYJaoAOuPjucWh/NChsZ8jGsIAZT6qPRCx2SFsjaQx/wEHQ6fQAn16dh7ZluvCfFhiEZXx9i6ZJJ0x6PbaZy3ieVOI5svD6F9BA0UB/q8EWt2rIsj81d7qNPxtq3K+STsXbuVbg+rpicr82pOtM2mmpPNSUIIczx1I8tNEx9qMUjl0p19C2gcH3KU8NUEMNE6LMa/p5VHx2ujyP4qGHSHCOj3cn3qnBcYfgnXx84NX/ljx+USd3q4RnypGlbw9Fnf6qHFk0+Vp+b4Voz6KP4+kD7HbTo2lcO50XLXGU+BrQrMKTGUbpCAf95H8f8paXbcUXqk+rC/bXTDnkbepj4+mTL0of/uJjkZF9159ZHIlkO/ZhbL0mP1gccX/7BUIuK0GctBih9VpxhgjRMn/DUeTuzPobnb5269NFv7Tl/fJFq4mlDbvBp6GIiK4c+doCk9ZGsYYL8AovXCvlUM+vToM0D+7adtj8YXRZnPSSbHvrk7+whO5PXDn3+KsQIfQxzmMoLpM4a+YA4Txesj0NJqqTN+rw+wOxDuvqvvbPtcduG4TjjyRJt+SF2kt45vd0DrsUN6zBM3//LbV07tIKtkGIk4Ibo/7Y9ySJ/oagH0634rvOZNce/hR6RoIfEp+G6aREs3Al80LFVgWjhLsfH+XqGkAYdxKfhp29ifH7lmanyHRTEp0KIwucTL/gAYJptQ+Ge2hPBQmp8On7wO67wCdgWc+Cj1n3Tk4cO4tNAHD4T+2zAiA4tFFFwkakz8A4thPhQc4Ihu6fTyifIgE/HjdFmm2QiyJP48OeIJgKf8wp0YvCEKmYrIMSH8l4dEUObAFfnHPicuSc74/azEEGewgf5c8QQgQ8yA4JJsGwnWJXhM0e4/sBblQw58Km5cwdu25NY31L42Ag3KT4+wLS8ZQYf5FnaSPGhkOjo/tf4WBIAfqMTZ+9Ds8upzQF8BjE+tK8nNj78+8cHx1HDrNXzmgsfD1/ZotZchY/h2M+wvffLth00iPGhVy4mAp9PzPvHg7428yFQFeJj/if4fGJ3YRj4TO8Fn5kbtF/kU9e68/7moo8Qn9eAHd4LPmfS9PzF+xd2hubhXeU+vslVnslLGH3y4NOkyn0GKh3n89OwKzRPkGvl1VC5F506uyE7PkqSOsvxWTt+JkzOxgcUP2ofr6DH6+kJcu37zJJ9H2RHdjk+NUFowEV1InwG/u6qjcJn9s53xfxUNqK6YZMOn4ZvFwzyrgMICvGh3XrPTdDOCfDxhki7eo7C5xyz3YpVsDJDzNcFMB0+Hf9Fj7+C+Exc28r3fZBLufGHkwqfiT1VqCh8hriicWMVCD2kVJ7idJp9aqGC+Mx0G1x/ad51n54XIjWkwmcWNUDjAyYuacTVnVzzyDIzEbqz3/f5GE7WLLMNXJA0N7LydsNb9rwmwmf9mCGftSoSnzH6Z2dno/+ztBkxur43psTn6HiWxUu5vua18edG+aYz86736DzdsxhvkuEzON5P5NlF4jNoyayP9h91KKnpOkFKfCyvvBKqS/jMqzaCvlV3l7HUA2/bvufcbMAE+AQOvScCXy4+8Jr9kxH0lw/k+MDE4af97C7h0zHaaJ82C9QN3AKPhvqy1Lr6zhOkw2dclUkjai9z8bHZqxL7HWNafI6O9j0qYqPKkDUGexVYZ6owP+2d8sIkMX+tCij0CfAJH1pOSM5cND6+7e7zB58nSIvPoB1lmLuTI/CxRBHM9jlI1xyocNs+Ppw8AlaILni5LKyBFPiEf2bK93b/2Qnw8eKaHt5X8AmYjdzM/NDThSg9Pt62yuQ+InwVjmb9j3cXX0M5qdPqia1baWna7w+5N26lLik+g94aYg/gjTEaH7/hGnJI+WtROT78uyQn81CPY71TvFOWoQpYTwUaqJhXWQbiztS07HaLIt46kONDnxlMxpjpJCvQsm64A7FYY+qT4wNjivo+1sUJmS9R1j7nfFWYGJ+hSl7fZz0uA8mFimhehE/q6mJvLkY1FzwjRbSBxPiAzYOPH37uc+bNDnPgg5UMHzmEf8BPWthvbR8FfKbDB46Z8IHKG29affTm82T4JK+sOkyCiYWuej2Lik0cIAM+cMiEj/WqomVbdWnMgw/sJfiIg1iFEcmXHgQOPEAWfIYpCz5+5Da5Eh9XQwJ8pOmzPhL4AFYCeshZ4RwfAA6QGh8+P7UR4IPaq1uUSr5LKsiGD7xoR+gL/U2LYXG0TEtVxrj40EdO3pMLH4A3klwJPjByL+9gv68fdov5qmX3UD/2LfdL/pgNHzp0aEuYluvcGWL/bqAqLfrSXyAjPjASmZoMHzBeWbZN4f5hOm1v0T0i7dgacuFDu7BCwrRMCo0N+a1iBxO8OIH9hpAJH7p7PYIUn6H69vcBtfvdmhzuxxSPhO+F+PANM7eEaXkgVA3Veaj6rS9bEXjmxAfAmuCVYzE+YL1yeZ7a0TiGTh8eQ6PSrsIk+EgAWiK/ZdpM29Z9jO/cjO22BxcCnpz4ANiDDnQuxgdGsz3Ufjk5QuTnONEjU44PqbZZfMuYY0uZdq2uNs6T9jgICefK79pCUNgYoofU+Ph6mSevBn8LIMCHdodxcTL9ZjsgkvE0A0vdS737ltmP9qd+z8bT78TA7Th/b6Xe89nvXublR9eE7Pjvfza7ed+1V9hBOsbO7r/K73v2WtjBD6HxNEJAxG0HSqqBoiJolJNJ9VB04+qNk+sDQtENq3121+kOim5WvXLXSpUAdKPyQo9c91B0g0Iv9JQMqChGeHKpNEHRzanRLo2qDopuT1i5FDq0UHSTOrqrpUcoulVdHYBMSZtvWsdrAKosFN228OCE0seS9RQBHgo8RVcBVOApIkQVw+TLjAWeosDVWDLwlIS5aJsgKgZNhZ2iC8LmMAWijpn3Zc4q4l5DV/p77a1pmceXsj94m/obJqfpXWVsYPQAAAAASUVORK5CYII=";

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
  moduleSuggestions: ModuleSuggestion[];
}

export interface RoiSlideModule {
  name: string;
  hours_per_month: number;
  annual_savings: number;
}

export interface RoiSlideQuote {
  person: string;
  pain: string;
  module_name: string;
  action: string;
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
  quotes: RoiSlideQuote[];
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

  const quotes: RoiSlideQuote[] = input.moduleSuggestions
    .filter(s => s.quote && s.confidence === "strong")
    .slice(0, 3)
    .map(s => {
      const catalog = MODULE_CATALOG.find(m => m.id === s.module_id);
      const modName = catalog?.label ?? moduleLabel(s.module_id);
      const parts = s.quote.match(/^(.+?)(?:\s*(?:dijo|mencionó|comentó|said|mentioned)\s+que\s+)?[«"'](.+?)[»"']\s*$/i);
      return {
        person: parts?.[1]?.trim() ?? "Prospect",
        pain: parts?.[2]?.trim() ?? s.quote,
        module_name: modName,
        action: `se automatiza y centraliza con ${modName}`,
      };
    });

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
    quotes,
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
      quotes_title: "Necesidad detectada",
      quote_prefix: "Con",
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
      quotes_title: "Detected needs",
      quote_prefix: "With",
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
      quotes_title: "Besoin détecté",
      quote_prefix: "Avec",
      footer: `Estimation basée sur une étude du cabinet interne de Factorial, avec ${data.total_employees} utilisateurs, ${data.hr_count} administrateur${data.hr_count > 1 ? "s" : ""} RH, ${data.manager_count} managers et ${data.onboardings} recrutements par an.`,
    },
  };
  const t = i18n[lang] ?? i18n.es;

  const moduleRows = data.modules.map((m, i) => {
    const color = PILL_COLORS[i % PILL_COLORS.length];
    return `          <tr>
            <td><span class="pill" style="background:${color};"><span class="dot"></span>${escHtml(m.name)}</span></td>
            <td>${m.hours_per_month}h</td>
            <td>${fmtEur(m.annual_savings)}</td>
          </tr>`;
  }).join("\n");

  const quoteCards = data.quotes.map((q, i) => {
    const color = PILL_COLORS[i % PILL_COLORS.length];
    return `      <div class="quote-card" style="border-color: ${color};">
        <div class="quote-icon" style="background:${color};">&#x1F4AC;</div>
        <div class="quote-body">
          <div class="quote-text"><span class="who">${escHtml(q.person)}</span> &mdash; <span class="pain">&laquo;${escHtml(q.pain)}&raquo;</span></div>
          <span class="quote-action" style="color: ${color};">&rarr; ${t.quote_prefix} ${escHtml(q.module_name)}, ${escHtml(q.action)}.</span>
        </div>
      </div>`;
  }).join("\n\n");

  const brandHtml = data.company_logo_url
    ? `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${escHtml(data.company_logo_url)}" alt="${escHtml(data.company_name)}">
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_B64}" alt="Factorial">`
    : `<span class="company-name">${escHtml(data.company_name)}</span>
        <div class="brand-divider"></div>
        <img src="${FACTORIAL_LOGO_B64}" alt="Factorial">`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1440">
<title>ROI Slide — ${escHtml(data.company_name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }

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
  .header-brand .company-name { font-size: 17px; font-weight: 700; color: #1F2937; }
  .header-brand .brand-divider { width: 1px; height: 24px; background: #D1D5DB; }
  .header-brand img { height: 26px; object-fit: contain; }

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
    color: #9CA3AF; font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.08em;
    padding: 0 0 10px 0; text-align: left;
    border-bottom: 1px solid #F3F4F6;
  }
  .module-table thead th:nth-child(2) { text-align: center; width: 120px; }
  .module-table thead th:nth-child(3) { text-align: right; width: 120px; }

  .module-table tbody tr { transition: background 0.15s; }
  .module-table tbody tr:hover { background: #FAFAFA; }
  .module-table tbody td { padding: 7px 0; vertical-align: middle; border-bottom: 1px solid #F9FAFB; font-variant-numeric: tabular-nums; }
  .module-table tbody td:nth-child(2) { text-align: center; font-size: 15px; color: #374151; font-weight: 600; width: 120px; }
  .module-table tbody td:nth-child(3) { text-align: right; font-size: 15px; color: #374151; font-weight: 600; width: 120px; }

  .pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 20px;
    color: #fff; font-weight: 700; font-size: 12px; white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }
  .pill .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.5); }

  .total-row td { padding-top: 10px !important; border-top: 2px solid #E5E7EB; border-bottom: none; }
  .total-row .total-label { font-size: 15px; font-weight: 700; color: #1F2937; }
  .total-row .total-hours { font-size: 16px; font-weight: 700; color: #374151; text-align: center; font-variant-numeric: tabular-nums; }
  .total-row .total-savings { font-size: 20px; font-weight: 800; color: #FF355E; text-align: right; font-variant-numeric: tabular-nums; }

  .quotes-section {
    padding: 14px 44px 10px 48px;
    border-top: 1px solid #F3F4F6;
    display: flex; flex-direction: column; gap: 8px;
    flex: 0 0 auto;
  }
  .quotes-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9CA3AF; margin-bottom: 2px; }
  .quote-card {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #F9FAFB;
    border-left: 3px solid;
    transition: transform 0.15s;
  }
  .quote-card:hover { transform: translateX(2px); }
  .quote-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; color: #fff; }
  .quote-body { flex: 1; }
  .quote-text { font-size: 12px; color: #374151; line-height: 1.45; }
  .quote-text .who { font-weight: 700; }
  .quote-text .pain { font-style: italic; color: #4B5563; }
  .quote-action { font-size: 11px; font-weight: 600; margin-top: 2px; display: block; }

  .footer { grid-column: 2 / 3; padding: 0 44px 14px 48px; align-self: end; }
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

${data.quotes.length > 0 ? `    <div class="quotes-section">
      <div class="quotes-title">${t.quotes_title}</div>

${quoteCards}
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

// ── PDF generation via html2canvas (lazy-loaded from CDN) + jsPDF ──

let html2canvasPromise: Promise<any> | null = null;

function loadHtml2Canvas(): Promise<any> {
  if (html2canvasPromise) return html2canvasPromise;
  if ((window as any).html2canvas) return Promise.resolve((window as any).html2canvas);
  html2canvasPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve((window as any).html2canvas);
    script.onerror = () => reject(new Error("Failed to load html2canvas"));
    document.head.appendChild(script);
  });
  return html2canvasPromise;
}

export async function generateRoiSlidePdf(data: RoiSlideData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const html2canvas = await loadHtml2Canvas();

  const fullHtml = generateRoiSlideHtml(data);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "1440px";
  container.style.height = "810px";
  container.style.zIndex = "-1";
  container.innerHTML = fullHtml
    .replace(/<!DOCTYPE html>[\s\S]*?<body>/, "")
    .replace(/<\/body>[\s\S]*$/, "");

  const styleEl = document.createElement("style");
  const styleMatch = fullHtml.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) styleEl.textContent = styleMatch[1];
  container.prepend(styleEl);

  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
  link.rel = "stylesheet";
  container.prepend(link);

  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 500));
  await document.fonts.ready;

  const slideEl = container.querySelector(".slide") as HTMLElement;
  if (!slideEl) { document.body.removeChild(container); throw new Error("Slide element not found"); }

  const canvas = await html2canvas(slideEl, {
    width: 1440,
    height: 810,
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1440, 810] });
  pdf.addImage(imgData, "PNG", 0, 0, 1440, 810);
  pdf.save(`ROI-Slide-${data.company_name || "report"}.pdf`);

  document.body.removeChild(container);
}
