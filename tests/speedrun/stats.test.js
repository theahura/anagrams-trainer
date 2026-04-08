import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStats,
  saveStats,
  updatePersonalBest,
} from '../../games/speedrun/src/stats.js'

describe('stats', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default stats when nothing saved', () => {
    const stats = loadStats('2026-04-08')
    expect(stats.attempts).toBe(0)
    expect(stats.bestAnyPercent).toBeNull()
    expect(stats.bestHundredRed).toBeNull()
    expect(stats.bestHundredBlue).toBeNull()
  })

  it('round-trips stats through localStorage', () => {
    const stats = {
      attempts: 5,
      bestAnyPercent: 12.345,
      bestHundredRed: 20.0,
      bestHundredBlue: null,
    }
    saveStats('2026-04-08', stats)
    const loaded = loadStats('2026-04-08')
    expect(loaded).toEqual(stats)
  })

  it('different days have independent stats', () => {
    saveStats('2026-04-08', { attempts: 3, bestAnyPercent: 10.0, bestHundredRed: null, bestHundredBlue: null })
    saveStats('2026-04-09', { attempts: 1, bestAnyPercent: 15.0, bestHundredRed: null, bestHundredBlue: null })

    expect(loadStats('2026-04-08').attempts).toBe(3)
    expect(loadStats('2026-04-09').attempts).toBe(1)
  })

  it('updates personal best only if faster', () => {
    const stats = {
      attempts: 2,
      bestAnyPercent: 15.0,
      bestHundredRed: 25.0,
      bestHundredBlue: null,
    }

    const record = { anyPercent: 12.0, hundredRed: 30.0, hundredBlue: 18.0 }
    const updated = updatePersonalBest(stats, record)

    expect(updated.bestAnyPercent).toBe(12.0) // faster
    expect(updated.bestHundredRed).toBe(25.0) // kept old (30 > 25)
    expect(updated.bestHundredBlue).toBe(18.0) // new record (was null)
  })

  it('returns default stats when localStorage has corrupted data', () => {
    localStorage.setItem('speedrun-stats-2026-04-08', 'not-valid-json{{{')
    const stats = loadStats('2026-04-08')
    expect(stats.attempts).toBe(0)
    expect(stats.bestAnyPercent).toBeNull()
  })

  it('sets PB from null when first time recorded', () => {
    const stats = {
      attempts: 0,
      bestAnyPercent: null,
      bestHundredRed: null,
      bestHundredBlue: null,
    }

    const record = { anyPercent: 20.0, hundredRed: null, hundredBlue: null }
    const updated = updatePersonalBest(stats, record)

    expect(updated.bestAnyPercent).toBe(20.0)
    expect(updated.bestHundredRed).toBeNull()
    expect(updated.bestHundredBlue).toBeNull()
  })
})
