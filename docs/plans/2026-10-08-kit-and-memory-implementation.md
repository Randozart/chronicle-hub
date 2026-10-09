# Kit & Memory — implementation

**Date:** 2026-10-08
**Companion:** `2026-10-08-kit-and-memory-design.md`

## Engine changes

### 1. `.source` property read — `src/engine/textProcessor.ts`

In `evaluateVariable`'s property chain, a new case between the `singular` handler and the
def-text_variants fallback:

```ts
else if (prop === 'source') {
    // Item memory: the oldest stored source (FIFO, paired with prune order).
    const srcs = (typeof currentValue === 'object' && currentValue) ? (currentValue as any).sources : (state as any)?.sources;
    foundValue = (Array.isArray(srcs) && srcs.length > 0) ? srcs[0] : "";
    foundIn = 'state';
}
```

- Reads the walking `currentValue` first (supports chained access) with a `state` fallback;
  default-constructed states always carry `sources: []`, so no null path.
- Returns `""` for empty stacks — `{ $item.source }` renders as nothing, never
  `[VAR ERROR]`.
- Write side unchanged: `effectParser` metadata `[source: ..., desc: ..., hidden]` on
  `++`/`+=` pushes onto `sources`; `--`/`-=`/lowering `=` prune FIFO with credit-based
  unique-source protection (`qualityOperations.ts`).

### 2. Orphan-slot cleanup — `src/engine/characterService.ts`

`enforceEquipmentVisibility` now starts by computing valid slot bases from
`settings.equipCategories` (stripping ` * N` counted forms) and deleting `character.equipment`
keys whose base (minus `_\d+` index suffix) is not among them.

- Item ownership lives in quality levels — only the binding is dropped.
- Runs on equip + resolve (existing call sites), so legacy `inventory` saves migrate on
  first action after a slot rename.
- Indexed slots (`hand_1`) and counted forms (`hand * 2`) stay valid.

## Gotchas (recorded, not re-learned)

- **`=` never pushes sources** — only incremental `++`/`+=` on Item/Equipable types do.
  Source-tagged grants must use `++`.
- **No commas inside source strings** — effect metadata splits parts on `,`.
- Importing `characterService` pulls in the Mongo client: harness scripts must export
  `MONGODB_URI` from `.env.local` and `process.exit(0)` or the process never ends.

## Verification

`scripts/_srctest.ts` harness (8 assertions): grant→push→read round-trip, oldest-first on
duplicate acquisitions, empty-stack blank, orphan key dropped while owned items and valid
keys survive, `hand * 2` indexed slot preserved. Gates: per-file `tsc --noEmit`, `npm run
lint` (zero new problems), `npm run build`.
