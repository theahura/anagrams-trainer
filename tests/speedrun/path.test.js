import { describe, it, expect } from 'vitest'
import {
  createPathRecorder,
  recordFrame,
  resetRecorder,
  getPath,
  isPathComplete,
  interpolatePosition,
} from '../../games/speedrun/src/path.js'

describe('path recording', () => {
  it('records position at the sample interval', () => {
    const recorder = createPathRecorder(0.05, 30)

    recordFrame(recorder, 10, 20, 0)
    recordFrame(recorder, 15, 25, 0.03) // too soon, skipped
    recordFrame(recorder, 20, 30, 0.05) // at interval, recorded

    const path = getPath(recorder)
    expect(path).toHaveLength(2)
    expect(path[0]).toEqual([10, 20, 0])
    expect(path[1]).toEqual([20, 30, 0.05])
  })

  it('records first frame immediately', () => {
    const recorder = createPathRecorder(0.05, 30)
    recordFrame(recorder, 100, 200, 0)

    const path = getPath(recorder)
    expect(path).toHaveLength(1)
    expect(path[0]).toEqual([100, 200, 0])
  })

  it('samples less frequently than every frame', () => {
    const recorder = createPathRecorder(0.05, 30)

    // Simulate 1 second at 60fps
    for (let i = 0; i < 60; i++) {
      const t = i / 60
      recordFrame(recorder, t * 100, 50, t)
    }

    const path = getPath(recorder)
    // At 0.05s intervals over 1s, should get roughly 20 samples (not 60)
    expect(path.length).toBeGreaterThan(10)
    expect(path.length).toBeLessThan(30)
  })

  it('isPathComplete returns true when under max duration', () => {
    const recorder = createPathRecorder(0.05, 30)
    recordFrame(recorder, 10, 20, 0)
    recordFrame(recorder, 20, 30, 15.0)

    expect(isPathComplete(recorder)).toBe(true)
  })

  it('isPathComplete returns false when over max duration', () => {
    const recorder = createPathRecorder(0.05, 30)
    recordFrame(recorder, 10, 20, 0)
    recordFrame(recorder, 20, 30, 31.0)

    expect(isPathComplete(recorder)).toBe(false)
  })

  it('isPathComplete returns false when path is empty', () => {
    const recorder = createPathRecorder(0.05, 30)
    expect(isPathComplete(recorder)).toBe(false)
  })

  it('reset clears the path', () => {
    const recorder = createPathRecorder(0.05, 30)
    recordFrame(recorder, 10, 20, 0)
    recordFrame(recorder, 20, 30, 0.1)

    resetRecorder(recorder)

    expect(getPath(recorder)).toHaveLength(0)
  })

  it('records fresh samples after reset', () => {
    const recorder = createPathRecorder(0.05, 30)
    recordFrame(recorder, 10, 20, 0)
    recordFrame(recorder, 20, 30, 0.1)

    resetRecorder(recorder)

    recordFrame(recorder, 50, 60, 0)
    recordFrame(recorder, 70, 80, 0.05)

    const path = getPath(recorder)
    expect(path).toHaveLength(2)
    expect(path[0]).toEqual([50, 60, 0])
  })
})

describe('path interpolation', () => {
  const samplePath = [
    [0, 0, 0],
    [100, 0, 1.0],
    [100, 100, 2.0],
  ]

  it('interpolates between two samples', () => {
    const pos = interpolatePosition(samplePath, 0.5)
    expect(pos.x).toBeCloseTo(50)
    expect(pos.y).toBeCloseTo(0)
  })

  it('returns exact position at sample time', () => {
    const pos = interpolatePosition(samplePath, 1.0)
    expect(pos.x).toBeCloseTo(100)
    expect(pos.y).toBeCloseTo(0)
  })

  it('returns first point for time before first sample', () => {
    const pos = interpolatePosition(samplePath, -0.5)
    expect(pos.x).toBeCloseTo(0)
    expect(pos.y).toBeCloseTo(0)
  })

  it('returns null for time after last sample', () => {
    const pos = interpolatePosition(samplePath, 3.0)
    expect(pos).toBeNull()
  })

  it('returns null for empty path', () => {
    expect(interpolatePosition([], 0.5)).toBeNull()
  })

  it('returns null for null path', () => {
    expect(interpolatePosition(null, 0.5)).toBeNull()
  })

  it('interpolates y between second and third samples', () => {
    const pos = interpolatePosition(samplePath, 1.5)
    expect(pos.x).toBeCloseTo(100)
    expect(pos.y).toBeCloseTo(50)
  })
})
