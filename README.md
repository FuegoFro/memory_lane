# Memory Lane

A photo and video slideshow application with narration support. View your memories with optional audio narration, titles, and auto-advance features. Includes an editor for reordering entries and recording narrations.

## Features

- **Slideshow viewer** with auto-advance or manual navigation
- **Narration playback** with full controls (play/pause/scrub)
- **Video support** with split audio channels (narration on left, video audio on right)
- **Editor interface** for managing entries, reordering, and recording narrations
- **Auto-transcription** of narrations using Google Gemini
- **Dropbox integration** for media storage
- **Password + TOTP authentication** for the editor

## Getting Started

### Prerequisites

- Node.js 20+
- A Dropbox account
- A Google Cloud account (for Gemini API)
- An authenticator app (Google Authenticator, Authy, etc.)

### Installation

```bash
npm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Then configure each section as described below.

## Environment Variables

### Authentication

Run the setup script to generate authentication credentials:

```bash
npm run setup
```

This interactive script will:
1. Prompt you for a password for editor access
2. Generate a TOTP secret and display a QR code URI for your authenticator app
3. Generate a random session secret

The script outputs three values to add to your `.env.local`:

| Variable | Description |
|----------|-------------|
| `AUTH_PASSWORD_HASH` | bcrypt hash of your editor password |
| `TOTP_SECRET` | Base32-encoded secret for TOTP (add to your authenticator app) |
| `SESSION_SECRET` | Random string for signing session cookies |

### Dropbox

Memory Lane uses Dropbox for storing media files and narrations.

1. **Create a Dropbox App**
   - Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
   - Click "Create app"
   - Choose "Scoped access"
   - Choose "Full Dropbox" or "App folder" access
   - Name your app (e.g., "MemoryLane")

2. **Configure Permissions**
   - In your app settings, go to the "Permissions" tab
   - Enable: `files.metadata.read`, `files.content.read`, `files.content.write`
   - Click "Submit"

3. **Get App Credentials**
   - In the "Settings" tab, find your App key and App secret

4. **Generate a Refresh Token**
   - Visit the OAuth 2 authorization URL (replace `YOUR_APP_KEY`):
     ```
     https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&response_type=code&token_access_type=offline
     ```
   - Authorize the app and copy the authorization code
   - Exchange the code for a refresh token:
     ```bash
     curl -X POST https://api.dropboxapi.com/oauth2/token \
       -d code=YOUR_AUTH_CODE \
       -d grant_type=authorization_code \
       -d client_id=YOUR_APP_KEY \
       -d client_secret=YOUR_APP_SECRET
     ```
   - Copy the `refresh_token` from the response

| Variable | Description |
|----------|-------------|
| `DROPBOX_APP_KEY` | Your Dropbox app key |
| `DROPBOX_APP_SECRET` | Your Dropbox app secret |
| `DROPBOX_REFRESH_TOKEN` | OAuth refresh token (long-lived) |
| `DROPBOX_FOLDER` | Folder path for media files (default: root) |

### Gemini API

Used for automatic transcription of narrations.

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy the generated key

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |

### Application

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Base URL of your app (e.g., `http://localhost:3000` for dev) |

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the slideshow.

## Testing

```bash
npm test        # Watch mode
npm run test:run # Single run
```

## Deployment

The app includes Docker and Fly.io configuration for deployment. See `fly.toml` and `Dockerfile` for details.

## License

Private project.
