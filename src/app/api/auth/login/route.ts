import { NextRequest, NextResponse } from 'next/server'
import {
  verifyPassword,
  verifyTOTP,
  createSession,
  setSessionCookie,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { password, totp } = await request.json()

    if (!password || !totp) {
      return NextResponse.json(
        { error: 'Password and TOTP code required' },
        { status: 400 }
      )
    }

    const passwordHash = process.env.AUTH_PASSWORD_HASH
    const totpSecret = process.env.TOTP_SECRET

    if (!passwordHash || !totpSecret) {
      console.error('Auth not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const passwordValid = verifyPassword(password, passwordHash)
    const totpValid = verifyTOTP(totp, totpSecret)

    if (!passwordValid || !totpValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = await createSession()
    await setSessionCookie(token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
