import { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, Search, Sparkles, Check, Eye, EyeOff, Edit3, RefreshCw } from "lucide-react";
import { generateDeckHtml, type XLDeckOptions } from "@/lib/generateRoiDeck";
import { getSavingsDescriptions } from "@/lib/moduleHours";
import { MODULE_INFO, getLocalized } from "@/lib/discoveryQuestions";
import type { RoiSlideData, RoiSlideInput } from "@/lib/generateRoiSlide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModjoCall {
  callId: number;
  title: string;
  date: string;
  duration: number;
}

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
  onClose: () => void;
}

type Tab = "slides" | "args" | "modjo";

export function XLPresentationEditor({
  roi, input, enhancedDescriptions, hiddenSlideIds, modjoCalls,
  selectedCallIds, modjoSearch, searchingCalls, personalizing,
  onModjoSearch, onSearchCalls, onToggleCallId, onPersonalize,
  onClearEnhanced, onSaveDescriptions, onHiddenChange, onClose,
}: Props) {
  const [tab, setTab] = useState<Tab>("slides");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [localHidden, setLocalHidden] = useState<Set<string>>(new Set(hiddenSlideIds));
  const [editedDescs, setEditedDescs] = useState<Record<string, Record<string, string>>>({});
  const [totalSlides, setTotalSlides] = useState(3);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const lang = (input.language ?? "es").slice(0, 2);

  // Build deck HTML with current options
  const deckHtml = useMemo(() => {
    const mergedDescs = mergeDescriptions(enhancedDescriptions, editedDescs);
    const inp = { ...input, customDescriptions: mergedDescs || undefined };
    return generateDeckHtml(roi, inp, "full", { hiddenSlideIds: localHidden });
  }, [roi, input, enhancedDescriptions, editedDescs, localHidden]);

  // Extract tool modules (product slides that can be hidden)
  const toolModuleIds = useMemo(() => {
    return (roi.modules ?? []).filter((m: any) => m.tool_override).map((m: any) => m.id) as string[];
  }, [roi]);

  // Count total slides from the HTML
  useEffect(() => {
    const matches = deckHtml.match(/class="slide"/g);
    if (matches) setTotalSlides(matches.length);
  }, [deckHtml]);

  // Load deck into iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(deckHtml);
    doc.close();
  }, [deckHtml]);

  function toggleHidden(id: string) {
    setLocalHidden(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function applyHidden() {
    onHiddenChange(new Set(localHidden));
  }

  function saveEditedDescs() {
    const merged = mergeDescriptions(enhancedDescriptions, editedDescs);
    if (merged) onSaveDescriptions(merged);
  }

  // Per-module argument editors — load current descriptions
  const moduleArgs = useMemo(() => {
    const baseLang = lang === "es" || lang === "en" ? lang : "es";
    const baseDescs = getSavingsDescriptions(baseLang);
    const modules = input.configModules ?? [];
    return modules.map(id => {
      const info = MODULE_INFO[id];
      const name = info ? getLocalized(info.label, lang) : id;
      const stakeholders: Array<"employee" | "hr" | "manager"> = ["employee", "hr", "manager"];
      const rows = stakeholders.map(s => {
        const enhanced = enhancedDescriptions?.[id]?.[s]?.[0] ?? null;
        const edited = editedDescs[id]?.[s] ?? null;
        const base = baseDescs[id]?.[s]?.[0] ?? "";
        return { stakeholder: s, value: edited ?? enhanced ?? base, isEnhanced: !!enhanced && !edited, isEdited: !!edited };
      }).filter(r => r.value);
      return { id, name, rows };
    }).filter(m => m.rows.length > 0);
  }, [input.configModules, lang, enhancedDescriptions, editedDescs]);

  const STAKE_LABEL: Record<string, string> = { employee: "Empleados", hr: "Admin RRHH", manager: "Managers" };
  const STAKE_COLOR: Record<string, string> = { employee: "#3B82F6", hr: "#10B981", manager: "#F59E0B" };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: "oklch(14% 0.01 250)" }}>
      {/* Left: slide preview */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Preview header */}
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "oklch(22% 0.01 250)", background: "oklch(16% 0.01 250)" }}>
          <span className="text-sm font-semibold text-white/80">Preview del deck</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">{totalSlides} slides</span>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Iframe */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden" style={{ background: "oklch(12% 0.008 250)" }}>
          <div className="w-full" style={{ maxWidth: "min(100%, calc((100vh - 120px) * 16/9))" }}>
            <div style={{ paddingBottom: "56.25%", position: "relative" }}>
              <iframe
                ref={iframeRef}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", borderRadius: 8, transform: "scale(1)", transformOrigin: "top left" }}
                sandbox="allow-same-origin"
                title="Deck preview"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 flex items-center justify-center gap-2 py-3" style={{ background: "oklch(16% 0.01 250)" }}>
          <span className="text-xs text-white/30">Usa Cmd+P desde el PDF para imprimir todas las slides</span>
        </div>
      </div>

      {/* Right: controls panel */}
      <div className="w-96 flex flex-col border-l shrink-0" style={{ borderColor: "oklch(22% 0.01 250)", background: "oklch(17% 0.01 250)" }}>
        {/* Tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: "oklch(22% 0.01 250)" }}>
          {([
            { id: "slides", label: "Slides" },
            { id: "args", label: "Argumentaciones" },
            { id: "modjo", label: "Modjo" },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 py-3 text-xs font-semibold transition-colors",
                tab === t.id
                  ? "text-white border-b-2 border-violet-400"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ── SLIDES TAB ── */}
          {tab === "slides" && (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Slides fijas</p>
                {["Cover", "Resumen ejecutivo (KPIs + desglose)", "Lista de módulos"].map((name, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "oklch(20% 0.01 250)" }}>
                    <div className="w-5 h-5 rounded flex items-center justify-center bg-violet-500/20">
                      <Check className="h-3 w-3 text-violet-400" />
                    </div>
                    <span className="text-xs text-white/70">{name}</span>
                    <span className="ml-auto text-[10px] text-white/30">#{i + 1}</span>
                  </div>
                ))}
              </div>

              {toolModuleIds.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3 mt-4">Slides de producto (herramientas)</p>
                  <p className="text-[10px] text-white/30 mb-3">Activa/desactiva slides de detalle para cada herramienta que Factorial reemplaza</p>
                  {toolModuleIds.map(id => {
                    const info = MODULE_INFO[id];
                    const name = info ? getLocalized(info.label, lang) : id;
                    const isHidden = localHidden.has(id);
                    return (
                      <button
                        key={id}
                        onClick={() => toggleHidden(id)}
                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg mb-1.5 transition-colors"
                        style={{ background: isHidden ? "oklch(20% 0.01 250)" : "oklch(22% 0.03 280)" }}
                      >
                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors", isHidden ? "border-white/20" : "border-violet-400 bg-violet-500")}>
                          {!isHidden && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span className={cn("text-xs transition-colors", isHidden ? "text-white/30 line-through" : "text-white/80")}>{name}</span>
                        {isHidden ? <EyeOff className="ml-auto h-3.5 w-3.5 text-white/20" /> : <Eye className="ml-auto h-3.5 w-3.5 text-violet-400" />}
                      </button>
                    );
                  })}
                  <Button
                    size="sm"
                    onClick={applyHidden}
                    className="w-full mt-2 h-9 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Aplicar cambios de slides
                  </Button>
                </div>
              )}

              {toolModuleIds.length === 0 && (
                <p className="text-xs text-white/30 text-center py-4">No hay slides de herramientas en este deck</p>
              )}
            </div>
          )}

          {/* ── ARGUMENTACIONES TAB ── */}
          {tab === "args" && (
            <div className="space-y-4">
              {moduleArgs.map(mod => (
                <div key={mod.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid oklch(24% 0.01 250)" }}>
                  <div className="px-3 py-2" style={{ background: "oklch(20% 0.01 250)" }}>
                    <span className="text-xs font-bold text-white/80">{mod.name}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "oklch(22% 0.01 250)" }}>
                    {mod.rows.map(row => (
                      <div key={row.stakeholder} className="p-3 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{ color: STAKE_COLOR[row.stakeholder], background: STAKE_COLOR[row.stakeholder] + "20" }}>
                            {STAKE_LABEL[row.stakeholder] ?? row.stakeholder}
                          </span>
                          {row.isEnhanced && <span className="text-[9px] text-violet-400 font-semibold">✨ Modjo</span>}
                          {row.isEdited && <span className="text-[9px] text-amber-400 font-semibold">✏ Editado</span>}
                        </div>
                        <textarea
                          value={row.value}
                          onChange={e => setEditedDescs(prev => ({
                            ...prev,
                            [mod.id]: { ...(prev[mod.id] ?? {}), [row.stakeholder]: e.target.value }
                          }))}
                          className="w-full text-xs rounded-lg p-2 resize-none leading-relaxed"
                          rows={3}
                          style={{ background: "oklch(20% 0.01 250)", color: "oklch(80% 0.008 250)", border: "1px solid oklch(26% 0.01 250)", outline: "none" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {Object.keys(editedDescs).length > 0 && (
                <Button
                  onClick={saveEditedDescs}
                  className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
                >
                  <Check className="h-4 w-4 mr-1.5" /> Guardar argumentaciones
                </Button>
              )}
              {enhancedDescriptions && (
                <button onClick={onClearEnhanced} className="w-full text-xs text-white/30 hover:text-red-400 transition-colors py-1">
                  Limpiar mejoras de Modjo
                </button>
              )}
            </div>
          )}

          {/* ── MODJO TAB ── */}
          {tab === "modjo" && (
            <div className="space-y-3">
              <p className="text-xs text-white/50 leading-relaxed">
                Selecciona una o varias llamadas. La IA reemplaza las descripciones genéricas por citas reales del prospect.
              </p>
              <div className="flex gap-2">
                <input
                  placeholder="Buscar por empresa o deal..."
                  value={modjoSearch}
                  onChange={e => onModjoSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !searchingCalls && onSearchCalls()}
                  className="flex-1 h-9 px-3 rounded-lg text-xs"
                  style={{ background: "oklch(20% 0.01 250)", color: "oklch(85% 0.008 250)", border: "1px solid oklch(26% 0.01 250)", outline: "none" }}
                />
                <button
                  onClick={onSearchCalls}
                  disabled={searchingCalls}
                  className="h-9 px-3 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {searchingCalls ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Buscar
                </button>
              </div>

              {modjoCalls.length > 0 && (
                <div className="space-y-1.5">
                  {modjoCalls.map(call => {
                    const isSelected = selectedCallIds.has(call.callId);
                    const dateStr = call.date ? new Date(call.date).toLocaleDateString() : "";
                    const mins = Math.round(call.duration / 60);
                    return (
                      <button
                        key={call.callId}
                        onClick={() => onToggleCallId(call.callId)}
                        className="w-full rounded-lg p-3 text-left transition-all"
                        style={{ background: isSelected ? "oklch(25% 0.04 280)" : "oklch(20% 0.01 250)", border: `1px solid ${isSelected ? "oklch(50% 0.2 280)" : "oklch(24% 0.01 250)"}` }}
                      >
                        <div className="flex items-start gap-2">
                          <div className={cn("mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors", isSelected ? "border-violet-400 bg-violet-500" : "border-white/20")}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white/80 truncate">{call.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-white/30 text-[10px]">
                              {dateStr && <span>{dateStr}</span>}
                              {mins > 0 && <span>{mins} min</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {selectedCallIds.size > 1 && (
                    <p className="text-[10px] text-violet-400 font-medium px-1">{selectedCallIds.size} llamadas — los transcripts se combinarán</p>
                  )}
                </div>
              )}

              <Button
                onClick={onPersonalize}
                disabled={selectedCallIds.size === 0 || personalizing}
                className="w-full h-10 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg"
              >
                {personalizing
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Mejorando con IA...</>
                  : <><Sparkles className="h-4 w-4 mr-1.5" /> Mejorar argumentaciones con Modjo</>
                }
              </Button>
            </div>
          )}
        </div>

        {/* Bottom close */}
        <div className="shrink-0 p-4 border-t" style={{ borderColor: "oklch(22% 0.01 250)" }}>
          <button
            onClick={onClose}
            className="w-full h-10 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cerrar editor
          </button>
        </div>
      </div>
    </div>
  );
}

// Merge enhanced descriptions with manually edited ones
function mergeDescriptions(
  enhanced: Record<string, any> | null,
  edited: Record<string, Record<string, string>>
): Record<string, any> | null {
  if (!enhanced && Object.keys(edited).length === 0) return null;
  const base = { ...(enhanced ?? {}) };
  for (const [modId, stakes] of Object.entries(edited)) {
    for (const [stake, val] of Object.entries(stakes)) {
      if (!base[modId]) base[modId] = {};
      base[modId][stake] = [val];
    }
  }
  return base;
}
