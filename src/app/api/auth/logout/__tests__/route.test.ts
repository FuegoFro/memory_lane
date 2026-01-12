import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the auth utilities before importing the route
vi.mock('@/lib/auth', () => ({
  clearSessionCookie: vi.fn(),
}))

import { POST } from '../route'
import { clearSessionCookie } from '@/lib/auth'

const mockClearSessionCookie = vi.mocked(clearSessionCookie)

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 200 with success true', async () => {
    mockClearSessionCookie.mockResolvedValue(undefined)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it('calls clearSessionCookie', async () => {
    mockClearSessionCookie.mockResolvedValue(undefined)

    await POST()

    expect(mockClearSessionCookie).toHaveBeenCalledTimes(1)
  })
})
