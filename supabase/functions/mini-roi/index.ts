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
      if (r.status === 429 && a < 2) { await new Promise(x => setTimeout(x, 65000)); continue; }
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
    // Speed: fetch summary first — much less tokens than full transcript
    const sumRes = await modjoGet(key, `/calls/${callId}/summaries`).catch(() => ({ data: [] }));
    const summary = (sumRes.data ?? [])[0]?.answer ?? "";
    if (summary && summary.length > 100) return `[RESUMEN]\n${summary}`;
    // Fallback: brief transcript if no useful summary
    const trRes = await modjoGet(key, `/calls/${callId}/transcript`).catch(() => ({ data: [] }));
    const segments = (trRes.data ?? []).slice(0, 30);
    const transcript = segments.map((s: any) => `${s.speaker?.name ?? "?"}: ${s.content}`).join("\n");
    return transcript ? `[TRANSCRIPT]\n${transcript}` : "";
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
      company_context: { type: "string", description: "2-3 sentences addressed directly to the company (second person plural: vosotros/vuestra). Start from what they live daily, not from what is missing. Natural flowing prose, no em dashes, no fragments. Mention specific tools they use and the concrete consequence of the current situation. End with what Factorial would solve for them." },
      modules: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "pain_type", "pain_title", "pain_description", "hours_employee", "hours_hr", "hours_manager", "source_employee", "source_hr", "source_manager"],
          properties: {
            id: { type: "string" },
            pain_type: { type: "string", enum: ["TIEMPO", "HERRAMIENTA", "DATOS", "CUMPLIMIENTO", "CRECIMIENTO"], description: "Use HERRAMIENTA only if the company explicitly mentions a specific tool to replace. Default is TIEMPO." },
            pain_title: { type: "string", description: "Short title: the specific situation at this company that this module fixes (max 10 words, no generic labels)" },
            pain_description: { type: "string", description: "1 sentence max 25 words. Address the company directly (second person). State the specific daily consequence they experience and why it happens (name the tool/process if known). Natural prose, no em dashes." },
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

  const targetLanguage = LANG_NAMES[lang] ?? "Spanish";
  const system = `You are an expert ROI consultant for Factorial (HR SaaS). You write documents presented directly to the prospect company.

LANGUAGE: Write ALL generated text (company_context, pain_title, pain_description) in ${targetLanguage}.

WRITING TONE — mandatory:
- Address the company in second person in the target language.
- Start from the consequence they experience daily, not from the missing feature.
- Natural flowing prose. No em dashes, no fragments, no "The challenge:".
- Mention specific tools when known (Plaza HR, Continia, SAP...).
- Consultant tone: specific and direct, no generic filler.

Be conservative: when in doubt, use the lower value.`;

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

2. Para cada módulo, escribe pain_title y pain_description siguiendo el tono del sistema:
   segunda persona, consecuencia primero, herramientas concretas, prosa fluida.
   Usa pain_type apropiado.

3. REGLAS CRÍTICAS PARA LAS HORAS — lee con atención:

   REGLA 1 — CERO por defecto, no defaults:
   Empieza con hours_employee=0, hours_hr=0, hours_manager=0 para cada módulo.
   Solo asigna horas a un stakeholder si el transcript lo menciona EXPLÍCITAMENTE
   como el que tiene el pain o pierde el tiempo. Si solo se menciona al HR, el
   empleado y el manager quedan a 0. Si no se menciona nadie, todos quedan a 0.

   REGLA 2 — Intensidad del pain determina las horas:
   - "explicit": prospect dice "X horas al día/semana" → convierte a h/mes
   - "strong": señales fuertes ("todo el día", "cada día", "muy manual") → usa tabla
   - "weak": lo mencionan como problema pero sin urgencia → tabla × 0.5
   - "none": no mencionado → 0 (no asumas nada)

   TABLA de horas para señal "strong" (punto de partida, no valor automático):
   core:          hr=2.0, employee=0.2, manager=0.5
   time_off:      hr=2.0, employee=0.1, manager=0.5
   time_tracking: hr=4.0, employee=0.2, manager=0.3
   payroll:       hr=2.0, employee=0.0, manager=0.3
   recruitment:   hr=3.0, employee=0.0, manager=1.0
   performance:   hr=1.5, employee=0.2, manager=0.8
   trainings:     hr=2.0, employee=0.1, manager=0.3
   compensations: hr=1.5, employee=0.0, manager=0.5
   expenses:      hr=1.5, employee=0.3, manager=0.5
   engagement:    hr=1.0, employee=0.0, manager=0.3
   procurement:   hr=1.5, employee=0.0, manager=0.5

   REGLA 3 — Contexto del sector importa:
   - Empresa industrial/hostelería/manufactura: employees suelen ser trabajadores
     de planta sin ordenador → hours_employee=0 salvo que digan lo contrario
   - Empresa de servicios/tech/consultoría: employees más digitalizados → considera
     hours_employee si el módulo afecta al trabajador (ausencias, gastos, formación)

   source="transcript" SOLO si el prospect dijo un número EXACTO de horas o días (ej: "3 horas al día", "un día a la semana").
   source="assumption" para TODO lo demás: señales cualitativas ("todo el día", "muy manual"), valores de la tabla, o inferencias.
   Regla: si tú calculaste o estimaste las horas, aunque sea a partir de algo que dijeron, es "assumption".

4. tool_replacements: SOLO si se menciona explícitamente una herramienta a reemplazar.
   Asigna module_id al módulo de Factorial que la sustituye.
   Precios orientativos (ya incluyen -20% de descuento conservador):
   IMPORTANTE: si el prospect mencionó un precio EXACTO (ej: "nos cuesta 4000"), usa ESE precio directamente sin aplicar descuento.

   HRIS / Core HR → module_id="core":
   - Bizneo HR, Sesame HR, cualquier HRIS genérico: €${Math.round((hs.employees ?? 50) * 3.2 * 12)}/año
   - Personio: €${Math.round((hs.employees ?? 50) * 3.6 * 12)}/año
   - ADP, SAP SuccessFactors, Workday: €${Math.round((hs.employees ?? 50) * 6.4 * 12)}/año

   Control Horario → module_id="time_tracking":
   - Terminales Fichem / hardware de fichaje: €900/año (amortizado)
   - Software de fichaje standalone: €${Math.round((hs.employees ?? 50) * 2.4 * 12)}/año

   Ausencias → module_id="time_off":
   - Gestor de ausencias standalone: €${Math.round((hs.employees ?? 50) * 2.0 * 12)}/año

   NO incluyas tool_replacement si usan Excel/papel/manual (eso es solo ahorro de tiempo)
   NO incluyas tool_replacement si el precio no es claro del transcript

Módulos disponibles (usa SOLO estos IDs exactos): core, time_off, time_tracking, time_planning, payroll, compensations, recruitment, performance, expenses, trainings, complaints, engagement, benefits_standard.`;

  const res = await azureFetch({
    model: "claude-opus-4-6",
    max_tokens: 2000,
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
    const toolReplacement = toolMap[m.id] ?? 0;
    // Tool replacement and hours are mutually exclusive:
    // if a tool is being replaced, its cost IS the saving — don't add hours on top
    const annual = toolReplacement > 0
      ? toolReplacement
      : ((m.hours_employee ?? 0) * headcounts.employee * hourly_costs.employee +
         (m.hours_hr ?? 0) * headcounts.hr * hourly_costs.hr +
         (m.hours_manager ?? 0) * headcounts.manager * hourly_costs.manager) * 12;
    totalSavings += annual;
    return { id: m.id, annual_savings: Math.round(annual), tool_replacement: toolReplacement };
  });

  // Suggested price: ~€5/emp/mes for ES, scaled by country
  const PEPM = { ES: 5, FR: 6, DE: 7, IT: 5.5, PT: 4, BR: 3, MX: 3 } as Record<string, number>;
  const suggestedCost = Math.round((PEPM[country] ?? 5) * emp * 12);
  const annualCost = annualCostOverride ?? suggestedCost;

  const roi_pct = annualCost > 0 ? Math.round(((totalSavings - annualCost) / annualCost) * 100) : 0;
  const payback_months = totalSavings > 0 ? Math.round((annualCost / totalSavings) * 12) : 0;

  return { modules: moduleSavings, total_savings: Math.round(totalSavings), annual_cost: annualCost, roi_pct: Math.max(0, roi_pct), payback_months, headcounts, hourly_costs };
}

// ── HTML 1-pager ──────────────────────────────────────────────────────────────

const MODULE_LABELS_I18N: Record<string, Record<string, string>> = {
  es: { core: "Plataforma del Empleado / Core", time_off: "Gestión de Ausencias", time_tracking: "Control Horario", time_planning: "Gestión de Turnos", payroll: "Nómina", compensations: "Compensaciones", recruitment: "Selección de Personal", performance: "Gestión de Desempeño", expenses: "Gestión de Gastos", trainings: "Formaciones", complaints: "Canal Seguro", engagement: "Engagement", benefits_standard: "Beneficios", headcount_planning: "Planificación de Plantilla", lms: "LMS", space: "Gestión de Espacios", it_inventory: "Inventario de IT", one: "Factorial One (IA)" },
  en: { core: "Employee Platform / Core", time_off: "Time Off", time_tracking: "Time Tracking", time_planning: "Shift Management", payroll: "Payroll Connect", compensations: "Compensation", recruitment: "Recruitment", performance: "Performance", expenses: "Expenses", trainings: "Training", complaints: "Trust Channel", engagement: "Engagement", benefits_standard: "Benefits", headcount_planning: "Headcount Planning", lms: "LMS", space: "Spaces", it_inventory: "IT Inventory", one: "Factorial One (AI)" },
  fr: { core: "Plateforme Employé / Core", time_off: "Congés", time_tracking: "Suivi du Temps", time_planning: "Gestion des Plannings", payroll: "Paie", compensations: "Rémunération", recruitment: "Recrutement", performance: "Performance", expenses: "Notes de Frais", trainings: "Formation", complaints: "Canal de Confiance", engagement: "Engagement", benefits_standard: "Avantages", headcount_planning: "Planification des Effectifs", lms: "LMS", space: "Espaces", it_inventory: "Inventaire IT", one: "Factorial One (IA)" },
  it: { core: "Employee Platform / Core", time_off: "Gestione Assenze", time_tracking: "Controllo Orario", time_planning: "Gestione Turni", payroll: "Paghe", compensations: "Compensi", recruitment: "Ricerca e Selezione", performance: "Gestione Performance", expenses: "Spese", trainings: "Formazione", complaints: "Canale Segnalazioni", engagement: "Coinvolgimento", benefits_standard: "Benefit", headcount_planning: "Pianificazione Personale", lms: "LMS", space: "Gestione Spazi", it_inventory: "Inventario IT", one: "Factorial One (IA)" },
  de: { core: "Mitarbeiterportal / Core", time_off: "Abwesenheiten", time_tracking: "Zeiterfassung", time_planning: "Schichtplanung", payroll: "Lohnabrechnung", compensations: "Vergütung", recruitment: "Recruitment", performance: "Performance", expenses: "Ausgaben", trainings: "Schulungen", complaints: "Hinweisgebersystem", engagement: "Engagement", benefits_standard: "Benefits", headcount_planning: "Personalplanung", lms: "LMS", space: "Raummanagement", it_inventory: "IT-Inventar", one: "Factorial One (KI)" },
  pt: { core: "Plataforma do Colaborador / Core", time_off: "Gestão de Ausências", time_tracking: "Controlo de Tempo", time_planning: "Gestão de Turnos", payroll: "Processamento Salarial", compensations: "Compensações", recruitment: "Recrutamento", performance: "Gestão de Desempenho", expenses: "Despesas", trainings: "Formações", complaints: "Canal Seguro", engagement: "Engagement", benefits_standard: "Benefícios", headcount_planning: "Planeamento de Headcount", lms: "LMS", space: "Gestão de Espaços", it_inventory: "Inventário de TI", one: "Factorial One (IA)" },
};

function getModuleLabel(id: string, lang: string): string {
  const labels = MODULE_LABELS_I18N[lang] ?? MODULE_LABELS_I18N.en;
  return labels[id] ?? MODULE_LABELS_I18N.en[id] ?? id;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function badge(source: string): string {
  if (source === "transcript") return `<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:3px;background:#D1FAE5;color:#065F46;">HECHO</span>`;
  return `<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 7px;border-radius:3px;background:#FEF3C7;color:#92400E;">ASUNCIÓN</span>`;
}

function buildHtml(hs: any, analysis: any, roi: RoiResult, lang: string): string {
  const dateLocale: Record<string, string> = { es: "es-ES", en: "en-GB", fr: "fr-FR", it: "it-IT", de: "de-DE", pt: "pt-PT" };
  const date = new Date().toLocaleDateString(dateLocale[lang] ?? "es-ES", { day: "numeric", month: "long", year: "numeric" });
  // L must be defined BEFORE ui to avoid circular reference
  const UI: Record<string, Record<string, string>> = {
    es: { title: "ANÁLISIS ROI ESTIMADO", per_year: "/año", source_transcript: "basado en conversaciones", source_assumption: "estimación sectorial", h_per_emp: "h/mes por empleado", h_per_hr: "h/mes por admin de RRHH", h_per_mgr: "h/mes por responsable", page_of: "Hoja {n} de {total}", confidential: "Confidencial", context: "Contexto", modules_header: "Módulos recomendados y ahorro estimado", modules_sub: "Todo el ahorro está basado en estimaciones de horas/mes por tipo de trabajador", savings_col: "Ahorro anual", roi_header: "Retorno de la inversión estimado", total_savings: "Ahorro total", investment: "Inversión", roi_est: "ROI estimado", payback: "Payback", net_return: "retorno neto", months: "meses", methodology: "Metodología", methodology_body: "Las horas indicadas son estimaciones conservadoras del tiempo que Factorial libera mensualmente por tipo de trabajador. Todas las cifras son asunciones basadas en benchmarks de empresas de tamaño similar, salvo donde se indique \"basado en conversaciones\". Requieren validación conjunta con el cliente.", staff_assumed: "Personal asumido", employees: "empleados", hr_admin: "admin de RRHH", managers: "responsables", hourly_cost: "Coste horario", per_emp: "h empleado", per_hr: "h admin", per_mgr: "h responsable", fact_label: "Propel ROI · Factorial", fact_sub: "Generado a partir de conversaciones y benchmarks del sector", replaces: "Reemplaza", estimated: "estimado", badge_fact: "HECHO", badge_assumption: "ASUNCIÓN", method_short: "Estimaciones conservadoras basadas en conversaciones y benchmarks de empresas similares. Requieren validación conjunta con el cliente." },
    en: { title: "ESTIMATED ROI ANALYSIS", per_year: "/year", source_transcript: "based on conversations", source_assumption: "sector estimate", h_per_emp: "h/month per employee", h_per_hr: "h/month per HR admin", h_per_mgr: "h/month per manager", page_of: "Page {n} of {total}", confidential: "Confidential", context: "Context", modules_header: "Recommended modules & estimated savings", modules_sub: "All savings are based on estimated hours/month by employee type", savings_col: "Annual savings", roi_header: "Estimated return on investment", total_savings: "Total savings", investment: "Investment", roi_est: "Estimated ROI", payback: "Payback", net_return: "net return", months: "months", methodology: "Methodology", methodology_body: "The hours indicated are conservative estimates of time Factorial frees up monthly by employee type. All figures are assumptions based on benchmarks from similar-sized companies, except where \"based on conversations\" is indicated. Require joint validation with the client.", staff_assumed: "Staff assumed", employees: "employees", hr_admin: "HR admins", managers: "managers", hourly_cost: "Hourly cost", per_emp: "h employee", per_hr: "h HR", per_mgr: "h manager", fact_label: "Propel ROI · Factorial", fact_sub: "Generated from conversations and industry benchmarks", replaces: "Replaces", estimated: "estimated", badge_fact: "FACT", badge_assumption: "ASSUMPTION", method_short: "Conservative estimates based on conversations and benchmarks from similar companies. Require joint validation with the client." },
    fr: { title: "ANALYSE ROI ESTIMÉE", per_year: "/an", source_transcript: "basé sur des conversations", source_assumption: "estimation sectorielle", h_per_emp: "h/mois par employé", h_per_hr: "h/mois par admin RH", h_per_mgr: "h/mois par manager", page_of: "Page {n} sur {total}", confidential: "Confidentiel", context: "Contexte", modules_header: "Modules recommandés et économies estimées", modules_sub: "Toutes les économies sont basées sur des estimations d'heures/mois par type d'employé", savings_col: "Économies annuelles", roi_header: "Retour sur investissement estimé", total_savings: "Économies totales", investment: "Investissement", roi_est: "ROI estimé", payback: "Payback", net_return: "retour net", months: "mois", methodology: "Méthodologie", methodology_body: "Les heures indiquées sont des estimations conservatives du temps libéré par Factorial chaque mois par type d'employé. Tous les chiffres sont des hypothèses basées sur des benchmarks d'entreprises de taille similaire. Nécessitent une validation conjointe.", staff_assumed: "Personnel estimé", employees: "employés", hr_admin: "admins RH", managers: "managers", hourly_cost: "Coût horaire", per_emp: "h employé", per_hr: "h RH", per_mgr: "h manager", fact_label: "Propel ROI · Factorial", fact_sub: "Généré à partir de conversations et benchmarks du secteur", replaces: "Remplace", estimated: "estimé", badge_fact: "FAIT", badge_assumption: "HYPOTHÈSE", method_short: "Estimations conservatrices basées sur des conversations et des benchmarks d'entreprises similaires. Nécessitent une validation conjointe." },
    it: { title: "ANALISI ROI STIMATA", per_year: "/anno", source_transcript: "basato su conversazioni", source_assumption: "stima settoriale", h_per_emp: "h/mese per dipendente", h_per_hr: "h/mese per admin HR", h_per_mgr: "h/mese per manager", page_of: "Pagina {n} di {total}", confidential: "Riservato", context: "Contesto", modules_header: "Moduli raccomandati e risparmi stimati", modules_sub: "Tutti i risparmi sono basati su ore/mese stimate per tipo di dipendente", savings_col: "Risparmio annuale", roi_header: "Ritorno stimato sull'investimento", total_savings: "Risparmio totale", investment: "Investimento", roi_est: "ROI stimato", payback: "Payback", net_return: "ritorno netto", months: "mesi", methodology: "Metodologia", methodology_body: "Le ore indicate sono stime conservative del tempo liberato da Factorial mensilmente per tipo di dipendente. Tutte le cifre sono stime basate su benchmark di aziende di dimensioni simili. Richiedono validazione congiunta con il cliente.", staff_assumed: "Personale stimato", employees: "dipendenti", hr_admin: "admin HR", managers: "manager", hourly_cost: "Costo orario", per_emp: "h dipendente", per_hr: "h HR", per_mgr: "h manager", fact_label: "Propel ROI · Factorial", fact_sub: "Generato da conversazioni e benchmark del settore", replaces: "Sostituisce", estimated: "stimato", badge_fact: "FATTO", badge_assumption: "STIMA", method_short: "Stime conservative basate su conversazioni e benchmark di aziende simili. Richiedono validazione congiunta con il cliente." },
    de: { title: "GESCHÄTZTE ROI-ANALYSE", per_year: "/Jahr", source_transcript: "basierend auf Gesprächen", source_assumption: "Branchenschätzung", h_per_emp: "h/Monat pro Mitarbeiter", h_per_hr: "h/Monat pro HR-Admin", h_per_mgr: "h/Monat pro Manager", page_of: "Seite {n} von {total}", confidential: "Vertraulich", context: "Kontext", modules_header: "Empfohlene Module und geschätzte Einsparungen", modules_sub: "Alle Einsparungen basieren auf geschätzten Stunden/Monat pro Mitarbeitertyp", savings_col: "Jährliche Einsparung", roi_header: "Geschätzte Kapitalrendite", total_savings: "Gesamteinsparung", investment: "Investition", roi_est: "Geschätzter ROI", payback: "Payback", net_return: "Nettorendite", months: "Monate", methodology: "Methodik", methodology_body: "Die angegebenen Stunden sind konservative Schätzungen der monatlich freigesetzten Zeit pro Mitarbeitertyp. Alle Zahlen sind Annahmen basierend auf Benchmarks ähnlicher Unternehmen. Erfordern gemeinsame Validierung.", staff_assumed: "Angenommenes Personal", employees: "Mitarbeiter", hr_admin: "HR-Admins", managers: "Manager", hourly_cost: "Stundenkosten", per_emp: "h Mitarbeiter", per_hr: "h HR", per_mgr: "h Manager", fact_label: "Propel ROI · Factorial", fact_sub: "Generiert aus Gesprächen und Branchenbenchmarks", replaces: "Ersetzt", estimated: "geschätzt", badge_fact: "FAKT", badge_assumption: "ANNAHME", method_short: "Konservative Schätzungen basierend auf Gesprächen und Benchmarks ähnlicher Unternehmen. Erfordern gemeinsame Validierung." },
    pt: { title: "ANÁLISE ROI ESTIMADA", per_year: "/ano", source_transcript: "baseado em conversas", source_assumption: "estimativa setorial", h_per_emp: "h/mês por colaborador", h_per_hr: "h/mês por admin de RH", h_per_mgr: "h/mês por responsável", page_of: "Página {n} de {total}", confidential: "Confidencial", context: "Contexto", modules_header: "Módulos recomendados e poupanças estimadas", modules_sub: "Todas as poupanças baseiam-se em horas/mês estimadas por tipo de colaborador", savings_col: "Poupança anual", roi_header: "Retorno do investimento estimado", total_savings: "Poupança total", investment: "Investimento", roi_est: "ROI estimado", payback: "Payback", net_return: "retorno líquido", months: "meses", methodology: "Metodologia", methodology_body: "As horas indicadas são estimativas conservadoras do tempo libertado pelo Factorial mensalmente por tipo de colaborador. Todos os valores são estimativas baseadas em benchmarks de empresas de tamanho similar. Requerem validação conjunta.", staff_assumed: "Pessoal assumido", employees: "colaboradores", hr_admin: "admin de RH", managers: "responsáveis", hourly_cost: "Custo horário", per_emp: "h colaborador", per_hr: "h RH", per_mgr: "h responsável", fact_label: "Propel ROI · Factorial", fact_sub: "Gerado a partir de conversas e benchmarks do setor", replaces: "Substitui", estimated: "estimado", badge_fact: "FACTO", badge_assumption: "ESTIMATIVA", method_short: "Estimativas conservadoras baseadas em conversas e benchmarks de empresas similares. Requerem validação conjunta com o cliente." },
  };
  const L = UI[lang] ?? UI.es;
  const country = (hs.country ?? "ES").substring(0, 2).toUpperCase();
  const countryNames: Record<string, Record<string, string>> = {
    ES: { es: "España", en: "Spain", fr: "Espagne", it: "Spagna", de: "Spanien", pt: "Espanha" },
    FR: { es: "Francia", en: "France", fr: "France", it: "Francia", de: "Frankreich", pt: "França" },
    DE: { es: "Alemania", en: "Germany", fr: "Allemagne", it: "Germania", de: "Deutschland", pt: "Alemanha" },
    IT: { es: "Italia", en: "Italy", fr: "Italie", it: "Italia", de: "Italien", pt: "Itália" },
    PT: { es: "Portugal", en: "Portugal", fr: "Portugal", it: "Portogallo", de: "Portugal", pt: "Portugal" },
  };
  const countryLabel = (cc: string) => countryNames[cc]?.[lang] ?? cc;

  // Core always first, then rest
  const modules: any[] = [...(analysis.modules ?? [])];
  const coreIdx = modules.findIndex((m: any) => m.id === "core");
  if (coreIdx > 0) modules.unshift(modules.splice(coreIdx, 1)[0]);

  const PAGE_SIZE = 6;
  const totalModules = modules.length;

  // Build each module row — clean, no boxes
  function moduleRow(m: any, idx: number): string {
    const mRoi = roi.modules.find((r: any) => r.id === m.id);
    const annual = Math.round((mRoi?.annual_savings ?? 0) / 100) * 100; // round to nearest €100
    const tool = (analysis.tool_replacements ?? []).find((t: any) => t.module_id === m.id);
    const num = String(idx + 1).padStart(2, "0");

    const parts = [
      m.hours_employee > 0 ? `~${m.hours_employee} ${L.h_per_emp}` : null,
      m.hours_hr > 0 ? `~${m.hours_hr} ${L.h_per_hr}` : null,
      m.hours_manager > 0 ? `~${m.hours_manager} ${L.h_per_mgr}` : null,
    ].filter(Boolean);

    const hasTranscript = [m.source_employee, m.source_hr, m.source_manager].includes("transcript");
    const sourceNote = hasTranscript ? L.source_transcript : L.source_assumption;

    // Tool replacement OR hours — never both
    const assumptionLine = tool
      ? `<p style="font-size:10px;color:#AAAACC;margin-top:3px;padding-left:20px;">${L.replaces} <strong style="color:#8888AA;">${esc(tool.tool_name)}</strong> · ~€${fmtEur(Math.round(tool.annual_cost_eur / 100) * 100)}/año ${L.estimated}</p>`
      : parts.length > 0
        ? `<p style="font-size:10px;color:#AAAACC;margin-top:3px;padding-left:20px;">${parts.map(esc).join(" · ")} — ${sourceNote}</p>`
        : "";

    return `
    <div style="padding:8px 0;border-bottom:1px solid #EBEBF0;page-break-inside:avoid;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:16px;">
        <div style="display:flex;align-items:baseline;gap:10px;flex:1;min-width:0;">
          <span style="font-size:10px;font-weight:800;color:#FF355E;letter-spacing:.02em;flex-shrink:0;">${num}</span>
          <span style="font-size:13px;font-weight:800;color:#1A1A2E;">${esc(getModuleLabel(m.id, lang))}</span>
        </div>
        <span style="font-size:14px;font-weight:800;color:#FF355E;letter-spacing:-.02em;white-space:nowrap;flex-shrink:0;">€${fmtEur(annual)}${L.per_year}</span></span>
      </div>
      <p style="font-size:11.5px;color:#4A4A6A;margin-top:3px;line-height:1.45;padding-left:20px;">${esc(m.pain_description ?? m.pain_title ?? "")}</p>
      ${assumptionLine}
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
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">${L.title}</div>
      <div style="font-size:11px;color:#9999BB;margin-top:3px;">${esc(date)} · ${L.confidential}</div>
    </div>
  </div>
  <!-- Company -->
  <div style="margin-top:18px;">
    <div style="font-size:27px;font-weight:800;color:#1A1A2E;letter-spacing:-.025em;line-height:1.1;">${esc(hs.company_name ?? hs.deal_name ?? "")}</div>
    <div style="font-size:12px;color:#8888AA;margin-top:5px;display:flex;gap:12px;flex-wrap:wrap;">
      ${hs.employees ? `<span><strong style="color:#1A1A2E;">${hs.employees}</strong> ${L.employees}</span>` : ""}
      ${hs.country ? `<span>${countryLabel(country)}</span>` : ""}
      ${hs.industry ? `<span>${esc(hs.industry)}</span>` : ""}
    </div>
  </div>
  <!-- Context — half size -->
  <div style="margin-top:14px;padding-bottom:12px;border-bottom:1px solid #EBEBF0;">
    <div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;margin-bottom:5px;">${L.context}</div>
    <p style="font-size:11px;line-height:1.5;color:#8888AA;">${esc(analysis.company_context ?? "")}</p>
  </div>`;

  const modulesHeaderHtml = `
  <div style="margin-top:16px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">${L.modules_header}</div>
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#CCCCDD;">${L.savings_col}</div>
    </div>
    <div style="font-size:9px;color:#AAAACC;font-style:italic;margin-bottom:3px;">${L.modules_sub}</div>`;

  const roiHtml = `
  <!-- ROI Summary -->
  <div style="margin-top:24px;padding:20px 24px;background:#F8F8FC;border-radius:6px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9999BB;margin-bottom:16px;">${L.roi_header}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">${L.total_savings}</div>
        <div style="font-size:22px;font-weight:800;color:#FF355E;letter-spacing:-.03em;margin-top:4px;">€${fmtEur(roi.total_savings)}</div>
        <div style="font-size:10px;color:#AAAACC;">${L.per_year}</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">${L.investment}</div>
        <div style="font-size:22px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:4px;">€${fmtEur(roi.annual_cost)}</div>
        <div style="font-size:10px;color:#AAAACC;">${L.per_year}</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">${L.roi_est}</div>
        <div style="font-size:22px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:4px;">${roi.roi_pct > 0 ? roi.roi_pct + "%" : "—"}</div>
        <div style="font-size:10px;color:#AAAACC;">${L.net_return}</div></div>
      <div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAAACC;">${L.payback}</div>
        <div style="font-size:22px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:4px;">${roi.payback_months}</div>
        <div style="font-size:10px;color:#AAAACC;">${L.months}</div></div>
    </div>
  </div>
  <!-- Methodology -->
  <div style="margin-top:16px;padding:14px 18px;background:#F4F4FA;border-radius:5px;">
    <p style="font-size:10.5px;color:#9999BB;line-height:1.7;">
      <strong style="color:#8888AA;">${L.methodology}:</strong> ${L.methodology_body}
      <br style="margin-bottom:4px;">
      <span style="display:inline-block;margin-top:5px;">${L.staff_assumed}: <strong style="color:#8888AA;">${roi.headcounts.employee} ${L.employees}</strong> · <strong style="color:#8888AA;">${roi.headcounts.hr} ${L.hr_admin}</strong> · <strong style="color:#8888AA;">${roi.headcounts.manager} ${L.managers}</strong> · ${L.hourly_cost}: <strong style="color:#8888AA;">€${roi.hourly_costs.employee}/${L.per_emp}</strong> · <strong style="color:#8888AA;">€${roi.hourly_costs.hr}/${L.per_hr}</strong> · <strong style="color:#8888AA;">€${roi.hourly_costs.manager}/${L.per_mgr}</strong></span>
    </p>
  </div>
  <!-- Footer -->
  <div style="margin-top:18px;padding-top:12px;border-top:1px solid #EBEBF0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;font-weight:800;color:#FF355E;">${L.fact_label}</div>
    <div style="font-size:10px;color:#CCCCDD;">${L.fact_sub}</div>
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
          <div style="font-size:11px;color:#9999BB;margin-top:3px;">${L.page_of.replace("{n}", String(pi + 1)).replace("{total}", String(pages.length))} · ${L.confidential}</div>
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
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;">${L.title}</div>
      <div style="font-size:11px;color:#9999BB;margin-top:3px;">${esc(date)} · ${L.confidential}</div>
    </div>
  </div>

  <!-- Company -->
  <div style="margin-top:20px;">
    <div style="font-size:28px;font-weight:800;color:#1A1A2E;letter-spacing:-.025em;line-height:1.1;">${esc(hs.company_name ?? hs.deal_name ?? "")}</div>
    <div style="font-size:12px;color:#6B6B8D;margin-top:6px;display:flex;gap:14px;flex-wrap:wrap;">
      ${hs.employees ? `<span><strong style="color:#1A1A2E;">${hs.employees}</strong> ${L.employees}</span>` : ""}
      ${hs.country ? `<span>${countryLabel(country)}</span>` : ""}
      ${hs.industry ? `<span>${esc(hs.industry)}</span>` : ""}
    </div>
  </div>

  <!-- Context -->
  <div style="margin-top:24px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:8px;border-bottom:1px solid #FFB8C8;">${L.context}</div>
    <p style="font-size:13px;line-height:1.65;color:#4A4A6A;margin-top:10px;">${esc(analysis.company_context ?? "")}</p>
  </div>

  <!-- Modules (with integrated pains) -->
  <div style="margin-top:24px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#FF355E;padding-bottom:8px;border-bottom:1px solid #FFB8C8;">${L.modules_header}</div>
    ${modulesHtml}
  </div>

  <!-- ROI Summary -->
  <div style="margin-top:28px;padding:24px 28px;background:#F8F8FC;border-radius:8px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#9999BB;margin-bottom:20px;">${L.roi_header}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;">
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">${L.total_savings}</div>
        <div style="font-size:24px;font-weight:800;color:#FF355E;letter-spacing:-.03em;margin-top:5px;">€${fmtEur(roi.total_savings)}</div>
        <div style="font-size:11px;color:#9999BB;">${L.per_year}</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">${L.investment}</div>
        <div style="font-size:24px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:5px;">€${fmtEur(roi.annual_cost)}</div>
        <div style="font-size:11px;color:#9999BB;">${L.per_year}</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">${L.roi_est}</div>
        <div style="font-size:24px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:5px;">${roi.roi_pct > 0 ? roi.roi_pct + "%" : "—"}</div>
        <div style="font-size:11px;color:#9999BB;">${L.net_return}</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;">${L.payback}</div>
        <div style="font-size:24px;font-weight:800;color:#1A1A2E;letter-spacing:-.03em;margin-top:5px;">${roi.payback_months}</div>
        <div style="font-size:11px;color:#9999BB;">${L.months}</div>
      </div>
    </div>
  </div>

  <!-- Methodology -->
  <div style="margin-top:20px;padding:18px 22px;background:#F4F4FA;border-radius:6px;">
    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#9999BB;margin-bottom:8px;">${L.methodology}</div>
    <p style="font-size:11px;color:#8888AA;line-height:1.7;">${L.method_short}</p>
  </div>

  <!-- Footer -->
  <div style="margin-top:20px;padding-top:14px;border-top:1px solid #E8E8F0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;font-weight:800;color:#FF355E;">${L.fact_label}</div>
    <div style="font-size:10px;color:#AAAACC;">${L.fact_sub}</div>
  </div>

</div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

// Language name map for Claude prompts
const LANG_NAMES: Record<string, string> = {
  es: "Spanish",
  en: "English",
  fr: "French",
  it: "Italian",
  de: "German",
  pt: "Portuguese",
};

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
              return `- ${getModuleLabel(m.id, language)}${note ? `\n  INSTRUCCIÓN AE: "${note}"` : ""}${isNew ? "\n  (módulo nuevo, no había en análisis original)" : ""}`;
            }).join("\n");

            const user = `EMPRESA: ${hs_data?.company_name ?? ""}, ${hs_data?.employees ?? "?"} empleados, ${hs_data?.country ?? ""}, ${hs_data?.industry ?? ""}
CONTEXTO: ${existing_analysis?.company_context ?? ""}

Genera o actualiza la descripción de cada módulo para el one-pager ROI.

TONO OBLIGATORIO (igual que en el análisis inicial):
- Segunda persona del plural (vosotros, vuestra, gestionáis...).
- Arranca desde la consecuencia que viven, no desde la funcionalidad que falta.
- Prosa fluida. Sin guiones largos, sin frases fragmentadas, sin "El reto:" o "La oportunidad:".
- Menciona herramientas concretas cuando las conoces.

REGLAS:
1. pain_title: situación concreta de esta empresa, max 10 palabras, sin etiquetas genéricas
2. pain_description: 1 frase máx 25 palabras en segunda persona. Consecuencia diaria concreta + por qué ocurre (herramienta o proceso específico si se conoce). Prosa natural.
3. INSTRUCCIÓN AE con precio específico (ej: "Sesame les cuesta 4000", "pagan 3500 por Bizneo") → usa ESE precio exacto en annual_cost_eur, SIN aplicar ningún descuento adicional. El AE ya sabe el precio real.
   INSTRUCCIÓN AE sin precio específico (ej: "reemplaza Sesame", "ahorro es dejar de pagar Bizneo") → estima precio de mercado con -20% de descuento conservador.
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
              max_tokens: 2000,
              system: `You are an expert ROI consultant for Factorial. Write ALL text (pain_title, pain_description) in ${LANG_NAMES[language] ?? "Spanish"}. Use natural prose in second person. Start from the consequence experienced, not the missing feature. ONLY return the requested JSON, no markdown or comments.`,
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
          const topCalls = calls.slice(0, 2); // max 2 transcripts to stay under token limit
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
          const moduleIds = (analysis.modules ?? []).map((m: any) => getModuleLabel(m.id, language));
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
