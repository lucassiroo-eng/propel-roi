
## Diagnosis

Three issues found:

### 1. ROI benefit drops to 0 when adding extra modules

The auto-lock effect (line 310-312 of StepOffering) writes the configuration to the parent via `onChange`. Its dependency array is `[configuration?.totalAnnualCost, configuration?.totalAnnualBenefit]` but omits `lockOffering`. This creates a stale-closure risk: when extras are added, cost changes and the effect fires, but the captured `lockOffering` may reference an intermediate `configuration` state from a previous render cycle, momentarily writing 0 benefit. The fix is to replace the effect with a direct `onChange` call inside the `configuration` useMemo or use a ref-based approach to always call with the latest values.

### 2. Expenses pricing is wrong (59 EUR shown as PEPM)

The "Spending Management" SKU in the pricing table is 59 EUR/year **fixed fee** (architecture: "Fixed + Expenses extra user"). The code currently treats it as a per-employee-per-month figure, showing "59 EUR por empleado/mes" and computing 708 EUR/year. The actual Expenses pricing is:

- **Fixed fee**: 59 EUR/year (from "Spending Management" or "Expenses Fixed Fee" at 39 EUR/mo yearly = 468/yr -- need to clarify)
- **Per-user tiers**: "Expenses Extra User [1-20]" at 3.6 EUR/user/mo, [21-50] at 2.88, [51-100] at 2.6, [100+] at 1.8

The correct computation: `annual = fixedFee + (numExpenseUsers * tieredPEPM * 12)`. Since we don't currently ask how many employees use Expenses, we'll default to `seats` and use the matching tier bracket. Display should show "Fixed 59 EUR/yr + X.X EUR/user/mo" instead of a single PEPM.

### 3. Extra modules have no "not in pains" indicator

When a seller adds an extra module (like Benefits), it increases cost but contributes 0 to Total Annual Benefit because no pain maps to it. The UI should clearly flag that with a "No ROI impact" or "Cost only -- not linked to any pain" note, so the seller understands why benefit didn't increase.

---

## Plan

### A. Fix stale-closure ROI bug (`StepOffering.tsx`)

- Replace the auto-lock `useEffect` with a `useEffect` that directly calls `onChange(...)` with computed values from `configuration`, adding all relevant dependencies (or use a ref pattern to avoid stale captures).
- Remove the intermediate `lockOffering` callback since it's only used in this one effect.

### B. Fix Expenses tiered pricing (`offeringEngine.ts` + `StepOffering.tsx`)

- Add a `TIERED_MODULES` map in `offeringEngine.ts` that identifies modules with fixed+per-user pricing (starting with `expenses`).
- Update `getAddonDetails` to handle tiered architecture: compute `annual = fixedFeeYearly + (tieredPepm * seats * 12)` using the "Spending Management" row for the fixed portion and the matching "Expenses Extra User" bracket for the per-user portion.
- Display the addon line as "Fixed 59 EUR/yr + 3,6 EUR/user/mo" instead of a single PEPM.

### C. Flag extra modules as cost-only (`StepOffering.tsx`)

- For addon lines where `isExtra === true` and `pains_solved.length === 0`, show a subtle "Cost only" or "No pain linked" note beneath the module name, explaining it does not contribute to Total Annual Benefit.

### Files to edit

- `src/lib/offeringEngine.ts` -- tiered pricing logic
- `src/components/wizard/StepOffering.tsx` -- fix effect, display tiered pricing, add cost-only flag
- `src/i18n/locales/en.json`, `es.json`, `fr.json` -- translation keys for "Cost only", tiered display
