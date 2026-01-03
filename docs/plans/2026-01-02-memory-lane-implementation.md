# Memory Lane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a narrated photo/video slideshow app with Dropbox integration, public viewing, and authenticated editing.

**Architecture:** Next.js full-stack app with SQLite for metadata, Dropbox for media storage, and Gemini for transcription. Public viewer at `/`, protected editor at `/edit`.

**Tech Stack:** Next.js 14 (App Router), SQLite (better-sqlite3), Dropbox API, Google Gemini 2.5 Flash, Web Audio API, TOTP authentication

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, etc. (via create-next-app)

**Step 1: Create Next.js app with TypeScript**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the project in the current directory.

**Step 2: Verify it works**

Run: `npm run dev`
Expected: Server starts at http://localhost:3000, shows Next.js welcome page

**Step 3: Stop the dev server and commit**

```bash
git add -A
git commit -m "chore: initialize Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install database and auth dependencies**

Run:
```bash
npm install better-sqlite3 uuid bcryptjs otpauth jose
npm install -D @types/better-sqlite3 @types/uuid @types/bcryptjs
```

**Step 2: Install Dropbox SDK**

Run:
```bash
npm install dropbox
```

**Step 3: Install Google AI SDK**

Run:
```bash
npm install @google/generative-ai
```

**Step 4: Verify installation**

Run: `npm ls --depth=0`
Expected: All packages listed without errors

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add core dependencies (SQLite, auth, Dropbox, Gemini)"
```

---

### Task 3: Set Up Environment Variables

**Files:**
- Create: `.env.local.example`
- Create: `.env.local` (not committed)
- Modify: `.gitignore`

**Step 1: Create environment template**

Create `.env.local.example`:
```bash
# Auth
AUTH_PASSWORD_HASH=
TOTP_SECRET=
SESSION_SECRET=

# Dropbox
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REFRESH_TOKEN=
DROPBOX_FOLDER=/MemoryLane

# Gemini
GEMINI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Step 2: Copy to .env.local**

Run: `cp .env.local.example .env.local`

**Step 3: Ensure .env.local is gitignored**

Check `.gitignore` already includes `.env*.local` (Next.js default). If not, add it.

**Step 4: Commit**

```bash
git add .env.local.example .gitignore
git commit -m "chore: add environment variable template"
```

---

### Task 4: Create Database Schema

**Files:**
- Create: `src/lib/db/schema.sql`
- Create: `src/lib/db/index.ts`

**Step 1: Create schema file**

Create `src/lib/db/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  dropbox_path TEXT NOT NULL UNIQUE,
  title TEXT,
  transcript TEXT,
  position INTEGER,
  disabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_position ON entries(position);
CREATE INDEX IF NOT EXISTS idx_entries_disabled ON entries(disabled);
```

**Step 2: Create database module**

Create `src/lib/db/index.ts`:
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/memory-lane.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

export default db;

export interface Entry {
  id: string;
  dropbox_path: string;
  title: string | null;
  transcript: string | null;
  position: number | null;
  disabled: number;
  created_at: string;
  updated_at: string;
}

export interface Setting {
  key: string;
  value: string;
}
```

**Step 3: Add data directory to gitignore**

Add to `.gitignore`:
```
/data/
```

**Step 4: Test database initialization**

Create a quick test script. Run in Node REPL:
```bash
node -e "require('./src/lib/db/index.ts')" 2>/dev/null || npx tsx -e "import './src/lib/db/index.ts'"
```

Actually, since this is TypeScript, just verify no syntax errors for now. Full testing comes with API routes.

**Step 5: Commit**

```bash
git add src/lib/db/ .gitignore
git commit -m "feat: add SQLite database schema and initialization"
```

---

## Phase 2: Authentication

### Task 5: Create Auth Utilities

**Files:**
- Create: `src/lib/auth/password.ts`
- Create: `src/lib/auth/totp.ts`
- Create: `src/lib/auth/session.ts`

**Step 1: Create password utility**

Create `src/lib/auth/password.ts`:
```typescript
import bcrypt from 'bcryptjs';

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// Utility to generate hash (run once during setup)
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}
```

**Step 2: Create TOTP utility**

Create `src/lib/auth/totp.ts`:
```typescript
import * as OTPAuth from 'otpauth';

export function verifyTOTP(token: string, secret: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: 'MemoryLane',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

// Utility to generate secret (run once during setup)
export function generateTOTPSecret(): { secret: string; uri: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'MemoryLane',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
}
```

**Step 3: Create session utility**

Create `src/lib/auth/session.ts`:
```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET not configured');
  return new TextEncoder().encode(secret);
}

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_DURATION) / 1000))
    .sign(getSecretKey());

  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
```

**Step 4: Create auth index**

Create `src/lib/auth/index.ts`:
```typescript
export { verifyPassword, hashPassword } from './password';
export { verifyTOTP, generateTOTPSecret } from './totp';
export {
  createSession,
  verifySession,
  getSession,
  setSessionCookie,
  clearSessionCookie,
} from './session';
```

**Step 5: Commit**

```bash
git add src/lib/auth/
git commit -m "feat: add authentication utilities (password, TOTP, session)"
```

---

### Task 6: Create Login API Route

**Files:**
- Create: `src/app/api/auth/login/route.ts`

**Step 1: Create login endpoint**

Create `src/app/api/auth/login/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPassword,
  verifyTOTP,
  createSession,
  setSessionCookie,
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password, totp } = await request.json();

    if (!password || !totp) {
      return NextResponse.json(
        { error: 'Password and TOTP code required' },
        { status: 400 }
      );
    }

    const passwordHash = process.env.AUTH_PASSWORD_HASH;
    const totpSecret = process.env.TOTP_SECRET;

    if (!passwordHash || !totpSecret) {
      console.error('Auth not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const passwordValid = verifyPassword(password, passwordHash);
    const totpValid = verifyTOTP(totp, totpSecret);

    if (!passwordValid || !totpValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createSession();
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/auth/login/
git commit -m "feat: add login API endpoint"
```

---

### Task 7: Create Logout API Route

**Files:**
- Create: `src/app/api/auth/logout/route.ts`

**Step 1: Create logout endpoint**

Create `src/app/api/auth/logout/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/auth/logout/
git commit -m "feat: add logout API endpoint"
```

---

### Task 8: Create Auth Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware for protected routes**

Create `src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

const PROTECTED_PATHS = ['/edit', '/api/edit'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For middleware, we need to verify without using cookies() helper
  const { jwtVerify } = await import('jose');
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/edit/:path*', '/api/edit/:path*'],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware for protected routes"
```

---

### Task 9: Create Login Page

**Files:**
- Create: `src/app/login/page.tsx`

**Step 1: Create login page component**

Create `src/app/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, totp }),
      });

      if (res.ok) {
        router.push('/edit');
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">
          Memory Lane
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="totp" className="block text-gray-300 mb-1">
              Authenticator Code
            </label>
            <input
              type="text"
              id="totp"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none tracking-widest text-center text-xl"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page UI"
```

---

## Phase 3: Dropbox Integration

### Task 10: Create Dropbox Client

**Files:**
- Create: `src/lib/dropbox/client.ts`

**Step 1: Create Dropbox client with token refresh**

Create `src/lib/dropbox/client.ts`:
```typescript
import { Dropbox } from 'dropbox';

let cachedClient: Dropbox | null = null;
let tokenExpiry: number = 0;

export async function getDropboxClient(): Promise<Dropbox> {
  const now = Date.now();

  // Return cached client if token is still valid (with 5 min buffer)
  if (cachedClient && tokenExpiry > now + 5 * 60 * 1000) {
    return cachedClient;
  }

  const appKey = process.env.DROPBOX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET;
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;

  if (!appKey || !appSecret || !refreshToken) {
    throw new Error('Dropbox credentials not configured');
  }

  // Create client that will auto-refresh
  const client = new Dropbox({
    clientId: appKey,
    clientSecret: appSecret,
    refreshToken,
  });

  cachedClient = client;
  // Dropbox access tokens are valid for 4 hours
  tokenExpiry = now + 4 * 60 * 60 * 1000;

  return client;
}

export function getDropboxFolder(): string {
  return process.env.DROPBOX_FOLDER || '/MemoryLane';
}
```

**Step 2: Commit**

```bash
git add src/lib/dropbox/
git commit -m "feat: add Dropbox client with token management"
```

---

### Task 11: Create Dropbox File Operations

**Files:**
- Create: `src/lib/dropbox/files.ts`

**Step 1: Create file listing and link operations**

Create `src/lib/dropbox/files.ts`:
```typescript
import { getDropboxClient, getDropboxFolder } from './client';
import { files } from 'dropbox';

export interface DropboxFile {
  path: string;
  name: string;
  isVideo: boolean;
  hasNarration: boolean;
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi'];
const NARRATION_SUFFIX = '.narration.webm';

function isMediaFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext)) ||
    VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))
  );
}

function isVideoFile(name: string): boolean {
  const lower = name.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function listMediaFiles(): Promise<DropboxFile[]> {
  const client = await getDropboxClient();
  const folder = getDropboxFolder();

  const response = await client.filesListFolder({ path: folder });
  const allEntries = response.result.entries;

  // Get all narration files for quick lookup
  const narrationPaths = new Set(
    allEntries
      .filter((e): e is files.FileMetadata =>
        e['.tag'] === 'file' && e.name.endsWith(NARRATION_SUFFIX)
      )
      .map((e) => e.path_lower)
  );

  // Filter to media files and check for narrations
  const mediaFiles: DropboxFile[] = allEntries
    .filter((e): e is files.FileMetadata =>
      e['.tag'] === 'file' && isMediaFile(e.name)
    )
    .map((entry) => {
      const narrationPath = (entry.path_lower + NARRATION_SUFFIX).toLowerCase();
      return {
        path: entry.path_display || entry.path_lower || '',
        name: entry.name,
        isVideo: isVideoFile(entry.name),
        hasNarration: narrationPaths.has(narrationPath),
      };
    });

  return mediaFiles;
}

// Cache for temporary links (valid 4 hours, we cache for 3)
const linkCache = new Map<string, { link: string; expiry: number }>();

export async function getTemporaryLink(path: string): Promise<string> {
  const now = Date.now();
  const cached = linkCache.get(path);

  if (cached && cached.expiry > now) {
    return cached.link;
  }

  const client = await getDropboxClient();
  const response = await client.filesGetTemporaryLink({ path });
  const link = response.result.link;

  // Cache for 3 hours (links valid for 4)
  linkCache.set(path, { link, expiry: now + 3 * 60 * 60 * 1000 });

  return link;
}

export async function uploadNarration(
  mediaPath: string,
  audioData: Buffer
): Promise<void> {
  const client = await getDropboxClient();
  const narrationPath = mediaPath + NARRATION_SUFFIX;

  await client.filesUpload({
    path: narrationPath,
    contents: audioData,
    mode: { '.tag': 'overwrite' },
  });

  // Invalidate cache for this narration
  linkCache.delete(narrationPath);
}

export async function deleteNarration(mediaPath: string): Promise<void> {
  const client = await getDropboxClient();
  const narrationPath = mediaPath + NARRATION_SUFFIX;

  try {
    await client.filesDeleteV2({ path: narrationPath });
  } catch (error: unknown) {
    // Ignore if file doesn't exist
    if (error && typeof error === 'object' && 'status' in error && error.status !== 409) {
      throw error;
    }
  }

  linkCache.delete(narrationPath);
}

export function getNarrationPath(mediaPath: string): string {
  return mediaPath + NARRATION_SUFFIX;
}
```

**Step 2: Create Dropbox index**

Create `src/lib/dropbox/index.ts`:
```typescript
export { getDropboxClient, getDropboxFolder } from './client';
export {
  listMediaFiles,
  getTemporaryLink,
  uploadNarration,
  deleteNarration,
  getNarrationPath,
  type DropboxFile,
} from './files';
```

**Step 3: Commit**

```bash
git add src/lib/dropbox/
git commit -m "feat: add Dropbox file operations (list, links, upload)"
```

---

## Phase 4: Entry Management

### Task 12: Create Entry Repository

**Files:**
- Create: `src/lib/entries/repository.ts`

**Step 1: Create entry CRUD operations**

Create `src/lib/entries/repository.ts`:
```typescript
import db, { Entry } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export function getAllEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    ORDER BY
      CASE WHEN disabled = 1 THEN 2
           WHEN position IS NULL THEN 1
           ELSE 0
      END,
      position ASC,
      created_at DESC
  `);
  return stmt.all() as Entry[];
}

export function getActiveEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    WHERE disabled = 0 AND position IS NOT NULL
    ORDER BY position ASC
  `);
  return stmt.all() as Entry[];
}

export function getStagingEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    WHERE disabled = 0 AND position IS NULL
    ORDER BY created_at DESC
  `);
  return stmt.all() as Entry[];
}

export function getDisabledEntries(): Entry[] {
  const stmt = db.prepare(`
    SELECT * FROM entries
    WHERE disabled = 1
    ORDER BY updated_at DESC
  `);
  return stmt.all() as Entry[];
}

export function getEntryById(id: string): Entry | undefined {
  const stmt = db.prepare('SELECT * FROM entries WHERE id = ?');
  return stmt.get(id) as Entry | undefined;
}

export function getEntryByPath(dropboxPath: string): Entry | undefined {
  const stmt = db.prepare('SELECT * FROM entries WHERE dropbox_path = ?');
  return stmt.get(dropboxPath) as Entry | undefined;
}

export function createEntry(dropboxPath: string): Entry {
  const id = uuidv4();
  const stmt = db.prepare(`
    INSERT INTO entries (id, dropbox_path)
    VALUES (?, ?)
  `);
  stmt.run(id, dropboxPath);
  return getEntryById(id)!;
}

export function updateEntry(
  id: string,
  updates: {
    title?: string | null;
    transcript?: string | null;
    position?: number | null;
    disabled?: boolean;
  }
): Entry | undefined {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if ('title' in updates) {
    fields.push('title = ?');
    values.push(updates.title ?? null);
  }
  if ('transcript' in updates) {
    fields.push('transcript = ?');
    values.push(updates.transcript ?? null);
  }
  if ('position' in updates) {
    fields.push('position = ?');
    values.push(updates.position ?? null);
  }
  if ('disabled' in updates) {
    fields.push('disabled = ?');
    values.push(updates.disabled ? 1 : 0);
  }

  if (fields.length === 0) return getEntryById(id);

  fields.push("updated_at = datetime('now')");
  values.push(id);

  const stmt = db.prepare(`
    UPDATE entries SET ${fields.join(', ')} WHERE id = ?
  `);
  stmt.run(...values);

  return getEntryById(id);
}

export function reorderEntries(orderedIds: string[]): void {
  const updateStmt = db.prepare('UPDATE entries SET position = ? WHERE id = ?');

  const reorder = db.transaction((ids: string[]) => {
    ids.forEach((id, index) => {
      updateStmt.run(index, id);
    });
  });

  reorder(orderedIds);
}

export function deleteEntry(id: string): boolean {
  const stmt = db.prepare('DELETE FROM entries WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getNextPosition(): number {
  const stmt = db.prepare('SELECT MAX(position) as max FROM entries WHERE position IS NOT NULL');
  const result = stmt.get() as { max: number | null };
  return (result.max ?? -1) + 1;
}
```

**Step 2: Create entries index**

Create `src/lib/entries/index.ts`:
```typescript
export {
  getAllEntries,
  getActiveEntries,
  getStagingEntries,
  getDisabledEntries,
  getEntryById,
  getEntryByPath,
  createEntry,
  updateEntry,
  reorderEntries,
  deleteEntry,
  getNextPosition,
} from './repository';
```

**Step 3: Commit**

```bash
git add src/lib/entries/
git commit -m "feat: add entry repository for database operations"
```

---

### Task 13: Create Sync Service

**Files:**
- Create: `src/lib/entries/sync.ts`

**Step 1: Create Dropbox sync logic**

Create `src/lib/entries/sync.ts`:
```typescript
import { listMediaFiles } from '@/lib/dropbox';
import { getEntryByPath, createEntry, getAllEntries } from './repository';

export interface SyncResult {
  added: number;
  removed: number;
  unchanged: number;
}

export async function syncFromDropbox(): Promise<SyncResult> {
  const dropboxFiles = await listMediaFiles();
  const existingEntries = getAllEntries();

  const dropboxPaths = new Set(dropboxFiles.map((f) => f.path));
  const existingPaths = new Set(existingEntries.map((e) => e.dropbox_path));

  let added = 0;
  let removed = 0;
  let unchanged = 0;

  // Add new files
  for (const file of dropboxFiles) {
    if (!existingPaths.has(file.path)) {
      createEntry(file.path);
      added++;
    } else {
      unchanged++;
    }
  }

  // Note: We don't auto-delete entries when files are removed from Dropbox
  // Instead, mark them or let user handle it manually
  // For now, just count how many are missing
  for (const entry of existingEntries) {
    if (!dropboxPaths.has(entry.dropbox_path)) {
      removed++;
      // Could mark as missing or disabled here
    }
  }

  return { added, removed, unchanged };
}
```

**Step 2: Update entries index**

Update `src/lib/entries/index.ts`:
```typescript
export {
  getAllEntries,
  getActiveEntries,
  getStagingEntries,
  getDisabledEntries,
  getEntryById,
  getEntryByPath,
  createEntry,
  updateEntry,
  reorderEntries,
  deleteEntry,
  getNextPosition,
} from './repository';

export { syncFromDropbox, type SyncResult } from './sync';
```

**Step 3: Commit**

```bash
git add src/lib/entries/
git commit -m "feat: add Dropbox sync service"
```

---

## Phase 5: Public API Routes

### Task 14: Create Public Entries API

**Files:**
- Create: `src/app/api/entries/route.ts`
- Create: `src/app/api/entries/[id]/route.ts`

**Step 1: Create entries list endpoint**

Create `src/app/api/entries/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getActiveEntries } from '@/lib/entries';

export async function GET() {
  try {
    const entries = getActiveEntries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create single entry endpoint**

Create `src/app/api/entries/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Don't expose disabled entries publicly
    if (entry.disabled) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to fetch entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entry' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/entries/
git commit -m "feat: add public entries API endpoints"
```

---

### Task 15: Create Media Proxy API

**Files:**
- Create: `src/app/api/media/[id]/route.ts`
- Create: `src/app/api/narration/[id]/route.ts`

**Step 1: Create media proxy endpoint**

Create `src/app/api/media/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink } from '@/lib/dropbox';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry || entry.disabled) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const link = await getTemporaryLink(entry.dropbox_path);
    return NextResponse.redirect(link);
  } catch (error) {
    console.error('Failed to get media link:', error);
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create narration proxy endpoint**

Create `src/app/api/narration/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry || entry.disabled) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const narrationPath = getNarrationPath(entry.dropbox_path);

    try {
      const link = await getTemporaryLink(narrationPath);
      return NextResponse.redirect(link);
    } catch {
      // Narration doesn't exist
      return NextResponse.json(
        { error: 'No narration' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Failed to get narration link:', error);
    return NextResponse.json(
      { error: 'Failed to get narration' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/media/ src/app/api/narration/
git commit -m "feat: add media and narration proxy endpoints"
```

---

### Task 16: Create Settings API

**Files:**
- Create: `src/lib/settings/index.ts`
- Create: `src/app/api/settings/viewer/route.ts`

**Step 1: Create settings helper**

Create `src/lib/settings/index.ts`:
```typescript
import db, { Setting } from '@/lib/db';

export interface ViewerSettings {
  autoAdvanceDelay: number; // seconds, 0 = disabled
  showTitles: boolean;
}

const DEFAULTS: ViewerSettings = {
  autoAdvanceDelay: 5,
  showTitles: true,
};

export function getSetting(key: string): string | undefined {
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as Setting | undefined;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  const stmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
  `);
  stmt.run(key, value, value);
}

export function getViewerSettings(): ViewerSettings {
  const autoAdvance = getSetting('autoAdvanceDelay');
  const showTitles = getSetting('showTitles');

  return {
    autoAdvanceDelay: autoAdvance ? parseInt(autoAdvance, 10) : DEFAULTS.autoAdvanceDelay,
    showTitles: showTitles ? showTitles === 'true' : DEFAULTS.showTitles,
  };
}

export function updateViewerSettings(settings: Partial<ViewerSettings>): void {
  if (settings.autoAdvanceDelay !== undefined) {
    setSetting('autoAdvanceDelay', settings.autoAdvanceDelay.toString());
  }
  if (settings.showTitles !== undefined) {
    setSetting('showTitles', settings.showTitles.toString());
  }
}
```

**Step 2: Create public settings endpoint**

Create `src/app/api/settings/viewer/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getViewerSettings } from '@/lib/settings';

export async function GET() {
  try {
    const settings = getViewerSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/settings/ src/app/api/settings/
git commit -m "feat: add settings storage and viewer settings API"
```

---

## Phase 6: Protected API Routes

### Task 17: Create Edit Entries API

**Files:**
- Create: `src/app/api/edit/entries/route.ts`
- Create: `src/app/api/edit/entries/[id]/route.ts`
- Create: `src/app/api/edit/entries/sync/route.ts`
- Create: `src/app/api/edit/entries/reorder/route.ts`

**Step 1: Create list all entries endpoint**

Create `src/app/api/edit/entries/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { getAllEntries } from '@/lib/entries';

export async function GET() {
  try {
    const entries = getAllEntries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Failed to fetch entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create update entry endpoint**

Create `src/app/api/edit/entries/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntry, getNextPosition } from '@/lib/entries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Failed to fetch entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const entry = getEntryById(id);
    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const updates: Parameters<typeof updateEntry>[1] = {};

    if ('title' in body) updates.title = body.title;
    if ('transcript' in body) updates.transcript = body.transcript;
    if ('disabled' in body) updates.disabled = body.disabled;

    // Handle status changes
    if ('status' in body) {
      switch (body.status) {
        case 'active':
          updates.disabled = false;
          if (entry.position === null) {
            updates.position = getNextPosition();
          }
          break;
        case 'staging':
          updates.disabled = false;
          updates.position = null;
          break;
        case 'disabled':
          updates.disabled = true;
          break;
      }
    }

    const updated = updateEntry(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}
```

**Step 3: Create sync endpoint**

Create `src/app/api/edit/entries/sync/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { syncFromDropbox } from '@/lib/entries';

export async function POST() {
  try {
    const result = await syncFromDropbox();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

**Step 4: Create reorder endpoint**

Create `src/app/api/edit/entries/reorder/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { reorderEntries, getActiveEntries } from '@/lib/entries';

export async function PUT(request: NextRequest) {
  try {
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'orderedIds must be an array' },
        { status: 400 }
      );
    }

    reorderEntries(orderedIds);
    const entries = getActiveEntries();

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Reorder failed:', error);
    return NextResponse.json(
      { error: 'Reorder failed' },
      { status: 500 }
    );
  }
}
```

**Step 5: Commit**

```bash
git add src/app/api/edit/entries/
git commit -m "feat: add protected entry management API endpoints"
```

---

### Task 18: Create Narration Upload API

**Files:**
- Create: `src/app/api/edit/narration/[id]/route.ts`

**Step 1: Create narration upload and delete endpoints**

Create `src/app/api/edit/narration/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById } from '@/lib/entries';
import { uploadNarration, deleteNarration } from '@/lib/dropbox';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadNarration(entry.dropbox_path, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Narration upload failed:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    await deleteNarration(entry.dropbox_path);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Narration delete failed:', error);
    return NextResponse.json(
      { error: 'Delete failed' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/edit/narration/
git commit -m "feat: add narration upload and delete endpoints"
```

---

### Task 19: Create Transcription API

**Files:**
- Create: `src/lib/transcription/index.ts`
- Create: `src/app/api/edit/transcribe/[id]/route.ts`

**Step 1: Create transcription service**

Create `src/lib/transcription/index.ts`:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

  const audioBase64 = audioBuffer.toString('base64');

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'audio/webm',
        data: audioBase64,
      },
    },
    {
      text: 'Transcribe this audio. Return only the transcript text, with no timestamps, labels, or additional formatting.',
    },
  ]);

  const response = await result.response;
  return response.text().trim();
}
```

**Step 2: Create transcription endpoint**

Create `src/app/api/edit/transcribe/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEntryById, updateEntry } from '@/lib/entries';
import { getTemporaryLink, getNarrationPath } from '@/lib/dropbox';
import { transcribeAudio } from '@/lib/transcription';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = getEntryById(id);

    if (!entry) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Get the narration audio from Dropbox
    const narrationPath = getNarrationPath(entry.dropbox_path);
    let link: string;

    try {
      link = await getTemporaryLink(narrationPath);
    } catch {
      return NextResponse.json(
        { error: 'No narration found for this entry' },
        { status: 404 }
      );
    }

    // Fetch the audio file
    const audioResponse = await fetch(link);
    if (!audioResponse.ok) {
      throw new Error('Failed to fetch audio file');
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Transcribe
    const transcript = await transcribeAudio(audioBuffer);

    // Save to database
    updateEntry(id, { transcript });

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Transcription failed:', error);
    return NextResponse.json(
      { error: 'Transcription failed' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/lib/transcription/ src/app/api/edit/transcribe/
git commit -m "feat: add transcription with Gemini 2.5 Flash"
```

---

### Task 20: Create Edit Settings API

**Files:**
- Create: `src/app/api/edit/settings/route.ts`

**Step 1: Create settings update endpoint**

Create `src/app/api/edit/settings/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getViewerSettings, updateViewerSettings } from '@/lib/settings';

export async function GET() {
  try {
    const settings = getViewerSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    updateViewerSettings(body);
    const settings = getViewerSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/edit/settings/
git commit -m "feat: add protected settings update endpoint"
```

---

## Phase 7: Viewer Frontend

### Task 21: Create Viewer Types and Hooks

**Files:**
- Create: `src/types/index.ts`
- Create: `src/hooks/useEntries.ts`
- Create: `src/hooks/useViewerSettings.ts`

**Step 1: Create shared types**

Create `src/types/index.ts`:
```typescript
export interface Entry {
  id: string;
  dropbox_path: string;
  title: string | null;
  transcript: string | null;
  position: number | null;
  disabled: number;
  created_at: string;
  updated_at: string;
}

export interface ViewerSettings {
  autoAdvanceDelay: number;
  showTitles: boolean;
}

export type EntryStatus = 'active' | 'staging' | 'disabled';

export function getEntryStatus(entry: Entry): EntryStatus {
  if (entry.disabled) return 'disabled';
  if (entry.position === null) return 'staging';
  return 'active';
}

export function isVideoFile(path: string): boolean {
  const lower = path.toLowerCase();
  return ['.mp4', '.mov', '.webm', '.avi'].some((ext) => lower.endsWith(ext));
}
```

**Step 2: Create entries hook**

Create `src/hooks/useEntries.ts`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Entry } from '@/types';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const res = await fetch('/api/entries');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEntries(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  return { entries, loading, error };
}
```

**Step 3: Create viewer settings hook**

Create `src/hooks/useViewerSettings.ts`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { ViewerSettings } from '@/types';

const DEFAULTS: ViewerSettings = {
  autoAdvanceDelay: 5,
  showTitles: true,
};

export function useViewerSettings() {
  const [settings, setSettings] = useState<ViewerSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings/viewer');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, setSettings, loading };
}
```

**Step 4: Commit**

```bash
git add src/types/ src/hooks/
git commit -m "feat: add shared types and viewer hooks"
```

---

### Task 22: Create Slideshow Component

**Files:**
- Create: `src/components/viewer/Slideshow.tsx`

**Step 1: Create main slideshow component**

Create `src/components/viewer/Slideshow.tsx`:
```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Entry, isVideoFile } from '@/types';
import { MediaDisplay } from './MediaDisplay';
import { NarrationPlayer } from './NarrationPlayer';
import { ViewerControls } from './ViewerControls';

interface SlideshowProps {
  entries: Entry[];
  initialAutoAdvance: number;
  initialShowTitles: boolean;
}

export function Slideshow({
  entries,
  initialAutoAdvance,
  initialShowTitles,
}: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(initialAutoAdvance);
  const [showTitles, setShowTitles] = useState(initialShowTitles);
  const [isNarrationPlaying, setIsNarrationPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimeout = useRef<NodeJS.Timeout>();
  const autoAdvanceTimeout = useRef<NodeJS.Timeout>();

  const currentEntry = entries[currentIndex];
  const isVideo = currentEntry ? isVideoFile(currentEntry.dropbox_path) : false;

  const goToNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % entries.length);
    setIsNarrationPlaying(false);
  }, [entries.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + entries.length) % entries.length);
    setIsNarrationPlaying(false);
  }, [entries.length]);

  const toggleNarration = useCallback(() => {
    setIsNarrationPlaying((p) => !p);
  }, []);

  // Auto-advance logic
  useEffect(() => {
    if (autoAdvanceTimeout.current) {
      clearTimeout(autoAdvanceTimeout.current);
    }

    if (autoAdvanceDelay > 0 && !isNarrationPlaying && !isVideo) {
      autoAdvanceTimeout.current = setTimeout(goToNext, autoAdvanceDelay * 1000);
    }

    return () => {
      if (autoAdvanceTimeout.current) {
        clearTimeout(autoAdvanceTimeout.current);
      }
    };
  }, [currentIndex, autoAdvanceDelay, isNarrationPlaying, isVideo, goToNext]);

  // Hide controls after inactivity
  useEffect(() => {
    function showControls() {
      setControlsVisible(true);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }

    window.addEventListener('mousemove', showControls);
    window.addEventListener('keydown', showControls);

    return () => {
      window.removeEventListener('mousemove', showControls);
      window.removeEventListener('keydown', showControls);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          goToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          goToPrev();
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          toggleNarration();
          break;
        case 'a':
        case 'A':
          setAutoAdvanceDelay((d) => (d === 0 ? 5 : 0));
          break;
        case 't':
        case 'T':
          setShowTitles((s) => !s);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, toggleNarration]);

  if (!currentEntry) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        No entries to display
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden">
      <MediaDisplay
        entry={currentEntry}
        isVideo={isVideo}
        isNarrationPlaying={isNarrationPlaying}
        onClick={toggleNarration}
      />

      {showTitles && isNarrationPlaying && currentEntry.title && (
        <div className="absolute bottom-24 left-0 right-0 text-center">
          <span className="bg-black/70 text-white px-6 py-3 text-2xl rounded">
            {currentEntry.title}
          </span>
        </div>
      )}

      <NarrationPlayer
        entryId={currentEntry.id}
        isPlaying={isNarrationPlaying}
        isVideo={isVideo}
        onEnded={() => {
          setIsNarrationPlaying(false);
          if (autoAdvanceDelay > 0) {
            goToNext();
          }
        }}
      />

      <ViewerControls
        visible={controlsVisible}
        currentIndex={currentIndex}
        totalEntries={entries.length}
        autoAdvanceDelay={autoAdvanceDelay}
        showTitles={showTitles}
        isNarrationPlaying={isNarrationPlaying}
        onPrev={goToPrev}
        onNext={goToNext}
        onToggleNarration={toggleNarration}
        onToggleAutoAdvance={() => setAutoAdvanceDelay((d) => (d === 0 ? 5 : 0))}
        onToggleTitles={() => setShowTitles((s) => !s)}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/viewer/
git commit -m "feat: add main Slideshow component"
```

---

### Task 23: Create Media Display Component

**Files:**
- Create: `src/components/viewer/MediaDisplay.tsx`

**Step 1: Create media display component**

Create `src/components/viewer/MediaDisplay.tsx`:
```typescript
'use client';

import { useRef, useEffect } from 'react';
import { Entry } from '@/types';

interface MediaDisplayProps {
  entry: Entry;
  isVideo: boolean;
  isNarrationPlaying: boolean;
  onClick: () => void;
}

export function MediaDisplay({
  entry,
  isVideo,
  isNarrationPlaying,
  onClick,
}: MediaDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isNarrationPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isNarrationPlaying]);

  const mediaUrl = `/api/media/${entry.id}`;

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={mediaUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={onClick}
        muted // Audio handled separately by NarrationPlayer
        playsInline
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl}
      alt={entry.title || 'Slideshow image'}
      className="w-full h-full object-contain cursor-pointer"
      onClick={onClick}
    />
  );
}
```

**Step 2: Commit**

```bash
git add src/components/viewer/MediaDisplay.tsx
git commit -m "feat: add MediaDisplay component"
```

---

### Task 24: Create Narration Player Component

**Files:**
- Create: `src/components/viewer/NarrationPlayer.tsx`

**Step 1: Create narration player with audio routing**

Create `src/components/viewer/NarrationPlayer.tsx`:
```typescript
'use client';

import { useRef, useEffect, useState } from 'react';

interface NarrationPlayerProps {
  entryId: string;
  isPlaying: boolean;
  isVideo: boolean;
  onEnded: () => void;
}

export function NarrationPlayer({
  entryId,
  isPlaying,
  isVideo,
  onEnded,
}: NarrationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [hasNarration, setHasNarration] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const narrationUrl = `/api/narration/${entryId}`;

  // Check if narration exists
  useEffect(() => {
    setHasNarration(true);
    setCurrentTime(0);
    setDuration(0);
  }, [entryId]);

  // Handle play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasNarration) return;

    if (isPlaying) {
      audio.play().catch(() => setHasNarration(false));
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [isPlaying, hasNarration]);

  // Set up audio routing for video (narration left, video right)
  useEffect(() => {
    if (!isVideo || !isPlaying) return;

    // This is a simplified version - full implementation would require
    // connecting both audio sources through Web Audio API
    // For now, just play narration normally

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isVideo, isPlaying]);

  function handleTimeUpdate() {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }

  function handleLoadedMetadata() {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }

  function handleError() {
    setHasNarration(false);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (!hasNarration) return null;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg px-4 py-2 flex items-center gap-3">
      <audio
        ref={audioRef}
        src={narrationUrl}
        onEnded={onEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />

      <span className="text-white text-sm min-w-[40px]">
        {formatTime(currentTime)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleSeek}
        className="w-48 h-1 bg-gray-600 rounded appearance-none cursor-pointer"
      />

      <span className="text-white text-sm min-w-[40px]">
        {formatTime(duration)}
      </span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/viewer/NarrationPlayer.tsx
git commit -m "feat: add NarrationPlayer component"
```

---

### Task 25: Create Viewer Controls Component

**Files:**
- Create: `src/components/viewer/ViewerControls.tsx`

**Step 1: Create viewer controls overlay**

Create `src/components/viewer/ViewerControls.tsx`:
```typescript
'use client';

interface ViewerControlsProps {
  visible: boolean;
  currentIndex: number;
  totalEntries: number;
  autoAdvanceDelay: number;
  showTitles: boolean;
  isNarrationPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleNarration: () => void;
  onToggleAutoAdvance: () => void;
  onToggleTitles: () => void;
}

export function ViewerControls({
  visible,
  currentIndex,
  totalEntries,
  autoAdvanceDelay,
  showTitles,
  isNarrationPlaying,
  onPrev,
  onNext,
  onToggleNarration,
  onToggleAutoAdvance,
  onToggleTitles,
}: ViewerControlsProps) {
  return (
    <div
      className={`absolute inset-x-0 top-0 p-4 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex justify-between items-center">
        {/* Left: Position indicator */}
        <div className="text-white bg-black/50 px-3 py-1 rounded">
          {currentIndex + 1} / {totalEntries}
        </div>

        {/* Right: Control buttons */}
        <div className="flex gap-2">
          <button
            onClick={onToggleNarration}
            className={`px-3 py-1 rounded text-white ${
              isNarrationPlaying ? 'bg-blue-600' : 'bg-black/50'
            }`}
            title="Space/Enter: Play/pause narration"
          >
            {isNarrationPlaying ? 'Pause' : 'Play'} Narration
          </button>

          <button
            onClick={onToggleAutoAdvance}
            className={`px-3 py-1 rounded text-white ${
              autoAdvanceDelay > 0 ? 'bg-green-600' : 'bg-black/50'
            }`}
            title="A: Toggle auto-advance"
          >
            Auto: {autoAdvanceDelay > 0 ? `${autoAdvanceDelay}s` : 'Off'}
          </button>

          <button
            onClick={onToggleTitles}
            className={`px-3 py-1 rounded text-white ${
              showTitles ? 'bg-purple-600' : 'bg-black/50'
            }`}
            title="T: Toggle titles"
          >
            Titles: {showTitles ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={onPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70"
        title="← Previous"
      >
        ◀
      </button>

      <button
        onClick={onNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 p-3 rounded-full hover:bg-black/70"
        title="→ Next"
      >
        ▶
      </button>
    </div>
  );
}
```

**Step 2: Create components index**

Create `src/components/viewer/index.ts`:
```typescript
export { Slideshow } from './Slideshow';
export { MediaDisplay } from './MediaDisplay';
export { NarrationPlayer } from './NarrationPlayer';
export { ViewerControls } from './ViewerControls';
```

**Step 3: Commit**

```bash
git add src/components/viewer/
git commit -m "feat: add ViewerControls component"
```

---

### Task 26: Create Viewer Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update the main page to show slideshow**

Replace `src/app/page.tsx`:
```typescript
import { Slideshow } from '@/components/viewer';
import { getActiveEntries } from '@/lib/entries';
import { getViewerSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const entries = getActiveEntries();
  const settings = getViewerSettings();

  if (entries.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-4">Memory Lane</h1>
        <p className="text-gray-400">No memories yet. Add some photos to get started!</p>
        <a
          href="/edit"
          className="mt-6 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Go to Editor
        </a>
      </div>
    );
  }

  return (
    <Slideshow
      entries={entries}
      initialAutoAdvance={settings.autoAdvanceDelay}
      initialShowTitles={settings.showTitles}
    />
  );
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add viewer page with slideshow"
```

---

## Phase 8: Editor Frontend

### Task 27: Create Editor Layout

**Files:**
- Create: `src/app/edit/layout.tsx`

**Step 1: Create editor layout with navigation**

Create `src/app/edit/layout.tsx`:
```typescript
import Link from 'next/link';

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/edit" className="text-xl font-bold text-white">
            Memory Lane Editor
          </Link>

          <div className="flex gap-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white"
              target="_blank"
            >
              View Slideshow
            </Link>

            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
              className="text-gray-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
```

Wait, this needs to be a client component for the onClick. Let me fix that:

Create `src/app/edit/layout.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/edit" className="text-xl font-bold text-white">
            Memory Lane Editor
          </Link>

          <div className="flex gap-4">
            <Link
              href="/"
              className="text-gray-300 hover:text-white"
              target="_blank"
            >
              View Slideshow
            </Link>

            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {children}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/edit/layout.tsx
git commit -m "feat: add editor layout with navigation"
```

---

### Task 28: Create Editor Grid Page

**Files:**
- Create: `src/app/edit/page.tsx`
- Create: `src/components/editor/EntryGrid.tsx`

**Step 1: Create entry grid component**

Create `src/components/editor/EntryGrid.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Entry, getEntryStatus, EntryStatus } from '@/types';

interface EntryGridProps {
  initialEntries: Entry[];
}

export function EntryGrid({ initialEntries }: EntryGridProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [filter, setFilter] = useState<EntryStatus | 'all'>('active');
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const filteredEntries = entries.filter((entry) => {
    if (filter === 'all') return true;
    return getEntryStatus(entry) === filter;
  });

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch('/api/edit/entries/sync', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setSyncResult(`Added ${data.added} new entries`);
        // Refresh entries
        const entriesRes = await fetch('/api/edit/entries');
        const entriesData = await entriesRes.json();
        setEntries(entriesData);
      } else {
        setSyncResult('Sync failed');
      }
    } catch {
      setSyncResult('Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <div className="flex gap-2">
          {(['active', 'staging', 'disabled', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-gray-400 text-sm">Size:</label>
          <input
            type="range"
            min={100}
            max={400}
            value={thumbnailSize}
            onChange={(e) => setThumbnailSize(parseInt(e.target.value))}
            className="w-32"
          />
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="ml-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync from Dropbox'}
        </button>

        {syncResult && (
          <span className="text-gray-400">{syncResult}</span>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${thumbnailSize}px, 1fr))`,
        }}
      >
        {filteredEntries.map((entry) => (
          <Link
            key={entry.id}
            href={`/edit/${entry.id}`}
            className="group relative bg-gray-800 rounded overflow-hidden hover:ring-2 hover:ring-blue-500"
            style={{ aspectRatio: '1' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/media/${entry.id}`}
              alt={entry.title || 'Entry thumbnail'}
              className="w-full h-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
              {entry.title && (
                <p className="text-white text-sm truncate">{entry.title}</p>
              )}
              <p className="text-gray-400 text-xs capitalize">
                {getEntryStatus(entry)}
              </p>
            </div>

            {/* Status badge */}
            <div
              className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
                getEntryStatus(entry) === 'active'
                  ? 'bg-green-500'
                  : getEntryStatus(entry) === 'staging'
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
            />
          </Link>
        ))}
      </div>

      {filteredEntries.length === 0 && (
        <p className="text-gray-400 text-center py-8">
          No entries in this category
        </p>
      )}
    </div>
  );
}
```

**Step 2: Create editor page**

Create `src/app/edit/page.tsx`:
```typescript
import { EntryGrid } from '@/components/editor/EntryGrid';
import { getAllEntries } from '@/lib/entries';

export const dynamic = 'force-dynamic';

export default function EditPage() {
  const entries = getAllEntries();

  return <EntryGrid initialEntries={entries} />;
}
```

**Step 3: Commit**

```bash
git add src/app/edit/page.tsx src/components/editor/
git commit -m "feat: add editor grid page"
```

---

### Task 29: Create Single Entry Editor

**Files:**
- Create: `src/app/edit/[id]/page.tsx`
- Create: `src/components/editor/EntryEditor.tsx`

**Step 1: Create entry editor component**

Create `src/components/editor/EntryEditor.tsx`:
```typescript
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Entry, getEntryStatus, isVideoFile } from '@/types';

interface EntryEditorProps {
  entry: Entry;
}

export function EntryEditor({ entry }: EntryEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(entry.title || '');
  const [transcript, setTranscript] = useState(entry.transcript || '');
  const [status, setStatus] = useState(getEntryStatus(entry));
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isVideo = isVideoFile(entry.dropbox_path);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/edit/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, transcript, status }),
      });
      router.push('/edit');
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadNarration(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function uploadNarration(audioBlob: Blob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'narration.webm');

    try {
      await fetch(`/api/edit/narration/${entry.id}`, {
        method: 'POST',
        body: formData,
      });

      // Trigger transcription
      await triggerTranscription();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }

  async function triggerTranscription() {
    setTranscribing(true);
    try {
      const res = await fetch(`/api/edit/transcribe/${entry.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setTranscribing(false);
    }
  }

  async function deleteNarration() {
    if (!confirm('Delete narration?')) return;

    try {
      await fetch(`/api/edit/narration/${entry.id}`, {
        method: 'DELETE',
      });
      setTranscript('');
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex gap-6">
        {/* Media preview */}
        <div className="flex-1">
          {isVideo ? (
            <video
              src={`/api/media/${entry.id}`}
              className="w-full rounded"
              controls
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${entry.id}`}
              alt={entry.title || 'Entry'}
              className="w-full rounded"
            />
          )}
        </div>

        {/* Editor form */}
        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="active">Active (in slideshow)</option>
              <option value="staging">Staging (not in slideshow)</option>
              <option value="disabled">Disabled (hidden)</option>
            </select>
          </div>

          {/* Narration section */}
          <div className="border-t border-gray-700 pt-4">
            <label className="block text-gray-300 mb-2">Narration</label>

            <div className="flex gap-2 mb-3">
              {recording ? (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Stop Recording
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Record Narration
                </button>
              )}

              <button
                onClick={deleteNarration}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Delete
              </button>

              <button
                onClick={triggerTranscription}
                disabled={transcribing}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                {transcribing ? 'Transcribing...' : 'Retry Transcription'}
              </button>
            </div>

            {/* Existing narration playback */}
            <audio
              src={`/api/narration/${entry.id}`}
              controls
              className="w-full mb-3"
            />

            {/* Transcript */}
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcript will appear here after recording..."
              className="w-full h-32 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={() => router.push('/edit')}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create entry editor page**

Create `src/app/edit/[id]/page.tsx`:
```typescript
import { notFound } from 'next/navigation';
import { EntryEditor } from '@/components/editor/EntryEditor';
import { getEntryById } from '@/lib/entries';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EntryEditorPage({ params }: PageProps) {
  const { id } = await params;
  const entry = getEntryById(id);

  if (!entry) {
    notFound();
  }

  return <EntryEditor entry={entry} />;
}
```

**Step 3: Create editor components index**

Create `src/components/editor/index.ts`:
```typescript
export { EntryGrid } from './EntryGrid';
export { EntryEditor } from './EntryEditor';
```

**Step 4: Commit**

```bash
git add src/app/edit/[id]/ src/components/editor/
git commit -m "feat: add single entry editor page"
```

---

## Phase 9: Cleanup and Polish

### Task 30: Update Global Styles

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Simplify global styles**

Replace `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-900 text-white;
}

/* Custom range input styling */
input[type='range'] {
  @apply h-2 rounded-lg appearance-none cursor-pointer bg-gray-600;
}

input[type='range']::-webkit-slider-thumb {
  @apply appearance-none w-4 h-4 rounded-full bg-blue-500;
}

/* Audio player styling */
audio {
  @apply w-full;
}

audio::-webkit-media-controls-panel {
  @apply bg-gray-700;
}
```

**Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "style: update global styles"
```

---

### Task 31: Create Setup Script

**Files:**
- Create: `scripts/setup.ts`
- Update: `package.json`

**Step 1: Create setup script for generating auth credentials**

Create `scripts/setup.ts`:
```typescript
import * as OTPAuth from 'otpauth';
import bcrypt from 'bcryptjs';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n=== Memory Lane Setup ===\n');

  // Password
  const password = await question('Enter password for editor access: ');
  const passwordHash = bcrypt.hashSync(password, 10);

  // TOTP
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'MemoryLane',
    label: 'Admin',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });

  // Session secret
  const sessionSecret = Array.from({ length: 32 }, () =>
    Math.random().toString(36).charAt(2)
  ).join('');

  console.log('\n=== Add these to your .env.local ===\n');
  console.log(`AUTH_PASSWORD_HASH=${passwordHash}`);
  console.log(`TOTP_SECRET=${secret.base32}`);
  console.log(`SESSION_SECRET=${sessionSecret}`);

  console.log('\n=== TOTP Setup ===\n');
  console.log('Scan this URI with your authenticator app:');
  console.log(totp.toString());
  console.log('\nOr manually enter this secret:', secret.base32);

  rl.close();
}

main();
```

**Step 2: Add script to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "setup": "npx tsx scripts/setup.ts"
  }
}
```

**Step 3: Commit**

```bash
git add scripts/ package.json
git commit -m "feat: add setup script for auth credentials"
```

---

### Task 32: Create Dockerfile

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Step 1: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/src/lib/db/schema.sql ./src/lib/db/schema.sql

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Step 2: Create .dockerignore**

Create `.dockerignore`:
```
.git
.gitignore
node_modules
.next
.env*.local
data/
*.md
```

**Step 3: Update next.config.js for standalone output**

Update `next.config.js` (or create if using .ts):
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
};

module.exports = nextConfig;
```

**Step 4: Commit**

```bash
git add Dockerfile .dockerignore next.config.js
git commit -m "feat: add Docker configuration for Fly.io deployment"
```

---

### Task 33: Create Fly.io Configuration

**Files:**
- Create: `fly.toml`

**Step 1: Create Fly.io config**

Create `fly.toml`:
```toml
app = "memory-lane"
primary_region = "sjc"

[build]

[env]
  DATABASE_PATH = "/app/data/memory-lane.db"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[mounts]
  source = "data"
  destination = "/app/data"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1
```

**Step 2: Commit**

```bash
git add fly.toml
git commit -m "feat: add Fly.io configuration"
```

---

### Task 34: Test Local Development

**Step 1: Set up test environment variables**

Run the setup script:
```bash
npm run setup
```

Copy the output to `.env.local` and add Dropbox + Gemini keys (from their respective consoles).

**Step 2: Run development server**

```bash
npm run dev
```

**Step 3: Test the following flows:**

1. Visit http://localhost:3000 - should show empty state
2. Visit http://localhost:3000/login - should show login form
3. Login with credentials
4. Click "Sync from Dropbox" (after configuring Dropbox)
5. Test viewing and editing entries

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during testing"
```

---

### Task 35: Deploy to Fly.io

**Step 1: Install Fly CLI and login**

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

**Step 2: Create the app and volume**

```bash
fly apps create memory-lane
fly volumes create data --region sjc --size 1
```

**Step 3: Set secrets**

```bash
fly secrets set AUTH_PASSWORD_HASH="<your-hash>"
fly secrets set TOTP_SECRET="<your-secret>"
fly secrets set SESSION_SECRET="<your-session-secret>"
fly secrets set DROPBOX_APP_KEY="<your-key>"
fly secrets set DROPBOX_APP_SECRET="<your-secret>"
fly secrets set DROPBOX_REFRESH_TOKEN="<your-token>"
fly secrets set GEMINI_API_KEY="<your-key>"
```

**Step 4: Deploy**

```bash
fly deploy
```

**Step 5: Verify deployment**

```bash
fly open
```

---

## Summary

This plan covers:

1. **Project setup** (Tasks 1-4): Next.js, dependencies, env vars, database
2. **Authentication** (Tasks 5-9): Password + TOTP login system
3. **Dropbox integration** (Tasks 10-11): Client setup and file operations
4. **Entry management** (Tasks 12-13): Database CRUD and sync
5. **Public API** (Tasks 14-16): Entries, media proxy, settings
6. **Protected API** (Tasks 17-20): Edit entries, narration, transcription
7. **Viewer frontend** (Tasks 21-26): Slideshow with controls
8. **Editor frontend** (Tasks 27-29): Grid and single entry editor
9. **Polish & Deploy** (Tasks 30-35): Styles, Docker, Fly.io

Total: ~35 tasks, each 2-5 minutes of focused work.
