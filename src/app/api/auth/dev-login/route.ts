import { NextResponse } from 'next/server'
import { createSession, setSessionCookie } from '@/lib/auth'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = await createSession()
  await setSessionCookie(token)

  return NextResponse.json({ success: true })
}
