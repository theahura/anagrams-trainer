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

  it('stores path when PB improves', () => {
    const stats = {
      attempts: 0,
      bestAnyPercent: null,
      bestHundredRed: null,
      bestHundredBlue: null,
    }
    const record = { anyPercent: 10.0, hundredRed: null, hundredBlue: null }
    const paths = {
      anyPercent: [[0, 0, 0], [100, 50, 5.0]],
      hundredRed: null,
      hundredBlue: null,
    }

    const updated = updatePersonalBest(stats, record, paths)

    expect(updated.bestPaths.anyPercent).toEqual([[0, 0, 0], [100, 50, 5.0]])
    expect(updated.bestPaths.hundredRed).toBeNull()
  })

  it('does not overwrite path when PB does not improve', () => {
    const stats = {
      attempts: 5,
      bestAnyPercent: 8.0,
      bestHundredRed: null,
      bestHundredBlue: null,
      bestPaths: {
        anyPercent: [[0, 0, 0], [50, 50, 4.0]],
        hundredRed: null,
        hundredBlue: null,
      },
    }
    const record = { anyPercent: 12.0, hundredRed: null, hundredBlue: null }
    const paths = {
      anyPercent: [[0, 0, 0], [200, 200, 12.0]],
      hundredRed: null,
      hundredBlue: null,
    }

    const updated = updatePersonalBest(stats, record, paths)

    expect(updated.bestAnyPercent).toBe(8.0)
    expect(updated.bestPaths.anyPercent).toEqual([[0, 0, 0], [50, 50, 4.0]])
  })

  it('handles old stats without bestPaths gracefully', () => {
    const oldStats = {
      attempts: 3,
      bestAnyPercent: 15.0,
      bestHundredRed: null,
      bestHundredBlue: null,
    }
    saveStats('2026-W15', oldStats)
    const loaded = loadStats('2026-W15')

    const record = { anyPercent: 10.0, hundredRed: null, hundredBlue: null }
    const paths = {
      anyPercent: [[0, 0, 0], [100, 50, 10.0]],
      hundredRed: null,
      hundredBlue: null,
    }
    const updated = updatePersonalBest(loaded, record, paths)

    expect(updated.bestAnyPercent).toBe(10.0)
    expect(updated.bestPaths.anyPercent).toEqual([[0, 0, 0], [100, 50, 10.0]])
  })

  it('stores paths independently per category', () => {
    const stats = {
      attempts: 0,
      bestAnyPercent: null,
      bestHundredRed: null,
      bestHundredBlue: null,
    }
    const record = { anyPercent: 10.0, hundredRed: 10.0, hundredBlue: null }
    const paths = {
      anyPercent: [[0, 0, 0], [100, 50, 10.0]],
      hundredRed: [[0, 0, 0], [80, 40, 10.0]],
      hundredBlue: null,
    }

    const updated = updatePersonalBest(stats, record, paths)

    expect(updated.bestPaths.anyPercent).toEqual(paths.anyPercent)
    expect(updated.bestPaths.hundredRed).toEqual(paths.hundredRed)
    expect(updated.bestPaths.hundredBlue).toBeNull()
  })

  it('default stats include bestPaths', () => {
    const stats = loadStats('nonexistent-week')
    expect(stats.bestPaths).toEqual({
      anyPercent: null,
      hundredRed: null,
      hundredBlue: null,
      hundredPercent: null,
    })
  })

  it('default stats include bestHundredPercent', () => {
    const stats = loadStats('nonexistent-seed')
    expect(stats.bestHundredPercent).toBeNull()
  })

  it('updates hundredPercent PB when faster', () => {
    const stats = {
      attempts: 2,
      bestAnyPercent: 10.0,
      bestHundredRed: 20.0,
      bestHundredBlue: 18.0,
      bestHundredPercent: 30.0,
    }

    const record = { anyPercent: 12.0, hundredRed: null, hundredBlue: null, hundredPercent: 25.0 }
    const updated = updatePersonalBest(stats, record)

    expect(updated.bestHundredPercent).toBe(25.0)
  })

  it('does not update hundredPercent PB when slower', () => {
    const stats = {
      attempts: 2,
      bestAnyPercent: 10.0,
      bestHundredRed: null,
      bestHundredBlue: null,
      bestHundredPercent: 20.0,
    }

    const record = { anyPercent: 12.0, hundredRed: null, hundredBlue: null, hundredPercent: 25.0 }
    const updated = updatePersonalBest(stats, record)

    expect(updated.bestHundredPercent).toBe(20.0)
  })

  it('sets hundredPercent PB from null', () => {
    const stats = {
      attempts: 0,
      bestAnyPercent: null,
      bestHundredRed: null,
      bestHundredBlue: null,
      bestHundredPercent: null,
    }

    const record = { anyPercent: 15.0, hundredRed: 15.0, hundredBlue: 15.0, hundredPercent: 15.0 }
    const updated = updatePersonalBest(stats, record)

    expect(updated.bestHundredPercent).toBe(15.0)
  })

  it('stores hundredPercent path when PB improves', () => {
    const stats = {
      attempts: 0,
      bestAnyPercent: null,
      bestHundredRed: null,
      bestHundredBlue: null,
      bestHundredPercent: null,
    }
    const record = { anyPercent: 10.0, hundredRed: 10.0, hundredBlue: 10.0, hundredPercent: 10.0 }
    const paths = {
      anyPercent: [[0, 0, 0], [100, 50, 10.0]],
      hundredRed: [[0, 0, 0], [80, 40, 10.0]],
      hundredBlue: [[0, 0, 0], [60, 30, 10.0]],
      hundredPercent: [[0, 0, 0], [120, 60, 10.0]],
    }

    const updated = updatePersonalBest(stats, record, paths)

    expect(updated.bestPaths.hundredPercent).toEqual([[0, 0, 0], [120, 60, 10.0]])
  })
})
