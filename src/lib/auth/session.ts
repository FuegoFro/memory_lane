import * as jose from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'session'
const SESSION_DURATION = 30 * 24 * 60 * 60 // 30 days in seconds

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET not configured')
  return new TextEncoder().encode(secret)
}

/**
 * Create a new JWT session token
 * @returns A signed JWT token string
 */
export async function createSession(): Promise<string> {
  const token = await new jose.SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecretKey())

  return token
}

/**
 * Verify a JWT session token
 * @param token - The JWT token to verify
 * @returns True if the token is valid, false otherwise
 */
export async function verifySession(token: string): Promise<boolean> {
  if (!token) {
    return false
  }

  try {
    await jose.jwtVerify(token, getSecretKey())
    return true
  } catch {
    return false
  }
}

/**
 * Get the current session from cookies and verify it
 * @returns True if there is a valid session, false otherwise
 */
export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return false
  }

  return verifySession(sessionCookie.value)
}

/**
 * Set the session cookie with the given token
 * @param token - The JWT token to store in the cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
