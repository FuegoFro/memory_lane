import { Dropbox } from 'dropbox'

let cachedClient: Dropbox | null = null
let tokenExpiry: number = 0

export async function getDropboxClient(): Promise<Dropbox> {
  const now = Date.now()

  // Return cached client if token is still valid (with 5 min buffer)
  if (cachedClient && tokenExpiry > now + 5 * 60 * 1000) {
    return cachedClient
  }

  const appKey = process.env.DROPBOX_APP_KEY
  const appSecret = process.env.DROPBOX_APP_SECRET
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN

  if (!appKey || !appSecret || !refreshToken) {
    throw new Error('Dropbox credentials not configured')
  }

  // Dropbox SDK expects a fetch implementation. 
  // In Node/Next.js, it might expect a .buffer() method on the response if it detects Node.
  const dropboxFetch = async (url: any, init: any) => {
    const res = await fetch(url, init);
    if (!res.buffer && res.arrayBuffer) {
      (res as any).buffer = async () => Buffer.from(await res.arrayBuffer());
    }
    return res;
  };

  // Create client that will auto-refresh
  const client = new Dropbox({
    clientId: appKey,
    clientSecret: appSecret,
    refreshToken,
    fetch: dropboxFetch as any,
  })

  cachedClient = client
  // Dropbox access tokens are valid for 4 hours
  tokenExpiry = now + 4 * 60 * 60 * 1000

  return client
}

export function getDropboxFolder(): string {
  return process.env.DROPBOX_FOLDER || ''
}
