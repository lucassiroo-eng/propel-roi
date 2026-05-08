import { Settings, Clock, DollarSign, Monitor, ClipboardList, TrendingDown, PiggyBank, type LucideIcon } from "lucide-react";

export interface PersonaConfig {
  color: string;
  Icon: LucideIcon;
  i18nKey: string;
}

const PERSONA_CONFIG: Record<string, PersonaConfig> = {
  "HR Director": { color: "#8B7EC8", Icon: Settings, i18nKey: "persona.hr_director" },
  "hr_director": { color: "#8B7EC8", Icon: Settings, i18nKey: "persona.hr_director" },
  "People Ops": { color: "#F4845F", Icon: Clock, i18nKey: "persona.people_ops" },
  "people_ops": { color: "#F4845F", Icon: Clock, i18nKey: "persona.people_ops" },
  "Finance": { color: "#5CB8B2", Icon: DollarSign, i18nKey: "persona.finance" },
  "finance": { color: "#5CB8B2", Icon: DollarSign, i18nKey: "persona.finance" },
  "IT/Admin": { color: "#5EEAD4", Icon: Monitor, i18nKey: "persona.it_admin" },
  "c_level": { color: "#5EEAD4", Icon: Monitor, i18nKey: "persona.c_level" },
};

const FALLBACK: PersonaConfig = { color: "#9CA3AF", Icon: ClipboardList, i18nKey: "persona.other" };

export function getPersonaConfig(persona: string): PersonaConfig {
  return PERSONA_CONFIG[persona] ?? FALLBACK;
}

export interface SubGroupConfig {
  Icon: LucideIcon;
  i18nKey: string;
}

const SUB_GROUP_CONFIG: Record<string, SubGroupConfig> = {
  time: { Icon: Clock, i18nKey: "subgroup.time" },
  inefficiency: { Icon: TrendingDown, i18nKey: "subgroup.inefficiency" },
  direct_cost_saving: { Icon: PiggyBank, i18nKey: "subgroup.direct_cost_saving" },
};

const SUB_GROUP_FALLBACK: SubGroupConfig = { Icon: ClipboardList, i18nKey: "subgroup.other" };

export function getSubGroupConfig(subGroup: string): SubGroupConfig {
  return SUB_GROUP_CONFIG[subGroup] ?? SUB_GROUP_FALLBACK;
}

/** Ordered list of sub_groups for consistent rendering */
export const SUB_GROUP_ORDER = ["time", "inefficiency", "direct_cost_saving"];
