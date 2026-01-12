import { describe, it, expect, beforeAll } from 'vitest'
import { createSession, verifySession } from '../session'

describe('session utilities', () => {
  beforeAll(() => {
    process.env.SESSION_SECRET = 'test-secret-for-vitest-minimum-length'
  })
  describe('createSession', () => {
    it('should return a JWT string', async () => {
      const token = await createSession()

      expect(typeof token).toBe('string')
      // JWTs have 3 parts separated by dots
      expect(token.split('.')).toHaveLength(3)
    })

    it('should create valid JWTs that can be verified', async () => {
      const token = await createSession()
      const isValid = await verifySession(token)

      expect(isValid).toBe(true)
    })
  })

  describe('verifySession', () => {
    it('should return true for a valid token', async () => {
      const token = await createSession()
      const isValid = await verifySession(token)

      expect(isValid).toBe(true)
    })

    it('should return false for an invalid token', async () => {
      const isValid = await verifySession('invalid.token.here')

      expect(isValid).toBe(false)
    })

    it('should return false for an empty token', async () => {
      const isValid = await verifySession('')

      expect(isValid).toBe(false)
    })

    it('should return false for a malformed JWT', async () => {
      const isValid = await verifySession('not-a-jwt')

      expect(isValid).toBe(false)
    })

    it('should return false for a tampered token', async () => {
      const token = await createSession()
      // Tamper with the token by modifying a character
      const tamperedToken = token.slice(0, -5) + 'XXXXX'

      const isValid = await verifySession(tamperedToken)

      expect(isValid).toBe(false)
    })
  })
})
