# Image Composer Bug Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix image composer rendering bugs causing mangled images, incorrect layer visibility, and improper SVG scaling

**Architecture:** Three-phase fix: 1) Normalize SVG dimensions relative to canvas, 2) Filter editorHidden layers, 3) Debug coordinate calculations with detailed logging

**Tech Stack:** Next.js API routes, TypeScript, sharp image processing, MongoDB for composition storage

---

### Task 1: Extract SVG Dimensions Helper

**Files:**
- Create: `src/app/api/image_composer/utils/svgDimensions.ts`

**Step 1: Create utility directory and file**

```bash
mkdir -p src/app/api/image_composer/utils
```

**Step 2: Write SVG dimension extraction utility**

```typescript
// src/app/api/image_composer/utils/svgDimensions.ts
/**
 * Extracts width and height from SVG buffer by parsing viewBox attribute
 * Defaults to 512x512 for game icons if viewBox not found or invalid
 */
export function extractSvgDimensions(svgBuffer: Buffer): { width: number; height: number } {
    const svgString = svgBuffer.toString('utf-8');

    // Try to extract viewBox
    const viewBoxMatch = svgString.match(/viewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
        const [, viewBox] = viewBoxMatch;
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length >= 4 && !parts.some(isNaN)) {
            return { width: parts[2], height: parts[3] };
        }
    }

    // Try to extract width/height attributes
    const widthMatch = svgString.match(/width=["']([^"']+)["']/i);
    const heightMatch = svgString.match(/height=["']([^"']+)["']/i);

    if (widthMatch && heightMatch) {
        const width = parseFloat(widthMatch[1]);
        const height = parseFloat(heightMatch[1]);
        if (!isNaN(width) && !isNaN(height)) {
            return { width, height };
        }
    }

    // Default for game icons (most are 512x512)
    return { width: 512, height: 512 };
}

/**
 * Calculates target dimensions for SVG based on canvas size and layer scale
 */
export function calculateSvgTargetDimensions(
    svgDimensions: { width: number; height: number },
    canvasWidth: number,
    canvasHeight: number,
    layerScale: number = 1
): { targetWidth: number; targetHeight: number } {
    // Calculate scale factor to make SVG proportional to canvas
    // Use the smaller dimension to ensure SVG fits
    const canvasAspect = canvasWidth / canvasHeight;
    const svgAspect = svgDimensions.width / svgDimensions.height;

    let scaleFactor = 1;

    if (canvasWidth > 0 && canvasHeight > 0) {
        // Scale SVG so its larger dimension is ~50% of canvas (adjustable)
        const targetMaxDimension = Math.max(canvasWidth, canvasHeight) * 0.5;
        const svgMaxDimension = Math.max(svgDimensions.width, svgDimensions.height);
        scaleFactor = targetMaxDimension / svgMaxDimension;
    }

    // Apply layer scale
    scaleFactor *= layerScale;

    return {
        targetWidth: Math.round(svgDimensions.width * scaleFactor),
        targetHeight: Math.round(svgDimensions.height * scaleFactor)
    };
}
```

**Step 3: Test TypeScript compilation**

Run: `npx tsc --noEmit src/app/api/image_composer/utils/svgDimensions.ts`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/api/image_composer/utils/svgDimensions.ts
git commit -m "feat: add SVG dimension extraction utility"
```

---

### Task 2: Integrate SVG Scaling in Render Route

**Files:**
- Modify: `src/app/api/image_composer/render/route.ts:240-255` (SVG processing section)

**Step 1: Import the SVG utilities**

Add at top of route.ts after other imports:
```typescript
import { extractSvgDimensions, calculateSvgTargetDimensions } from './utils/svgDimensions';
```

**Step 2: Update SVG processing logic**

Find the SVG processing section around line 240 and replace:

Current (lines 240-255):
```typescript
// --- STEP 1: RESIZE ---
// Force density to 72 for SVGs to match Browser/Canvas default.
// Without this, Sharp might use 96 or higher, making the image huge and shifting the center.
let img = isSvg ? sharp(buffer, { density: 72 }) : sharp(buffer);

const originalMeta = await img.metadata();

if (layer.scale !== 1 && originalMeta.width) {
    img = img.resize(Math.round(originalMeta.width * layer.scale));
}
const scaledBuffer = await img.toBuffer();
```

Replace with:
```typescript
// --- STEP 1: RESIZE ---
let img: sharp.Sharp;
let targetWidth: number | undefined;
let targetHeight: number | undefined;

if (isSvg) {
    // Extract SVG dimensions and calculate target size
    const svgDimensions = extractSvgDimensions(buffer);
    const targetDims = calculateSvgTargetDimensions(
        svgDimensions,
        composition.width,
        composition.height,
        layer.scale
    );

    targetWidth = targetDims.targetWidth;
    targetHeight = targetDims.targetHeight;

    console.log(`[SVG Debug] Layer ${layerIndex}: ${svgDimensions.width}x${svgDimensions.height} -> ${targetWidth}x${targetHeight} (scale=${layer.scale})`);

    // Create sharp instance with density 72 and target dimensions
    img = sharp(buffer, { density: 72 }).resize(targetWidth, targetHeight, {
        fit: 'fill',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
} else {
    img = sharp(buffer);

    const originalMeta = await img.metadata();
    if (layer.scale !== 1 && originalMeta.width) {
        img = img.resize(Math.round(originalMeta.width * layer.scale));
    }
}

const scaledBuffer = await img.toBuffer();
```

**Step 3: Add debug logging for scaled dimensions**

After getting `scaledMeta`, add:
```typescript
const scaledMeta = await sharp(scaledBuffer).metadata();
const scaledW = scaledMeta.width || 0;
const scaledH = scaledMeta.height || 0;

// Debug log for SVG vs non-SVG scaling
if (isSvg) {
    console.log(`[Layer ${layerIndex}] SVG scaled ${scaledW}x${scaledH} (target was ${targetWidth}x${targetHeight})`);
} else {
    console.log(`[Layer ${layerIndex}] scaled ${scaledW}x${scaledH}`);
}
```

**Step 4: Test TypeScript compilation**

Run: `npx tsc --noEmit src/app/api/image_composer/render/route.ts`
Expected: No TypeScript errors (might have minor warnings)

**Step 5: Commit**

```bash
git add src/app/api/image_composer/render/route.ts
git commit -m "feat: integrate SVG dimension scaling in render route"
```

---

### Task 3: Add EditorHidden Layer Filtering

**Files:**
- Modify: `src/app/api/image_composer/render/route.ts:195-205` (layer filtering logic)

**Step 1: Examine current layer filtering logic**

Current lines 195-205 handle group filtering only:
```typescript
// Logic Filtering
if (layer.groupId) {
    const paramValue = searchParams.get(layer.groupId);
    if (paramValue !== layer.variantValue) continue;
}
```

**Step 2: Add editorHidden filtering before group logic**

Replace the current logic filtering section with:
```typescript
// --- EditorHidden Filtering ---
// Skip editor-hidden layers unless part of active logic group
if (layer.editorHidden) {
    const hasGroup = layer.groupId !== undefined && layer.groupId !== null && layer.groupId !== '';
    const groupMatches = hasGroup && searchParams.get(layer.groupId) === layer.variantValue;

    if (!hasGroup || !groupMatches) {
        console.log(`[Layer ${layerIndex}] Skipping editor-hidden layer: ${layer.name || layer.assetId}`);
        continue;
    } else {
        console.log(`[Layer ${layerIndex}] Rendering editor-hidden layer due to active group: ${layer.groupId}=${layer.variantValue}`);
    }
}

// --- Logic Group Filtering ---
if (layer.groupId) {
    const paramValue = searchParams.get(layer.groupId);
    if (paramValue !== layer.variantValue) {
        console.log(`[Layer ${layerIndex}] Skipping due to group mismatch: ${layer.groupId}=${paramValue} vs ${layer.variantValue}`);
        continue;
    }
}
```

**Step 3: Test TypeScript compilation**

Run: `npx tsc --noEmit src/app/api/image_composer/render/route.ts`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/api/image_composer/render/route.ts
git commit -m "feat: add editorHidden layer filtering with group override"
```

---

### Task 4: Add Coordinate Calculation Debugging

**Files:**
- Modify: `src/app/api/image_composer/render/route.ts:255-280` (coordinate calculation section)

**Step 1: Add detailed debug logging before rotation**

Find the coordinate calculation section (after scaledBuffer) and add debug logs:

Current (lines 255-280):
```typescript
const scaledW = scaledMeta.width || 0;
const scaledH = scaledMeta.height || 0;
console.log(`[Layer ${layerIndex}] scaled ${scaledW}x${scaledH}`);

// --- STEP 2: ROTATE & RE-CENTER ---
// 1. Calculate visual center in Canvas Space (where the user put the center of the image)
const visualCenterX = layer.x + (scaledW / 2);
const visualCenterY = layer.y + (scaledH / 2);
```

Replace with:
```typescript
const scaledW = scaledMeta.width || 0;
const scaledH = scaledMeta.height || 0;

// Debug log for SVG vs non-SVG scaling
if (isSvg) {
    console.log(`[Layer ${layerIndex}] SVG scaled ${scaledW}x${scaledH} (target was ${targetWidth}x${targetHeight})`);
} else {
    console.log(`[Layer ${layerIndex}] scaled ${scaledW}x${scaledH}`);
}

// --- STEP 2: ROTATE & RE-CENTER ---
// Debug: Log original layer coordinates
console.log(`[Coord Debug] Layer ${layerIndex}: original position (${layer.x}, ${layer.y}), scale=${layer.scale}, rotation=${layer.rotation}`);

// 1. Calculate visual center in Canvas Space (where the user put the center of the image)
const visualCenterX = layer.x + (scaledW / 2);
const visualCenterY = layer.y + (scaledH / 2);
console.log(`[Coord Debug] Layer ${layerIndex}: visual center (${visualCenterX}, ${visualCenterY}), scaled dims ${scaledW}x${scaledH}`);
```

**Step 2: Add debug logging for rotation calculation**

Find the rotation section and add:

After line 273 (after finalX/finalY calculation):
```typescript
const rotatedMeta = await sharp(rotatedBuffer).metadata();
const rotatedW = rotatedMeta.width || 0;
const rotatedH = rotatedMeta.height || 0;

// 3. Calculate New Top-Left to keep the center fixed
const finalX = visualCenterX - (rotatedW / 2);
const finalY = visualCenterY - (rotatedH / 2);

// Debug log for rotation calculations
console.log(`[Coord Debug] Layer ${layerIndex}: rotated ${rotatedW}x${rotatedH} (expanded from ${scaledW}x${scaledH})`);
console.log(`[Coord Debug] Layer ${layerIndex}: final position (${finalX}, ${finalY}) to keep center at (${visualCenterX}, ${visualCenterY})`);
console.log(`[Layer ${layerIndex}] rotated ${rotatedW}x${rotatedH}, finalX=${finalX}, finalY=${finalY}`);
```

**Step 3: Test TypeScript compilation**

Run: `npx tsc --noEmit src/app/api/image_composer/render/route.ts`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/api/image_composer/render/route.ts
git commit -m "feat: add coordinate calculation debugging logs"
```

---

### Task 5: Test with Goblin Thief Composition

**Files:**
- Test: Manual API testing with browser or curl

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Call the API endpoint**

Open browser or use curl:
```
curl "http://localhost:3000/api/image_composer/render?storyId=rogue_dot_esc&id=goblin_thief"
```

**Step 3: Check server logs for debug output**

Expected to see in logs:
- `[SVG Debug]` lines showing dimension calculations
- `[Coord Debug]` lines showing coordinate transformations
- Layers with `editorHidden: true` being skipped (unless in active group)
- No `[safelyAddLayer] buffer 1389x1389` (should be much smaller)

**Step 4: Save rendered image for inspection**

Use curl with output:
```
curl "http://localhost:3000/api/image_composer/render?storyId=rogue_dot_esc&id=goblin_thief" --output test-render.webp
```

Open `test-render.webp` to check if it looks better than before.

**Step 5: Commit test verification**

```bash
git commit --allow-empty -m "test: initial SVG scaling and filtering test"
```

---

### Task 6: Test EditorHidden Filtering with Groups

**Files:**
- Test: Manual API testing with group parameters

**Step 1: Check composition for logic groups**

From the JSON, layer with ID `"5e33b9b9-5926-46d7-9980-2ceddd58c7e0"` has:
- `groupId: "target"`
- `variantValue: "goblin"`
- `editorHidden: true`

**Step 2: Test without group parameter**

Call API without target parameter:
```
curl "http://localhost:3000/api/image_composer/render?storyId=rogue_dot_esc&id=goblin_thief"
```

Check logs: Should see `Skipping editor-hidden layer: convergence target`

**Step 3: Test with matching group parameter**

Call API with matching group:
```
curl "http://localhost:3000/api/image_composer/render?storyId=rogue_dot_esc&id=goblin_thief&target=goblin"
```

Check logs: Should see `Rendering editor-hidden layer due to active group: target=goblin`

**Step 4: Test with non-matching group parameter**

```
curl "http://localhost:3000/api/image_composer/render?storyId=rogue_dot_esc&id=goblin_thief&target=other"
```

Check logs: Should see `Skipping editor-hidden layer: convergence target`

**Step 5: Commit test results**

```bash
git commit --allow-empty -m "test: editorHidden filtering with logic groups"
```

---

### Task 7: Verify Effect Buffer Sizing

**Files:**
- Check: Server logs for effect buffer dimensions

**Step 1: Analyze effect buffer size calculations**

Check logs for lines like:
- `[safelyAddLayer] buffer 1389x1389` (should be much smaller now)
- Effect buffers (stroke, glow, shadow) should be proportional to scaled layer size

**Step 2: Verify stroke buffer calculation**

Current stroke logic adds `width * 2` to dimensions (lines 506-507):
```typescript
const strokeWidth = w + width * 2;
const strokeHeight = h + width * 2;
```

This seems correct. Check that `w` and `h` are the rotated dimensions (not original 1389x1389).

**Step 3: Verify glow/shadow buffer calculation**

Current glow/shadow logic uses padding = `blur * 2` (line 299):
```typescript
const padding = g.blur * 2;
```

And extends image by padding on all sides. This should create buffer of size `(w + padding*2) x (h + padding*2)`.

**Step 4: Check if effect buffers are still oversized**

If effect buffers are still large (>2x canvas size), we may need to scale effect buffers along with main layer.

**Step 5: Commit findings**

```bash
git commit --allow-empty -m "debug: effect buffer size analysis"
```

---

### Task 8: Adjust Coordinate Calculations if Needed

**Files:**
- Modify: `src/app/api/image_composer/render/route.ts` (if coordinate adjustments needed)

**Step 1: Analyze debug logs from Task 5**

Check `[Coord Debug]` logs for:
- Are `finalX` and `finalY` values reasonable? (Not huge negatives like -350)
- Does visual center calculation make sense?
- Are rotated dimensions significantly larger than scaled dimensions?

**Step 2: Potential fixes (if needed)**

If coordinates are still wrong, possible fixes:

1. **Adjust SVG scaling factor** in `calculateSvgTargetDimensions`
2. **Fix visual center calculation** for rotated layers
3. **Adjust effect buffer positioning** relative to main layer

**Step 3: Implement coordinate adjustments**

If needed, modify the coordinate calculations based on debug findings.

**Step 4: Test adjustments**

Re-run Task 5 tests to verify improvements.

**Step 5: Commit adjustments**

```bash
git add src/app/api/image_composer/render/route.ts
git commit -m "fix: adjust coordinate calculations based on debug data"
```

---

### Task 9: Compare with ComposerEditor Example

**Files:**
- Compare: Rendered output vs ComposerEditor preview

**Step 1: Open ComposerEditor for goblin_thief**

Navigate to: `http://localhost:3000/create/rogue_dot_esc/composer?composition=goblin_thief`

**Step 2: Export example image from ComposerEditor**

Use the "Export PNG Snapshot" button to save example image.

**Step 3: Compare with API rendered image**

Visually compare:
- Overall composition layout
- Layer visibility (editorHidden layers should match)
- SVG scaling and quality
- Effect rendering (glow, stroke, shadow)

**Step 4: Note differences**

Document any significant differences between example and API render.

**Step 5: Commit comparison results**

```bash
git commit --allow-empty -m "test: comparison with ComposerEditor example"
```

---

### Task 10: Final Testing and Cleanup

**Files:**
- Test: Multiple compositions with different parameters

**Step 1: Test with other compositions**

If available, test with other compositions to ensure fixes work generally.

**Step 2: Test with different canvas sizes**

Test compositions with different canvas sizes (icon, banner, HD).

**Step 3: Test with mixed asset types**

Test compositions with both SVG and raster (PNG/JPEG) assets.

**Step 4: Remove or reduce debug logging**

Once satisfied, consider reducing debug logging to only essential information.

**Step 5: Final commit**

```bash
git add src/app/api/image_composer/render/route.ts src/app/api/image_composer/utils/svgDimensions.ts
git commit -m "feat: complete image composer bug fixes - SVG scaling, editorHidden filtering, coordinate debugging"
```

---

## Success Criteria Checklist

- [ ] SVG layers render at canvas-proportional dimensions (not 1389x1389)
- [ ] Editor-hidden layers don't appear unless part of active logic group
- [ ] Coordinate calculations produce reasonable positions (not huge negatives)
- [ ] Effect buffers are sized appropriately relative to scaled layers
- [ ] Rendered output matches ComposerEditor example quality
- [ ] All layer effects (glow, stroke, shadow) render correctly
- [ ] Multiple compositions render successfully

**Next Steps:** Use superpowers:executing-plans to implement this plan task-by-task.

---

**Plan complete and saved to `docs/plans/2026-03-05-image-composer-bug-fix-implementation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**