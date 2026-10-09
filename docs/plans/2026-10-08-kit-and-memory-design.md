# Kit & Memory — design

**Date:** 2026-10-08
**Status:** approved (equipment + source-narrative session)
**Scope:** engine (two gaps) + world (Sodium Wisp content)

## Problem

Equipment and item-memory are built in the engine but almost unused by Sodium Wisp:

- One equipment slot (`inventory`) — no loadout decisions, no room for growth.
- `bonus`, use events (`storylet` field), `auto_equip`, slot locks: zero world usage.
- The `.source` item-memory property is **documented** (`docs/scribescript`) but not
  implemented — the property chain falls through to `undefined`, so provenance can be
  written (`$item [source: ...] ++` → FIFO stack, credit-based prune) but never read.
  Provenance without a reader is dead narrative: "You use the blade, which you received
  from the lord for your service" cannot be said.

## Design

### Engine (two changes)

1. **`.source` read** (`textProcessor.ts`, property chain): `prop === 'source'` returns
   `state.sources[0]` — the **oldest** source, matching the documented FIFO contract that
   pairs with prune order (text and history always agree). Empty stack → `""`.
2. **Orphan-slot cleanup** (`enforceEquipmentVisibility`): equipment keys whose base slot
   no longer appears in `settings.equipCategories` are deleted (item stays owned). Without
   this, renaming slots ghost-locks items — the equip route counts *any* slot binding
   toward ownership, so a phantom `inventory` key would block re-equipping.

No other engine work: bonuses are read-time virtual sums (`getEffectiveLevel`), use
events are the quality def's `storylet` field, slots are data-driven (`equipCategories` +
category defs, `name * N` counted forms).

### World

- **Slots:** `hand`, `coat`, `shelf` replace `inventory`.
- **Existing trio re-homed + bonused:** recorder (hand, nerve at night), EMF meter (hand,
  acuity when whispers are up), salt pouch (coat, steadying while static is due).
- **New items, three flavors:** mundane (umbrella, ledger), liminal-touched (mirror shard
  from the player's own mirror, ferry token from the pickpocket card's existing prose),
  strings-attached (landlord's spare key, `bound` until a story frees it).
- **Sources at every acquisition:** intro choice, stall buys, pickpocket token, rent key —
  grants flip `= N` to `++ [source: ...]` because only incremental item gains push sources.
  Source strings must avoid commas (metadata is comma-split).
- **Use events:** recorder replay and salt re-newal end on `{$item.source}` — the item
  narrates its own provenance back to the player.
- **The Appraisal:** recurring card where a handler lifts an owned item and reads its
  source aloud — same item, different past depending on how it was acquired (QBN pattern
  #7, deck-as-pacing-valve).

## Verification

Harness: grant→push→read FIFO, empty-stack blank, orphan cleanup keeps owned items and
`hand * 2` indexed slots. World: threshold-free — lint (W29 sole ALERT), import, full
opening-chain playtest unchanged.
