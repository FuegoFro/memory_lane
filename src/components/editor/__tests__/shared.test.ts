import { describe, it, expect } from 'vitest'
import { yearFromTakenAt } from '../shared'

describe('yearFromTakenAt', () => {
  it('returns the year from an ISO timestamp', () => {
    expect(yearFromTakenAt('2019-12-25T08:30:00Z')).toBe(2019)
  })

  it('returns null when the date is null', () => {
    expect(yearFromTakenAt(null)).toBeNull()
  })
})
