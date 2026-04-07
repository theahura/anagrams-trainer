import { describe, it, expect } from 'vitest'
import {
  createTimer,
  updateTimer,
  formatTime,
  createCompletionRecord,
} from '../../games/speedrun/src/timing.js'

describe('timer', () => {
  it('starts at zero and not running', () => {
    const timer = createTimer()
    expect(timer.elapsed).toBe(0)
    expect(timer.running).toBe(false)
  })

  it('tracks elapsed time when running', () => {
    const timer = createTimer()
    timer.running = true
    updateTimer(timer, 0.5)
    updateTimer(timer, 0.5)
    expect(timer.elapsed).toBeCloseTo(1.0)
  })

  it('does not track time when not running', () => {
    const timer = createTimer()
    timer.running = false
    updateTimer(timer, 1.0)
    expect(timer.elapsed).toBe(0)
  })

  it('can be paused and resumed', () => {
    const timer = createTimer()
    timer.running = true
    updateTimer(timer, 1.0)
    timer.running = false
    updateTimer(timer, 5.0)
    timer.running = true
    updateTimer(timer, 1.0)
    expect(timer.elapsed).toBeCloseTo(2.0)
  })
})

describe('formatTime', () => {
  it('formats zero as 0:00.000', () => {
    expect(formatTime(0)).toBe('0:00.000')
  })

  it('formats seconds and milliseconds', () => {
    expect(formatTime(5.123)).toBe('0:05.123')
  })

  it('formats minutes', () => {
    expect(formatTime(65.5)).toBe('1:05.500')
  })

  it('formats large times', () => {
    expect(formatTime(3661.125)).toBe('61:01.125')
  })
})

describe('completion record', () => {
  it('records any% time when reaching goal with no coins', () => {
    const player = { reachedGoal: true, redCoins: 0, blueCoins: 0 }
    const level = { redCoins: [{ x: 0, y: 0 }, { x: 1, y: 1 }], blueCoins: [{ x: 2, y: 2 }] }
    const timer = { elapsed: 12.345 }

    const record = createCompletionRecord(timer, player, level)
    expect(record.anyPercent).toBeCloseTo(12.345)
    expect(record.hundredRed).toBeNull()
    expect(record.hundredBlue).toBeNull()
  })

  it('records 100% red time when all red coins collected', () => {
    const player = { reachedGoal: true, redCoins: 3, blueCoins: 0 }
    const level = {
      redCoins: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
      blueCoins: [{ x: 3, y: 3 }],
    }
    const timer = { elapsed: 20.0 }

    const record = createCompletionRecord(timer, player, level)
    expect(record.anyPercent).toBeCloseTo(20.0)
    expect(record.hundredRed).toBeCloseTo(20.0)
    expect(record.hundredBlue).toBeNull()
  })

  it('records 100% blue time when all blue coins collected', () => {
    const player = { reachedGoal: true, redCoins: 0, blueCoins: 2 }
    const level = {
      redCoins: [{ x: 0, y: 0 }],
      blueCoins: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
    }
    const timer = { elapsed: 15.0 }

    const record = createCompletionRecord(timer, player, level)
    expect(record.anyPercent).toBeCloseTo(15.0)
    expect(record.hundredRed).toBeNull()
    expect(record.hundredBlue).toBeCloseTo(15.0)
  })

  it('records all times when all coins collected', () => {
    const player = { reachedGoal: true, redCoins: 2, blueCoins: 2 }
    const level = {
      redCoins: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      blueCoins: [{ x: 2, y: 2 }, { x: 3, y: 3 }],
    }
    const timer = { elapsed: 30.0 }

    const record = createCompletionRecord(timer, player, level)
    expect(record.anyPercent).toBeCloseTo(30.0)
    expect(record.hundredRed).toBeCloseTo(30.0)
    expect(record.hundredBlue).toBeCloseTo(30.0)
  })
})
