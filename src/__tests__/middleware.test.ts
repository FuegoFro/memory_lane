import { describe, it, expect, beforeAll } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'

// Mock environment variable
beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-for-vitest-minimum-length'
})

// Helper to create a valid JWT token for testing
async function createValidToken(): Promise<string> {
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
  return new jose.SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret)
}

// Helper to create a NextRequest with optional cookies
function createRequest(
  pathname: string,
  options?: { sessionToken?: string }
): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000')
  const request = new NextRequest(url)

  if (options?.sessionToken) {
    // Create a new request with the cookie set
    const headers = new Headers()
    headers.set('cookie', `session=${options.sessionToken}`)
    return new NextRequest(url, { headers })
  }

  return request
}

describe('middleware', () => {
  let middleware: (request: NextRequest) => Promise<NextResponse>

  beforeAll(async () => {
    // Dynamically import to ensure env is set
    const middlewareModule = await import('../middleware')
    middleware = middlewareModule.middleware
  })

  describe('unprotected paths', () => {
    it('should allow requests to the home page', async () => {
      const request = createRequest('/')
      const response = await middleware(request)

      // NextResponse.next() doesn't set a specific status for "pass through"
      // We check that it's not a redirect and not a JSON error response
      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('should allow requests to /login', async () => {
      const request = createRequest('/login')
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('should allow requests to /api/auth/login', async () => {
      const request = createRequest('/api/auth/login')
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('should allow requests to static files', async () => {
      const request = createRequest('/images/photo.jpg')
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  })

  describe('protected page paths without session', () => {
    it('should redirect /edit to /login when no session', async () => {
      const request = createRequest('/edit')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    })

    it('should redirect /edit/123 to /login when no session', async () => {
      const request = createRequest('/edit/123')
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    })
  })

  describe('protected API paths without session', () => {
    it('should return 401 for /api/edit when no session', async () => {
      const request = createRequest('/api/edit')
      const response = await middleware(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('should return 401 for /api/edit/photos when no session', async () => {
      const request = createRequest('/api/edit/photos')
      const response = await middleware(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('protected paths with valid session', () => {
    it('should allow /edit with valid session', async () => {
      const token = await createValidToken()
      const request = createRequest('/edit', { sessionToken: token })
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('should allow /edit/123 with valid session', async () => {
      const token = await createValidToken()
      const request = createRequest('/edit/123', { sessionToken: token })
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('should allow /api/edit with valid session', async () => {
      const token = await createValidToken()
      const request = createRequest('/api/edit', { sessionToken: token })
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })

    it('should allow /api/edit/photos with valid session', async () => {
      const token = await createValidToken()
      const request = createRequest('/api/edit/photos', { sessionToken: token })
      const response = await middleware(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
    })
  })

  describe('protected paths with invalid session', () => {
    it('should redirect /edit to /login with invalid session', async () => {
      const request = createRequest('/edit', { sessionToken: 'invalid.token.here' })
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    })

    it('should return 401 for /api/edit with invalid session', async () => {
      const request = createRequest('/api/edit', { sessionToken: 'invalid.token.here' })
      const response = await middleware(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })

    it('should redirect /edit to /login with tampered session', async () => {
      const token = await createValidToken()
      const tamperedToken = token.slice(0, -5) + 'XXXXX'
      const request = createRequest('/edit', { sessionToken: tamperedToken })
      const response = await middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/login')
    })

    it('should return 401 for /api/edit with tampered session', async () => {
      const token = await createValidToken()
      const tamperedToken = token.slice(0, -5) + 'XXXXX'
      const request = createRequest('/api/edit', { sessionToken: tamperedToken })
      const response = await middleware(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body).toEqual({ error: 'Unauthorized' })
    })
  })
})
