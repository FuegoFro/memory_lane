import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PATHS = ['/edit', '/api/edit']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtected) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For middleware, we need to verify without using cookies() helper
  const { jwtVerify } = await import('jose')
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET)

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/edit/:path*', '/api/edit/:path*'],
}
