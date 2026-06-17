import { describe, it, expect, vi } from 'vitest'
import { mapWithConcurrency } from '../concurrency'

describe('mapWithConcurrency', () => {
  it('maps every item and preserves input order', async () => {
    const items = [1, 2, 3, 4, 5]
    const result = await mapWithConcurrency(items, 2, async (n) => n * 10)
    expect(result).toEqual([10, 20, 30, 40, 50])
  })

  it('never runs more than `limit` tasks at once', async () => {
    let active = 0
    let maxActive = 0
    const fn = async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return null
    }
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7, 8], 3, fn)
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  it('returns an empty array for empty input without calling fn', async () => {
    const fn = vi.fn()
    const result = await mapWithConcurrency([], 4, fn)
    expect(result).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })
})
