# Common Costs — implementation

**Date:** 2026-10-08
**Design:** `2026-10-08-common-costs-design.md`
**Branch:** `bugfix-batch-aug2026-clean`

## Steps (all complete)

1. **models.ts** — `CommonCostDef` interface; `WorldSettings.commonCosts?: CommonCostDef[]`;
   `ResolveOption.common_costs?: string[]`.
   - `npx tsc --noEmit` → 0 errors.
2. **`src/app/api/resolve/route.ts`** — after the action-economy block, apply each opted-in
   common cost's effect string via `engine.applyEffects(cc.effects)`. Covers storylets and
   opportunity cards (both arrive through `getEvent`).
   - `npx tsc --noEmit` → 0 errors.
3. **`src/components/admin/CommonCostsPicker.tsx`** (new) — fetches
   `/api/admin/settings?storyId=`, renders a checkbox per defined cost, toggles
   `option.common_costs`. Renders nothing when the world defines none.
4. **`storylets/components/OptionEditor.tsx`** — picker under the Label/Cost/Image row.
   Opportunity cards reuse the same `OptionList`/`OptionEditor`, so the checkbox appears in
   the card editor with no extra work.
   - `npx tsc --noEmit` → 0 errors.
5. **`settings/components/SettingsGameSystem.tsx`** — "Common Costs" section: add/remove
   rows (key, label, effects, default checkbox), SmartArea effect strings, docs link to
   `/docs/logic#common-costs`.
6. **`docs/logic/page.tsx`** — section 4 "Common Costs" with the day-clock example.
7. `npm run lint` — no new diagnostics. `npm run build` — passes.

## Notes

- `default: true` is an editor affordance only; resolve applies strictly opted-in keys
  (backwards compatible: pre-existing options have no `common_costs` and never pay).
- **Conditional effects ARE supported** (corrected 2026-10-08, same day): the parser expands
  `{cond : effects | }` regions via evaluateText and re-parses recursively; text conditionals
  nest too. An earlier correction in these docs claimed otherwise — that was a test-harness
  artifact (seeding raw numbers instead of QualityState objects breaks proxy reads; production
  characters always carry proper states). Verified with a state-shaped harness: carry/wrap
  effect strings tick correctly, nested conditionals resolve DAWN/DAY/NIGHT, and trailing
  conditionals in qc strings fire.
- Sodium Wisp's dormant `day_close` qc carried ~30 conditional regions (standing decay,
  rel penalties) that were inert only because the storylet itself was dormant — they work,
  and are restored in the world repo.
