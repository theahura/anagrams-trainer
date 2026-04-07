const STORAGE_PREFIX = 'speedrun-stats-'

export function loadStats(weekSeed) {
  const data = localStorage.getItem(STORAGE_PREFIX + weekSeed)
  if (!data) {
    return {
      attempts: 0,
      bestAnyPercent: null,
      bestHundredRed: null,
      bestHundredBlue: null,
    }
  }
  return JSON.parse(data)
}

export function saveStats(weekSeed, stats) {
  localStorage.setItem(STORAGE_PREFIX + weekSeed, JSON.stringify(stats))
}

export function updatePersonalBest(stats, record) {
  const updated = { ...stats }

  if (record.anyPercent !== null) {
    if (updated.bestAnyPercent === null || record.anyPercent < updated.bestAnyPercent) {
      updated.bestAnyPercent = record.anyPercent
    }
  }

  if (record.hundredRed !== null) {
    if (updated.bestHundredRed === null || record.hundredRed < updated.bestHundredRed) {
      updated.bestHundredRed = record.hundredRed
    }
  }

  if (record.hundredBlue !== null) {
    if (updated.bestHundredBlue === null || record.hundredBlue < updated.bestHundredBlue) {
      updated.bestHundredBlue = record.hundredBlue
    }
  }

  return updated
}
