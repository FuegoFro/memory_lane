# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run dev          # Start development server at http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npx vitest run src/lib/auth  # Run tests for a specific module
```

## Architecture

Memory Lane is a photo/video slideshow app with narration support, built with Next.js 16 (App Router) and SQLite.

### Core Layers

**Pages** (`src/app/`):
- `/` - Public slideshow viewer
- `/login` - Password + TOTP authentication
- `/edit` - Protected entry editor (grid with drag-and-drop)
- `/edit/[id]` - Individual entry editing

**API Routes** (`src/app/api/`):
- `/api/entries/` - Public endpoints for slideshow data
- `/api/edit/` - Protected endpoints requiring authentication
- `/api/media/`, `/api/narration/` - Media streaming

**Business Logic** (`src/lib/`):
- `auth/` - Password (bcrypt), TOTP, JWT sessions (jose)
- `db/` - SQLite singleton with better-sqlite3, WAL mode
- `dropbox/` - OAuth token refresh, file operations
- `entries/` - Repository pattern, sync with Dropbox
- `settings/` - Viewer preferences
- `transcription/` - Google Gemini API integration

### Entry Status Model

Entries have three statuses determined by `disabled` and `position` fields:
- **Active**: `disabled=0` AND `position!=NULL` (shown in slideshow, ordered by position)
- **Staging**: `disabled=0` AND `position=NULL` (new entries awaiting placement)
- **Disabled**: `disabled=1` (hidden from slideshow)

Use `getEntryStatus()` from `src/types/index.ts` to derive status.

### Authentication Flow

1. User submits password + TOTP at `/login`
2. Server validates and creates JWT session cookie
3. Middleware (`src/middleware.ts`) protects `/edit` and `/api/edit/*` routes
4. Sessions verified with jose JWT library

**Dev-only login bypass:** `POST /api/auth/dev-login` creates an authenticated session without credentials. Only works when `NODE_ENV !== 'production'`. Use this for automated/agent testing against a local dev server.

### Testing Notes

Tests run serially (not parallel) due to SQLite singleton. Test files are in `__tests__/` directories adjacent to source files.

## Key Files

- `src/middleware.ts` - Route protection logic
- `src/lib/db/schema.sql` - Database schema
- `src/lib/entries/repository.ts` - Entry CRUD operations
- `src/lib/dropbox/client.ts` - Dropbox API client with token refresh
