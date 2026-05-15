/**
 * Offering engine v2 — composer-oriented.
 * Replaces the old good/better/best tier logic with a bundle picker + add-on composer.
 */

// ── Canonical module names ──
const MODULE_ALIASES: Record<string, string> = {
  "core": "core",
  "employee platform /core": "core",
  "employee platform": "core",
  "employees": "core",
  "time tracking": "time_tracking",
  "time-off": "time_off",
  "time off": "time_off",
  "shifts": "time_planning",
  "shift management": "time_planning",
  "time planning": "time_planning",
  "performance": "performance",
  "trainings": "trainings",
  "engagement": "engagement",
  "recruitment": "recruitment",
  "expenses": "expenses",
  "compensation": "compensations",
  "compensations": "compensations",
  "benefits": "benefits",
  "benefits standard": "benefits_standard",
  "benefits standard (retribucion flexible)": "benefits_standard",
  "retribucion flexible": "benefits_standard",
  "benefits plus": "benefits",
  "projects": "projects",
  "project management": "projects",
  "procurement": "procurement",
  "lms": "lms",
  "complaints": "complaints",
  "trust channel (complaints/whistleblower)": "complaints",
  "software management": "software_management",
  "it inventory": "it_inventory",
  "it hub": "it_inventory",
  "payroll connect": "payroll",
  "payroll": "payroll",
  "compensation (w silae)": "compensations",
  "cfn": "cfn",
  "one": "one",
  "space": "space",
  "spaces": "space",
  "accounts payable": "accounts_payable",
  "wellhub": "wellhub",
  "onboarding": "onboarding",
  "offboarding": "offboarding",
  "documents": "documents",
  "analytics": "analytics",
  "surveys": "engagement",
  "surveys + performance": "performance",
  "spend management": "expenses",
  "multi-entity": "multi_entity",
  "crm": "crm",
  "crm 🆕": "crm",
  "headcount planning": "headcount_planning",
  "one - ai agent": "one",
  "silae integration": "silae",
  "silae": "silae",
  "compensation (includes silae integration)": "compensations",
  "compensation (w silae)": "compensations",
  "business central": "integration_business_central",
  "netsuite": "integration_netsuite",
  "sage 200": "integration_sage_200",
  "sage 200 (spain only)": "integration_sage_200",
  "milena": "integration_milena",
  "milena (spain only)": "integration_milena",
  "suprema xiptic": "integration_suprema_xiptic",
  "trust channel": "complaints",
};

export function canonicalModule(raw: string): string {
  const lower = raw.trim().toLowerCase();
  return MODULE_ALIASES[lower] ?? lower.replace(/[\s/]+/g, "_");
}

const MODULE_LABELS: Record<string, string> = {
  core: "Core HR",
  time_tracking: "Time Tracking",
  time_off: "Time Off",
  time_planning: "Shift Management",
  performance: "Performance",
  trainings: "Trainings",
  engagement: "Engagement",
  recruitment: "Recruitment",
  expenses: "Expenses",
  compensations: "Compensation",
  benefits: "Salary Advance",
  benefits_standard: "Benefits Standard",
  projects: "Projects",
  procurement: "Procurement",
  lms: "LMS",
  complaints: "Trust Channel",
  software_management: "Software Management",
  it_inventory: "IT Inventory",
  payroll: "Payroll Connect",
  cfn: "CFN",
  one: "Factorial One",
  space: "Space",
  accounts_payable: "Accounts Payable",
  wellhub: "Wellhub",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  documents: "Documents",
  analytics: "Analytics",
  multi_entity: "Multi-entity",
  crm: "CRM",
  headcount_planning: "Headcount Planning",
  silae: "SILAE Integration",
  integration_business_central: "Business Central",
  integration_netsuite: "Netsuite",
  integration_sage_200: "SAGE 200",
  integration_milena: "Milena",
  integration_suprema_xiptic: "Suprema Xiptic",
};

export function moduleLabel(canonical: string): string {
  return MODULE_LABELS[canonical] ?? canonical.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Types ──

export interface BundleRow {
  id: number;
  bundle_name: string;
  country: string;
  tier: string | null;
  included_modules: string | null;
  floor_seats: number | null;
  business_pepm_monthly: number | null;
  business_pepm_yearly: number | null;
  enterprise_pepm_monthly: number | null;
  enterprise_pepm_yearly: number | null;
}

export interface PricingLineItem {
  sku_name: string;
  sku_type: string;
  architecture?: string | null;
  price_business_yearly: string | null;
  price_enterprise_yearly: string | null;
  price_business_monthly: string | null;
  price_enterprise_monthly: string | null;
}

export interface PainModuleEntry {
  pain_id: string;
  primary_module: string;
}

// ── Constraint violations ──

export interface ConstraintViolation {
  type: "error" | "warning";
  message: string;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
}

// ── Bundle analysis result ──

export interface BundleAnalysis {
  bundle: BundleRow;
  bundleModules: string[];
  coveredRequired: string[];       // required modules covered by bundle
  uncoveredRequired: string[];     // required modules NOT in bundle
  bundlePepm: number;
  bundleAnnual: number;
  addonPepm: number;
  addonAnnual: number;
  totalAnnual: number;
  totalBenefit: number;            // sum of annual_benefit for covered pains
  netRoi: number;
  effectiveSeats: number;
}

// ── Helpers ──

const STARTER_MODULES: Record<string, string[]> = {
  "starter operations": ["Core", "Time Tracking", "Time Off"],
  "starter planning": ["Core", "Time Tracking", "Time Off", "Shifts"],
  "starter productivity": ["Core", "Time Tracking", "Time Off", "Performance"],
  "starter essentials": ["Core", "Time Tracking", "Time Off", "Trainings"],
  "starter essential": ["Core", "Time Tracking", "Time Off", "Trainings"],
  "starter consulting": ["Core", "Time Tracking", "Time Off", "Projects"],
  "starter people": ["Core", "Performance", "Trainings", "Engagement"],
  "starter compensation": ["Core", "Time Tracking", "Time Off", "Compensation", "Benefits Standard"],
  "starter compensations": ["Core", "Time Tracking", "Time Off", "Compensation", "Benefits Standard"],
};

export function parseModulesFromBundle(b: BundleRow): string[] {
  if (!b.included_modules) return [];
  const raw = b.included_modules;

  // Try resolving via bundle_name first (most reliable)
  const byName = STARTER_MODULES[b.bundle_name.trim().toLowerCase()];
  if (byName) return [...new Set(byName.map(canonicalModule).filter(Boolean))];

  // Match "Starter X" optionally followed by "+ extras"
  const starterMatch = raw.match(/^(Starter\s+\w+)\s*(?:\+\s*(.*))?$/i);
  if (starterMatch) {
    const starterName = starterMatch[1].trim().toLowerCase();
    const starterMods = STARTER_MODULES[starterName];
    if (starterMods) {
      const extras = starterMatch[2]
        ? starterMatch[2].split(/[+,]/).map(s => s.trim()).filter(Boolean)
        : [];
      return [...new Set([...starterMods, ...extras].map(canonicalModule).filter(Boolean))];
    }
  }

  // Simple comma/plus/and separated list
  return [...new Set(
    raw.split(/[,+]|\band\b/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(canonicalModule)
      .filter(Boolean)
  )];
}

export function getBundlePepm(
  b: BundleRow,
  billing: "monthly" | "yearly",
  tier: "business" | "enterprise",
): number {
  if (billing === "yearly") {
    return tier === "enterprise" ? (b.enterprise_pepm_yearly ?? 0) : (b.business_pepm_yearly ?? 0);
  }
  return tier === "enterprise" ? (b.enterprise_pepm_monthly ?? 0) : (b.business_pepm_monthly ?? 0);
}

export function getLineItemPrice(
  item: PricingLineItem,
  billing: "monthly" | "yearly",
  tier: "business" | "enterprise",
): number {
  const raw = billing === "yearly"
    ? (tier === "enterprise" ? item.price_enterprise_yearly : item.price_business_yearly)
    : (tier === "enterprise" ? item.price_enterprise_monthly : item.price_business_monthly);
  if (!raw) return 0;
  const num = parseFloat(String(raw));
  return isNaN(num) ? 0 : num;
}

// Modules that are included in Core HR and have no standalone SKU
export const MODULES_INCLUDED_IN_CORE = new Set([
  "onboarding", "offboarding", "documents",
]);

// Fallback: canonical module → SKU name when direct match fails
const MODULE_TO_SKU: Record<string, string> = {
  expenses: "Spending Management",
  space: "Spaces",
  projects: "Project Management",
  compensations: "Compensation",
  complaints: "Trust channel (Complaints/Whistleblower)",
  time_planning: "Shift Management",
  crm: "CRM",
  headcount_planning: "Headcount Planning",
  silae: "SILAE Integration",
  integration_business_central: "Business Central",
  integration_netsuite: "Netsuite",
  integration_sage_200: "SAGE 200",
  integration_milena: "Milena",
  integration_suprema_xiptic: "Suprema Xiptic",
};

function getLineItemForModule(
  module: string,
  lineItems: PricingLineItem[],
): PricingLineItem | undefined {
  // Direct canonical match first
  const direct = lineItems.find(li => canonicalModule(li.sku_name) === module);
  if (direct) return direct;
  // Fallback by SKU name
  const skuName = MODULE_TO_SKU[module];
  if (skuName) return lineItems.find(li => li.sku_name === skuName);
  return undefined;
}

// ── List all purchasable add-on modules from pricing table ──

export function listAvailableAddonModules(
  lineItems: PricingLineItem[],
  excludeModules: string[],
): { module: string; label: string }[] {
  const excludeSet = new Set(excludeModules);
  const seen = new Set<string>();
  const result: { module: string; label: string }[] = [];

  // First add SKUs that canonicalize cleanly
  for (const li of lineItems) {
    const mod = canonicalModule(li.sku_name);
    if (!mod || seen.has(mod) || excludeSet.has(mod) || MODULES_INCLUDED_IN_CORE.has(mod)) continue;
    // Skip meta/aggregate rows
    if (["bundled add-ons", "other", "finance", "talent", "integrations (by partners)"].includes(li.sku_name.toLowerCase())) continue;
    // Skip tiered variants (keep only the first)
    if (li.sku_name.match(/Extra User|disc\.|Active Jobs|\(\d/)) continue;
    seen.add(mod);
    result.push({ module: mod, label: moduleLabel(mod) });
  }

  // Add fallback-mapped modules that aren't already present
  for (const [mod, skuName] of Object.entries(MODULE_TO_SKU)) {
    if (seen.has(mod) || excludeSet.has(mod)) continue;
    if (lineItems.some(li => li.sku_name === skuName)) {
      seen.add(mod);
      result.push({ module: mod, label: moduleLabel(mod) });
    }
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

// ── Required modules from pains ──

export interface RequiredModule {
  module: string;
  label: string;
  painIds: string[];
  totalBenefit: number;
}

export function deriveRequiredModules(
  selectedPains: string[],
  painModules: PainModuleEntry[],
  painBenefits: Record<string, number>,
): RequiredModule[] {
  const map = new Map<string, { painIds: string[]; totalBenefit: number }>();
  
  // Core is always required
  map.set("core", { painIds: [], totalBenefit: 0 });
  
  for (const painId of selectedPains) {
    const pm = painModules.find(p => p.pain_id === painId);
    if (!pm) continue;
    const mods = pm.primary_module
      .split(/[+,/]/)
      .map(s => canonicalModule(s.trim()))
      .filter(Boolean);
    for (const mod of mods) {
      if (!map.has(mod)) map.set(mod, { painIds: [], totalBenefit: 0 });
      const entry = map.get(mod)!;
      entry.painIds.push(painId);
      entry.totalBenefit += painBenefits[painId] ?? 0;
    }
  }
  
  return Array.from(map.entries()).map(([module, data]) => ({
    module,
    label: moduleLabel(module),
    painIds: data.painIds,
    totalBenefit: data.totalBenefit,
  }));
}

// ── Analyze a bundle against required modules ──

export function analyzeBundle(
  bundle: BundleRow,
  requiredModules: string[],
  lineItems: PricingLineItem[],
  billing: "monthly" | "yearly",
  tier: "business" | "enterprise",
  seats: number,
  painModules: PainModuleEntry[],
  selectedPains: string[],
  painBenefits: Record<string, number>,
): BundleAnalysis {
  const bundleModules = parseModulesFromBundle(bundle);
  const hasCore = bundleModules.includes("core");
  const isCovered = (m: string) => bundleModules.includes(m) || (hasCore && MODULES_INCLUDED_IN_CORE.has(m));
  const coveredRequired = requiredModules.filter(isCovered);
  const uncoveredRequired = requiredModules.filter(m => !isCovered(m));
  
  const effectiveSeats = Math.max(seats, Number(bundle.floor_seats ?? 0));
  const bundlePepm = getBundlePepm(bundle, billing, tier);
  const bundleAnnual = bundlePepm * effectiveSeats * 12;
  
  // Add-on costs for uncovered required modules
  let addonAnnual = 0;
  let addonPepm = 0;
  for (const mod of uncoveredRequired) {
    const details = getAddonDetails(mod, lineItems, billing, tier, effectiveSeats);
    if (details) {
      addonAnnual += details.annual;
      addonPepm += details.pepm;
    }
  }
  const totalAnnual = bundleAnnual + addonAnnual;
  
  // All modules in the configuration (bundle + add-ons)
  const allModules = [...new Set([...bundleModules, ...uncoveredRequired])];
  
  // Compute total benefit: sum of annual_benefit for pains whose required module is in allModules
  let totalBenefit = 0;
  for (const painId of selectedPains) {
    const pm = painModules.find(p => p.pain_id === painId);
    if (!pm) continue;
    const painMods = pm.primary_module
      .split(/[+,/]/)
      .map(s => canonicalModule(s.trim()))
      .filter(Boolean);
    if (painMods.some(m => allModules.includes(m))) {
      totalBenefit += painBenefits[painId] ?? 0;
    }
  }
  
  return {
    bundle,
    bundleModules,
    coveredRequired,
    uncoveredRequired,
    bundlePepm,
    bundleAnnual,
    addonPepm,
    addonAnnual,
    totalAnnual,
    totalBenefit,
    netRoi: totalBenefit - totalAnnual,
    effectiveSeats,
  };
}

// ── Find optimal bundle (maximize Net ROI) ──

export function findOptimalBundle(
  bundles: BundleRow[],
  requiredModules: string[],
  lineItems: PricingLineItem[],
  billing: "monthly" | "yearly",
  tier: "business" | "enterprise",
  seats: number,
  painModules: PainModuleEntry[],
  selectedPains: string[],
  painBenefits: Record<string, number>,
): BundleAnalysis | null {
  const analyses = bundles
    .filter(b => getBundlePepm(b, billing, tier) > 0) // skip bundles with no price
    .map(b => analyzeBundle(b, requiredModules, lineItems, billing, tier, seats, painModules, selectedPains, painBenefits));
  
  if (analyses.length === 0) return null;
  
  // Sort by: most required modules covered DESC, then total annual cost ASC
  analyses.sort((a, b) => {
    const covDiff = b.coveredRequired.length - a.coveredRequired.length;
    if (covDiff !== 0) return covDiff;
    return a.totalAnnual - b.totalAnnual;
  });
  
  return analyses[0];
}

// ── Constraint validation ──

export function validateConfiguration(params: {
  bundleModules: string[];
  addonModules: string[];
  tier: "business" | "enterprise";
  seats: number;
  totalPepm: number;
  lineItems: PricingLineItem[];
}): ConstraintViolation[] {
  const { bundleModules, addonModules, tier, seats, totalPepm, lineItems } = params;
  const allModules = [...bundleModules, ...addonModules];
  const violations: ConstraintViolation[] = [];
  
  // Core mandatory
  if (!allModules.includes("core")) {
    violations.push({
      type: "error",
      message: "Core HR is mandatory and must be included.",
      i18nKey: "offering.constraint_core_mandatory",
    });
  }
  
  // Time Off + Time Tracking paired
  const hasTimeOff = allModules.includes("time_off");
  const hasTimeTracking = allModules.includes("time_tracking");
  if (hasTimeOff !== hasTimeTracking) {
    violations.push({
      type: "warning",
      message: "Time Off and Time Tracking must be added together.",
      i18nKey: "offering.constraint_time_paired",
    });
  }
  
  // LMS requires Trainings
  if (allModules.includes("lms") && !allModules.includes("trainings")) {
    violations.push({
      type: "warning",
      message: "LMS requires the Trainings module.",
      i18nKey: "offering.constraint_lms_trainings",
    });
  }
  
  // ATS Recruitment 100-seat minimum
  if (allModules.includes("recruitment") && seats < 100) {
    violations.push({
      type: "warning",
      message: `Recruitment requires a minimum of 100 seats (current: ${seats}).`,
      i18nKey: "offering.constraint_recruitment_seats",
      i18nParams: { seats },
    });
  }
  
  // No-Enterprise modules: check if any addon has no enterprise price
  if (tier === "enterprise") {
    for (const mod of addonModules) {
      const item = lineItems.find(li => canonicalModule(li.sku_name) === mod);
      if (item) {
        const price = getLineItemPrice(item, "yearly", "enterprise");
        if (price === 0) {
          violations.push({
            type: "warning",
            message: `${moduleLabel(mod)} is not available on Enterprise tier.`,
            i18nKey: "offering.constraint_no_enterprise",
            i18nParams: { module: moduleLabel(mod) },
          });
        }
      }
    }
  }
  
  // ARPU floor (€19/seat monthly = €228/seat yearly is typical, but we use a simple check)
  // The min ARPU is typically from the pricing table "floor" field
  // For now, we use a soft check
  
  return violations;
}

// ── Tiered pricing helpers (Expenses, Recruitment, etc.) ──

interface TieredBracket {
  min: number;
  max: number;
  skuPattern: RegExp;
}

const EXPENSES_BRACKETS: TieredBracket[] = [
  { min: 1, max: 20, skuPattern: /Expenses Extra User \[1-20\]/i },
  { min: 21, max: 50, skuPattern: /Expenses Extra User \[21-50\]/i },
  { min: 51, max: 100, skuPattern: /Expenses Extra User \[51-100\]/i },
  { min: 101, max: Infinity, skuPattern: /Expenses Extra User \(\+100\)/i },
];

function getExpensesTieredPepm(
  seats: number,
  lineItems: PricingLineItem[],
  billing: "monthly" | "yearly",
  tier: "business" | "enterprise",
): number {
  const bracket = EXPENSES_BRACKETS.find(b => seats >= b.min && seats <= b.max)
    ?? EXPENSES_BRACKETS[EXPENSES_BRACKETS.length - 1];
  const item = lineItems.find(li => bracket.skuPattern.test(li.sku_name));
  if (!item) return 0;
  return getLineItemPrice(item, billing, tier);
}

// ── Get add-on details for a module ──

export interface AddonDetailsResult {
  pepm: number;
  annual: number;
  architecture: string;
  /** For tiered modules: annual fixed fee component */
  fixedFeeAnnual?: number;
  /** For tiered modules: per-user PEPM on top of fixed */
  userPepm?: number;
  isTiered?: boolean;
}

export function getAddonDetails(
  module: string,
  lineItems: PricingLineItem[],
  billing: "monthly" | "yearly",
  tier: "business" | "enterprise",
  seats: number,
): AddonDetailsResult | null {
  // Special handling for Expenses (fixed fee + per-user tiers)
  if (module === "expenses") {
    const fixedItem = lineItems.find(li => /Spending Management/i.test(li.sku_name));
    const fixedFeeAnnual = fixedItem ? getLineItemPrice(fixedItem, billing, tier) : 0;
    const userPepm = getExpensesTieredPepm(seats, lineItems, billing, tier);
    const annual = fixedFeeAnnual + (userPepm * seats * 12);
    return {
      pepm: 0,
      annual,
      architecture: "Fixed + Per user",
      fixedFeeAnnual,
      userPepm,
      isTiered: true,
    };
  }

  const item = getLineItemForModule(module, lineItems);
  if (!item) return null;
  const pepm = getLineItemPrice(item, billing, tier);
  const architecture = item.architecture ?? "Per seat";
  const isFixed = architecture.toLowerCase().includes("fixed");
  const annual = isFixed ? pepm * 12 : pepm * seats * 12;
  return { pepm, annual, architecture };
}

// ── Covered/uncovered pains for a module set ──

export function classifyPains(
  selectedPains: string[],
  painModules: PainModuleEntry[],
  configModules: string[],
): { covered: string[]; uncovered: string[] } {
  const covered: string[] = [];
  const uncovered: string[] = [];
  
  for (const painId of selectedPains) {
    const pm = painModules.find(p => p.pain_id === painId);
    if (!pm) { uncovered.push(painId); continue; }
    const painMods = pm.primary_module
      .split(/[+,/]/)
      .map(s => canonicalModule(s.trim()))
      .filter(Boolean);
    const hasCore = configModules.includes("core");
    if (painMods.some(m => configModules.includes(m) || (hasCore && MODULES_INCLUDED_IN_CORE.has(m)))) {
      covered.push(painId);
    } else {
      uncovered.push(painId);
    }
  }
  
  return { covered, uncovered };
}

// ── Legacy re-exports for any code still importing old types ──

export type RecommendationRule = {
  rule_id: string;
  triggering_pains: string;
  recommended_bundle: string;
  min_pains: number | null;
  rationale: string | null;
};

export type BenchmarkRow = {
  sector: string;
  country: string;
  attach_rates: Record<string, number> | null;
  n_customers: number | null;
};
