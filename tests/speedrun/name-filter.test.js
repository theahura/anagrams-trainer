import { describe, it, expect, beforeEach } from 'vitest'
import { validateName, getSavedName, setSavedName } from '../../games/speedrun/src/nameFilter.js'

describe('name validation', () => {
  it('accepts valid alphanumeric names', () => {
    expect(validateName('SpeedKing').valid).toBe(true)
    expect(validateName('player_1').valid).toBe(true)
    expect(validateName('abc').valid).toBe(true)
    expect(validateName('ABCDEFGHIJKL').valid).toBe(true)
  })

  it('rejects names shorter than 3 characters', () => {
    const result = validateName('ab')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects names longer than 12 characters', () => {
    const result = validateName('abcdefghijklm')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects names with special characters', () => {
    expect(validateName('player!').valid).toBe(false)
    expect(validateName('a b c').valid).toBe(false)
    expect(validateName('<script>').valid).toBe(false)
    expect(validateName('name@123').valid).toBe(false)
  })

  it('rejects empty and whitespace-only names', () => {
    expect(validateName('').valid).toBe(false)
    expect(validateName('   ').valid).toBe(false)
  })

  it('trims whitespace before validating', () => {
    expect(validateName('  abc  ').valid).toBe(true)
  })

  it('rejects profane names', () => {
    const result = validateName('fuck')
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('saved name', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no name is saved', () => {
    expect(getSavedName()).toBeNull()
  })

  it('round-trips a saved name', () => {
    setSavedName('SpeedKing')
    expect(getSavedName()).toBe('SpeedKing')
  })
})
