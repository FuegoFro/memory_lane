import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the auth utilities before importing the route
vi.mock('@/lib/auth', () => ({
  verifyPassword: vi.fn(),
  verifyTOTP: vi.fn(),
  createSession: vi.fn(),
  setSessionCookie: vi.fn(),
}))

import { POST } from '../route'
import {
  verifyPassword,
  verifyTOTP,
  createSession,
  setSessionCookie,
} from '@/lib/auth'

const mockVerifyPassword = vi.mocked(verifyPassword)
const mockVerifyTOTP = vi.mocked(verifyTOTP)
const mockCreateSession = vi.mocked(createSession)
const mockSetSessionCookie = vi.mocked(setSessionCookie)

function createMockRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('POST /api/auth/login', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = {
      ...originalEnv,
      AUTH_PASSWORD_HASH: 'test-hash',
      TOTP_SECRET: 'test-secret',
      SESSION_SECRET: 'test-session-secret-minimum-length',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('validation', () => {
    it('returns 400 when password is missing', async () => {
      const request = createMockRequest({ totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Password and TOTP code required')
    })

    it('returns 400 when totp is missing', async () => {
      const request = createMockRequest({ password: 'secret' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Password and TOTP code required')
    })

    it('returns 400 when both password and totp are missing', async () => {
      const request = createMockRequest({})

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toBe('Password and TOTP code required')
    })
  })

  describe('server configuration', () => {
    it('returns 500 when AUTH_PASSWORD_HASH is not configured', async () => {
      delete process.env.AUTH_PASSWORD_HASH
      const request = createMockRequest({ password: 'secret', totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Server configuration error')
    })

    it('returns 500 when TOTP_SECRET is not configured', async () => {
      delete process.env.TOTP_SECRET
      const request = createMockRequest({ password: 'secret', totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Server configuration error')
    })
  })

  describe('authentication', () => {
    it('returns 401 when password is invalid', async () => {
      mockVerifyPassword.mockReturnValue(false)
      mockVerifyTOTP.mockReturnValue(true)

      const request = createMockRequest({ password: 'wrong', totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Invalid credentials')
      expect(mockVerifyPassword).toHaveBeenCalledWith('wrong', 'test-hash')
    })

    it('returns 401 when TOTP is invalid', async () => {
      mockVerifyPassword.mockReturnValue(true)
      mockVerifyTOTP.mockReturnValue(false)

      const request = createMockRequest({ password: 'correct', totp: '000000' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Invalid credentials')
      expect(mockVerifyTOTP).toHaveBeenCalledWith('000000', 'test-secret')
    })

    it('returns 401 when both password and TOTP are invalid', async () => {
      mockVerifyPassword.mockReturnValue(false)
      mockVerifyTOTP.mockReturnValue(false)

      const request = createMockRequest({ password: 'wrong', totp: '000000' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.error).toBe('Invalid credentials')
    })
  })

  describe('successful login', () => {
    it('returns 200 with success true when credentials are valid', async () => {
      mockVerifyPassword.mockReturnValue(true)
      mockVerifyTOTP.mockReturnValue(true)
      mockCreateSession.mockResolvedValue('test-token')
      mockSetSessionCookie.mockResolvedValue(undefined)

      const request = createMockRequest({ password: 'correct', totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('creates a session and sets a cookie on successful login', async () => {
      mockVerifyPassword.mockReturnValue(true)
      mockVerifyTOTP.mockReturnValue(true)
      mockCreateSession.mockResolvedValue('test-session-token')
      mockSetSessionCookie.mockResolvedValue(undefined)

      const request = createMockRequest({ password: 'correct', totp: '123456' })

      await POST(request)

      expect(mockCreateSession).toHaveBeenCalled()
      expect(mockSetSessionCookie).toHaveBeenCalledWith('test-session-token')
    })
  })

  describe('error handling', () => {
    it('returns 500 when an unexpected error occurs during JSON parsing', async () => {
      // Create a request with invalid JSON
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Login failed')
    })

    it('returns 500 when createSession throws an error', async () => {
      mockVerifyPassword.mockReturnValue(true)
      mockVerifyTOTP.mockReturnValue(true)
      mockCreateSession.mockRejectedValue(new Error('Session creation failed'))

      const request = createMockRequest({ password: 'correct', totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Login failed')
    })

    it('returns 500 when setSessionCookie throws an error', async () => {
      mockVerifyPassword.mockReturnValue(true)
      mockVerifyTOTP.mockReturnValue(true)
      mockCreateSession.mockResolvedValue('test-token')
      mockSetSessionCookie.mockRejectedValue(new Error('Cookie error'))

      const request = createMockRequest({ password: 'correct', totp: '123456' })

      const response = await POST(request)
      const body = await response.json()

      expect(response.status).toBe(500)
      expect(body.error).toBe('Login failed')
    })
  })
})
