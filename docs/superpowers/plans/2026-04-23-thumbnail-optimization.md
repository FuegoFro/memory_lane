# Thumbnail Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve lower-resolution thumbnails in the edit grid to improve scroll performance and reduce memory usage.

**Architecture:** Enhance the media proxy API to support a `size` parameter that calls Dropbox's thumbnail API, leveraging browser caching with `Cache-Control` headers.

**Tech Stack:** Next.js, Dropbox API, React.

---

### Task 1: Update Dropbox Client

**Files:**
- Modify: `src/lib/dropbox/files.ts`

- [ ] **Step 1: Add `getThumbnail` to `src/lib/dropbox/files.ts`**

```typescript
export async function getThumbnail(
  path: string,
  size: string
): Promise<{ data: Buffer; metadata: any }> {
  const client = await getDropboxClient();
  const response = await client.filesGetThumbnail({
    path,
    format: { '.tag': 'jpeg' },
    size: { '.tag': size as any },
    mode: { '.tag': 'bestfit' },
  });

  return {
    data: (response.result as any).fileBinary as Buffer,
    metadata: response.result,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/dropbox/files.ts
git commit -m "feat: add getThumbnail helper to dropbox client"
```

---

### Task 2: Enhance Media Proxy API

**Files:**
- Modify: `src/app/api/media/[id]/route.ts`

- [ ] **Step 1: Implement size handling and caching in `src/app/api/media/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getThumbnail } from '@/lib/dropbox';

const SUPPORTED_SIZES = [
  'w32h32', 'w64h64', 'w128h128', 'w256h256', 
  'w480h320', 'w640h480', 'w960h640', 'w1024h768', 'w2048h1536'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size');
    
    const entry = getEntryById(id);

    if (!entry || entry.disabled) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (size && SUPPORTED_SIZES.includes(size)) {
      const { data } = await getThumbnail(entry.dropbox_path, size);
      
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        },
      });
    }

    const link = await getTemporaryLink(entry.dropbox_path);
    return NextResponse.redirect(link);
  } catch (error) {
    console.error('Failed to get media:', error);
    return NextResponse.json({ error: 'Failed to get media' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/media/
git commit -m "feat: enhance media proxy with thumbnail support and caching"
```

---

### Task 3: Update Thumb Component

**Files:**
- Modify: `src/components/ui/Thumb.tsx`

- [ ] **Step 1: Add `thumbSrc` to `ThumbEntry` and use it in `Thumb` component**

Update `ThumbEntry` interface:
```typescript
export interface ThumbEntry {
  id: string;
  title: string;
  year: number | null;
  kind: 'photo' | 'video';
  src: string;
  thumbSrc?: string;
  hasNarration: boolean;
  duration: string | null;
}
```

Update `Photo` src:
```typescript
<Photo
  src={entry.thumbSrc || entry.src}
  alt={entry.title}
  style={{ width: '100%', aspectRatio: '4 / 3' }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Thumb.tsx
git commit -m "feat: update Thumb component to support optional thumbnail source"
```

---

### Task 4: Integrate in EntryGrid

**Files:**
- Modify: `src/components/editor/EntryGrid.tsx`

- [ ] **Step 1: Add size mapping helper and update rendering in `src/components/editor/EntryGrid.tsx`**

Add helper:
```typescript
function getDropboxSize(pixelSize: number): string {
  if (pixelSize <= 64) return 'w64h64';
  if (pixelSize <= 128) return 'w128h128';
  if (pixelSize <= 256) return 'w480h320';
  if (pixelSize <= 480) return 'w640h480';
  return 'w960h640';
}
```

Update rendering logic:
```typescript
const dbSize = getDropboxSize(thumbnailSize);
// ... in the map loop
const thumbEntry = {
  ...toThumbEntry(entry),
  thumbSrc: `/api/media/${entry.id}?size=${dbSize}`
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/EntryGrid.tsx
git commit -m "feat: use optimized thumbnails in EntryGrid based on slider size"
```
