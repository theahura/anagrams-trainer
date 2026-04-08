import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  getCountFromServer: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

vi.mock('../../games/speedrun/src/firebase.js', () => ({
  db: {},
}))

let submitScore

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('../../games/speedrun/src/leaderboard.js')
  submitScore = mod.submitScore
})

describe('submitScore input validation', () => {
  it('rejects negative times', async () => {
    await expect(submitScore('2026-W15', 'anyPercent', -1, 'abc')).rejects.toThrow()
  })

  it('rejects zero time', async () => {
    await expect(submitScore('2026-W15', 'anyPercent', 0, 'abc')).rejects.toThrow()
  })

  it('rejects NaN time', async () => {
    await expect(submitScore('2026-W15', 'anyPercent', NaN, 'abc')).rejects.toThrow()
  })

  it('rejects time over 1 hour', async () => {
    await expect(submitScore('2026-W15', 'anyPercent', 3601, 'abc')).rejects.toThrow()
  })

  it('rejects invalid category', async () => {
    await expect(submitScore('2026-W15', 'bogus', 10, 'abc')).rejects.toThrow()
  })

  it('rejects invalid name', async () => {
    await expect(submitScore('2026-W15', 'anyPercent', 10, 'a')).rejects.toThrow()
  })

  it('accepts valid inputs without throwing', async () => {
    await expect(submitScore('2026-W15', 'anyPercent', 12.345, 'SpeedKing')).resolves.not.toThrow()
    await expect(submitScore('2026-W15', 'hundredRed', 20.0, 'player_1')).resolves.not.toThrow()
    await expect(submitScore('2026-W15', 'hundredBlue', 5.0, 'abc')).resolves.not.toThrow()
  })
})

