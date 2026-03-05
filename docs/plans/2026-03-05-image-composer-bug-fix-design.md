# Image Composer Bug Fix Design

**Date:** 2026-03-05
**Goal:** Fix image composer rendering bugs causing mangled images, incorrect layer visibility, and improper SVG scaling

## Root Causes Identified

1. **SVG Scaling Problem**: SVGs render at inconsistent, overly large dimensions (1389x1389 vs canvas 300x400), causing incorrect coordinate calculations and cropping
2. **Missing EditorHidden Filter**: Layers with `editorHidden: true` appear in final render when they shouldn't
3. **Coordinate Calculation Issues**: Negative coordinates + large SVG dimensions cause only top-left portions to be visible after cropping
4. **Effect Buffer Sizes**: Stroke, glow, and shadow effects create buffers much larger than base layers, compounding positioning issues

## Design Sections

### Section 1: SVG Scaling and Density Fix

**Problem:** SVGs render at arbitrary large sizes instead of canvas-proportional dimensions

**Solution:** Normalize SVG dimensions relative to canvas:
- Extract intrinsic dimensions from SVG viewBox (e.g., 512x512 for game icons)
- Calculate scale factor based on canvas size and layer scale
- Maintain `density: 72` for now (matches browser/Canvas default)
- Ensure consistent rasterization across all SVG layers

**Implementation:**
- Modify `sharp(buffer, { density: 72 })` to use calculated dimensions
- Add SVG metadata extraction before processing
- Scale SVGs relative to canvas, not arbitrary large sizes

### Section 2: EditorHidden Layer Filtering

**Problem:** Layers with `editorHidden: true` appear in final render

**Solution:** Filter layers based on `editorHidden` flag and logic groups:
- Skip layer if `editorHidden: true` AND (no group OR group doesn't match)
- Only render editor-hidden layers when part of active logic group with matching variant

**Implementation:**
```typescript
if (layer.editorHidden) {
    const hasGroup = layer.groupId !== undefined;
    const groupMatches = hasGroup && searchParams.get(layer.groupId) === layer.variantValue;

    if (!hasGroup || !groupMatches) {
        continue; // Skip this layer
    }
}
```

### Section 3: Coordinate Calculation Debugging

**Problem:** Large negative coordinates cause incorrect cropping and positioning

**Solution:** Add detailed debugging and validate coordinate math:
1. Log each transformation step (original → scaled → rotated → final)
2. Validate effect buffer size calculations
3. Ensure visual center remains fixed after rotation/effects
4. Adjust positioning if coordinate math is incorrect

**Debugging Strategy:**
```typescript
console.log(`[Debug] Layer ${layerIndex}:`);
console.log(`  Original: ${originalW}x${originalH}`);
console.log(`  Scaled: ${scaledW}x${scaledH} (scale=${layer.scale})`);
console.log(`  Rotated: ${rotatedW}x${rotatedH} (rotation=${layer.rotation})`);
console.log(`  Visual center: (${visualCenterX}, ${visualCenterY})`);
console.log(`  Final position: (${finalX}, ${finalY})`);
```

## Implementation Approach

**Priority Order:**
1. **Fix SVG scaling** (Section 1) - addresses root cause of oversized buffers
2. **Add editorHidden filtering** (Section 2) - corrects layer visibility
3. **Debug coordinate calculations** (Section 3) - fine-tunes positioning

**Testing Strategy:**
1. Test with "goblin_thief" composition (ID: goblin_thief, storyId: rogue_dot_esc)
2. Compare rendered output with ComposerEditor.tsx example mockup
3. Verify hidden layers don't appear unless part of active logic group
4. Check SVG layers render at appropriate scale without pixelation

## Success Criteria

- [ ] Final rendered image matches ComposerEditor.tsx example mockup
- [ ] Hidden layers (`editorHidden: true`) don't appear unless part of active logic group
- [ ] SVG layers render at appropriate scale relative to canvas
- [ ] All layer effects (glow, stroke, shadow) render correctly
- [ ] Coordinate calculations produce correct layer positioning
- [ ] No "top-left only" cropping of extended layers

## Files to Modify

1. `src/app/api/image_composer/render/route.ts`
   - SVG scaling and dimension extraction
   - EditorHidden filtering logic
   - Coordinate calculation debugging

**Note:** ComposerEditor.tsx preview functionality should remain unchanged as it's already working correctly.

---

**Next Steps:** Use `superpowers:writing-plans` to create detailed implementation plan