import * as XLSX from "xlsx";
import { MODULE_CATALOG } from "@/lib/moduleCatalog";

interface EvidenceItem {
  index: number;
  text: string;
  evidence_type: string;
  attribution: string;
  source_label: string;
  source_date: string | null;
}

interface RuleMatch {
  evidence_index: number;
  rule_id: number | null;
  module_id: string;
  evidence_type: string;
  attribution: string;
  match_quality: string;
  strength: string;
}

interface ModuleMatch {
  module_id: string;
  confidence: number;
  confidence_level: string;
  evidence_chain: RuleMatch[];
  strongest_quote: string;
  rationale: string;
}

interface AnalysisData {
  evidence: EvidenceItem[];
  matches: ModuleMatch[];
  rules_used: number;
  profiles_used: number;
  meta: { passes: number; model: string };
}

function moduleLabel(id: string): string {
  return MODULE_CATALOG.find(m => m.id === id)?.label ?? id;
}

export function downloadEvidenceExcel(data: AnalysisData, companyName: string) {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Evidence (Pass 1) ──
  const evRows = data.evidence.map(e => ({
    "#": e.index,
    "Evidence Text": e.text,
    "Type": e.evidence_type,
    "Attribution": e.attribution,
    "Source": e.source_label,
    "Date": e.source_date ?? "",
  }));
  const ws1 = XLSX.utils.json_to_sheet(evRows);
  ws1["!cols"] = [{ wch: 4 }, { wch: 80 }, { wch: 15 }, { wch: 18 }, { wch: 25 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Pass 1 — Evidence");

  // ── Sheet 2: Module Matches (Pass 2) ──
  const matchRows = data.matches.flatMap(m =>
    m.evidence_chain.length > 0
      ? m.evidence_chain.map((ec, i) => ({
          "Module": i === 0 ? moduleLabel(m.module_id) : "",
          "Module ID": i === 0 ? m.module_id : "",
          "Confidence": i === 0 ? `${(m.confidence * 100).toFixed(0)}%` : "",
          "Level": i === 0 ? m.confidence_level : "",
          "Evidence #": ec.evidence_index,
          "Evidence Text": data.evidence[ec.evidence_index]?.text ?? "",
          "Evidence Type": ec.evidence_type,
          "Attribution": ec.attribution,
          "Rule Strength": ec.strength,
          "Match Quality": ec.match_quality,
          "Rule ID": ec.rule_id ?? "",
          "Rationale": i === 0 ? m.rationale : "",
        }))
      : [{
          "Module": moduleLabel(m.module_id),
          "Module ID": m.module_id,
          "Confidence": `${(m.confidence * 100).toFixed(0)}%`,
          "Level": m.confidence_level,
          "Evidence #": "",
          "Evidence Text": m.strongest_quote,
          "Evidence Type": "",
          "Attribution": "",
          "Rule Strength": "",
          "Match Quality": "",
          "Rule ID": "",
          "Rationale": m.rationale,
        }]
  );
  const ws2 = XLSX.utils.json_to_sheet(matchRows);
  ws2["!cols"] = [
    { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 8 },
    { wch: 8 }, { wch: 60 }, { wch: 14 }, { wch: 18 },
    { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Pass 2 — Matches");

  // ── Sheet 3: Summary ──
  const summaryRows = data.matches.map(m => ({
    "Module": moduleLabel(m.module_id),
    "Module ID": m.module_id,
    "Confidence %": `${(m.confidence * 100).toFixed(0)}%`,
    "Level": m.confidence_level,
    "Evidence Count": m.evidence_chain.length,
    "Strongest Quote": m.strongest_quote,
    "Rationale": m.rationale,
  }));
  const ws3 = XLSX.utils.json_to_sheet(summaryRows);
  ws3["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 60 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Summary");

  // ── Sheet 4: Meta ──
  const metaRows = [
    { Key: "Company", Value: companyName },
    { Key: "Date", Value: new Date().toISOString().slice(0, 10) },
    { Key: "Model", Value: data.meta.model },
    { Key: "Passes", Value: data.meta.passes },
    { Key: "Evidence extracted", Value: data.evidence.length },
    { Key: "Modules matched", Value: data.matches.length },
    { Key: "Rules in DB", Value: data.rules_used },
    { Key: "Profiles in DB", Value: data.profiles_used },
  ];
  const ws4 = XLSX.utils.json_to_sheet(metaRows);
  ws4["!cols"] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws4, "Meta");

  XLSX.writeFile(wb, `Evidence-Analysis-${companyName || "report"}.xlsx`);
}
