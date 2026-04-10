import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadSettings,
  saveSettings,
} from '../../games/speedrun/src/settings.js'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default settings when nothing stored', () => {
    const settings = loadSettings()
    expect(settings.ghostCategory).toBe('anyPercent')
  })

  it('round-trips settings through localStorage', () => {
    const settings = { ghostCategory: 'hundredRed' }
    saveSettings(settings)
    const loaded = loadSettings()
    expect(loaded).toEqual(settings)
  })

  it('returns defaults when localStorage has corrupted data', () => {
    localStorage.setItem('speedrun-settings', 'not-valid-json{{{')
    const settings = loadSettings()
    expect(settings.ghostCategory).toBe('anyPercent')
  })

  it('persists off setting', () => {
    saveSettings({ ghostCategory: 'off' })
    expect(loadSettings().ghostCategory).toBe('off')
  })

  it('persists hundredBlue setting', () => {
    saveSettings({ ghostCategory: 'hundredBlue' })
    expect(loadSettings().ghostCategory).toBe('hundredBlue')
  })

  it('persists hundredPercent setting', () => {
    saveSettings({ ghostCategory: 'hundredPercent' })
    expect(loadSettings().ghostCategory).toBe('hundredPercent')
  })
})
