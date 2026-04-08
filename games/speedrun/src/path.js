export function createPathRecorder(sampleInterval = 0.05, maxDuration = 30) {
  return {
    path: [],
    lastSampleTime: -Infinity,
    sampleInterval,
    maxDuration,
  }
}

export function recordFrame(recorder, x, y, elapsed) {
  if (elapsed - recorder.lastSampleTime >= recorder.sampleInterval) {
    recorder.path.push([x, y, elapsed])
    recorder.lastSampleTime = elapsed
  }
}

export function resetRecorder(recorder) {
  recorder.path = []
  recorder.lastSampleTime = -Infinity
}

export function getPath(recorder) {
  return [...recorder.path]
}

export function isPathComplete(recorder) {
  if (recorder.path.length === 0) return false
  const lastTime = recorder.path[recorder.path.length - 1][2]
  return lastTime <= recorder.maxDuration
}

export function interpolatePosition(path, elapsed) {
  if (!path || path.length === 0) return null

  if (elapsed <= path[0][2]) {
    return { x: path[0][0], y: path[0][1] }
  }

  if (elapsed > path[path.length - 1][2]) {
    return null
  }

  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0, t0] = path[i]
    const [x1, y1, t1] = path[i + 1]
    if (elapsed >= t0 && elapsed <= t1) {
      if (t1 - t0 === 0) return { x: x0, y: y0 }
      const t = (elapsed - t0) / (t1 - t0)
      return {
        x: x0 + (x1 - x0) * t,
        y: y0 + (y1 - y0) * t,
      }
    }
  }

  return null
}
