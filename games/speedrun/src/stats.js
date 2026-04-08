const STORAGE_PREFIX = 'speedrun-stats-'

export function loadStats(seed) {
  const data = localStorage.getItem(STORAGE_PREFIX + seed)
  if (!data) {
    return defaultStats()
  }
  try {
    return JSON.parse(data)
  } catch {
    return defaultStats()
  }
}

function defaultStats() {
  return {
    attempts: 0,
    bestAnyPercent: null,
    bestHundredRed: null,
    bestHundredBlue: null,
    bestPaths: {
      anyPercent: null,
      hundredRed: null,
      hundredBlue: null,
    },
  }
}

export function saveStats(seed, stats) {
  localStorage.setItem(STORAGE_PREFIX + seed, JSON.stringify(stats))
}

export function updatePersonalBest(stats, record, paths) {
  const updated = { ...stats }
  const currentPaths = updated.bestPaths || { anyPercent: null, hundredRed: null, hundredBlue: null }
  updated.bestPaths = { ...currentPaths }

  if (record.anyPercent !== null) {
    if (updated.bestAnyPercent === null || record.anyPercent < updated.bestAnyPercent) {
      updated.bestAnyPercent = record.anyPercent
      if (paths) updated.bestPaths.anyPercent = paths.anyPercent
    }
  }

  if (record.hundredRed !== null) {
    if (updated.bestHundredRed === null || record.hundredRed < updated.bestHundredRed) {
      updated.bestHundredRed = record.hundredRed
      if (paths) updated.bestPaths.hundredRed = paths.hundredRed
    }
  }

  if (record.hundredBlue !== null) {
    if (updated.bestHundredBlue === null || record.hundredBlue < updated.bestHundredBlue) {
      updated.bestHundredBlue = record.hundredBlue
      if (paths) updated.bestPaths.hundredBlue = paths.hundredBlue
    }
  }

  return updated
}
