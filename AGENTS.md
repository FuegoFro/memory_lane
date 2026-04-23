# AGENTS.md

This file provides cross-platform instructions for AI agents (Claude Code, Gemini CLI, etc.) working in this repository.

## Engineering Standards

### TDD (Test-Driven Development)
We use Red/Green TDD for everything.
1. Write a failing test that reproduces the bug or defines the new feature.
2. Run the test to confirm it fails.
3. Write the minimal implementation to make the test pass.
4. Run the test to confirm it passes.
5. Refactor and verify.

### Superpowers Skills
We use the Superpowers skill set for disciplined workflows.
- **ALWAYS** invoke a skill if it might apply (e.g., `brainstorming`, `writing-plans`, `systematic-debugging`).
- Follow skill instructions strictly; they represent expert procedural guidance.

### Subagent-Driven Development
For complex tasks or implementation plans, we prioritize `subagent-driven-development`.
- Use a fresh subagent for each task.
- Review work between tasks.
- Keep the main session history lean.

### Isolated Workspaces
Use `using-git-worktrees` for all feature work.
- Never work directly in the main branch.
- Ensure worktrees are ignored by git (check `.gitignore`).

## Build and Development Commands

```bash
npm run dev          # Start development server at http://localhost:3000
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run tests once (CI mode)
npm run test:watch   # Run tests in watch mode
npm run test:run     # Alias for npm test
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

**Dev-only login bypass**: `POST /api/auth/dev-login` creates an authenticated session without credentials. Only works when `NODE_ENV !== 'production'`. Use this for automated/agent testing against a local dev server.

### Testing Notes

Tests run serially (not parallel) due to SQLite singleton. Test files are in `__tests__/` directories adjacent to source files.

## Key Files

- `src/middleware.ts` - Route protection logic
- `src/lib/db/schema.sql` - Database schema
- `src/lib/entries/repository.ts` - Entry CRUD operations
- `src/lib/dropbox/client.ts` - Dropbox API client with token refresh

