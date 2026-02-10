# Memory Lane - Design Document

A photo/video slideshow with optional narration for sharing memories with friends and family.

## Overview

Memory Lane is a web application for creating narrated slideshows. Media is stored in Dropbox, and the app provides both a public viewing experience and an authenticated editing interface for curating content and recording narrations.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js App                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Viewer        │  │   Editor (auth required)     │  │
│  │   /             │  │   /edit                      │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│                            │                            │
│                     API Routes                          │
│              /api/entries, /api/auth, etc.             │
└─────────────────────────────────────────────────────────┘
              │                           │
              ▼                           ▼
        ┌──────────┐              ┌──────────────┐
        │  SQLite  │              │   Dropbox    │
        │ metadata │              │  media files │
        └──────────┘              └──────────────┘
```

- **SQLite** stores entry order, titles, transcript text, and Dropbox file references
- **Dropbox** stores original media files (photos/videos) and narration audio files
- The app never copies media to its own storage - it proxies or uses Dropbox direct links

## Data Model

```sql
-- Each media file from Dropbox
entries (
  id              TEXT PRIMARY KEY,  -- UUID
  dropbox_path    TEXT NOT NULL,     -- "/photo.jpg"
  title           TEXT,              -- Optional display title
  transcript      TEXT,              -- Generated from narration audio
  position        INTEGER,           -- Order in slideshow (NULL = not in slideshow)
  disabled        BOOLEAN DEFAULT 0, -- Hidden from both staging and slideshow
  created_at      TIMESTAMP,
  updated_at      TIMESTAMP
)

-- App settings
settings (
  key    TEXT PRIMARY KEY,
  value  TEXT
)
```

**Entry states:**
- `position = NULL, disabled = 0` → Staging (new/unplaced)
- `position = N, disabled = 0` → Active in slideshow at position N
- `disabled = 1` → Hidden/archived (position ignored)

Narration audio path is derived: `dropbox_path` → `dropbox_path + ".narration.webm"`

## Dropbox Integration

**Authentication:** OAuth 2.0 with a long-lived refresh token stored as an environment variable.

**Folder structure:**
```
<DROPBOX_FOLDER>/
  ├── beach-2024.jpg
  ├── beach-2024.jpg.narration.webm
  ├── birthday-video.mp4
  ├── birthday-video.mp4.narration.webm
  └── sunset.jpg
```

**Sync behavior:**
- Manual "Sync from Dropbox" button in editor
- New files added to staging (position = NULL)
- Deleted files cleaned up from database
- No continuous background sync

**Operations:**
- Read: Fetch media via Dropbox temporary links (cached, refreshed as needed)
- Write: Upload narration audio to `{original_path}.narration.webm`

## Viewing Experience

**Route:** `/` (public, no auth required)

**Layout:**
- Full-screen media display (photo or video)
- Minimal overlay controls that fade when idle
- Title appears over media when narration is playing (toggleable)

**Controls:**

| Action | Keyboard | Mouse |
|--------|----------|-------|
| Play/pause narration | Space or Enter | Click on media |
| Next entry | → or ↓ | Next button |
| Previous entry | ← or ↑ | Prev button |
| Toggle auto-advance | A | Button |
| Toggle titles | T | Button |

**Auto-advance:**
- Can be disabled or set to a configurable delay
- Pauses when narration starts, resumes after narration ends
- Waits for videos longer than the delay to finish

**Narration playback:**
- Full audio controls (play/pause, scrub, time display)
- For videos: narration on left channel, video audio on right channel

## Editing Experience

**Routes:** `/edit` and `/edit/[id]` (auth required)

**Grid view (`/edit`):**
- Row-major grid of thumbnails with adjustable size
- Three filters: Slideshow / Staging / Disabled
- Drag-and-drop to reorder slideshow entries
- Click thumbnail to open single-entry editor
- "Sync from Dropbox" button

**Single entry editor (`/edit/[id]`):**
- Large media preview
- Title text field
- Narration section:
  - Record button (browser audio recording)
  - Recording auto-stops at video duration for video entries
  - Playback controls for existing narration
  - Delete narration option
  - Auto-generated transcript display
- Status toggle: Active / Staging / Disabled

**Recording flow:**
1. Click Record, browser requests mic permission
2. Audio recorded as WebM (Opus codec)
3. On stop: upload to Dropbox, send to Gemini for transcription
4. Transcript saved to database and displayed

## Authentication

**Protected routes:** `/edit/*` and write API endpoints

**Login flow:**
1. Visit `/edit` → redirect to `/login`
2. Enter password + 6-digit TOTP code
3. Receive HTTP-only session cookie
4. Session valid for 30 days

**Implementation:**
- Password and TOTP secret in environment variables
- Password hashed with bcrypt
- TOTP verified using standard RFC 6238
- Session token is signed JWT in cookie

## Video + Narration Audio Mixing

Using Web Audio API to route narration to left channel and video audio to right:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Narration   │────▶│ ChannelMerger│────▶│   Output    │
│ (mono→left) │     │              │     │  (stereo)   │
├─────────────┤     │              │     └─────────────┘
│ Video audio │────▶│              │
│ (mono→right)│     └──────────────┘
└─────────────┘
```

- Narration and video start together when user triggers playback
- Video plays muted via HTML, audio routed through Web Audio API
- Fallback: if Web Audio fails, play narration normally and mute video

## Transcription

**Service:** Google Gemini 2.5 Flash (free tier)

**Flow:**
1. After recording narration, upload to Dropbox
2. Send audio to Gemini with transcription prompt
3. Save transcript to database
4. Display in editor UI

**Error handling:**
- Show "Transcription failed" on errors
- Manual transcript editing available
- "Retry transcription" button

## API Routes

**Public:**
```
GET  /api/entries              - List active slideshow entries (ordered)
GET  /api/entries/[id]         - Single entry metadata
GET  /api/media/[id]           - Proxy to Dropbox media
GET  /api/narration/[id]       - Proxy to Dropbox narration audio
GET  /api/settings/viewer      - Auto-advance delay, etc.
```

**Protected:**
```
POST /api/auth/login           - Password + TOTP → session cookie
POST /api/auth/logout          - Clear session

GET  /api/edit/entries         - All entries (including staging/disabled)
POST /api/edit/entries/sync    - Scan Dropbox, add new files to staging
PUT  /api/edit/entries/[id]    - Update title, position, disabled status
PUT  /api/edit/entries/reorder - Bulk update positions

POST /api/edit/narration/[id]  - Upload narration audio → Dropbox
DELETE /api/edit/narration/[id] - Delete narration from Dropbox

POST /api/edit/transcribe/[id] - Trigger Gemini transcription
PUT  /api/edit/settings        - Update app settings
```

## Deployment

**Platform:** Fly.io
- Single app instance
- SQLite on Fly volume (persistent storage)
- Node.js runtime via Next.js Dockerfile

**Environment variables:**
```
# Auth
AUTH_PASSWORD_HASH=<bcrypt hash>
TOTP_SECRET=<base32 secret>
SESSION_SECRET=<random string for JWT signing>

# Dropbox
DROPBOX_REFRESH_TOKEN=<long-lived token>
DROPBOX_APP_KEY=<from Dropbox app console>
DROPBOX_APP_SECRET=<from Dropbox app console>
DROPBOX_FOLDER=

# Gemini
GEMINI_API_KEY=<from Google AI Studio>
```

**Initial setup:**
1. Create Dropbox app (scoped to a folder)
2. OAuth flow to get refresh token
3. Create Gemini API key
4. Generate TOTP secret, add to authenticator app
5. Hash password with bcrypt
6. Deploy to Fly.io with env vars

**Backup:**
- Media/narrations: Already in Dropbox
- SQLite: Periodic copy to Dropbox or manual download

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Framework | Next.js |
| Database | SQLite |
| Hosting | Fly.io |
| Media Storage | Dropbox |
| Transcription | Google Gemini 2.5 Flash |
| Auth | Password + TOTP |
| Audio Mixing | Web Audio API |
