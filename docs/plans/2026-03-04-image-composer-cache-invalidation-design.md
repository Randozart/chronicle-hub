# Image Composer Cache Invalidation Design

**Date:** 2026-03-04
**Status:** Approved
**Related Issue:** Testing image composer fixes requires manual cache invalidation

## Problem Statement

The image composer (`/api/image_composer/render`) uses an in-memory `RENDER_CACHE` Map to improve performance by caching rendered images. However, when testing composition fixes during development, cached images prevent seeing updated results without manually adding `?refresh=true` to URLs. This disrupts the testing workflow.

## Goals

1. **Automatic cache clearing** when entering playtest mode
2. **Story-specific invalidation** - clear only cache for current story
3. **Minimal complexity** - preserve existing simple in-memory cache
4. **Explicit control** - cache clearing triggered by user action

## Design Decisions

### Selected Approach: Simple Cache-Clearing API

**Reasoning:** Maintains the simple in-memory cache (good for performance) while adding explicit invalidation triggers tied to testing workflows. Avoids over-engineering with distributed cache systems.

### Cache Scope: Per-Story Clearing

When entering playtest mode for a story, clear only cache entries for that specific storyId. This preserves cache for other stories and reduces unnecessary re-renders.

### Detection Method: Separate API Call

Playtest button calls cache-clearing API explicitly rather than using URL parameters or automatic detection. This keeps concerns separated and gives explicit control.

## Technical Design

### 1. API Endpoint

**Location:** `src/app/api/image_composer/cache/clear/route.ts`

**Method:** GET
**Parameters:** `storyId` (required), `all` (optional, admin only)

**Behavior:**
- Clears all `RENDER_CACHE` entries matching the storyId
- Returns JSON: `{ success: true, cleared: number }`
- Logs cache clearing for debugging: `[Cache] Cleared X entries for story ${storyId}`
- If `all=true` parameter provided (admin only), clears entire cache

**Security:** Simple storyId validation. No authentication required since cache contains non-sensitive rendered images.

### 2. Cache Key Structure

Current cache keys use full URL: `http://.../render?id=xyz&storyId=abc&...`

**Filtering approach:** Match cache keys containing `storyId=${storyId}` substring.

**Implementation in `src/app/api/image_composer/render/route.ts`:**
- Add helper function: `clearCacheForStory(storyId: string): number`
- Filter `RENDER_CACHE` keys: `key.includes(`storyId=${storyId}`)`
- Delete matching entries, return count cleared

### 3. Integration with Playtest Button

**Current button:** Located in `src/app/create/[storyId]/layout.tsx` (lines 139-153)

**Integration:** Add `onClick` handler to the Link component:
1. Call `fetch(/api/image_composer/cache/clear?storyId=${storyId})`
2. Open playtest tab (`/play/${storyId}?playtest=true`)
3. Optional: Show toast notification on success/error

**Alternative considered:** Separate "Clear Cache" button next to playtest. Rejected in favor of automatic clearing to streamline testing workflow.

## Implementation Steps

1. **Add cache clearing helper** to existing render route
2. **Create new API endpoint** `/api/image_composer/cache/clear`
3. **Modify playtest button** to call cache API before opening tab
4. **Add logging** for cache operations
5. **Test workflow** end-to-end

## Testing Plan

### Manual Testing
1. Create/edit composition in composer
2. View composition → should be cached
3. Click Playtest World → should call cache API
4. View composition in playtest → should see fresh render (not cached)
5. Subsequent views → should use cache (until next playtest)

### Edge Cases
- **Multiple browser tabs:** Cache cleared per server instance
- **Server restart:** Cache lost anyway (acceptable)
- **Concurrent requests:** Cache clearing is synchronous but fast
- **Invalid storyId:** API returns error, no cache cleared

## Success Criteria

- [ ] Cache cleared when clicking Playtest World button
- [ ] Only current story's cache cleared (others preserved)
- [ ] Fresh renders appear in playtest mode
- [ ] Subsequent views use cache (performance maintained)
- [ ] No regressions in existing image composer functionality

## Future Considerations

1. **Cache persistence:** Could move to Redis for multi-instance deployments
2. **Selective clearing:** Clear only specific composition IDs
3. **Cache statistics:** Track hit/miss rates for optimization
4. **TTL-based expiration:** Add time-based cache invalidation

## Approved By

User approval received on 2026-03-04 for:
- Simple Cache-Clearing API approach
- Per-story cache clearing scope
- Separate API call detection method
- Integration via playtest button click handler