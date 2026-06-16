import { createClient } from "npm:@supabase/supabase-js@2";

const AZURE_URL = "https://partners-bizdev-ai.services.ai.azure.com/anthropic/v1/messages";
async function azureFetch(body: Record<string, unknown>, timeoutMs = 55000): Promise<Response> {
  const k = Deno.env.get("AZURE_ANTHROPIC_API_KEY");
  if (!k) throw new Error("AZURE_ANTHROPIC_API_KEY not set");
  const h = { "x-api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
  for (let a = 0; a <= 2; a++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    try {
      const r = await fetch(AZURE_URL, { method: "POST", headers: h, body: JSON.stringify(body), signal: c.signal });
      clearTimeout(t);
      if (r.status === 429 && a < 2) { await new Promise(x => setTimeout(x, 25000)); continue; }
      return r;
    } catch (e) { clearTimeout(t); if (a < 2) { await new Promise(x => setTimeout(x, 3000)); continue; } throw e; }
  }
  throw new Error("Azure: max retries exceeded");
}

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
    required: ["modules", "company_context"],
    properties: {
      company_context: { type: "string", description: "2-3 sentence summary of the company situation" },
      modules: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "pain_type", "pain_title", "pain_description", "hours_employee", "hours_hr", "hours_manager", "source_employee", "source_hr", "source_manager"],
          properties: {
            id: { type: "string" },
            pain_type: { type: "string", enum: ["TIEMPO", "HERRAMIENTA", "DATOS", "CUMPLIMIENTO", "CRECIMIENTO"], description: "Use HERRAMIENTA only if the company explicitly mentions a specific tool to replace. Default is TIEMPO." },
            pain_title: { type: "string", description: "One sentence: the main pain this module solves" },
            pain_description: { type: "string", description: "1 sentence (max 25 words). Specific to this company. For the 'core' module, always mention at least one of: documentos, firma digital, contratos, or nóminas — because Core includes document management and digital signatures." },
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
   Añade otros SOLO si hay evidencia muy clara en los transcripts. Máximo 5 módulos.

2. Para cada módulo, escribe pain_title y pain_description explicando POR QUÉ necesitan ese módulo.
   Sé específico para esta empresa. Usa pain_type apropiado.

3. Horas estimadas — usa VALORES BAJOS y CONSERVADORES (empresa <100 emp):

   core:          employee=0.2, hr=1.5, manager=0.25
   (Core incluye portal del empleado, onboarding, documentos y firma digital.
   Las horas de Core deben reflejar también el tiempo en gestión documental:
   envío de contratos, firma de documentos, PRL, nóminas — todo lo que hoy va por email o papel.)
   time_off:      employee=0.1, hr=1.5, manager=0.5
   time_tracking: employee=0.2, hr=3.5, manager=0.25
   payroll:       employee=0.0, hr=2.0, manager=0.25
   documents:     employee=0.2, hr=1.0, manager=0.2
   recruitment:   employee=0.0, hr=3.0, manager=1.0

   Solo ajusta HACIA ARRIBA si el transcript tiene señal explícita muy fuerte
   ("nos pasa todo el día", "X horas al día"). Máximo 1.5× el default.
   Si no se menciona en el transcript, usa 0.7× el default (menos del default).
   NUNCA superes estas caps: employee=0.5, hr=8.0, manager=1.0 h/mes.

   source="transcript" si hay evidencia real, "assumption" si es estimación.

4. tool_replacements: SOLO si se menciona explícitamente una herramienta a reemplazar.
   Precios orientativos (ya incluyen -20% de descuento):
   - Terminales Fichem/hardware: €900/año (amortizado)
   - Bizneo/Sesame: €${Math.round((hs.employees ?? 50) * 3.2 * 12)}/año
   - Personio: €${Math.round((hs.employees ?? 50) * 3.6 * 12)}/año
   - Excel/manual: €0 (no es tool replacement)

Módulos disponibles (usa SOLO estos IDs exactos): core, time_off, time_tracking, time_planning, payroll, compensations, recruitment, performance, expenses, trainings, complaints, engagement, benefits_standard.`;

  const res = await azureFetch({
    model: "claude-opus-4-6",
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
  time_off: "Gestión de Ausencias",
  time_tracking: "Control Horario",
  time_planning: "Planificación de Turnos",
  payroll: "Nómina",
  compensations: "Compensaciones",
  recruitment: "Selección de Personal",
  performance: "Evaluación del Desempeño",
  expenses: "Gestión de Gastos",
  trainings: "Formación",
  complaints: "Canal de Denuncias",
  engagement: "Clima Laboral",
  benefits_standard: "Beneficios para Empleados",
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

  // Core always first, then rest
  const modules: any[] = [...(analysis.modules ?? [])];
  const coreIdx = modules.findIndex((m: any) => m.id === "core");
  if (coreIdx > 0) modules.unshift(modules.splice(coreIdx, 1)[0]);

  const PAGE_SIZE = 5;
  const totalModules = modules.length;

  // Build each module row — clean, no boxes
  function moduleRow(m: any, idx: number): string {
    const mRoi = roi.modules.find((r: any) => r.id === m.id);
    const annual = Math.round((mRoi?.annual_savings ?? 0) / 100) * 100; // round to nearest €100
    const tool = (analysis.tool_replacements ?? []).find((t: any) => t.module_id === m.id);
    const num = String(idx + 1).padStart(2, "0");

    const parts = [
      m.hours_employee > 0 ? `~${m.hours_employee} h/mes por empleado` : null,
      m.hours_hr > 0 ? `~${m.hours_hr} h/mes por admin de RRHH` : null,
      m.hours_manager > 0 ? `~${m.hours_manager} h/mes por responsable` : null,
    ].filter(Boolean);

    const hasTranscript = [m.source_employee, m.source_hr, m.source_manager].includes("transcript");
    const sourceNote = hasTranscript ? "basado en conversaciones" : "estimación sectorial";

    const toolNote = tool
      ? ` · reemplaza ${esc(tool.tool_name)} (~€${fmtEur(Math.round(tool.annual_cost_eur / 100) * 100)}/año estimado)`
      : "";

    return `
    <div style="padding:14px 0;border-bottom:1px solid #EBEBF0;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;">
        <div style="display:flex;align-items:baseline;gap:12px;flex:1;min-width:0;">
          <span style="font-size:11px;font-weight:800;color:#FF355E;letter-spacing:.02em;flex-shrink:0;">${num}</span>
          <span style="font-size:14px;font-weight:800;color:#1A1A2E;">${esc(MODULE_LABELS[m.id] ?? m.id)}</span>
        </div>
        <span style="font-size:16px;font-weight:800;color:#FF355E;letter-spacing:-.02em;white-space:nowrap;flex-shrink:0;">€${fmtEur(annual)}<span style="font-size:10px;font-weight:500;color:#AAAACC;">/año</span></span>
      </div>
      <p style="font-size:12.5px;color:#4A4A6A;margin-top:4px;line-height:1.55;padding-left:24px;">${esc(m.pain_description ?? m.pain_title ?? "")}</p>
      ${parts.length > 0 ? `<p style="font-size:11px;color:#AAAACC;margin-top:6px;padding-left:24px;">${parts.map(esc).join(" · ")}${toolNote} — ${sourceNote}</p>` : ""}
    </div>`;
  }

  // Split into pages of PAGE_SIZE modules
  const pages: string[] = [];
  for (let p = 0; p < Math.ceil(totalModules / PAGE_SIZE); p++) {
    const slice = modules.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
    pages.push(slice.map((m: any, i: number) => moduleRow(m, p * PAGE_SIZE + i)).join(""));
  }

  const headerHtml = `
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #FF355E;">
    <img src="https://factorialhr.com/images/factorial-logo.svg" alt="Factorial" style="height:22px;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div style="display:none;font-size:17px;font-weight:800;color:#FF355E;letter-spacing:-.03em;">factorial</div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">Análisis ROI Estimado</div>
      <div style="font-size:11px;color:#9999BB;margin-top:3px;">${esc(date)} · Confidencial</div>
    </div>
  </div>
  <!-- Company -->
  <div style="margin-top:18px;">
    <div style="font-size:27px;font-weight:800;color:#1A1A2E;letter-spacing:-.025em;line-height:1.1;">${esc(hs.company_name ?? hs.deal_name ?? "")}</div>
    <div style="font-size:12px;color:#8888AA;margin-top:5px;display:flex;gap:12px;flex-wrap:wrap;">
      ${hs.employees ? `<span><strong style="color:#1A1A2E;">${hs.employees}</strong> empleados</span>` : ""}
      ${hs.country ? `<span>${countryLabel[country] ?? country}</span>` : ""}
      ${hs.industry ? `<span>${esc(hs.industry)}</span>` : ""}
    </div>
  </div>
  <!-- Context -->
  <div style="margin-top:20px;padding-bottom:18px;border-bottom:1px solid #EBEBF0;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;margin-bottom:8px;">Contexto</div>
    <p style="font-size:12.5px;line-height:1.65;color:#4A4A6A;">${esc(analysis.company_context ?? "")}</p>
  </div>`;

  const modulesHeaderHtml = `
  <div style="margin-top:20px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">Módulos recomendados y ahorro estimado</div>
      <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#CCCCDD;">Ahorro anual</div>
    </div>
    <div style="font-size:9px;color:#AAAACC;font-style:italic;margin-bottom:4px;">Todo el ahorro está basado en estimaciones de horas/mes por tipo de trabajador</div>`;

  const roiHtml = `
  <!-- ROI Summary -->
  <div style="margin-top:24px;padding:20px 24px;background:#F8F8FC;border-radius:6px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9999BB;margin-bottom:16px;">Retorno de la inversión estimado</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">Ahorro total</div>
        <div style="font-size:22px;font-weight:800;color:#FF355E;letter-spacing:-.03em;margin-top:4px;">€${fmtEur(roi.total_savings)}</div>
        <div style="font-size:10px;color:#AAAACC;">/año</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">Inversión</div>
        <div style="font-size:22px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:4px;">€${fmtEur(roi.annual_cost)}</div>
        <div style="font-size:10px;color:#AAAACC;">/año</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">ROI estimado</div>
        <div style="font-size:22px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:4px;">${roi.roi_pct}%</div>
        <div style="font-size:10px;color:#AAAACC;">retorno neto</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">Payback</div>
        <div style="font-size:22px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:4px;">${roi.payback_months}</div>
        <div style="font-size:10px;color:#AAAACC;">meses</div></div>
    </div>
  </div>
  <!-- Methodology -->
  <div style="margin-top:16px;padding:14px 18px;background:#F4F4FA;border-radius:5px;">
    <p style="font-size:10.5px;color:#9999BB;line-height:1.7;">Las horas indicadas son estimaciones conservadoras del tiempo que Factorial libera mensualmente por tipo de trabajador (empleados, administración de RRHH y responsables). Todas las cifras son asunciones basadas en benchmarks de empresas de tamaño similar, salvo donde se indique "basado en conversaciones". Requieren validación conjunta con el cliente.</p>
  </div>
  <!-- Footer -->
  <div style="margin-top:18px;padding-top:12px;border-top:1px solid #EBEBF0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;font-weight:800;color:#FF355E;">Propel ROI · Factorial</div>
    <div style="font-size:10px;color:#CCCCDD;">Generado a partir de conversaciones y benchmarks del sector</div>
  </div>`;

  // Build pages HTML — each page is a self-contained .page div
  const pagesHtml = pages.map((modHtml, pi) => {
    const isFirst = pi === 0;
    const isLast = pi === pages.length - 1;

    let content = "";
    if (isFirst) {
      content += headerHtml;
      content += modulesHeaderHtml;
      content += modHtml;
      content += `</div>`; // close modules div
    } else {
      // Continuation pages: full header identical to first page
      content += `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid #FF355E;">
        <img src="https://factorialhr.com/images/factorial-logo.svg" alt="Factorial" style="height:22px;" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div style="display:none;font-size:17px;font-weight:800;color:#FF355E;letter-spacing:-.03em;">factorial</div>
        <div style="text-align:right;">
          <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">Análisis ROI Estimado · ${esc(hs.company_name ?? "")}</div>
          <div style="font-size:11px;color:#9999BB;margin-top:3px;">Hoja ${pi + 1} de ${pages.length} · Confidencial</div>
        </div>
      </div>
      <div style="margin-top:16px;">${modHtml}</div>`;
    }
    if (isLast) {
      content += roiHtml;
    }
    return `<div class="page">${content}</div>`;
  }).join('\n');

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
html { background: #E4E4EC; min-height: 100%; }
body { font-family: 'Inter', -apple-system, sans-serif; color: #1A1A2E; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; min-height: 297mm; margin: 24px auto; background: #fff; padding: 16mm 18mm 18mm; box-shadow: 0 4px 32px rgba(0,0,0,.14); }
@media print {
  html { background: #fff; }
  .page { margin: 0; box-shadow: none; width: 100%; padding: 14mm 18mm; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;

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
html { background: #E4E4EC; min-height: 100%; }
body { font-family: 'Inter', -apple-system, sans-serif; color: #1A1A2E; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; min-height: 297mm; margin: 24px auto; background: #fff; padding: 16mm 18mm 18mm; box-shadow: 0 4px 32px rgba(0,0,0,.14); }
@media print {
  html { background: #fff; }
  .page { margin: 0; box-shadow: none; width: 100%; padding: 14mm 18mm; }
}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #FF355E;">
    <div style="font-size:18px;font-weight:800;color:#FF355E;letter-spacing:-.03em;">factorial</div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">Análisis ROI Estimado</div>
      <div style="font-size:11px;color:#9999BB;margin-top:3px;">${esc(date)} · Confidencial</div>
    </div>
  </div>

  <!-- Company -->
  <div style="margin-top:20px;">
    <div style="font-size:28px;font-weight:800;color:#1A1A2E;letter-spacing:-.025em;line-height:1.1;">${esc(hs.company_name ?? hs.deal_name ?? "")}</div>
    <div style="font-size:12px;color:#6B6B8D;margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;">
      ${hs.employees ? `<span><strong style="color:#1A1A2E;">${hs.employees}</strong> empleados</span>` : ""}
      ${hs.country ? `<span>${countryLabel[country] ?? country}</span>` : ""}
      ${hs.industry ? `<span>${esc(hs.industry)}</span>` : ""}
    </div>
  </div>

  <!-- Context -->
  <div style="margin-top:24px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:8px;border-bottom:1px solid #FFB8C8;">Contexto</div>
    <p style="font-size:13px;line-height:1.65;color:#4A4A6A;margin-top:10px;">${esc(analysis.company_context ?? "")}</p>
  </div>

  <!-- Modules (with integrated pains) -->
  <div style="margin-top:24px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:8px;border-bottom:1px solid #FFB8C8;">Módulos recomendados y ahorro estimado</div>
    ${modulesHtml}
  </div>

  <!-- ROI Summary -->
  <div style="margin-top:28px;padding:24px 28px;background:#F8F8FC;border-radius:8px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9999BB;margin-bottom:20px;">Retorno de la inversión estimado</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">Ahorro total</div>
        <div style="font-size:24px;font-weight:800;color:#FF355E;letter-spacing:-.03em;margin-top:5px;">€${fmtEur(roi.total_savings)}</div>
        <div style="font-size:11px;color:#9999BB;">/año</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">Inversión</div>
        <div style="font-size:24px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:5px;">€${fmtEur(roi.annual_cost)}</div>
        <div style="font-size:11px;color:#9999BB;">/año</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">ROI estimado</div>
        <div style="font-size:24px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:5px;">${roi.roi_pct}%</div>
        <div style="font-size:11px;color:#9999BB;">retorno neto</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">Payback</div>
        <div style="font-size:24px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:5px;">${roi.payback_months}</div>
        <div style="font-size:11px;color:#9999BB;">meses</div>
      </div>
    </div>
  </div>

  <!-- Methodology -->
  <div style="margin-top:20px;padding:18px 22px;background:#F4F4FA;border-radius:6px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;margin-bottom:8px;">Metodología</div>
    <p style="font-size:11px;color:#8888AA;line-height:1.7;">
      Análisis basado en conversaciones registradas
      <span style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 5px;border-radius:3px;background:#D1FAE5;color:#065F46;">HECHO</span>
      y benchmarks de empresas de tamaño similar
      <span style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 5px;border-radius:3px;background:#FEF3C7;color:#92400E;">ASUNCIÓN</span>.
      Estimaciones conservadoras. Las cifras representan el orden de magnitud, no valores exactos. Requieren validación conjunta.
    </p>
  </div>

  <!-- Footer -->
  <div style="margin-top:20px;padding-top:14px;border-top:1px solid #E8E8F0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;font-weight:800;color:#FF355E;">Propel ROI · Factorial</div>
    <div style="font-size:10px;color:#AAAACC;">Generado a partir de conversaciones y benchmarks del sector</div>
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

    const body = await req.json();
    const { mode, language = "es", annual_cost_override } = body;

    const enc = new TextEncoder();

    // ── html_only mode: regenerate from existing analysis + module overrides ──
    if (mode === "html_only") {
      const { hs_data, existing_analysis, selected_modules, module_notes = {} } = body;
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (data: Record<string, unknown>) => {
            try { controller.enqueue(enc.encode(JSON.stringify(data) + "\n")); } catch { /* closed */ }
          };
          try {
            emit({ step: "claude", status: "running", label: "Regenerando argumentación con tus instrucciones..." });

            // Build ordered module list (core first, then selected order)
            const moduleList = selected_modules.map(id => {
              const orig = (existing_analysis.modules ?? []).find((m: any) => m.id === id);
              return orig ?? { id, hours_employee: 0.1, hours_hr: 1.0, hours_manager: 0.25, source_employee: "assumption", source_hr: "assumption", source_manager: "assumption" };
            });
            const coreIdx = moduleList.findIndex((m: any) => m.id === "core");
            if (coreIdx > 0) moduleList.unshift(moduleList.splice(coreIdx, 1)[0]);

            const moduleInstructions = moduleList.map((m: any) => {
              const note = module_notes[m.id];
              const isNew = !(existing_analysis.modules ?? []).find((x: any) => x.id === m.id);
              return `- ${MODULE_LABELS[m.id] ?? m.id}${note ? `\n  INSTRUCCIÓN AE: "${note}"` : ""}${isNew ? "\n  (módulo nuevo, no había en análisis original)" : ""}`;
            }).join("\n");

            const user = `EMPRESA: ${hs_data?.company_name ?? ""}, ${hs_data?.employees ?? "?"} empleados, ${hs_data?.country ?? ""}, ${hs_data?.industry ?? ""}
CONTEXTO: ${existing_analysis?.company_context ?? ""}

Genera o actualiza la descripción de cada módulo para el one-pager ROI.

REGLAS:
1. pain_title: max 12 palabras, específico para esta empresa
2. pain_description: 1 frase, max 20 palabras, menciona la consecuencia de negocio concreta
3. INSTRUCCIÓN AE "precio de [tool]" o "ahorro es dejar de pagar [tool]" → añade ese módulo a tool_replacements con tool_name y annual_cost_eur estimado (precio de mercado de esa herramienta -20%)
4. INSTRUCCIÓN AE "como [otro módulo]" → adapta el argumento al contexto de esta empresa para este módulo específico
5. INSTRUCCIÓN AE sobre horas → ajusta hours_employee/hours_hr/hours_manager
6. Sin INSTRUCCIÓN AE → genera descripción basada en el contexto de la empresa y benchmarks del sector
7. NUNCA copies la instrucción del AE textualmente como pain_description

MÓDULOS:
${moduleInstructions}

Módulos actuales del análisis:
${JSON.stringify(moduleList, null, 2)}

Devuelve JSON exacto:
{
  "modules": [{ "id": "...", "pain_type": "TIEMPO|HERRAMIENTA|DATOS|CUMPLIMIENTO|CRECIMIENTO", "pain_title": "...", "pain_description": "...", "hours_employee": 0, "hours_hr": 0, "hours_manager": 0, "source_employee": "assumption|transcript", "source_hr": "assumption|transcript", "source_manager": "assumption|transcript" }],
  "tool_replacements": [{ "module_id": "...", "tool_name": "...", "annual_cost_eur": 0 }]
}`;

            const res = await azureFetch({
              model: "claude-opus-4-6",
              max_tokens: 2048,
              system: "Eres un analista de ventas de Factorial. Genera argumentación de ROI en español. Responde SOLO con el JSON pedido, sin markdown ni comentarios.",
              messages: [{ role: "user", content: user }],
            }, 45000);

            const filteredAnalysis = { ...existing_analysis, modules: moduleList, tool_replacements: existing_analysis.tool_replacements ?? [] };

            if (res.ok) {
              const rb = await res.json();
              const text = rb.content?.[0]?.text ?? "";
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.modules) filteredAnalysis.modules = parsed.modules;
                  if (parsed.tool_replacements?.length) filteredAnalysis.tool_replacements = parsed.tool_replacements;
                } catch { /* keep original */ }
              }
            }

            emit({ step: "claude", status: "done", label: "Argumentación generada" });

            const roi = calculateRoi(hs_data, filteredAnalysis, annual_cost_override ? Number(annual_cost_override) : undefined);
            emit({ step: "html", status: "running", label: "Generando documento..." });
            const html = buildHtml(hs_data, filteredAnalysis, roi, language);
            emit({ step: "html", status: "done", label: "Documento generado" });
            emit({ step: "result", status: "done", label: "Listo", html, roi_data: roi, analysis: filteredAnalysis, company: hs_data });
          } catch (err: any) {
            emit({ step: "error", status: "error", label: "Error", detail: err.message ?? "Error" });
          }
          try { controller.close(); } catch { /* */ }
        },
      });
      return new Response(stream, { headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" } });
    }

    const { deal_url } = body;
    if (!deal_url) throw new Error("deal_url is required");

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
