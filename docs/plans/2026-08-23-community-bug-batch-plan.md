# Community Bug Batch + Hidden Categories Feature

**Date:** 2026-08-23
**Branch:** `bugfix-batch-aug2026` (from `parser-rework` @ `0e457b80`)
**Status:** Complete — all phases landed (see git log on branch)

## Outcome notes

- Base branch did not compile: `textProcessor.ts` called `logger.trace()` on a
  callable `TraceLogger` type. Fixed in a separate commit so the batch builds.
- `npm run test:parser` fails on the base branch too (`tsconfig.test.json`
  lacks the `@/*` path alias) — left as-is, flagged for follow-up.
- Full-project lint: 2193 problems vs 2195 baseline (net -2); every touched
  file was diffed against its stashed baseline with no new diagnostics.
- `npm run build` passes after installing the missing platform-native
  `lightningcss-linux-x64-gnu` binary (environmental, `--no-save`).
**Sources:** GitHub issue #52, direct user reports, Discord/other reports relayed by maintainer.

## Decisions locked with maintainer

| Question | Decision |
|---|---|
| Sidebar ANY/ALL repro | Apply defensive fixes (case/whitespace normalization, empty-list show-all) without waiting for repro |
| Hidden categories scope | Hide member qualities everywhere except sidebar; keep `%pick`/`%all` queryable |
| Living stories | Fix all identified silent-failure paths |
| Must/High urgency without `autofire_if` | Only explicit `autofire_if` forces/persists; urgency alone never hijacks |

## Phase 1 — Quick wins

### 1A. Issue #52: invisible scrollbar (classic-light)
Global scrollbar rules (`src/styles/base/core.css:59-86`) hardcode `--border-light`/`--bg-main`
and ignore the dedicated `--scrollbar-thumb` / `--scrollbar-bg` / `--scrollbar-thumb-hover`
variables themes define. classic-light thumb `#b8c5d3` vs track `#d1dbe4` = invisible.

- Consume dedicated vars with fallbacks in `core.css` (standard `scrollbar-color` + webkit pseudos).
- Bump classic-light `--scrollbar-thumb` to `#94a3b8` (`--text-muted`) for contrast.
- Themes lacking the vars keep current appearance via fallbacks.

### 1B. Sidebar category matching (defensive)
Code already uses ANY-semantics (`CharacterSheet.tsx:41` `.some()`); reported ALL-symptom likely
from case-sensitive compare or the empty-list guard added in `648f9972`.

- New shared util `src/utils/categoryMatching.ts`: split `,` / trim / lowercase both sides.
- Apply at `CharacterSheet.tsx:41`, `CharacterInspector.tsx:106-110`.
- Restore empty-list show-all semantics: `length === 0 || some(...)`.

## Phase 2 — Engine/display bugs

### 2C. Lock reasons must evaluate ScribeScript in quality names
Gating logic is fine; presentation is broken. Three copy-pasted regex humanizers paste raw
`def.name` and cannot parse `{$q.name} == 'x'` clauses at all:

- `StoryletDisplay.tsx:369-403` (`getLockReason`)
- `LocationStorylets.tsx:33-66`
- `OptionEditor.tsx:502-516` (`getLockPreview`)

Fix: extract single shared `formatLockReason(condition, qualityDefs, evaluate)` util;
resolve qid → `evaluate(def.name)` (handles script-in-name), assemble readable clause string,
final `evaluate()` pass over result for leftover `{...}`. Custom `lock_message` path already
works — unchanged.

### 2D. Autofire gating — explicit `autofire_if` only
`evaluateCondition("")` returns true, so every bare-Must/High storylet counts as eligible and
post-resolution the first one is **persisted** as `currentStoryletId`
(`resolve/route.ts:163-215`), which page load restores (`play/[storyId]/page.tsx:78-84`) —
the "refresh auto-selects first storylet" bug. Same trap in `equip/route.ts:97-112`.

- `contentCache.ts:141-143` `getAutofireStorylets`: collect only `!!s.autofire_if`.
- Defensive truthy check at `resolve/route.ts:65-68`, `equip/route.ts`.
- Genuine `autofire_if` forcing (page load, 409 lock, redirect chain) unchanged.

## Phase 3 — Guest account overhaul

### 3E. Living stories silent-failure paths
1. `characterService.checkLivingStories` builds engine without merging
   `character.dynamicQualities` → `%new` targets hit "Unknown quality. Skipping."
   (swallowed). Merge dynamic defs like `resolve/route.ts:37-40`.
2. Same function omits world-state arg → `$world.*` writes vanish. Route through world updates.
3. `scheduler.ts` drops unparseable durations/effects silently — add warnings with context;
   log dropped instructions at `processScheduledUpdates` gate.
4. Guests: skip `saveCharacterState` when guest; `acknowledge-event/route.ts` accept
   `guestState` body (already sent by `GameHub.tsx`) and return updated guest state;
   GameHub writes returned state back to localStorage.

### 3F. Unify character creation
Guest branch `create/route.ts:63-154` duplicates registered provisioning with a `$`-prefix key
mismatch (looks up `$player_name`, payload sends stripped keys) → typed values dropped,
actions never seeded (0), deck charges empty, calc rules skipped.

- Extract shared provisioning fn in `characterService.ts`; both branches call it.
- Seed action economy from `settings.maxActions` both paths (registered currently hardcodes 20).
- Name resolution parity; never assign raw `$player_name` as literal name.
- Skip-creation flow works for guests once unified.

### 3G. Guest must-events
Extract autofire eligibility evaluation into a shared module runnable client-side;
`GameHub` guest-load effect evaluates after restoring character/location and after travel.

### 3H. migrate-guest route path
Move `src/app/character/migrate-guest/route.ts` → `src/app/api/character/migrate-guest/route.ts`
(GameHub fetches `/api/...`; current location 404s).

## Phase 4 — Feature: hidden categories

- `CategoryDefinition.hidden?: boolean` (`models.ts:347`) + editor toggle in `CategoryMainForm.tsx`.
- Member qualities: queryable by `%pick`/`%all` (unaffected), visible on sidebar when the
  category is sidebar-enabled, filtered from `ProfilePanel.tsx` listing and `Possessions.tsx`
  item listing. Admin `CharacterInspector` stays unfiltered (debug surface).

## Verification

- `npm run lint` + `npm run build` per phase.
- Manual passes: scrollbar FF+Chrome, mixed-case sidebar repro, lock tooltip with
  `{$q.name}`, living-story timer on dynamic quality registers/fires/console-visible,
  refresh-in-location neutral landing, guest journey (name → skip-create → max actions →
  must-event → ack → migrate).
