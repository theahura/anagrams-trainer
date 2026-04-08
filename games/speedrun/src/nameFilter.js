import LeoProfanity from 'leo-profanity'

const NAME_REGEX = /^[a-zA-Z0-9_]+$/
const MIN_LENGTH = 3
const MAX_LENGTH = 12
const STORAGE_KEY = 'speedrun-player-name'

export function validateName(raw) {
  const name = raw.trim()

  if (name.length < MIN_LENGTH) {
    return { valid: false, error: `Name must be at least ${MIN_LENGTH} characters` }
  }

  if (name.length > MAX_LENGTH) {
    return { valid: false, error: `Name must be at most ${MAX_LENGTH} characters` }
  }

  if (!NAME_REGEX.test(name)) {
    return { valid: false, error: 'Name can only contain letters, numbers, and underscores' }
  }

  if (LeoProfanity.check(name)) {
    return { valid: false, error: 'That name is not allowed' }
  }

  return { valid: true }
}

export function getSavedName() {
  return localStorage.getItem(STORAGE_KEY)
}

export function setSavedName(name) {
  localStorage.setItem(STORAGE_KEY, name)
}
