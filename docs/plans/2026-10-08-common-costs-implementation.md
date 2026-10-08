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
- Conditional effects inside a qc-style string are a proven pattern (`day_close_accept` in
  Sodium Wisp already ships one); the day-clock carry/wrap leans on it, so no loop logic
  needed in the engine.
