const STORAGE_KEY = 'speedrun-settings'

function defaultSettings() {
  return {
    ghostCategory: 'anyPercent',
  }
}

export function loadSettings() {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) {
    return defaultSettings()
  }
  try {
    return JSON.parse(data)
  } catch {
    return defaultSettings()
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
