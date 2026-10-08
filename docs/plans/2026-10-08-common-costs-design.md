# Common Costs — design

**Date:** 2026-10-08
**Status:** approved (playthrough-fixes session, "The City Keeps Its Hours" — first consumer)
**Scope:** platform (generic), world-agnostic

## Problem

Worlds need options to spend secondary resources — time passing, stamina, sanity — without
per-option boilerplate and without hard-coding any world's particular resource into the engine.
Sodium Wisp's day-cycle wants "playing an option advances the clock"; other worlds will want
other meters. The action economy already funnels every resolve through one cost choke point;
a second, *world-defined* cost channel belongs right next to it.

## Design

### Settings (world-defined, generic)

```ts
// GameSettings
commonCosts?: CommonCostDef[];
// CommonCostDef = { key: string; label: string; effects: string; default?: boolean }
```

- `key` — stable id referenced by options.
- `label` — editor-facing name ("Time passes", "Stamina").
- `effects` — **plain ScribeScript effects** (ops and macros; keep it to `$q += n`-style
  statements — conditional regions inside effect strings do not reliably execute, so put any
  branching in the *storylets* that read the meter, not in the cost). Sodium Wisp's "time":
  `$slot += 1` with `slot` a Counter (max 3) — the meter saturates at night; the day itself
  turns in a storylet that reads the meter and resets it.
- `default` — pre-check the box for new options.

### Options opt in per option

```ts
// ResolveOption
common_costs?: string[]; // keys of settings.commonCosts
```

A checkbox row per defined common cost in the storylet option editor and the opportunity
(card) option editor. Checkmark = this option passes that cost. No new "should this advance
the clock" flags — the checkmark *is* the switch. Free options (`instant_redirect`, zero
action cost) may still opt in: common costs are decoupled from the action economy by design.

### Resolve

`/api/resolve` — after the existing action-economy block, before `resolveOption`:

```ts
if (settings.commonCosts?.length && option.common_costs?.length) {
    for (const key of option.common_costs) {
        const cc = settings.commonCosts.find(c => c.key === key);
        if (cc?.effects) engine.applyEffects(cc.effects);
    }
}
```

Cards resolve through the same route (`getEvent` returns opportunities too), so one
application point covers storylets and deck cards.

## Deliberately out of scope

- No editor lock-reason humanizing for common costs yet (they opt in, they never lock).
- No graph-view checkbox (editors only) — noted as follow-up.
- No display of common-cost spend in the resolution UI beyond what the effects themselves
  narrate.

## Consumer (Sodium Wisp, "The City Keeps Its Hours")

`slot` (0 dawn / 1 day / 2 dusk / 3 night) + `slot_carry`; `slot` **saturates** at night;
`day_close` (reactivated dormant storylet) becomes visible at `$slot >= 3` — closing charges
rent/meals/static and the player chooses when the day ends. `day_renew` resets at dawn.
Action-driven only: nothing ticks while away (this is an RPG pressure — story pressure, never
survival pressure). Waiting is a legal move: options with higher `action_cost` that opt into
"time".

## Verification

Per file: `npx tsc --noEmit`. Then `npm run lint` (no new diagnostics) and `npm run build`.
Playtest + world-side wiring live in the world repo (CH-Neon-Medium).
