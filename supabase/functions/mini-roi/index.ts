import { createClient } from "npm:@supabase/supabase-js@2";
import { azureFetch } from "../_shared/azureFetch.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const HS_BASE = "https://api.hubapi.com";
const MODJO_BASE = "https://api.modjo.ai/v2";

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractDealId(url: string): string | null {
  return url.match(/\/deal\/(\d+)/)?.[1]
    ?? url.match(/\/record\/0-3\/(\d+)/)?.[1]
    ?? url.match(/\/(\d{5,})\/?(?:\?|$)/)?.[1]
    ?? null;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(Math.round(n));
}

async function modjoGet(key: string, path: string): Promise<any> {
  const res = await fetch(`${MODJO_BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Modjo ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// ── HubSpot fetch ─────────────────────────────────────────────────────────────

async function fetchHubspot(dealUrl: string): Promise<any> {
  const dealId = extractDealId(dealUrl);
  if (!dealId) throw new Error("No se pudo extraer el ID del deal de la URL");

  const token = Deno.env.get("HUBSPOT_PAT_TOKEN");
  if (!token) throw new Error("HUBSPOT_PAT_TOKEN not configured");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const dealRes = await fetch(
    `${HS_BASE}/crm/v3/objects/deals/${dealId}?properties=dealname,revised_number_of_emloyeess,dealstage,closedate&associations=companies`,
    { headers: h }
  );
  if (!dealRes.ok) throw new Error(`HubSpot deal fetch failed [${dealRes.status}]`);
  const deal = await dealRes.json();

  const result: Record<string, any> = {
    deal_id: dealId,
    deal_name: deal.properties?.dealname ?? "",
    employees: parseInt(deal.properties?.revised_number_of_emloyeess ?? "0") || null,
  };

  const compAssoc = deal.associations?.companies?.results?.[0];
  if (compAssoc) {
    const cRes = await fetch(
      `${HS_BASE}/crm/v3/objects/companies/${compAssoc.id}?properties=name,country_qobra_samba,country,industry`,
      { headers: h }
    );
    if (cRes.ok) {
      const c = await cRes.json();
      result.company_name = c.properties?.name ?? "";
      result.country = c.properties?.country_qobra_samba ?? c.properties?.country ?? "ES";
      result.industry = c.properties?.industry ?? "";
    }
  }

  // Notes (max 10 most recent)
  const notesAssoc = await fetch(`${HS_BASE}/crm/v3/objects/deals/${dealId}/associations/notes`, { headers: h });
  if (notesAssoc.ok) {
    const na = await notesAssoc.json();
    const noteIds: string[] = (na.results ?? []).map((r: any) => r.id).slice(0, 10);
    if (noteIds.length) {
      const fetched = await Promise.all(noteIds.map(async (nid) => {
        const nr = await fetch(`${HS_BASE}/crm/v3/objects/notes/${nid}?properties=hs_note_body,hs_timestamp`, { headers: h });
        if (!nr.ok) return null;
        const n = await nr.json();
        return { body: n.properties?.hs_note_body ?? "", date: n.properties?.hs_timestamp ?? "" };
      }));
      result.notes = fetched.filter(Boolean).sort((a: any, b: any) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
  }

  return result;
}

// ── Modjo search + transcripts ────────────────────────────────────────────────

async function fetchModjoCalls(companyName: string, dealId: string | null, key: string): Promise<any[]> {
  const cleaned = companyName.replace(/\s*-\s*from\s.*/i, "").trim();
  const noise = new Set(["s.l.", "s.a.", "sl", "sa", "sas", "srl", "gmbh", "ltd", "inc"]);
  const keywords = cleaned.split(/[\s\-·,.']+/).filter(w => w.length >= 3 && !noise.has(w.toLowerCase()));

  const accountIds = new Set<number>();

  // Try deal-based search first
  if (cleaned.length >= 2) {
    try {
      const deals = await modjoGet(key, `/deals?name=${encodeURIComponent(cleaned)}&size=5`);
      for (const d of deals.data ?? []) {
        if (d.accountId) accountIds.add(d.accountId);
      }
    } catch { /* ignore */ }
  }

  // Fallback: keyword account search
  if (accountIds.size === 0) {
    const results = await Promise.all(
      keywords.slice(0, 3).map(kw =>
        modjoGet(key, `/accounts?name=${encodeURIComponent(kw)}&size=5`).catch(() => ({ data: [] }))
      )
    );
    const counts = new Map<number, number>();
    for (const r of results) {
      for (const acc of r.data ?? []) {
        counts.set(acc.id, (counts.get(acc.id) ?? 0) + 1);
      }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    for (const [id] of sorted) accountIds.add(id);
  }

  const callMap = new Map<number, any>();
  for (const accId of accountIds) {
    try {
      const res = await modjoGet(key, `/calls?account_id=${accId}&expand=deal,users&size=20`);
      for (const c of res.data ?? []) {
        if (!callMap.has(c.id)) {
          callMap.set(c.id, { callId: c.id, title: c.name ?? "", date: c.date ?? "", duration: c.duration ?? 0 });
        }
      }
    } catch { /* ignore */ }
  }

  return [...callMap.values()].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

async function fetchTranscript(callId: number, key: string): Promise<string> {
  try {
    const [trRes, sumRes] = await Promise.all([
      modjoGet(key, `/calls/${callId}/transcript`),
      modjoGet(key, `/calls/${callId}/summaries`).catch(() => ({ data: [] })),
    ]);
    const segments = (trRes.data ?? []).slice(0, 120); // limit tokens
    const transcript = segments.map((s: any) => `${s.speaker?.name ?? "?"}: ${s.content}`).join("\n");
    const summary = (sumRes.data ?? [])[0]?.answer ?? "";
    return [summary ? `[RESUMEN]\n${summary}` : "", transcript ? `[TRANSCRIPT]\n${transcript}` : ""]
      .filter(Boolean).join("\n\n");
  } catch {
    return "";
  }
}

// ── Claude analysis ───────────────────────────────────────────────────────────

const ANALYSIS_TOOL = {
  name: "mini_roi_analysis",
  description: "Structured ROI analysis from call transcripts",
  input_schema: {
    type: "object",
    required: ["modules", "pain_themes", "company_context"],
    properties: {
      company_context: { type: "string", description: "2-3 sentence summary of the company situation" },
      pain_themes: {
        type: "array",
        description: "3-5 pain themes identified. No direct quotes.",
        items: {
          type: "object",
          required: ["type", "title", "description"],
          properties: {
            type: { type: "string", enum: ["TIEMPO", "HERRAMIENTA", "DATOS", "CUMPLIMIENTO", "CRECIMIENTO"] },
            title: { type: "string" },
            description: { type: "string" },
          },
        },
      },
      modules: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "hours_employee", "hours_hr", "hours_manager", "source_employee", "source_hr", "source_manager"],
          properties: {
            id: { type: "string" },
            hours_employee: { type: "number", description: "h/mes per employee" },
            hours_hr: { type: "number", description: "h/mes for the HR admin (flat monthly)" },
            hours_manager: { type: "number", description: "h/mes per manager" },
            source_employee: { type: "string", enum: ["transcript", "assumption"] },
            source_hr: { type: "string", enum: ["transcript", "assumption"] },
            source_manager: { type: "string", enum: ["transcript", "assumption"] },
          },
        },
      },
      tool_replacements: {
        type: "array",
        items: {
          type: "object",
          required: ["module_id", "tool_name", "annual_cost_eur"],
          properties: {
            module_id: { type: "string" },
            tool_name: { type: "string" },
            annual_cost_eur: { type: "number" },
          },
        },
      },
    },
  },
};

async function analyzeWithClaude(hs: any, transcripts: string[], lang: string): Promise<any> {
  const notes = (hs.notes ?? []).map((n: any) => n.body).filter(Boolean).join("\n---\n");
  const transcriptBlock = transcripts.length
    ? transcripts.map((t, i) => `=== LLAMADA ${i + 1} ===\n${t}`).join("\n\n")
    : "(Sin transcripts disponibles)";

  const system = `Eres un analista de ventas experto en ROI para Factorial (HR SaaS).
Tu tarea es analizar datos de empresa y transcripts de llamadas para producir una estimación conservadora de ROI.
Responde SIEMPRE en español. Sé conservador: ante la duda, usa el valor más bajo.`;

  const user = `EMPRESA:
- Nombre: ${hs.company_name ?? "Desconocida"}
- País: ${hs.country ?? "ES"}
- Sector: ${hs.industry ?? "Desconocido"}
- Empleados: ${hs.employees ?? "Desconocido"}

NOTAS DE HUBSPOT:
${notes || "(Sin notas)"}

${transcriptBlock}

INSTRUCCIONES:
1. Incluye SIEMPRE estos módulos: core, time_off, time_tracking.
   Añade otros solo si hay evidencia clara en los transcripts.

2. Para las horas estimadas por stakeholder/mes, usa esta tabla de referencia
   (empresa sin HRIS, <100 empleados, baja digitalización):

   core:          employee=0.25, hr=2.0, manager=0.5
   time_off:      employee=0.25, hr=3.0, manager=1.0
   time_tracking: employee=0.3,  hr=6.0, manager=0.5
   payroll:       employee=0.0,  hr=4.0, manager=0.5
   documents:     employee=0.5,  hr=2.0, manager=0.3
   recruitment:   employee=0.0,  hr=5.0, manager=2.0

   Ajusta HACIA ARRIBA solo si el transcript tiene señal fuerte ("nos pasa cada día", "todo el día").
   Ajusta HACIA ABAJO si no hay ninguna mención (usa 0.75× el default).
   Si el transcript da horas explícitas, úsalas directamente (cap: 40h/mes).

   Marca source="transcript" si hay evidencia real, "assumption" si es el default.
   Si hours=0, pon source="assumption".

3. Para tool_replacements: solo si se menciona explícitamente una herramienta a reemplazar.
   Tabla de precios orientativos (aplica -20% por ser conservador):
   - Terminales Fichem/hardware: €1.100/año total (amortizado)
   - Bizneo/Sesame HR: ${hs.employees ?? 50}emp × €4/mes × 12 = €${Math.round((hs.employees ?? 50) * 4 * 12 * 0.8)}/año
   - Personio: ${hs.employees ?? 50}emp × €4.5/mes × 12 = €${Math.round((hs.employees ?? 50) * 4.5 * 12 * 0.8)}/año
   - Excel/manual: €0 (no es tool replacement, solo ahorro de tiempo)

4. Los pain_themes deben ser temáticos (no citar textualmente). Máximo 5.

Módulos disponibles: core, time_off, time_tracking, payroll, documents, recruitment, performance, expenses, time_planning, trainings, complaints.`;

  const res = await azureFetch({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    tools: [ANALYSIS_TOOL],
    tool_choice: { type: "tool", name: "mini_roi_analysis" },
    system,
    messages: [{ role: "user", content: user }],
  }, 55000);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err.slice(0, 300)}`);
  }

  const body = await res.json();
  const toolUse = body.content?.find((b: any) => b.type === "tool_use");
  if (!toolUse?.input) throw new Error("Claude no devolvió análisis estructurado");
  return toolUse.input;
}

// ── ROI calculation ───────────────────────────────────────────────────────────

interface RoiResult {
  modules: { id: string; annual_savings: number; tool_replacement: number }[];
  total_savings: number;
  annual_cost: number;
  roi_pct: number;
  payback_months: number;
  headcounts: { employee: number; hr: number; manager: number };
  hourly_costs: { employee: number; hr: number; manager: number };
}

function calculateRoi(hs: any, analysis: any, annualCostOverride?: number): RoiResult {
  const emp = Math.max(1, hs.employees ?? 50);
  const hrCount = Math.max(1, Math.round(emp * 0.03));
  const mgrCount = Math.max(1, Math.round(emp * 0.07));

  // Hourly costs by country (loaded cost including social charges)
  const HOURLY = { ES: 22, FR: 28, DE: 32, IT: 22, PT: 18, BR: 12, MX: 10 } as Record<string, number>;
  const country = (hs.country ?? "ES").substring(0, 2).toUpperCase();
  const baseHourly = HOURLY[country] ?? 22;
  const hourly_costs = { employee: baseHourly, hr: Math.round(baseHourly * 1.15), manager: Math.round(baseHourly * 1.4) };
  const headcounts = { employee: emp, hr: hrCount, manager: mgrCount };

  const toolMap: Record<string, number> = {};
  for (const tr of analysis.tool_replacements ?? []) {
    toolMap[tr.module_id] = (toolMap[tr.module_id] ?? 0) + (tr.annual_cost_eur ?? 0);
  }

  let totalSavings = 0;
  const moduleSavings = (analysis.modules ?? []).map((m: any) => {
    const monthlyTime =
      (m.hours_employee ?? 0) * headcounts.employee * hourly_costs.employee +
      (m.hours_hr ?? 0) * headcounts.hr * hourly_costs.hr +
      (m.hours_manager ?? 0) * headcounts.manager * hourly_costs.manager;
    const toolReplacement = toolMap[m.id] ?? 0;
    const annual = monthlyTime * 12 + toolReplacement;
    totalSavings += annual;
    return { id: m.id, annual_savings: Math.round(annual), tool_replacement: toolReplacement };
  });

  // Suggested price: ~€5/emp/mes for ES, scaled by country
  const PEPM = { ES: 5, FR: 6, DE: 7, IT: 5.5, PT: 4, BR: 3, MX: 3 } as Record<string, number>;
  const suggestedCost = Math.round((PEPM[country] ?? 5) * emp * 12);
  const annualCost = annualCostOverride ?? suggestedCost;

  const roi_pct = annualCost > 0 ? Math.round(((totalSavings - annualCost) / annualCost) * 100) : 0;
  const payback_months = totalSavings > 0 ? Math.round((annualCost / totalSavings) * 12) : 0;

  return { modules: moduleSavings, total_savings: Math.round(totalSavings), annual_cost: annualCost, roi_pct, payback_months, headcounts, hourly_costs };
}

// ── HTML 1-pager ──────────────────────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  core: "Plataforma del Empleado / Core",
  time_off: "Ausencias",
  time_tracking: "Control Horario",
  payroll: "Nómina",
  documents: "Documentos y Firma Digital",
  recruitment: "Selección de Personal",
  performance: "Evaluación del Desempeño",
  expenses: "Gastos",
  time_planning: "Planificación de Turnos",
  trainings: "Formación",
  complaints: "Buzón de Denuncias",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function badge(source: string): string {
  if (source === "transcript") return `<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:3px;background:#D1FAE5;color:#065F46;">HECHO</span>`;
  return `<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:3px;background:#FEF3C7;color:#92400E;">ASUNCIÓN</span>`;
}

function buildHtml(hs: any, analysis: any, roi: RoiResult, lang: string): string {
  const date = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const country = (hs.country ?? "ES").substring(0, 2).toUpperCase();
  const countryLabel: Record<string, string> = { ES: "España", FR: "Francia", DE: "Alemania", IT: "Italia", PT: "Portugal" };

  const modulesHtml = (analysis.modules ?? []).map((m: any) => {
    const mRoi = roi.modules.find((r: any) => r.id === m.id);
    const annual = mRoi?.annual_savings ?? 0;
    const toolRep = mRoi?.tool_replacement ?? 0;
    const tool = (analysis.tool_replacements ?? []).find((t: any) => t.module_id === m.id);

    const rows = [
      { label: "Empleados", hours: m.hours_employee, count: roi.headcounts.employee, cost: roi.hourly_costs.employee, source: m.source_employee, unit: "h/mes" },
      { label: "Admin RRHH", hours: m.hours_hr, count: roi.headcounts.hr, cost: roi.hourly_costs.hr, source: m.source_hr, unit: "h/mes" },
      { label: "Managers", hours: m.hours_manager, count: roi.headcounts.manager, cost: roi.hourly_costs.manager, source: m.source_manager, unit: "h/mes" },
    ].filter(r => r.hours > 0);

    const rowsHtml = rows.map(r => `
      <div style="display:flex;align-items:baseline;gap:12px;padding:10px 20px;border-bottom:1px solid #F0F0F6;font-size:13px;">
        <span style="font-weight:600;color:#1A1A2E;min-width:100px;">${esc(r.label)}</span>
        <span style="color:#6B6B8D;flex:1;">${r.hours} ${r.unit} × ${r.count} personas × €${r.cost}/h</span>
        <span style="font-weight:700;color:#1A1A2E;min-width:90px;text-align:right;">€${fmtEur(r.hours * r.count * r.cost * 12)}/año</span>
        <span>${badge(r.source)}</span>
      </div>`).join("");

    const toolHtml = tool ? `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 20px;background:#FFF8F9;border-top:1px solid #FFE4EA;font-size:13px;">
        <span style="color:#6B6B8D;">Reemplaza:</span>
        <span style="font-weight:600;color:#1A1A2E;">${esc(tool.tool_name)}</span>
        <span style="margin-left:auto;font-weight:700;color:#FF355E;">€${fmtEur(tool.annual_cost_eur)}/año</span>
        <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:3px;background:#E0E7FF;color:#3730A3;">ESTIMADO</span>
      </div>` : "";

    return `
    <div style="border:1px solid #E8E8F0;border-radius:8px;overflow:hidden;margin-top:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:#F8F8FC;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#fff;background:#FF355E;padding:3px 8px;border-radius:4px;">MÓDULO</span>
          <span style="font-size:15px;font-weight:800;color:#1A1A2E;">${esc(MODULE_LABELS[m.id] ?? m.id)}</span>
        </div>
        <span style="font-size:20px;font-weight:800;color:#FF355E;letter-spacing:-.02em;">€${fmtEur(annual)}<span style="font-size:12px;font-weight:500;color:#9999BB;">/año</span></span>
      </div>
      ${rows.length === 0 ? `<div style="padding:14px 20px;font-size:13px;color:#9999BB;font-style:italic;">Ahorro estimado por reemplazo de herramienta</div>` : rowsHtml}
      ${toolHtml}
    </div>`;
  }).join("");

  const painHtml = (analysis.pain_themes ?? []).map((p: any, i: number) => {
    const typeColors: Record<string, string> = {
      TIEMPO: "#1A1A2E", HERRAMIENTA: "#4F46E5", DATOS: "#0891B2", CUMPLIMIENTO: "#DC2626", CRECIMIENTO: "#059669"
    };
    const color = typeColors[p.type] ?? "#1A1A2E";
    return `
    <div style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #F0F0F6;">
      <div style="font-size:11px;font-weight:800;color:#FF355E;min-width:20px;padding-top:3px;">${i + 1}.</div>
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#fff;background:${color};padding:2px 6px;border-radius:3px;align-self:flex-start;margin-top:2px;white-space:nowrap;">${esc(p.type)}</span>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:700;color:#1A1A2E;">${esc(p.title)}</div>
        <div style="font-size:13px;color:#6B6B8D;margin-top:4px;line-height:1.55;">${esc(p.description)}</div>
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mini ROI — ${esc(hs.company_name ?? "")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, sans-serif; background: #fff; color: #1A1A2E; -webkit-print-color-adjust: exact; }
@media print { body { padding: 0; } .page { padding: 36px 48px; } }
</style>
</head>
<body>
<div style="max-width:820px;margin:0 auto;padding:52px 64px;">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:2px solid #FF355E;">
    <div style="font-size:20px;font-weight:800;color:#FF355E;letter-spacing:-.03em;">factorial</div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">Análisis ROI Estimado</div>
      <div style="font-size:11px;color:#9999BB;margin-top:4px;">${esc(date)} · Confidencial</div>
    </div>
  </div>

  <!-- Company -->
  <div style="margin-top:28px;">
    <div style="font-size:34px;font-weight:800;color:#1A1A2E;letter-spacing:-.025em;line-height:1.1;">${esc(hs.company_name ?? hs.deal_name ?? "")}</div>
    <div style="font-size:13px;color:#6B6B8D;margin-top:8px;display:flex;gap:16px;flex-wrap:wrap;">
      ${hs.employees ? `<span><strong style="color:#1A1A2E;">${hs.employees}</strong> empleados</span>` : ""}
      ${hs.country ? `<span>${countryLabel[country] ?? country}</span>` : ""}
      ${hs.industry ? `<span>${esc(hs.industry)}</span>` : ""}
    </div>
  </div>

  <!-- Context -->
  <div style="margin-top:36px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:10px;border-bottom:1px solid #FFB8C8;">Contexto de la empresa</div>
    <p style="font-size:14px;line-height:1.7;color:#4A4A6A;margin-top:14px;">${esc(analysis.company_context ?? "")}</p>
  </div>

  <!-- Pains -->
  <div style="margin-top:36px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:10px;border-bottom:1px solid #FFB8C8;">Pains identificados en conversaciones</div>
    <div style="margin-top:8px;">${painHtml}</div>
  </div>

  <!-- Modules -->
  <div style="margin-top:36px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:10px;border-bottom:1px solid #FFB8C8;">Módulos y ahorro estimado</div>
    ${modulesHtml}
  </div>

  <!-- ROI Summary -->
  <div style="margin-top:40px;padding:32px;background:#F8F8FC;border-radius:10px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9999BB;margin-bottom:24px;">Retorno de la inversión estimado</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">Ahorro total</div>
        <div style="font-size:28px;font-weight:800;color:#FF355E;letter-spacing:-.03em;margin-top:6px;">€${fmtEur(roi.total_savings)}</div>
        <div style="font-size:12px;color:#9999BB;">/ año</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">Inversión Factorial</div>
        <div style="font-size:28px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:6px;">€${fmtEur(roi.annual_cost)}</div>
        <div style="font-size:12px;color:#9999BB;">/ año</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">ROI estimado</div>
        <div style="font-size:28px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:6px;">${roi.roi_pct}%</div>
        <div style="font-size:12px;color:#9999BB;">retorno neto</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">Payback</div>
        <div style="font-size:28px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:6px;">${roi.payback_months}</div>
        <div style="font-size:12px;color:#9999BB;">meses</div>
      </div>
    </div>
  </div>

  <!-- Methodology -->
  <div style="margin-top:32px;padding:22px 28px;background:#F4F4FA;border-radius:8px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;margin-bottom:10px;">Transparencia metodológica</div>
    <p style="font-size:12px;color:#8888AA;line-height:1.75;">
      Este análisis combina datos de conversaciones registradas
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 5px;border-radius:3px;background:#D1FAE5;color:#065F46;">HECHO</span>
      con estimaciones basadas en benchmarks de empresas de tamaño y sector similar
      <span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 5px;border-radius:3px;background:#FEF3C7;color:#92400E;">ASUNCIÓN</span>.
      Los valores de asunción corresponden a promedios conservadores de nuestra base de clientes.
      Los ahorros estimados representan el orden de magnitud del ROI, no valores exactos.
      Todas las cifras son estimaciones antes de validación conjunta con el cliente.
    </p>
  </div>

  <!-- Footer -->
  <div style="margin-top:36px;padding-top:20px;border-top:1px solid #E8E8F0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:11px;font-weight:800;color:#FF355E;letter-spacing:-.01em;">Propel ROI · Factorial</div>
    <div style="font-size:11px;color:#AAAACC;">Generado automáticamente a partir de conversaciones y benchmarks del sector</div>
  </div>

</div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });

    const { deal_url, language = "es", annual_cost_override } = await req.json();
    if (!deal_url) throw new Error("deal_url is required");

    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (data: Record<string, unknown>) => {
          try { controller.enqueue(enc.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
        };

        try {
          // 1. HubSpot
          emit({ step: "hubspot", status: "running", label: "Buscando deal en HubSpot..." });
          const hs = await fetchHubspot(deal_url);
          emit({ step: "hubspot", status: "done", label: "Deal encontrado", detail: `${hs.company_name || hs.deal_name} · ${hs.employees ?? "?"} emp · ${hs.country ?? "?"}` });

          // 2. Modjo
          emit({ step: "modjo", status: "running", label: "Buscando llamadas en Modjo..." });
          const modjoKey = Deno.env.get("MODJO_V2_API_KEY") ?? Deno.env.get("MODJO_API_KEY") ?? "";
          const calls = modjoKey ? await fetchModjoCalls(hs.company_name ?? hs.deal_name, hs.deal_id, modjoKey).catch(() => []) : [];
          emit({ step: "modjo", status: "done", label: "Llamadas Modjo", detail: calls.length ? `${calls.length} llamada${calls.length !== 1 ? "s" : ""} encontrada${calls.length !== 1 ? "s" : ""}` : "Sin llamadas — usando notas HubSpot" });

          // 3. Transcripts
          const topCalls = calls.slice(0, 3);
          let transcripts: string[] = [];
          if (topCalls.length > 0 && modjoKey) {
            emit({ step: "transcripts", status: "running", label: `Descargando ${topCalls.length} transcript${topCalls.length !== 1 ? "s" : ""}...` });
            transcripts = (await Promise.all(topCalls.map((c: any) => fetchTranscript(c.callId, modjoKey)))).filter(Boolean);
            emit({ step: "transcripts", status: "done", label: "Transcripts", detail: `${transcripts.filter(t => t.length > 100).length} con contenido` });
          } else {
            emit({ step: "transcripts", status: "done", label: "Transcripts", detail: "Usando notas de HubSpot como fuente" });
          }

          // 4. Claude
          emit({ step: "claude", status: "running", label: "Analizando con Claude..." });
          const analysis = await analyzeWithClaude(hs, transcripts, language);
          const moduleIds = (analysis.modules ?? []).map((m: any) => MODULE_LABELS[m.id] ?? m.id);
          emit({ step: "claude", status: "done", label: "Análisis completado", detail: `${moduleIds.join(", ")}` });

          // 5. ROI
          emit({ step: "roi", status: "running", label: "Calculando ROI..." });
          const roi = calculateRoi(hs, analysis, annual_cost_override ? Number(annual_cost_override) : undefined);
          emit({ step: "roi", status: "done", label: "ROI calculado", detail: `Ahorro: €${fmtEur(roi.total_savings)}/año · ROI: ${roi.roi_pct}%` });

          // 6. HTML
          emit({ step: "html", status: "running", label: "Generando documento..." });
          const html = buildHtml(hs, analysis, roi, language);

          emit({ step: "result", status: "done", label: "Listo", html, roi_data: roi, analysis, company: hs });

        } catch (err: any) {
          emit({ step: "error", status: "error", label: "Error", detail: err.message ?? "Error desconocido" });
        }

        try { controller.close(); } catch { /* already closed */ }
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
