# Social Actions (StoryNexus-style) + Relationship Qualities

**Date:** 2026-10-02
**Branch:** TBD (cut from `bugfix-batch-aug2026-clean` or `main` once batch merges)
**Status:** Design locked — Phase A implementation starting
**Motivation:** Rat Sim revival needs player-to-player interaction (groom/fight/court).

## How StoryNexus did it (research)

Sources: Failbetter forum threads `storynexus-rich-quality-effects-social-actions/10504`
(Alexis, 2013-04-26) and `testing-social-acts/10563` (aragaer, 2013-05); StoryNexus
Reference Guide (Scribd copy, snippet-verified).

1. **Social acts were invitations.** Acting on a player created a pending invitation
   on the target; effects applied only on accept. Gift-like acts auto-accepted.
2. **Relationship Qualities** — per-pair, directional state ("Fighting against X"),
   usable to filter target lists ("attack only the player I am fighting, no list").
3. **Mirroring** — cross-character value reads ("set invitee's Opponent's weapon
   damage to inviter's Weapon damage"). Ordering vs branch effects was ambiguous.
4. **Separate effect sets per side** — inviter and invitee each had their own quality
   effects, keyed off the same act. Co-operative acts: "invitations to dinner, gifts,
   co-operative problem solving, hiring for missions, doomed love affairs".
5. Social acts were a **layer on the existing effect language** (rich quality effects),
   not a separate DSL.

## Decisions locked with maintainer

| Question | Decision |
|---|---|
| Architecture | Hybrid: formal spine (targeting/delivery/UI/authz), ScribeScript flesh (effects/conditions) |
| New sigil chars? | **No.** Reserved roots instead: `$target.*`, `$rel.*`. Free ASCII sigils all collide with JS operators (`&`→`&&`, `?`→ternary, `!`→not) |
| `#` scope | Reserved. `#world.*` (per-world `worldState`) and `#platform.*` (cross-world) — reserved names now, implementation deferred |
| Outcomes | Challenge supported in v1; target effect set mirrors actor's pass/fail of the same resolution |
| Target consent | Invitation (accept/decline) by default; `auto_accept` per-option for gift-like acts |
| Decline | Silent — nothing happens, event consumed |
| Ordering | Actor's own effects resolve FIRST; `$target.*` values snapshot AFTER |
| Guests | Registered characters only, v1 |
| Naming | "Social Actions" in UI/docs (SN vocabulary) |
| Relationships | Phase B: directional rows, auto-acquaintance on first accepted act, `known` scope without co-location requirement |

## Scope reserved for the writer

| Notation | Meaning | Notes |
|---|---|---|
| `$target.name` | other player's character name | text + conditions |
| `$target.<qid>` | other player's quality value (SN "mirroring") | conditions, effect values, text |
| `$rel.<type>` | relationship level between actor and player-in-play | Phase B; candidate while filtering, target once chosen |
| `rel.<type> <op> <val>` | relationship effect op | Phase B; parsed like quality ops, hits the pair row |
| `target` , `rel`, `world`, `platform` | reserved quality ids | enforced via reserved-id list |

## Phase A — Social actions core

### A1. Model (`src/engine/models.ts`)

- `ResolveOption` + `ContentCommon`-bearing option types:
  ```ts
  social?: boolean;                    // option acts on another player
  social_scope?: 'here' | 'anywhere';  // Phase B adds 'known'
  social_if?: string;                  // per-candidate condition (their qualities)
  auto_accept?: boolean;               // skip accept/decline; effects apply on next tick
  target_pass_quality_change?: string; // effect string, runs in TARGET context
  target_fail_quality_change?: string;
  target_text?: string;                // narration stored on target's event (snapshot)
  ```
- `PendingEvent`: add
  ```ts
  type?: 'living' | 'social';          // default 'living' for existing rows
  fromCharacterId?: string;
  fromName?: string;
  socialOptionId?: string;
  effects?: { pass?: string; fail?: string };  // effect strings, applied on accept
  outcome?: 'pass' | 'fail';           // actor's resolution result
  accepted?: boolean;
  ```
  Existing events keep working: absent `type` treated as `'living'`.
- `CharacterDocument` unchanged (`pendingEvents` already exists).
- Reserved id list constant (`target`, `rel`, `world`, `platform`) exported from
  `models.ts`; quality creation paths warn-but-allow (legacy worlds), editor shows
  a warning.

### A2. Engine + routes

- **`GET /api/social/candidates`** (`src/app/api/social/candidates/route.ts`):
  `storyId` → registered characters at actor's location (scope `here`) or all
  registered characters in world (scope `anywhere`), excluding actor. Projection:
  `characterId, name, portrait`. Response includes `locks: Record<charId, string>` —
  `social_if` evaluated per candidate (server-side engine) so the picker can
  grey-out instead of hide (writers' choice later; v1 hides locked).
- **`POST /api/resolve`** extension: accept `targetCharacterId`. When option is
  `social`:
  - Validate: target exists in story, registered, scope match (co-location for
    `here`), `social_if` passes (engine built on target's qualities), actor not guest.
  - Resolve actor normally (existing pipeline untouched; actor effects apply first).
  - Snapshot phase: build second `GameEngine` on target's qualities; evaluate
    `target_text` + `$target.*` reads AFTER actor effects resolved (locked ordering).
  - Enqueue on target: `PendingEvent` `{type:'social', fromCharacterId, fromName,
    socialOptionId, effects:{pass, fail}, outcome, triggerTime: now,
    description: evaluated target_text}`.
    - `auto_accept`: set `accepted: true` immediately.
  - **No other write to the target doc** (append-only) — avoids the
    `saveCharacterState` last-write-wins race (characterService.ts:411).
- **`POST /api/social/accept`** + **`POST /api/social/decline`**
  (`src/app/api/social/respond/route.ts`, action in body):
  - Loads caller's character (guestState accepted — events may arrive pre-registration;
    if guest: apply locally, return state, same shape as acknowledge-event).
  - Decline: set `completedTime`, done.
  - Accept: build engine on caller's qualities, apply the outcome's effect string
    (pass/fail), produce `QualityChangeInfo[]` for the response, mark completed.
  - Response includes updated character + change list (mirrors resolve response shape).

### A3. Firing + UI (target side)

- `checkLivingStories` (`characterService.ts:12-99`) must NOT auto-complete social
  events (it completes `!completedTime` events). Filter `type !== 'social' ||
  accepted` into the auto-apply path; social unaccepted events surface to UI instead.
  Auto-accepted social events DO auto-apply there (triggerTime gate as normal).
- **`LivingStories.tsx`**: render social events as cards — sender name, narration,
  their change list (on accept), **Accept/Decline** buttons (auto-accept: single
  Acknowledge, changes pre-applied). Wire to the respond route; on success update
  character state in GameHub (same path as handleAcknowledgeEvent, GameHub.tsx:192).
- **`StoryletDisplay.tsx` / option click**: when option `social`, open target
  **picker modal** (candidates fetch → portrait+name grid → confirm). Pass
  `targetCharacterId` to resolve.

### A4. Editor UI

- **`OptionEditor.tsx`**: new BehaviorCard **"Social Action"** in the behavior row.
  When on, shows: Targets radio (`here` / `anywhere`), Target requirement SmartArea
  (condition mode, label "Target must meet requirement"), Auto-accept BehaviorCard,
  "Target Sees" SmartArea (plain text mode).
- Outcome columns (`pass`/`fail` prefix switch at `:458`): add second "Their Changes"
  SmartArea (`target_pass_quality_change` / `target_fail_quality_change`), effect
  mode. Visible only when social is on (or always — hidden-if-empty is cleaner:
  render when `data.social`).

### A5. Text scope

- `$target.*` root in `textProcessor.ts:403` + `variables.ts:98` context resolution:
  a new optional `targetCtx?: { name?: string; qualities: PlayerQualities }` on the
  evaluation context; `sigil === '$' && identifier === 'target'` routes
  `.name` → name, `.<qid>` → targetCtx qualities lookup. Absent targetCtx →
  `[Unknown: $target.…]` (same as unresolved refs today).
- Effect values: `effectParser.ts` `finalVal` evaluation already routes through
  `ctx.evaluateText` — inherits the scope for free once context carries targetCtx.
- Resolve route passes targetCtx into actor-engine evaluation for `target_text`,
  and the actor's `pass_long`/`fail_long` so `$target.name` works in result prose.
- Guest guard: `$target.*` unreachable for guests (social unavailable).

### A6. Docs + seed (creator-facing, in-app)

- `/docs/storylets` (options) — Social Action block; `/docs/macros` — `$target.*`
  scope; `/docs/patterns` — recipe 12 "The Watering Hole" (Rat Sim act examples).
- Seed world `hidden-cats-test` gains: second registered character
  (`secondrat@chronicle.local` / same password), a social storylet at `market_square`
  with one consent act (challenge) + one auto-accept act. Manual pass matrix:
  actor sees picker → result; target sees card → accept applies changes / decline
  consumes silently; auto-accept applies without interaction.

## Phase B — Relationship qualities + `known` scope

### B1. Store + service

- New collection `relationships`:
  `{ storyId, ownerId, otherId, type, level: number, stringValue?: string,
     updatedAt }`, index `{storyId, ownerId}` (query "who do I know"), unique
  `{storyId, ownerId, otherId, type}`.
- `src/engine/relationshipService.ts`: `getRelationships(storyId, ownerId)`,
  `bumpRelationship(storyId, ownerId, otherId, type, op, val)`,
  `acquaint(storyId, aId, bId)` (writes `acquaintance` rows both directions).

### B2. Engine integration

- Auto-acquaintance: on social accept (respond route) → `acquaint(...)` if no rows
  exist for the pair.
- `social_scope: 'known'`: candidates = distinct `otherId` from actor's rows;
  co-location NOT required (locked decision).
- `$rel.<type>` root: context gains `relCtx?: (type) => number | string` —
  resolves pair level for social_if (candidate), target effects, and text.
- `rel.<type> <op> <val>` effect lhs: `effectParser.ts` fallback assignMatch gains a
  branch — lhs starting `rel.` routes to relationshipService instead of
  changeQuality. Valid in both actor and target effect strings.
- `social_if` context: candidate qualities + pair rel values merged.

### B3. UI + docs

- Option editor: third radio `known`.
- Picker `known` mode shows relationship type chips next to portraits.
- Docs: relationship section in `/docs/storylets` + `/docs/patterns` recipe extension.

## Defined semantics (write these into docs)

1. Actor effects resolve first; target snapshot after (SN ambiguity, settled).
2. Challenge (if present) resolves once; target's effect set keyed off actor's
   outcome. No second roll on the target side.
3. Decline = silent consume. No effects, no notification to actor.
4. Actor sees only their own result screen; "Their Changes" there are pending,
   not applied (target hasn't accepted) — writers write result prose accordingly.
   Docs call this out.
5. Social actions cost actions per the option's normal `action_cost`.
6. Target offline: events queue indefinitely (pendingEvents persistence); no expiry
   in v1.
7. `hideProfileIdentity` worlds: picker still lists character names (that IS the
   character identity; it hides *user* profiles). Revisit if abused.

## Verification (per phase)

- `npx tsc --noEmit` on touched files, `npm run lint` (no new diagnostics vs
  baseline), `npm run build`.
- Engine-level: seeded world resolve via curl — social resolve with target,
  candidates endpoint, accept/decline flows, auto-accept path, decline-silence.
- Manual: two browser profiles (two registered accounts), full rat-fight loop:
  pick → resolve → target card → accept → both sheets reflect changes.
- Lint baseline note: docs pages sit at 230 pre-existing diagnostics — diff against
  stashed baseline, not zero.

## Risks / notes

- `saveCharacterState` whole-doc `$set` race: mitigated by append-only enqueue on
  target; accept path writes only the accepting character. Two simultaneous social
  accepts on the same character still race — acceptable v1, note for later
  optimistic concurrency.
- `check-events` route is dormant + guest-less; if social push-polling is wanted,
  revive it then (add guestState, GameHub poll). v1 fires on page render/resolve.
- React Compiler: picker modal + LivingStories changes must avoid mutation-heavy
  patterns (state updates via setState only).
- `players` collection is legacy Lazarus data, NOT user accounts — social code must
  query `characters`.
