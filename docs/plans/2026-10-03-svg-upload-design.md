# SVG Uploads — True Vector Images

**Date:** 2026-10-03
**Status:** approved for implementation

## Goal

Upload full `.svg` files that store and render as real vector SVGs — never
rasterized to PNG/JPEG/WebP — everywhere images are shown (storylets,
locations, cards, pickers). Image Composer stays raster by design (its output
is WebP).

## Background (what already worked)

- `storageService.uploadAsset` already skips sharp/WebP conversion when
  `contentType === 'image/svg+xml' || ext === 'svg'`.
- `GameImage` renders uploads via plain `<img>` — SVG therefore already
  displays as vector once the stored URL ends in `.svg`.
- `AssetExplorer` posts the raw `File` untouched.

## Failure modes fixed here

1. **Exact-MIME detection.** `ImageUploader` / `ImagePickerModal` branch on
   `file.type === 'image/svg+xml'` only. Empty or off-spec MIME
   (`text/xml`, `''`) falls into the canvas path → `toBlob('image/png'|'image/jpeg')`
   → flatten. The server route also 400s on MIME alone (no extension or
   content fallback).
2. **`img.onload` preview gate.** Dimensionless SVGs (no width/height/viewBox)
   can stall the gate → upload UI never unlocks; `calculateAutoFit` divides by
   zero intrinsic size.
3. **`accept="image/*"`** hides SVGs on some browsers/file pickers.
4. **No sanitization.** A stored SVG opened directly (`/uploads/…svg`,
   same origin) executes scripts — stored XSS.
5. **S3 `ContentType`** falls back to `application/octet-stream` when
   `file.type` is empty → browser downloads instead of renders.
6. **`/uploads/*` missing from `src/proxy.ts` allowlist** — guest players are
   redirected to `/login` for every local upload (pre-existing bug; blocks
   the feature in `/play`).

## Design

### Detection — `src/utils/svgFile.ts` (new, client + server)

- `isSvgFile({name, type})`: MIME `image/svg+xml` **or** `.svg` extension.
- `sniffSvg(buffer)`: skip BOM/whitespace, head starts with `<?xml` or `<svg`
  (case-insensitive) — server-side fallback for empty-MIME files.

### Sanitization (strict) — `isomorphic-dompurify` (new dep)

Applied server-side in the upload route **before** storage:

```ts
DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script', 'iframe', 'object', 'embed', 'link', 'meta'],
    ALLOWED_URI_REGEXP: /^[^:]*$|^#|^data:image\//,  // no schemes: blocks http(s), javascript:
});
```

Strips: `<script>`, `<foreignObject>`, all `on*` handlers, `javascript:` /
external `http(s)` references (attribute URIs).
Keeps: gradients, filters, animations, inline `<style>`, `url(#…)` local refs,
`data:image/…`.
Notes: `ALLOWED_URI_REGEXP` only governs attribute URIs — external `url()`
fetches inside `<style>` text remain possible (tracking-pixel level risk only;
no script execution path). Empty parse result → 400.

### Server changes

- **`api/admin/assets/upload/route.ts`**: accept when MIME allowed **or**
  `isSvgFile` **or** `sniffSvg` on the first bytes; normalize contentType to
  `image/svg+xml` for SVGs; sanitize; reject invalid SVG with 400.
- **`storageService.ts`**: when `isSvg`, force
  `contentType = 'image/svg+xml'` (fixes S3 octet-stream).

### Client changes

- **`ImageUploader.tsx`**: branch on `isSvgFile(file)`; SVG skips the
  `img.onload` gate and the crop canvas — plain `<img>` objectURL preview +
  "Vector file — uploaded raw, crop not applied" note; upload button enabled
  immediately; reuses existing `uploadRawFile()`. `accept`
  `"image/svg+xml,.svg,image/*"`.
- **`ImagePickerModal.tsx`**: same detection; keep original `File` in state
  and post it directly (no objectURL re-fetch); same gate/preview bypass;
  `accept` updated.
- **`AssetExplorer.tsx`**: `accept` updated only (already raw).

### Serving

- **`proxy.ts`**: allowlist `/uploads` (public static files — also unblocks
  guest access to local samples).
- **`GameImage.tsx`**: add `.svg` to the broken-src extension fallback chain.

## Out of scope

- Image Composer SVG layers continue to rasterize (output is WebP).
- Crop/zoom for SVG — raw pass-through by design; CSS `object-fit` handles
  display sizing.
- Back-sanitizing SVGs already in the library (none expected).

## Verification

1. `npx tsc --noEmit` on touched files.
2. `npm run lint` — no new diagnostics vs. stash baseline.
3. `npm run build`.
4. Curl suite:
   - crafted SVG containing `<script>`, `onload=`, `<foreignObject>`,
     `href="https://…"` → stored file stripped of all four; URL ends `.svg`;
     `GET /uploads/…svg` → 200, `Content-Type: image/svg+xml`.
   - `.svg` with empty MIME → accepted (extension/sniff), stored as `.svg`.
   - PNG regression → still converted to WebP.
   - unauth `GET /uploads/<file>` → 200 (no 307 to `/login`).
   - `/play/<world>` HTML references the `.svg`.
   - malformed non-SVG named `.svg` → 400.
