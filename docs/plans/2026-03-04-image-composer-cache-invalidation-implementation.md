# Image Composer Cache Invalidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cache clearing API for image composer that integrates with playtest mode

**Architecture:** Simple GET API endpoint `/api/image_composer/cache/clear` that clears in-memory RENDER_CACHE entries for specific storyId. Playtest button calls this API before opening playtest tab.

**Tech Stack:** Next.js API routes, TypeScript, React, in-memory Map cache

---

### Task 1: Add cache clearing helper to render route

**Files:**
- Modify: `src/app/api/image_composer/render/route.ts:19-21` (RENDER_CACHE declaration)
- Modify: `src/app/api/image_composer/render/route.ts` (add helper function after imports)

**Step 1: Write the helper function**

Add this after the imports and before the `RENDER_CACHE` declaration:

```typescript
// Cache clearing helper
export function clearCacheForStory(storyId: string): number {
    if (!storyId || typeof storyId !== 'string') return 0;

    let cleared = 0;
    const prefix = `storyId=${storyId}`;

    // Iterate through cache keys and delete those containing the storyId
    for (const key of RENDER_CACHE.keys()) {
        if (key.includes(prefix)) {
            RENDER_CACHE.delete(key);
            cleared++;
        }
    }

    console.log(`[Cache] Cleared ${cleared} entries for story ${storyId}`);
    return cleared;
}
```

**Step 2: Make RENDER_CACHE exportable**

Change line 19 from:
```typescript
const RENDER_CACHE = new Map<string, Buffer>();
```
To:
```typescript
export const RENDER_CACHE = new Map<string, Buffer>();
```

**Step 3: Verify the file compiles**

Run: `npx tsc --noEmit src/app/api/image_composer/render/route.ts`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/api/image_composer/render/route.ts
git commit -m "feat: add cache clearing helper to image composer"
```

---

### Task 2: Create cache clearing API endpoint

**Files:**
- Create: `src/app/api/image_composer/cache/clear/route.ts`

**Step 1: Create directory structure**

```bash
mkdir -p src/app/api/image_composer/cache/clear
```

**Step 2: Write the API endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RENDER_CACHE, clearCacheForStory } from '../../render/route';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');
    const clearAll = searchParams.get('all') === 'true';

    if (!storyId && !clearAll) {
        return NextResponse.json(
            { error: 'Missing storyId parameter' },
            { status: 400 }
        );
    }

    try {
        let cleared = 0;

        if (clearAll) {
            // Admin-only: clear entire cache
            cleared = RENDER_CACHE.size;
            RENDER_CACHE.clear();
            console.log(`[Cache] Cleared entire cache (${cleared} entries)`);
        } else {
            // Clear cache for specific story
            cleared = clearCacheForStory(storyId!);
        }

        return NextResponse.json({
            success: true,
            cleared,
            storyId: clearAll ? null : storyId
        });
    } catch (error) {
        console.error('[Cache] Clear error:', error);
        return NextResponse.json(
            { error: 'Cache clearing failed' },
            { status: 500 }
        );
    }
}
```

**Step 3: Verify the file compiles**

Run: `npx tsc --noEmit src/app/api/image_composer/cache/clear/route.ts`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/api/image_composer/cache/clear/route.ts
git commit -m "feat: add cache clearing API endpoint"
```

---

### Task 3: Test the cache clearing API

**Files:**
- Test: Manual API testing with curl or browser

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on port 3000

**Step 2: Test API endpoint with invalid request**

Open browser or use curl:
```
curl "http://localhost:3000/api/image_composer/cache/clear"
```
Expected: `{"error":"Missing storyId parameter"}` with status 400

**Step 3: Test API endpoint with valid storyId**

```
curl "http://localhost:3000/api/image_composer/cache/clear?storyId=test_story"
```
Expected: `{"success":true,"cleared":0,"storyId":"test_story"}` (0 entries cleared since cache is empty)

**Step 4: Test server logs**

Check server console for: `[Cache] Cleared 0 entries for story test_story`

**Step 5: Commit test verification**

```bash
git commit --allow-empty -m "test: verified cache clearing API works"
```

---

### Task 4: Integrate with playtest button

**Files:**
- Modify: `src/app/create/[storyId]/layout.tsx:139-153` (playtest button)

**Step 1: Examine current button code**

Current button (lines 139-153) is a Link component:
```tsx
<Link
    href={`/play/${storyId}?playtest=true`}
    target="_blank"
    className="admin-link"
    style={{...}}
>
    ▶ Playtest World
</Link>
```

**Step 2: Convert to button with click handler**

Replace the Link component with:
```tsx
<button
    onClick={async () => {
        try {
            // Clear image composer cache
            await fetch(`/api/image_composer/cache/clear?storyId=${storyId}`);
            // Open playtest in new tab
            window.open(`/play/${storyId}?playtest=true`, '_blank');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            // Fallback: open playtest anyway
            window.open(`/play/${storyId}?playtest=true`, '_blank');
        }
    }}
    className="admin-link"
    style={{
        backgroundColor: 'var(--tool-accent-green, #28a745)',
        color: '#fff',
        textAlign: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        padding: '0.6rem',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit'
    }}
>
    ▶ Playtest World
</button>
```

**Step 3: Verify TypeScript compilation**

Run: `npx tsc --noEmit src/app/create/[storyId]/layout.tsx`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/create/[storyId]/layout.tsx
git commit -m "feat: integrate cache clearing with playtest button"
```

---

### Task 5: Add optional toast notification

**Files:**
- Modify: `src/app/create/[storyId]/layout.tsx` (add toast handling)
- Check: `src/providers/ToastProvider.tsx` (toast system)

**Step 1: Check if toast provider exists**

Run: `ls -la src/providers/`
Expected: `ToastProvider.tsx` exists

**Step 2: Import and use toast hook**

Add import at top of layout.tsx:
```typescript
import { useToast } from '@/providers/ToastProvider';
```

Inside the component function, add:
```typescript
const { showToast } = useToast();
```

**Step 3: Update click handler with toast**

Update the onClick handler:
```tsx
onClick={async () => {
    try {
        // Clear image composer cache
        const response = await fetch(`/api/image_composer/cache/clear?storyId=${storyId}`);
        const result = await response.json();

        if (result.success) {
            showToast(`Cleared ${result.cleared} cached images`, 'info');
        }

        // Open playtest in new tab
        window.open(`/play/${storyId}?playtest=true`, '_blank');
    } catch (error) {
        console.error('Failed to clear cache:', error);
        showToast('Cache clear failed, opening playtest anyway', 'warning');
        window.open(`/play/${storyId}?playtest=true`, '_blank');
    }
}}
```

**Step 4: Handle missing toast provider**

If toast provider doesn't exist, wrap in try-catch:
```tsx
let showToast = (message: string, type: string) => console.log(`${type}: ${message}`);
try {
    const toast = useToast();
    showToast = toast.showToast;
} catch (e) {
    // Toast provider not available, use console fallback
}
```

**Step 5: Commit**

```bash
git add src/app/create/[storyId]/layout.tsx
git commit -m "feat: add toast notifications for cache clearing"
```

---

### Task 6: Manual end-to-end testing

**Files:** None - manual testing

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server running on port 3000

**Step 2: Navigate to composer**

Open: `http://localhost:3000/create/<storyId>/composer`
Replace `<storyId>` with actual story ID

**Step 3: Create or select composition**

Create a test composition or use existing one

**Step 4: Generate cache entry**

View the composition (triggers render and cache)
Check server logs for: `[Composite] Starting composite` and cache storage

**Step 5: Click Playtest World button**

Click the green "▶ Playtest World" button in left sidebar
Check server logs for: `[Cache] Cleared X entries for story <storyId>`

**Step 6: Verify cache was cleared**

View composition again immediately
Check server logs: Should NOT show "Cache hit", should show fresh render

**Step 7: Verify subsequent uses cache**

View composition a second time
Check server logs: Should show "Cache hit" (if within same request)

**Step 8: Commit test results**

```bash
git commit --allow-empty -m "test: manual E2E testing completed successfully"
```

---

### Task 7: Edge case handling

**Files:**
- Modify: `src/app/api/image_composer/cache/clear/route.ts` (add validation)

**Step 1: Add input validation**

Update the GET function to validate storyId format:
```typescript
if (storyId && !/^[a-zA-Z0-9_-]+$/.test(storyId)) {
    return NextResponse.json(
        { error: 'Invalid storyId format' },
        { status: 400 }
    );
}
```

**Step 2: Add rate limiting protection**

Add simple rate limiting to prevent abuse:
```typescript
const CLEAR_THROTTLE = new Map<string, number>();

// Inside GET function, after validation:
if (storyId) {
    const lastClear = CLEAR_THROTTLE.get(storyId);
    const now = Date.now();
    if (lastClear && now - lastClear < 5000) { // 5 second throttle
        return NextResponse.json(
            { error: 'Cache cleared too recently, please wait' },
            { status: 429 }
        );
    }
    CLEAR_THROTTLE.set(storyId, now);
}
```

**Step 3: Verify updates**

Run: `npx tsc --noEmit src/app/api/image_composer/cache/clear/route.ts`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add src/app/api/image_composer/cache/clear/route.ts
git commit -m "feat: add validation and rate limiting to cache clear"
```

---

### Task 8: Update documentation

**Files:**
- Modify: `docs/plans/2026-03-04-image-composer-cache-invalidation-design.md`

**Step 1: Update design document with implementation details**

Add implementation section at end:
```markdown
## Implementation Completed

**Date:** 2026-03-04

### Changes Made:
1. Added `clearCacheForStory()` helper to render route
2. Created `/api/image_composer/cache/clear` API endpoint
3. Modified playtest button to clear cache before opening playtest
4. Added toast notifications for user feedback
5. Added input validation and rate limiting

### Files Modified:
- `src/app/api/image_composer/render/route.ts`
- `src/app/api/image_composer/cache/clear/route.ts`
- `src/app/create/[storyId]/layout.tsx`

### Testing:
- Manual E2E testing confirmed cache clears when entering playtest
- API endpoint tested with valid/invalid requests
- Toast notifications working (when available)
```

**Step 2: Commit documentation**

```bash
git add docs/plans/2026-03-04-image-composer-cache-invalidation-design.md
git commit -m "docs: update design document with implementation details"
```

---

## Success Criteria Checklist

- [ ] Cache clearing helper function added to render route
- [ ] API endpoint `/api/image_composer/cache/clear` created and working
- [ ] Playtest button clears cache before opening playtest tab
- [ ] Toast notifications show cache clear status (when available)
- [ ] Input validation prevents invalid storyIds
- [ ] Rate limiting prevents abuse (5 second throttle)
- [ ] Manual E2E testing confirms workflow works
- [ ] Documentation updated with implementation details

**Next Steps:** Use superpowers:executing-plans to implement this plan task-by-task.