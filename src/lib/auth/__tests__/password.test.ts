import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('password utilities', () => {
  describe('hashPassword', () => {
    it('should create a valid bcrypt hash', () => {
      const password = 'testPassword123!'
      const hash = hashPassword(password)

      // bcrypt hashes start with $2a$ or $2b$ and have a specific length
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$.{53}$/)
    })

    it('should create different hashes for the same password', () => {
      const password = 'testPassword123!'
      const hash1 = hashPassword(password)
      const hash2 = hashPassword(password)

      // Due to salting, hashes should be different
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', () => {
      const password = 'testPassword123!'
      const hash = hashPassword(password)

      expect(verifyPassword(password, hash)).toBe(true)
    })

    it('should return false for wrong password', () => {
      const password = 'testPassword123!'
      const wrongPassword = 'wrongPassword456!'
      const hash = hashPassword(password)

      expect(verifyPassword(wrongPassword, hash)).toBe(false)
    })

    it('should return false for empty password', () => {
      const password = 'testPassword123!'
      const hash = hashPassword(password)

      expect(verifyPassword('', hash)).toBe(false)
    })
  })
})
