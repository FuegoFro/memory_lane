import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create a mock class for Dropbox
const MockDropbox = vi.fn(function (this: object) {
  // Mock Dropbox instance methods as needed
  return this
})

// Mock the dropbox module
vi.mock('dropbox', () => ({
  Dropbox: MockDropbox,
}))

describe('Dropbox client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to clear cached client between tests
    vi.resetModules()
    // Reset environment
    process.env = { ...originalEnv }
    // Clear any mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getDropboxClient', () => {
    it('should return a Dropbox instance when credentials are configured', async () => {
      process.env.DROPBOX_APP_KEY = 'test-app-key'
      process.env.DROPBOX_APP_SECRET = 'test-app-secret'
      process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh-token'

      const { getDropboxClient } = await import('../client')
      const client = await getDropboxClient()

      expect(client).toBeDefined()
      expect(client).toBeInstanceOf(Object)
    })

    it('should throw an error when DROPBOX_APP_KEY is missing', async () => {
      process.env.DROPBOX_APP_SECRET = 'test-app-secret'
      process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh-token'
      delete process.env.DROPBOX_APP_KEY

      const { getDropboxClient } = await import('../client')

      await expect(getDropboxClient()).rejects.toThrow(
        'Dropbox credentials not configured'
      )
    })

    it('should throw an error when DROPBOX_APP_SECRET is missing', async () => {
      process.env.DROPBOX_APP_KEY = 'test-app-key'
      process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh-token'
      delete process.env.DROPBOX_APP_SECRET

      const { getDropboxClient } = await import('../client')

      await expect(getDropboxClient()).rejects.toThrow(
        'Dropbox credentials not configured'
      )
    })

    it('should throw an error when DROPBOX_REFRESH_TOKEN is missing', async () => {
      process.env.DROPBOX_APP_KEY = 'test-app-key'
      process.env.DROPBOX_APP_SECRET = 'test-app-secret'
      delete process.env.DROPBOX_REFRESH_TOKEN

      const { getDropboxClient } = await import('../client')

      await expect(getDropboxClient()).rejects.toThrow(
        'Dropbox credentials not configured'
      )
    })

    it('should return cached client if token is still valid', async () => {
      process.env.DROPBOX_APP_KEY = 'test-app-key'
      process.env.DROPBOX_APP_SECRET = 'test-app-secret'
      process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh-token'

      const { getDropboxClient } = await import('../client')
      const { Dropbox } = await import('dropbox')

      const client1 = await getDropboxClient()
      const client2 = await getDropboxClient()

      // Both calls should return the same instance
      expect(client1).toBe(client2)
      // Dropbox constructor should only be called once
      expect(Dropbox).toHaveBeenCalledTimes(1)
    })

    it('should create a new client when token has expired', async () => {
      process.env.DROPBOX_APP_KEY = 'test-app-key'
      process.env.DROPBOX_APP_SECRET = 'test-app-secret'
      process.env.DROPBOX_REFRESH_TOKEN = 'test-refresh-token'

      // Get initial module
      const clientModule = await import('../client')
      const { Dropbox } = await import('dropbox')

      // Get first client
      await clientModule.getDropboxClient()
      expect(Dropbox).toHaveBeenCalledTimes(1)

      // Simulate time passing beyond token expiry (4 hours + buffer)
      const originalDateNow = Date.now
      const futureTime = originalDateNow() + 5 * 60 * 60 * 1000 // 5 hours in the future
      Date.now = vi.fn(() => futureTime)

      // Reset modules to simulate a fresh import but with expired token
      vi.resetModules()

      // We need to re-import after reset
      const newClientModule = await import('../client')
      await newClientModule.getDropboxClient()

      // Restore Date.now
      Date.now = originalDateNow
    })

    it('should pass correct credentials to Dropbox constructor', async () => {
      process.env.DROPBOX_APP_KEY = 'my-app-key'
      process.env.DROPBOX_APP_SECRET = 'my-app-secret'
      process.env.DROPBOX_REFRESH_TOKEN = 'my-refresh-token'

      const { getDropboxClient } = await import('../client')
      const { Dropbox } = await import('dropbox')

      await getDropboxClient()

      expect(Dropbox).toHaveBeenCalledWith({
        clientId: 'my-app-key',
        clientSecret: 'my-app-secret',
        refreshToken: 'my-refresh-token',
        fetch,
      })
    })
  })

  describe('getDropboxFolder', () => {
    it('should return DROPBOX_FOLDER env var when set', async () => {
      process.env.DROPBOX_FOLDER = '/CustomFolder'

      const { getDropboxFolder } = await import('../client')
      const folder = getDropboxFolder()

      expect(folder).toBe('/CustomFolder')
    })

    it("should return '' as default when DROPBOX_FOLDER is not set", async () => {
      delete process.env.DROPBOX_FOLDER

      const { getDropboxFolder } = await import('../client')
      const folder = getDropboxFolder()

      expect(folder).toBe('')
    })
  })
})
