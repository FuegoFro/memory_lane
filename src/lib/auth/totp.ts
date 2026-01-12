import * as OTPAuth from 'otpauth'

const ISSUER = 'MemoryLane'
const LABEL = 'Admin'

/**
 * Generate a new TOTP secret and URI for authenticator app setup
 * @returns Object containing the base32-encoded secret and otpauth URI
 */
export function generateTOTPSecret(): { secret: string; uri: string } {
  const secret = new OTPAuth.Secret({ size: 20 })

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: LABEL,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  })

  return {
    secret: secret.base32,
    uri: totp.toString(),
  }
}

/**
 * Verify a TOTP token against a secret
 * @param token - The 6-digit TOTP token from the authenticator app
 * @param secret - The base32-encoded secret
 * @returns True if the token is valid, false otherwise
 */
export function verifyTOTP(token: string, secret: string): boolean {
  if (!token || token.length !== 6) {
    return false
  }

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: LABEL,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret,
  })

  // delta returns null if invalid, or the time step difference if valid
  // We allow a window of 1 step (30 seconds) either direction for clock drift
  const delta = totp.validate({ token, window: 1 })

  return delta !== null
}
