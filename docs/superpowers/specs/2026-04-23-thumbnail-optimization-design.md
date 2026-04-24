# Spec: Thumbnail Optimization (2026-04-23)

Improve performance and reduce "jank" in the Memory Lane grid by serving lower-resolution thumbnails instead of original assets.

## Context
Currently, the `EntryGrid` renders original high-resolution assets (often 5-15MB each) in its cards. While these are proxied via Dropbox, the browser must still download and downscale them to fit the thumbnail slots (typically 200px-400px). This causes significant memory pressure and "jank" during scrolling.

## Goals
- Serve appropriately sized thumbnails for the grid cards.
- Reduce bandwidth usage for the editing interface.
- Match thumbnail resolution to the user's adjustable grid size slider.
- Leverage browser caching for performance.

## Architecture

### 1. Media Proxy Enhancement
The `/api/media/[id]` endpoint will be updated to handle a `size` query parameter.

- **Endpoint:** `GET /api/media/[id]?size=w480h320`
- **Logic:**
  - If `size` is present, call Dropbox's `filesGetThumbnail` API.
  - Return the binary data with a `Cache-Control` header (e.g., `public, max-age=86400`).
  - If `size` is absent, maintain current behavior (redirect to original file).
  - Validation: Ensure the requested `size` is one of the [Dropbox-supported thumbnail sizes](https://www.dropbox.com/developers/documentation/http/documentation#files-get_thumbnail).

### 2. Dropbox Client Update
Add a `getThumbnail` helper to `src/lib/dropbox/files.ts`.

- **Function:** `getThumbnail(path: string, size: string): Promise<{ data: Buffer; metadata: any }>`
- **Returns:** The binary content and metadata (including `rev` for potential future ETag use).

### 3. Browser Caching
Instead of a server-side LRU cache, we will rely on standard browser caching to minimize redundant transfers.

- **Header:** `Cache-Control: public, max-age=86400` (24 hours).
- **Rationale:** Since the media in a Memory Lane project is mostly static, a 24-hour cache provides a good balance between performance and freshness without adding server-side state.

### 4. UI Integration
Update the rendering logic to request thumbnails.

- **`src/components/ui/Thumb.tsx`:** Update to accept an optional `src` that includes the size parameter.
- **`src/app/edit/EntryGrid.tsx`:** Calculate the target Dropbox size based on the `thumbnailSize` state.

#### Mapping Logic (Optimized for Retina):
| `thumbnailSize` Slider | Dropbox Size Parameter | Native Res |
|-------------------------|------------------------|------------|
| < 64px                  | `w64h64`               | 64x64      |
| 64px - 128px            | `w128h128`             | 128x128    |
| 128px - 256px           | `w480h320`             | 480x320    |
| 256px - 480px           | `w640h480`             | 640x480    |
| > 480px                 | `w960h640`             | 960x640    |

## Testing Plan
1. **API Test:** Verify that `GET /api/media/[id]?size=w64h64` returns a small image buffer with `Cache-Control: public, max-age=86400`.
2. **Browser Test:** Confirm in DevTools that subsequent requests for the same thumbnail result in `(from disk cache)` or `(from memory cache)`.
3. **UI Test:** Ensure thumbnails update correctly when the slider is moved and that scrolling feels smooth with 100+ entries.
