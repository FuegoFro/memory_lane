import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a password using bcrypt
 * @param password - The plain text password to hash
 * @returns The bcrypt hash of the password
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS)
}

/**
 * Verify a password against a bcrypt hash
 * @param password - The plain text password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns True if the password matches the hash, false otherwise
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (!password) {
    return false
  }
  return bcrypt.compareSync(password, hash)
}
