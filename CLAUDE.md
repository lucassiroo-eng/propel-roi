# propel-roi — Project Memory

ROI calculator and sales-enablement wizard for Factorial prospects.
Stack: React 18 + Vite + TypeScript + Tailwind + shadcn/ui, Supabase backend.
Deploy: GitHub Pages via GitHub Actions (`lucassiroo-eng/propel-roi`).

## Wizard flow

1. Importar (HubSpot/Airtable deal fetch)
2. Módulos (select Factorial modules)
3. Config (headcount, salaries)
4. Discovery (per-module slides)
5. Resultado (ROI calculation)
6. Personalizar (PDF/PPTX export)

## Key files

- `src/pages/CoCreation.tsx` — main wizard UI, all 6 steps
- `src/lib/discoveryQuestions.ts` — `MODULE_INFO` (label, description, color, image, valueProps) + `DISCOVERY_QUESTIONS` (per-stakeholder questions keyed by module)
- `src/lib/offeringEngine.ts` — module composer
- `src/lib/painFormulas.ts` — safe expression evaluator
- `src/lib/moduleCatalog.ts` — Factorial module definitions

## Module screenshots

15 PNGs in `public/modules/` (Vite copies to `dist/` root at build):
`core.png`, `time_off.png`, `time_tracking.png`, `time_planning.png`, `payroll.png`, `recruitment.png`, `performance.png`, `expenses.png`, `trainings.png`, `compensations.png`, `engagement.png`, `procurement.png`, `projects.png`, `complaints.png`, `benefits_standard.png`

**Missing** (no file, do NOT add image path to MODULE_INFO): `documents.png`, `headcount_planning.png`, `lms.png`

## GitHub Pages base path

`VITE_BASE_PATH` is set to `/${repo_name}/` in CI. Always prefix static asset paths with:
```ts
import.meta.env.BASE_URL + path.replace(/^\//, '')
```
Never use bare `/modules/foo.png` — it 404s on Pages.

## Discovery slide layout (CoCreation.tsx ~line 762)

Three layout cases detected at render time:

| Condition | Layout |
|---|---|
| Has image + has questions | Top row (info left / screenshot right, `minHeight:220px`) + Bottom row flex-1 (questions card left / inputs card right) |
| No image, has questions | Top row (info only, full width) + Bottom row flex-1 (questions + inputs) |
| No image, no questions | Full-height 2-col: styled info card left + inputs card right |

- Bottom row always `flex-1 min-h-0` — fills remaining screen height
- Cards are `flex flex-col` with scrollable inner content
- Progress bar: `h-1.5` pills, module color filled/tinted/muted
- OKLCH used for all text colors (`oklch(18% 0.015 250)` dark, `oklch(42% 0.01 250)` body, etc.)
- Image `onError` → adds module key to `imgBrokenSet` Set → hides image slot

## MODULE_INFO shape

```ts
{
  label: { en, es, fr },
  description: { en, es, fr },   // value-prop headline shown as h2
  color: "#hex",
  image?: "/modules/filename.png",  // only if file exists in public/modules/
  valueProps: [{ en, es, fr }, ...]  // 2–3 bullet points
}
```

## Modules without images (as of last session)

`headcount_planning`, `lms`, `documents`, `benefits` (Anticipo de Nómina), `wellhub`, `hr_analytics`, and any module not listed in the 15 PNGs above.

## i18n

`lang` state from `useTranslation`. Helper `getLocalized(obj, lang)` picks `obj[lang] ?? obj.es ?? obj.en`. Questions use `getQuestion(q, lang)`.

## Supabase edge functions (12 total)

pain-mapping, offering-suggestions, evidence-analysis, email-draft, unified-analysis, hubspot-deal-fetch, airtable-deal-fetch, and others.

## Design register

**Product** (tool used during sales demos). Impeccable product register applies. Color strategy: Restrained with module-color accent. No dark mode.

## Admin panel

`src/pages/Admin.tsx` — views: analytics, pipeline, settings, docs.
`src/components/settings/AdminAnalytics.tsx` — ROI Pipeline section.

### Pipeline features
- Collapsible sent table + "Añadir ROIs" modal (deduped by company)
- "Sync HubSpot" button — calls `hubspot-deal` edge function per row
- Per-row × to remove from sent list
- Funnel: Enviados → Close Won
- HubSpot stage IDs decoded via `HUBSPOT_STAGE_LABELS` map (see file)

### RLS (updated 2026-06-03)
`own_sessions_select` and `own_prospects_select` use `USING (true)` — all authenticated users
can read all sessions and prospects (internal team tool).

## Auto-save (added 2026-06-03)

Both Express (step 3) and CoCreation (step 4) auto-save when the result screen is reached,
using a `useRef` guard to fire only once per session. Prevents data loss.

## hubspot_deal_url

Stored in `prospects.hubspot_deal_url`. Persisted on both insert and update in both flows.
Required for Sync HubSpot to work. Historical records need manual SQL update.
HubSpot portal: `4960096` (EU1). Deal URL: `https://app-eu1.hubspot.com/contacts/4960096/record/0-3/{id}/`

## roi_sessions.flow_type

`'express'` or `'co_created'`. Added via migration `20260602120000_roi_pipeline.sql`.

## Removed modules

HR Analytics (`analytics`) fully removed from `moduleCatalog.ts` and `offeringEngine.ts`.
`discoveryModules = selectedModules.filter(id => catalogIds.has(id))` guards against
HubSpot-imported deals that include removed module IDs.

## Supabase SQL tips

Cast when joining auth.users: `r.pae_id::text = (SELECT id::text FROM auth.users WHERE email = '...')`
