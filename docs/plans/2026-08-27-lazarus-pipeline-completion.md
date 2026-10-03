# Lazarus Pipeline Completion Plan

**Date:** 2026-08-27
**Goal:** Full-stack pipeline from StoryNexus data → playable ChronicleHub world
**Target data:** Black Crown (structured JSON on disk) + Maelstrom (scraped JSONL)

---

## Data Sources

### Source A: Structured JSON Export (Black Crown)
Location: `/mnt/data/blackcrownproject-master/blackcrownproject-master/assets/main_if/tbcp_storynexus_dump/`

| File | Size | Schema |
|------|------|--------|
| `Events.json` | 2.0 MB | Array of `{Id, Name, Description, ChildBranches[], QualitiesRequired[], Deck, Setting, ...}` |
| `Qualities.json` | 224 KB | Array of `{Id, Name, Description, Nature, Category, Cap, LevelDescriptionText, Enhancements[], ...}` |
| `Areas.json` | 1 KB | Array of `{Id, Name, Description, ImageName, MoveMessage}` |
| `Settings.json` | 705 B | Array of `{Id, Name, Personae[], StartingArea, StartingDomicile, MaxActionsAllowed}` |
| `Personas.json` | 225 B | Array of `{Id, Name, QualitiesAffected[], Setting}` |
| `Domiciles.json` | 104 B | Array of `{Id, Name, MaxHandSize}` |

Conversion mode: **Direct mapping** (Mode A) — no inference needed.

### Source B: Scraped JSONL (Maelstrom)
Captured from StoryNexus network traffic. Each line is a `NETWORK` or `NETWORK_RESPONSE` type JSON object.

Key fields per line:
- `type`: `"NETWORK"` or `"NETWORK_RESPONSE"`
- `context.triggeredByBranch`: branch ID that led to this event
- `payload.Event`: event data (Id, Name, Description, Image, Deck, Setting, Area, ParentBranch)
- `payload.OpenBranches[]`: available choices
- `payload.LockedBranches[]`: locked choices with requirements HTML
- `payload.Messages[]`: quality change notifications
- `payload.MidPanelQualities[]`: main stats
- `payload.InventoryItems[]`: inventory
- `payload.InventorySlots[]`: equipped items
- `payload.OtherStatuses`: categorized qualities (Story, Reputation, Advantage, Circumstance, etc.)
- `payload.MajorLaterals[]` / `payload.MinorLaterals[]`: lateral qualities
- `payload.CharacterName`: character name for normalization

Conversion mode: **Inference pipeline** (Mode B) — requires reconstruct → convert.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA SOURCE SELECTION                      │
├──────────────────────┬──────────────────────────────────────┤
│  Mode A: Structured  │  Mode B: Scraped JSONL               │
│  (Black Crown JSON)  │  (Maelstrom captures)                │
└──────────┬───────────┴──────────────┬───────────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐    ┌──────────────────────────────┐
│ Direct Converter │    │ Stage 1: Ingest (existing)    │
│ (new)            │    │ → lazarus_evidence collection  │
└──────────┬───────┘    └──────────────┬───────────────┘
           │                           │
           │                           ▼
           │              ┌──────────────────────────────┐
           │              │ Stage 2: Reconstruct (fix)    │
           │              │ → ReconstructedEvent[]        │
           │              └──────────────┬───────────────┘
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Stage 3: Convert to WorldConfig                  │
│  StoryNexus schema → ChronicleHub schema                     │
│  + SLM inference for ambiguous cases                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Stage 4: Validate                                │
│  Check for orphaned refs, broken links, missing data          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              Stage 5: Import                                  │
│  Write WorldConfig → new ChronicleHub world                   │
│  storynexusMode: true                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Ingest (Mode B only)

**Status:** Already works. No changes needed.

**File:** `src/app/api/lazarus/ingest/route.ts`
**UI:** `src/app/lazarus/ingest/page.tsx`

The existing pipeline:
1. Reads JSONL in 2MB chunks, batches of 250 lines
2. For each line with `type: NETWORK` or `NETWORK_RESPONSE`:
   - Scavenges geography (areas/settings) from payload
   - Scavenges qualities (MidPanelQualities, InventorySlots, OtherStatuses, MajorLaterals, MinorLaterals)
   - Scavenges requirements HTML from branches (extracts quality IDs via `data-edit`)
   - Scavenges events (title, branches, parentBranchId)
3. Deduplicates via content hashing
4. Bulk writes to `lazarus_evidence`, `lazarus_quality_evidence`, `lazarus_geography` collections

**Test command:** Upload any of the 4 fetched JSONL files via `/lazarus/ingest` UI.

---

## Stage 2: Reconstruct (Mode B only)

**Status:** Mostly works. 3 bugs to fix.

### Bug A: Requirements Parser

**File:** `src/engine/lazarus/reconstruction.ts`, function `parseRequirements()` (lines 132-149)

**Current behavior:** Extracts quality IDs from `data-edit` attributes but hardcodes `op: '?'` and `value: 0`.

**Fix:** Parse the full HTML structure:
```html
<span class="req-item inner-shadow tooltipToggle">
  <img alt="Pound coin" src="..." data-edit="14822" />
  <span class="req-item-level">10</span>
  <span class="tooltip">You need <strong>10</strong> x <strong>Pound coin</strong> (you have <strong>238</strong>)</span>
</span>
```

**Extraction logic:**
1. Find `<img>` tags with `data-edit` attribute → quality ID
2. Find `<span class="req-item-level">` → threshold value
3. Find surrounding text for operator:
   - `"at least"` / `"minimum"` → `>=`
   - `"no more than"` / `"maximum"` → `<=`
   - `"exactly"` → `==`
   - Default (no operator found) → `>=` (most common in StoryNexus)
4. If HTML is fragmentary (missing value/name), set `op: null` and flag for SLM

**Return type change:** `ParsedRequirement` should become:
```typescript
interface ParsedRequirement {
  qualityId: number;
  name?: string;        // from alt tag
  op: '>=' | '<=' | '==' | '>' | '<' | null;  // null = needs SLM
  value: number | null;  // null = needs SLM
  confidence: number;    // 0-1, how sure we are
}
```

### Bug B: Success/Failure Inference

**File:** `src/engine/lazarus/reconstruction.ts`, lines 220-230

**Current behavior:** `isSuccess: true` hardcoded for all outcomes.

**Fix logic:**
1. If branch has `Challenges` array with entries → outcome came from a skill check
   - If outcome shows `Messages` with `"DifficultyRollSuccessMessage"` → `isSuccess: true`
   - If outcome shows `Messages` with `"DifficultyRollFailureMessage"` → `isSuccess: false`
   - If no message type → `isSuccess: null` (unknown)
2. If branch has no challenges → guaranteed outcome → `isSuccess: true`

**Change `ReconstructedBranch.Outcomes.isSuccess`** from `boolean` to `boolean | null`.

### Bug C: Geography Tab

**File:** `src/app/lazarus/[worldId]/reconstruct/page.tsx`

**Current behavior:** Tab exists in tab bar but content section only renders events, qualities, and export. Geography tab renders nothing.

**Fix:** Add geography content section:
```tsx
{activeTab === 'geography' && (
    <div>
        <p style={{marginBottom:'1rem', color:'#888'}}>Found {geography.length} unique areas and settings.</p>
        <div style={{maxHeight:'600px', overflowY:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.85rem'}}>
                <thead>
                    <tr style={{textAlign:'left', color:'#666'}}><th>ID</th><th>Name</th><th>Type</th></tr>
                </thead>
                <tbody>
                    {geography.map((g: any) => (
                        <tr key={g._id.id} style={{borderTop:'1px solid #333'}}>
                            <td style={{padding:'8px', color:'#61afef', fontFamily:'monospace'}}>{g._id.id}</td>
                            <td style={{padding:'8px', color:'#ccc'}}>{g.name}</td>
                            <td style={{padding:'8px', color:'#aaa'}}>{g._id.type}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
)}
```

---

## Stage 3: Convert to WorldConfig

### Mode A: Structured JSON → WorldConfig

**New file:** `src/engine/lazarus/converters/structuredConverter.ts`

**Input:** Raw JSON files from `tbcp_storynexus_dump/`
**Output:** `WorldConfig`

#### Quality Conversion

StoryNexus Quality → ChronicleHub QualityDefinition:

| SN Field | CH Field | Notes |
|----------|----------|-------|
| `Id` | `id` | Convert to string |
| `Name` | `name` | Direct |
| `Description` | `description` | Direct |
| `Nature` | `type` | See mapping below |
| `Category` | `category` | Store as string, create CategoryDefinition |
| `Cap` | `max` | Convert to string |
| `Image` | `image` | Use `normalizeImage()` |
| `LevelDescriptionText` | `text_variants` | Parse JSON string → Record |
| `ChangeDescriptionText` | `increase_description` / `decrease_description` | Parse JSON, first entry |
| `Tag` | `tags` | Split or wrap in array |
| `Enhancements[]` | `bonus` | See bonus mapping below |

**Nature → QualityType mapping:**
```
Nature 1 + no PyramidNumberIncreaseLimit → Counter (C)
Nature 1 + has PyramidNumberIncreaseLimit → Pyramidal (P)
Nature 2 → Item (I)
Nature 3 → String (S) (if seen)
Nature 4 → Item (I)
Nature 5 → ??? (SLM classify)
Nature 6 → String (S)
Nature 7 → Equipable (E)
```

**Enhancements → bonus:**
Each enhancement `{AssociatedQuality: {Id, Name}, Level, SetToExactly}` becomes a ScribeScript bonus string:
- `SetToExactly: N` → `bonus: "N"` on that quality
- `Level: N` → `bonus: "+N"` (additive)

#### Event → Storylet/Opportunity Conversion

**StoryNexus Event structure:**
```json
{
  "Id": 27551,
  "Name": "The Curiosity's Hold",
  "Description": "...",
  "Image": "...",
  "Deck": {"Name": "Pinned", "Id": 121, ...} or null,
  "Setting": {"Id": 106},
  "ChildBranches": [
    {
      "Id": 13235,
      "Name": "The RESTLESS SPIRIT...",
      "Description": "...",
      "ButtonText": "...",
      "QualitiesRequired": [{"MinLevel": 10, "AssociatedQuality": {"Id": 14822}}],
      "BranchRequirementsDescription": "<html>",
      "BranchUnlockRequirementsDescription": "<html>",
      "Challenges": [{"AssociatedQuality": {...}, "TargetNumber": 20, "IsLuck": true}],
      "DefaultEvent": { ... } or null,
      "SuccessEvent": { ... } or null,
      "FailureEvent": { ... } or null
    }
  ],
  "QualitiesAffected": [],
  "QualitiesRequired": [{"MinLevel": 1, "AssociatedQuality": {"Id": 474}}]
}
```

**ChronicleHub Storylet/Opportunity:**
```typescript
{
  id: string,
  name: string,
  text: string,          // event Description
  image_code?: string,
  options: ResolveOption[]  // one per ChildBranch
}
```

**Conversion rules:**

1. **Determine type:**
   - Event has `Deck` property → `Opportunity` (with `deck` field)
   - Event has no `Deck` → `Storylet`

2. **Event-level fields:**
   - `Id` → `id` (string)
   - `Name` → `name`
   - `Description` → `text`
   - `Image` → `image_code` (via `normalizeImage()`)
   - `Deck.Name` → `deck` (for Opportunity)
   - `Setting.Id` → `location` (lookup Area name)

3. **Event-level QualitiesRequired → visible_if/unlock_if:**
   Each `QualitiesRequired` entry → ScribeScript expression:
   ```json
   {"MinLevel": 1, "AssociatedQuality": {"Id": 474}}
   // → visible_if: "%474 >= 1"
   ```
   Multiple requirements → join with ` AND `:
   ```
   "%474 >= 1 AND %995 >= 1"
   ```

4. **Branch → ResolveOption:**
   - `Id` → `id` (string)
   - `Name` → `name`
   - `Description` → `text` (long description)
   - `ButtonText` → `name` (displayed on button)
   - `Image` → `image_code`
   - `Ordering` → `ordering`

5. **Branch QualitiesRequired → visible_if / unlock_if:**
   - `BranchRequirementsDescription` presence → `visible_if`
   - `BranchUnlockRequirementsDescription` presence → `unlock_if`
   - ScribeScript from `QualitiesRequired` array:
     ```
     {"MinLevel": 10, "AssociatedQuality": {"Id": 14822}}
     // → visible_if: "%14822 >= 10"
     ```

6. **Branch Challenges → challenge:**
   ```json
   {"AssociatedQuality": {"Id": 1478, "Name": "Command"}, "TargetNumber": 20, "IsLuck": false}
   // → challenge: "Command: 20%"
   ```
   Luck challenges:
   ```json
   {"IsLuck": true, "TargetNumber": 20}
   // → challenge: "Luck: 20%"
   ```
   Multiple challenges → separate options or comma-join.

7. **Branch DefaultEvent/SuccessEvent/FailureEvent → pass/fail text:**
   - `DefaultEvent` (no challenge) → `pass_long` = event Description
   - `SuccessEvent` → `pass_long` = event Description, `isSuccess: true`
   - `FailureEvent` → `fail_long` = event Description, `isSuccess: false`
   - `ExoticEffects` on outcome → special handling (flag, not text)

8. **QualitiesAffected → pass_quality_change / fail_quality_change:**
   Each `QualitiesAffected` entry:
   ```json
   {"Level": 5, "AssociatedQuality": {"Id": 1491, "Name": "Wounds"}, "SetToExactly": null, "ChangeBy": 2}
   // → pass_quality_change: "$Wounds += 2"
   ```
   Operations:
   - `ChangeBy: N` (positive) → `$Name += N`
   - `ChangeBy: N` (negative) → `$Name -= N`
   - `SetToExactly: N` → `$Name = N`
   - If outcome is `SuccessEvent`, effects go to `pass_quality_change`
   - If outcome is `FailureEvent`, effects go to `fail_quality_change`
   - If `DefaultEvent`, effects go to `pass_quality_change`

#### Location Conversion

StoryNexus Area → ChronicleHub LocationDefinition + DeckDefinition:

| SN Field | CH Field | Notes |
|----------|----------|-------|
| `Id` | `id` | Convert to string |
| `Name` | `name` | Direct |
| `Description` | `description` | Direct |
| `ImageName` | `image` | Direct (already normalized) |
| — | `deck` | Generate deck ID from area name: `area_<id>` |
| — | `coordinates` | Default `{x: 0, y: 0}` or place on map |
| — | `regionId` | Infer from Setting association |

**Deck generation:**
For each location, create a DeckDefinition:
```typescript
{
  id: `area_${area.Id}`,
  name: `${area.Name} Deck`,
  saved: `'true'`,  // always draw
  hand_size: `'5'`,
  draw_cost: `'0'`
}
```

**Region generation:**
From Settings, each Setting has areas. Group areas by Setting → create MapRegion per Setting.

#### WorldSettings Conversion

```
Settings.json[0] → WorldSettings:
  - title: Settings.Name
  - storynexusMode: true
  - layoutStyle: "london"
  - maxActions: Settings.MaxActionsAllowed
  - useActionEconomy: true
  - actionId: "1553" (Pound coin, from quality dump)
  - startLocation: Settings.StartingArea.Id → lookup Area name
  - playerName: "Addressed As" quality ID (1503 from dumps)
  - playerImage: "" (default)
  - characterSheetCategories: ["Advantage", "Reputation", "Story", "Circumstance"]
```

### Mode B: Scraped JSONL → WorldConfig

**New file:** `src/engine/lazarus/converters/jsonlConverter.ts`

**Input:** Reconstructed data from Stage 2 (ReconstructedEvent[], QualityEvidence[], GeoEvidence[])
**Output:** `WorldConfig`

This reuses the Mode A converter logic but with different input sources:
- Events come from `lazarus_evidence` collection (already reconstructed)
- Qualities come from `lazarus_quality_evidence` collection
- Geography comes from `lazarus_geography` collection

**Key differences from Mode A:**
- Qualities may have multiple variations (different levels observed) → merge into one QualityDefinition
- Events may have incomplete data → use SLM for gaps
- Requirements HTML may be fragmentary → SLM inference
- No Settings file → generate defaults

---

## Stage 4: Validate

**New file:** `src/engine/lazarus/validator.ts`

**Input:** `WorldConfig`
**Output:** `ValidationReport`

```typescript
interface ValidationReport {
  worldId: string;
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
  issues: ValidationIssue[];
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  entity: 'storylet' | 'opportunity' | 'quality' | 'location' | 'deck' | 'setting';
  entityId: string;
  field?: string;
  message: string;
  suggestion?: string;
}
```

**Validation rules:**

| Rule | Severity | Check |
|------|----------|-------|
| Orphaned quality ref | ERROR | `visible_if`/`unlock_if` references quality ID not in QualityDefinitions |
| Missing deck | ERROR | Opportunity references deck not in DeckDefinitions |
| Missing location | ERROR | Storylet references location not in LocationDefinitions |
| Broken challenge | ERROR | Challenge references quality not in QualityDefinitions |
| Empty storylet | WARNING | Storylet has no options |
| Missing image | WARNING | Entity references image_code not in assets |
| Unreachable storylet | WARNING | No other storylet redirects to this one (orphan check) |
| Unused quality | INFO | Quality defined but never referenced in any storylet |
| Duplicate names | INFO | Multiple storylets share same name |

---

## Stage 5: Import

**New file:** `src/app/api/lazarus/import/route.ts`

**Input:** `WorldConfig` + world metadata
**Output:** Created world in MongoDB

**Steps:**
1. Create world document in `worlds` collection with generated ID
2. Write `WorldConfig` as JSON to world's config document
3. Set `storynexusMode: true` in settings
4. Download images from StoryNexus S3 URLs → upload to ChronicleHub S3
5. Create default character template
6. Return world ID for navigation

**API:**
```
POST /api/lazarus/import
Body: { worldConfig: WorldConfig, worldName: string, source: 'blackcrown' | 'maelstrom' }
Response: { success: boolean, worldId: string }
```

---

## SLM Bridge

**New file:** `src/engine/lazarus/slmBridge.ts`

**Strategy:** Rule-based heuristics first, SLM as fallback when confidence < 0.7.

### Rule-Based Functions

#### 1. `parseRequirementsHtml(html: string): ParsedRequirement[]`

Rules (in priority order):
1. Parse structured HTML: find `<img data-edit="ID">` + `<span class="req-item-level">VALUE</span>`
2. Parse tooltip text: `"You need <strong>VALUE</strong> x <strong>NAME</strong>"`
3. Infer operator from surrounding text:
   - `"at least"`, `"minimum"`, `"you need"` → `>=`
   - `"no more than"`, `"maximum"` → `<=`
   - `"exactly"` → `==`
   - Default → `>=`
4. If structure is too fragmentary → return with `confidence: 0.3`

#### 2. `classifyVariableSites(texts: string[]): VariableSite[]`

Given multiple text variations of the same event:
1. Tokenize each text
2. Find token positions where content differs
3. Classify the variation:
   - Name substitution (character name appears) → `player_name`
   - Pronoun variation (he/she/they) → `gender`
   - Stat reference changes → `quality_ref`
4. Return annotated text with `[VAR:type]` markers

#### 3. `classifyQualityType(quality: QualityEvidence): QualityType`

Rules:
1. If `Nature` field present → use Nature mapping (see above)
2. If `Enhancements` present with `SetToExactly` → `Equipable`
3. If name contains common patterns:
   - "Reputation:" → `Counter`
   - "Addressed As" → `String`
   - Has `LevelDescriptionText` with named levels → `String` or `Counter`
4. If category is `5000` (Story flags) → `Counter`
5. If category is `36000` (Identity) → `String`
6. Default → `Counter`

#### 4. `classifyOutcomeSuccess(branch, outcome): boolean | null`

Rules:
1. If outcome has `Messages` with `"DifficultyRollSuccessMessage"` → `true`
2. If outcome has `Messages` with `"DifficultyRollFailureMessage"` → `false`
3. If branch has no challenges → `true` (guaranteed)
4. Default → `null` (unknown)

### SLM Integration (future)

When rule-based confidence < 0.7:
- Call local SLM (Ollama, llama.cpp, or API)
- Prompt: structured task with context
- Cache result in `lazarus_slm_cache` collection
- Allow manual override in UI

---

## File Manifest

### New Files
| File | Purpose |
|------|---------|
| `src/engine/lazarus/converters/structuredConverter.ts` | Black Crown JSON → WorldConfig |
| `src/engine/lazarus/converters/jsonlConverter.ts` | Scraped JSONL reconstructed data → WorldConfig |
| `src/engine/lazarus/converters/scribeScript.ts` | ScribeScript expression generation from diffs |
| `src/engine/lazarus/slmBridge.ts` | Rule-based inference + SLM fallback |
| `src/engine/lazarus/validator.ts` | Conversion validation |
| `src/app/api/lazarus/import/route.ts` | Import API endpoint |
| `src/app/lazarus/[worldId]/convert/page.tsx` | Conversion UI page |

### Modified Files
| File | Changes |
|------|---------|
| `src/engine/lazarus/reconstruction.ts` | Fix `parseRequirements()`, fix `isSuccess` inference |
| `src/app/lazarus/[worldId]/reconstruct/page.tsx` | Add geography tab content |

---

## Execution Order

1. **Bug fixes** (reconstruction.ts, reconstruct page) — 30 min
2. **SLM bridge** (slmBridge.ts) — rule-based functions — 1 hour
3. **ScribeScript generator** (scribeScript.ts) — 30 min
4. **Structured converter** (structuredConverter.ts) — 2 hours
5. **JSONL converter** (jsonlConverter.ts) — 1 hour
6. **Validator** (validator.ts) — 1 hour
7. **Import API** (import/route.ts) — 1 hour
8. **Conversion UI** (convert/page.tsx) — 1 hour
9. **Test Black Crown** — 1 hour
10. **Test Maelstrom** — 1 hour

**Total estimated: ~9 hours**

---

## Testing Strategy

### Unit Tests
- `parseRequirements()` with known HTML fragments
- `classifyQualityType()` with Black Crown qualities
- `convertEvent()` with known events
- `generateScribeScript()` with known diffs

### Integration Tests
- Black Crown: full pipeline JSON → WorldConfig → validate → import
- Maelstrom: ingest → reconstruct → convert → validate → import

### Manual Verification
- Play imported world in ChronicleHub player
- Compare behavior with original StoryNexus screenshots
- Check all storylets appear, branches work, qualities change
