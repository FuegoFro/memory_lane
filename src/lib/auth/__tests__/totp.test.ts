import { describe, it, expect } from 'vitest'
import { generateTOTPSecret, verifyTOTP } from '../totp'
import * as OTPAuth from 'otpauth'

describe('TOTP utilities', () => {
  describe('generateTOTPSecret', () => {
    it('should return an object with secret and uri', () => {
      const result = generateTOTPSecret()

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('uri')
    })

    it('should return a base32 encoded secret', () => {
      const result = generateTOTPSecret()

      // Base32 characters are A-Z and 2-7
      expect(result.secret).toMatch(/^[A-Z2-7]+$/)
    })

    it('should return a valid otpauth URI', () => {
      const result = generateTOTPSecret()

      expect(result.uri).toMatch(/^otpauth:\/\/totp\//)
      expect(result.uri).toContain('secret=')
    })

    it('should generate different secrets each time', () => {
      const result1 = generateTOTPSecret()
      const result2 = generateTOTPSecret()

      expect(result1.secret).not.toBe(result2.secret)
    })
  })

  describe('verifyTOTP', () => {
    it('should return true for a valid token', () => {
      // Generate a secret and create a valid token
      const result = generateTOTPSecret()

      // Create a TOTP instance with the same secret to generate a valid token
      const totp = new OTPAuth.TOTP({
        issuer: 'MemoryLane',
        label: 'Admin',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: result.secret,
      })
      const validToken = totp.generate()

      expect(verifyTOTP(validToken, result.secret)).toBe(true)
    })

    it('should return false for an invalid token', () => {
      const result = generateTOTPSecret()

      // Use an obviously invalid token
      expect(verifyTOTP('000000', result.secret)).toBe(false)
    })

    it('should return false for malformed tokens', () => {
      const result = generateTOTPSecret()

      expect(verifyTOTP('abc', result.secret)).toBe(false)
      expect(verifyTOTP('', result.secret)).toBe(false)
    })
  })
})
