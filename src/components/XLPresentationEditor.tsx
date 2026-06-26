import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from "react";
import { X, Loader2, Search, Sparkles, Check, Eye, EyeOff, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { generateDeckHtml, generateDeckPdf, type XLDeckOptions } from "@/lib/generateRoiDeck";
import { buildRoiSlideData } from "@/lib/generateRoiSlide";
import { getSavingsDescriptions } from "@/lib/moduleHours";
import { MODULE_INFO, getLocalized } from "@/lib/discoveryQuestions";
import type { RoiSlideData, RoiSlideInput } from "@/lib/generateRoiSlide";
import { cn } from "@/lib/utils";

// ── Tokens (warm-slate dark — not blue-grey) ──────────────────────────────
const T = {
  bg:       "#0E0E13",
  surface:  "#15151D",
  panel:    "#12121A",
  border:   "#252530",
  borderHi: "#36364A",
  text:     "#E4E4F0",
  muted:    "#62627A",
  faint:    "#2E2E3E",
  violet:   "#7C3AED",
  violetLo: "#1E1430",
  coral:    "#FF355E",
} as const;

// ── Slide geometry in deck coordinate space ───────────────────────────────
// body { padding: 40px 0; gap: 40px }  .slide { height: 720px }
// Slide 0: scrollTop = 0, Slide N: scrollTop = N * 760
function slideScrollTop(n: number): number { return n * 760; }

interface ModjoCall { callId: number; title: string; date: string; duration: number; }

interface Props {
  roi: RoiSlideData;
  input: RoiSlideInput;
  enhancedDescriptions: Record<string, any> | null;
  hiddenSlideIds: Set<string>;
  modjoCalls: ModjoCall[];
  selectedCallIds: Set<number>;
  modjoSearch: string;
  searchingCalls: boolean;
  personalizing: boolean;
  onModjoSearch: (q: string) => void;
  onSearchCalls: () => void;
  onToggleCallId: (id: number) => void;
  onPersonalize: () => void;
  onClearEnhanced: () => void;
  onSaveDescriptions: (descs: Record<string, any>) => void;
  onHiddenChange: (ids: Set<string>) => void;
  bothModeModules?: Set<string>;
  onClose: () => void;
}

type Tab = "slides" | "args" | "modjo";

export function XLPresentationEditor(props: Props) {
  const {
    roi, input, enhancedDescriptions, hiddenSlideIds, modjoCalls,
    selectedCallIds, modjoSearch, searchingCalls, personalizing,
    onModjoSearch, onSearchCalls, onToggleCallId, onPersonalize,
    onClearEnhanced, onSaveDescriptions, onHiddenChange, onClose,
    bothModeModules: bothModeProp = new Set<string>(),
  } = props;

  const [tab, setTab] = useState<Tab>("slides");
  const [slideIdx, setSlideIdx] = useState(0);
  const [totalSlides, setTotalSlides] = useState(3);
  const [localHidden, setLocalHidden] = useState<Set<string>>(new Set(hiddenSlideIds));
  const [editedDescs, setEditedDescs] = useState<Record<string, Record<string, string>>>({});
  const [downloading, setDownloading] = useState<"summary" | "full" | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lang = (input.language ?? "es").slice(0, 2);

  // Build merged deck HTML
  const deckHtml = useMemo(() => {
    const mergedDescs = mergeDescriptions(enhancedDescriptions, editedDescs);
    return generateDeckHtml(roi, { ...input, customDescriptions: mergedDescs || undefined }, "full", { hiddenSlideIds: localHidden });
  }, [roi, input, enhancedDescriptions, editedDescs, localHidden]);

  // Count slides in rendered HTML
  useEffect(() => {
    const n = (deckHtml.match(/class="slide"/g) ?? []).length;
    if (n) { setTotalSlides(n); setSlideIdx(i => Math.min(i, n - 1)); }
  }, [deckHtml]);

  // Write deck HTML into iframe — debounced 250ms so editing doesn't flicker on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      doc.open(); doc.write(deckHtml); doc.close();
      setTimeout(() => scrollToSlide(slideIdx), 120);
    }, 250);
    return () => clearTimeout(timer);
  }, [deckHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll iframe to the right slide
  const scrollToSlide = useCallback((idx: number) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.scrollTo({ top: slideScrollTop(idx), behavior: "smooth" });
  }, []);

  function goSlide(delta: number) {
    setSlideIdx(i => {
      const next = Math.max(0, Math.min(totalSlides - 1, i + delta));
      scrollToSlide(next);
      return next;
    });
  }

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goSlide(1);
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   goSlide(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, totalSlides]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tool module IDs — their detail slides can be toggled as a group
  const toolModuleIds = useMemo(
    () => (roi.modules ?? []).filter((m: any) => m.tool_override).map((m: any) => m.id as string),
    [roi]
  );
  // Tool slides are hidden when localHidden has ANY entry (all-or-nothing)
  const toolSlidesHidden = localHidden.size > 0;

  function toggleAllToolSlides() {
    if (toolSlidesHidden) {
      setLocalHidden(new Set()); // show all
    } else {
      setLocalHidden(new Set(toolModuleIds)); // hide all
    }
  }
  function applyHidden() { onHiddenChange(new Set(localHidden)); }

  // Editable argumentations — hour-based modules + "Ambos" modules (they have an hours slide too)
  const moduleArgs = useMemo(() => {
    const base = getSavingsDescriptions(lang === "es" || lang === "en" ? lang : "es");
    return (input.configModules ?? [])
      .filter(id => !toolModuleIds.includes(id) || bothModeProp.has(id)) // include "Ambos" modules: they have hour slides
      .map(id => {
        const info = MODULE_INFO[id];
        const name = info ? getLocalized(info.label, lang) : id;
        const stakes = (["employee", "hr", "manager"] as const).map(s => {
          const enh    = enhancedDescriptions?.[id]?.[s]?.[0] ?? null;
          const edited = editedDescs[id]?.[s] ?? null;
          const def    = base[id]?.[s]?.[0] ?? "";
          return { s, value: edited ?? enh ?? def, isEnhanced: !!enh && !edited, isEdited: !!edited };
        }).filter(r => r.value);
        return { id, name, stakes };
      }).filter(m => m.stakes.length > 0);
  }, [input.configModules, lang, enhancedDescriptions, editedDescs, toolModuleIds, bothModeProp]);

  // Map module id → slide index (0-based) in XL mode:
  // 0=cover, 1=kpis, 2=list, 3+=hour slides, then tool slides
  const moduleSlideIndex = useMemo(() => {
    const map: Record<string, number> = {};
    const hourIds = (input.configModules ?? []).filter(id => !toolModuleIds.includes(id));
    hourIds.forEach((id, i) => { map[id] = 3 + i; });
    if (!toolSlidesHidden) {
      toolModuleIds.forEach((id, i) => { map[id] = 3 + hourIds.length + i; });
    }
    return map;
  }, [input.configModules, toolModuleIds, toolSlidesHidden]);

  function focusModule(id: string) {
    const idx = moduleSlideIndex[id];
    if (idx !== undefined) {
      setSlideIdx(idx);
      scrollToSlide(idx);
    }
  }

  function setDesc(modId: string, stake: string, val: string) {
    setEditedDescs(prev => ({ ...prev, [modId]: { ...(prev[modId] ?? {}), [stake]: val } }));
  }

  function saveDescs() {
    const merged = mergeDescriptions(enhancedDescriptions, editedDescs);
    if (merged) onSaveDescriptions(merged);
  }

  const hasDescEdits = Object.keys(editedDescs).length > 0;
  const hiddenChanged = !setsEqual(localHidden, hiddenSlideIds);

  async function download(mode: "summary" | "full") {
    setDownloading(mode);
    try {
      const mergedDescs = mergeDescriptions(enhancedDescriptions, editedDescs);
      const inp = { ...input, customDescriptions: mergedDescs || undefined };
      const data = buildRoiSlideData(inp);
      await generateDeckPdf(data, inp, mode, { hiddenSlideIds: localHidden });
    } finally { setDownloading(null); }
  }

  const STAKE_COLOR: Record<string, string> = { employee: "#3B82F6", hr: "#10B981", manager: "#F59E0B" };
  const STAKE_LABEL: Record<string, string> = { employee: "Empleados", hr: "Admin RRHH", manager: "Managers" };

  return (
    <div
      className="fixed inset-0 z-[60] flex"
      style={{ background: T.bg }}
      onKeyDown={e => e.stopPropagation()}
    >
      {/* ── LEFT: Slide preview ─────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0" style={{ background: T.bg }}>

        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 shrink-0"
          style={{ height: 52, borderBottom: `1px solid ${T.border}`, background: T.surface }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: T.coral }} />
            <span className="text-[13px] font-semibold" style={{ color: T.text }}>Editor de presentación</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium tabular-nums" style={{ color: T.muted }}>
              {slideIdx + 1} / {totalSlides}
            </span>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{ color: T.muted }}
              onMouseEnter={e => (e.currentTarget.style.background = T.faint)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Slide stage */}
        <div
          className="flex-1 flex flex-col items-center justify-center relative"
          style={{ background: T.bg, padding: "28px 32px" }}
        >
          {/* Slide frame */}
          <div className="w-full" style={{ maxWidth: "min(100%, calc((100vh - 160px) * 16/9))" }}>
            <div className="relative" style={{ paddingBottom: "56.25%", borderRadius: 8, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.55)" }}>
              <IframeScaled ref={iframeRef} />
            </div>
          </div>

          {/* Nav arrows */}
          <div className="flex items-center gap-4 mt-5">
            <button
              onClick={() => goSlide(-1)}
              disabled={slideIdx === 0}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-25"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
            >
              <ChevronLeft size={16} />
            </button>
            {/* Slide dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setSlideIdx(i); scrollToSlide(i); }}
                  className="rounded-full transition-all"
                  style={{
                    width: i === slideIdx ? 20 : 6,
                    height: 6,
                    background: i === slideIdx ? T.coral : T.border,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => goSlide(1)}
              disabled={slideIdx === totalSlides - 1}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-all disabled:opacity-25"
              style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Download bar */}
        <div
          className="shrink-0 flex items-center gap-3 px-6 py-3"
          style={{ borderTop: `1px solid ${T.border}`, background: T.surface }}
        >
          <span className="text-[11px] font-medium mr-2" style={{ color: T.muted }}>Descargar deck</span>
          {(["summary", "full"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => download(mode)}
              disabled={!!downloading}
              className="flex items-center gap-1.5 rounded-lg px-3 h-8 text-xs font-semibold transition-all disabled:opacity-40"
              style={{ background: T.faint, color: T.text, border: `1px solid ${T.border}` }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = T.borderHi)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}
            >
              {downloading === mode
                ? <Loader2 size={12} className="animate-spin" />
                : <Download size={12} />}
              {mode === "summary" ? "1-Pager" : "Completo"}
            </button>
          ))}
          <span className="text-[10px] ml-auto" style={{ color: T.muted }}>← → para navegar · Esc para cerrar</span>
        </div>
      </div>

      {/* ── RIGHT: Controls ─────────────────────────────────── */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: 380, background: T.panel, borderLeft: `1px solid ${T.border}` }}
      >
        {/* Tab bar */}
        <div
          className="flex shrink-0"
          style={{ borderBottom: `1px solid ${T.border}`, height: 48 }}
        >
          {([
            { id: "slides" as Tab, label: "Slides" },
            { id: "args"   as Tab, label: "Argumentos" },
            { id: "modjo"  as Tab, label: "Modjo" },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 text-xs font-semibold transition-colors relative"
              style={{ color: tab === id ? T.text : T.muted }}
            >
              {label}
              {tab === id && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                  style={{ background: T.coral }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 16px" }}>

          {/* ── SLIDES TAB ── */}
          {tab === "slides" && (
            <div>
              {/* Fixed slides */}
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: T.muted }}>Slides fijas</p>
              {["Portada", "KPIs y desglose de ahorro", "Lista de módulos"].map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-1"
                  style={{ background: T.faint }}
                >
                  <Check size={13} style={{ color: T.muted, flexShrink: 0 }} />
                  <span className="text-[12px]" style={{ color: T.muted }}>{name}</span>
                  <span className="ml-auto text-[10px]" style={{ color: T.muted }}>#{i + 1}</span>
                </div>
              ))}

              {/* Hour slides — always included, listed for info */}
              <div className="mt-5 mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Slides de argumentación de horas</p>
                <p className="text-[10px] mb-3" style={{ color: T.muted }}>Siempre incluidas. Detalle por stakeholder para cada módulo de horas.</p>
                {(roi.modules ?? []).filter((m: any) => !m.tool_override && m.annual_savings > 0).map((m: any) => {
                  const info = MODULE_INFO[m.id];
                  const name = info ? getLocalized(info.label, lang) : m.id;
                  return (
                    <div key={m.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2 mb-1" style={{ background: T.faint }}>
                      <Check size={12} style={{ color: T.violet, flexShrink: 0 }} />
                      <span className="text-[12px] truncate" style={{ color: T.text }}>{name}</span>
                      <Eye size={11} style={{ color: T.violet, flexShrink: 0, marginLeft: "auto" }} />
                    </div>
                  );
                })}
              </div>

              {/* Tool slides — single on/off toggle */}
              {toolModuleIds.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: T.muted }}>Slides de herramientas reemplazadas</p>
                  <button
                    onClick={toggleAllToolSlides}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all"
                    style={{
                      background: toolSlidesHidden ? T.faint : "#1C1C2E",
                      border: `1px solid ${toolSlidesHidden ? T.border : "#2E2E48"}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-5 h-5 rounded-md transition-colors flex-shrink-0"
                      style={{
                        background: toolSlidesHidden ? "transparent" : T.violet,
                        border: `1.5px solid ${toolSlidesHidden ? T.borderHi : T.violet}`,
                      }}
                    >
                      {!toolSlidesHidden && <Check size={11} style={{ color: "#fff" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-semibold block" style={{ color: toolSlidesHidden ? T.muted : T.text }}>
                        {toolSlidesHidden ? "Slides de herramientas ocultas" : "Slides de herramientas incluidas"}
                      </span>
                      <span className="text-[10px]" style={{ color: T.muted }}>
                        {toolModuleIds.length} slides · clic para {toolSlidesHidden ? "mostrar" : "ocultar"}
                      </span>
                    </div>
                    {toolSlidesHidden
                      ? <EyeOff size={14} style={{ color: T.muted, flexShrink: 0 }} />
                      : <Eye size={14} style={{ color: T.violet, flexShrink: 0 }} />}
                  </button>
                  {hiddenChanged && (
                    <button
                      onClick={applyHidden}
                      className="w-full mt-2 h-9 rounded-lg text-xs font-semibold transition-colors"
                      style={{ background: T.violet, color: "#fff" }}
                    >
                      Aplicar
                    </button>
                  )}
                </div>
              )}

              {toolModuleIds.length === 0 && (
                <p className="text-[11px] text-center mt-4" style={{ color: T.muted }}>
                  No hay herramientas reemplazadas en este deck
                </p>
              )}
            </div>
          )}

          {/* ── ARGS TAB ── */}
          {tab === "args" && (
            <div>
              {moduleArgs.map((mod) => {
                const slideNum = (moduleSlideIndex[mod.id] ?? 0) + 1; // 1-based for display
                return (
                <div
                  key={mod.id}
                  className="mb-4 rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${T.border}` }}
                >
                  {/* Module header — click to jump to that slide in preview */}
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-left"
                    style={{ background: T.faint, borderBottom: `1px solid ${T.border}` }}
                    onClick={() => focusModule(mod.id)}
                    title="Ver en preview"
                  >
                    <span className="text-[11px] font-bold" style={{ color: T.text }}>{mod.name}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded ml-2 flex-shrink-0"
                      style={{ background: T.border, color: T.muted }}>
                      slide {slideNum}
                    </span>
                  </button>
                  {mod.stakes.map(({ s, value, isEnhanced, isEdited }) => (
                    <div
                      key={s}
                      className="p-3"
                      style={{ borderBottom: `1px solid ${T.border}` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ color: STAKE_COLOR[s], background: STAKE_COLOR[s] + "18" }}
                        >
                          {STAKE_LABEL[s]}
                        </span>
                        {isEnhanced && !isEdited && (
                          <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: T.violet }}>
                            <Sparkles size={9} /> Modjo
                          </span>
                        )}
                        {isEdited && (
                          <span className="text-[9px] font-semibold" style={{ color: "#F59E0B" }}>✏ editado</span>
                        )}
                      </div>
                      <textarea
                        value={value}
                        onChange={e => setDesc(mod.id, s, e.target.value)}
                        onFocus={() => focusModule(mod.id)}
                        rows={3}
                        className="w-full text-[11px] leading-relaxed rounded-lg resize-none outline-none p-2"
                        style={{
                          background: T.bg,
                          color: T.text,
                          border: `1px solid ${isEdited ? "#F59E0B60" : T.border}`,
                          caretColor: T.text,
                        }}
                      />
                    </div>
                  ))}
                </div>
                );
              })}

              {hasDescEdits && (
                <button
                  onClick={saveDescs}
                  className="w-full h-10 rounded-xl text-xs font-semibold mt-1 transition-colors"
                  style={{ background: T.violet, color: "#fff" }}
                >
                  <Check size={13} style={{ display: "inline", marginRight: 6 }} />
                  Guardar argumentaciones
                </button>
              )}

              {enhancedDescriptions && (
                <button
                  onClick={onClearEnhanced}
                  className="w-full mt-2 text-[11px] py-2 transition-colors"
                  style={{ color: T.muted }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
                  onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
                >
                  Borrar mejoras de Modjo
                </button>
              )}

              {moduleArgs.length === 0 && (
                <p className="text-[11px] text-center mt-6" style={{ color: T.muted }}>No hay módulos con argumentaciones</p>
              )}
            </div>
          )}

          {/* ── MODJO TAB ── */}
          {tab === "modjo" && (
            <div>
              <p className="text-[11px] leading-relaxed mb-4" style={{ color: T.muted }}>
                Selecciona una o varias llamadas. La IA sustituye las descripciones genéricas por citas reales del prospect.
              </p>

              {/* Search */}
              <div className="flex gap-2 mb-3">
                <input
                  value={modjoSearch}
                  onChange={e => onModjoSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !searchingCalls && onSearchCalls()}
                  placeholder="Empresa o deal..."
                  className="flex-1 h-9 px-3 text-xs rounded-lg outline-none"
                  style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, caretColor: T.text }}
                />
                <button
                  onClick={onSearchCalls}
                  disabled={searchingCalls}
                  className="h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-opacity disabled:opacity-40"
                  style={{ background: T.violet, color: "#fff" }}
                >
                  {searchingCalls ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  Buscar
                </button>
              </div>

              {/* Call list */}
              {modjoCalls.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {modjoCalls.map(call => {
                    const on = selectedCallIds.has(call.callId);
                    const dateStr = call.date ? new Date(call.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : "";
                    const mins = Math.round(call.duration / 60);
                    return (
                      <button
                        key={call.callId}
                        onClick={() => onToggleCallId(call.callId)}
                        className="w-full flex items-start gap-2.5 rounded-lg p-2.5 text-left transition-all"
                        style={{
                          background: on ? T.violetLo : T.faint,
                          border: `1px solid ${on ? T.violet + "60" : T.border}`,
                        }}
                      >
                        <div
                          className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ background: on ? T.violet : "transparent", border: `1.5px solid ${on ? T.violet : T.borderHi}` }}
                        >
                          {on && <Check size={9} style={{ color: "#fff" }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold truncate" style={{ color: T.text }}>{call.title}</p>
                          <div className="flex gap-2 mt-0.5 text-[10px]" style={{ color: T.muted }}>
                            {dateStr && <span>{dateStr}</span>}
                            {mins > 0 && <span>{mins} min</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {selectedCallIds.size > 1 && (
                    <p className="text-[10px] pt-1 pl-1" style={{ color: T.violet }}>
                      {selectedCallIds.size} llamadas · los transcripts se combinarán
                    </p>
                  )}
                </div>
              )}

              {modjoCalls.length === 0 && (
                <p className="text-[11px] text-center py-6" style={{ color: T.muted }}>
                  Busca un deal para ver las llamadas disponibles
                </p>
              )}

              <button
                onClick={onPersonalize}
                disabled={selectedCallIds.size === 0 || personalizing}
                className="w-full h-10 rounded-xl text-[12px] font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-35"
                style={{ background: T.violet, color: "#fff" }}
              >
                {personalizing
                  ? <><Loader2 size={14} className="animate-spin" /> Mejorando con IA...</>
                  : <><Sparkles size={14} /> Mejorar argumentaciones</>}
              </button>
            </div>
          )}
        </div>

        {/* Save footer */}
        <div
          className="shrink-0 p-4 space-y-2"
          style={{ borderTop: `1px solid ${T.border}` }}
        >
          <button
            onClick={() => {
              // Save all local edits to parent, then close
              const merged = mergeDescriptions(enhancedDescriptions, editedDescs);
              if (merged) onSaveDescriptions(merged);
              if (!setsEqual(localHidden, hiddenSlideIds)) onHiddenChange(new Set(localHidden));
              onClose();
            }}
            className="w-full h-10 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-2"
            style={{ background: T.coral, color: "#fff" }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Check size={15} />
            Guardar versión
          </button>
          <button
            onClick={onClose}
            className="w-full h-8 rounded-xl text-[11px] font-medium transition-colors"
            style={{ color: T.muted }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}
          >
            Cerrar sin guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Scaled iframe for 1280×720 deck ──────────────────
const IframeScaled = forwardRef<HTMLIFrameElement, {}>((_, ref) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setScale(el.clientWidth / 1280);
    });
    obs.observe(el);
    setScale(el.clientWidth / 1280);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <iframe
        ref={ref}
        title="Slide preview"
        sandbox="allow-same-origin allow-scripts"
        scrolling="no"
        style={{
          position: "absolute", top: 0, left: 0,
          width: 1280, height: 720, border: "none",
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
});
IframeScaled.displayName = "IframeScaled";

// ── Helpers ───────────────────────────────────────────

function mergeDescriptions(
  enhanced: Record<string, any> | null,
  edited: Record<string, Record<string, string>>
): Record<string, any> | null {
  if (!enhanced && Object.keys(edited).length === 0) return null;
  const out = { ...(enhanced ?? {}) };
  for (const [id, stakes] of Object.entries(edited)) {
    for (const [s, val] of Object.entries(stakes)) {
      if (!out[id]) out[id] = {};
      out[id][s] = [val];
    }
  }
  return out;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
