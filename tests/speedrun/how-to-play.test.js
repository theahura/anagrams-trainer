import { describe, it, expect, beforeEach } from 'vitest'
import {
  hasSeenHowToPlay,
  markHowToPlaySeen,
  setupHowToPlayModal,
} from '../../games/speedrun/src/howToPlay.js'

describe('how-to-play modal', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  describe('first-visit detection', () => {
    it('returns false when player has never visited', () => {
      expect(hasSeenHowToPlay()).toBe(false)
    })

    it('returns true after marking as seen', () => {
      markHowToPlaySeen()
      expect(hasSeenHowToPlay()).toBe(true)
    })

  })

  describe('modal setup and interaction', () => {
    let modal

    beforeEach(() => {
      document.body.innerHTML = `
        <button id="how-to-play-btn">?</button>
        <div id="how-to-play-modal" class="hidden">
          <div class="htp-content">
            <button class="htp-close">&times;</button>
            <h2>How to Play</h2>
            <div class="htp-controls"></div>
          </div>
        </div>
      `
      modal = document.getElementById('how-to-play-modal')
    })

    it('auto-opens on first visit when localStorage key is absent', () => {
      setupHowToPlayModal()
      expect(modal.classList.contains('hidden')).toBe(false)
    })

    it('does not auto-open when localStorage key exists', () => {
      markHowToPlaySeen()
      setupHowToPlayModal()
      expect(modal.classList.contains('hidden')).toBe(true)
    })

    it('opens when ? button is clicked', () => {
      markHowToPlaySeen()
      setupHowToPlayModal()
      expect(modal.classList.contains('hidden')).toBe(true)

      document.getElementById('how-to-play-btn').click()
      expect(modal.classList.contains('hidden')).toBe(false)
    })

    it('closes when close button is clicked', () => {
      setupHowToPlayModal()
      expect(modal.classList.contains('hidden')).toBe(false)

      modal.querySelector('.htp-close').click()
      expect(modal.classList.contains('hidden')).toBe(true)
    })

    it('closes when backdrop is clicked', () => {
      setupHowToPlayModal()
      expect(modal.classList.contains('hidden')).toBe(false)

      modal.click()
      expect(modal.classList.contains('hidden')).toBe(true)
    })

    it('does not close when inner content is clicked', () => {
      setupHowToPlayModal()
      expect(modal.classList.contains('hidden')).toBe(false)

      modal.querySelector('.htp-content').click()
      expect(modal.classList.contains('hidden')).toBe(false)
    })

  })

  describe('modal content', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="how-to-play-btn">?</button>
        <div id="how-to-play-modal" class="hidden">
          <div class="htp-content">
            <button class="htp-close">&times;</button>
            <h2>How to Play</h2>
            <div class="htp-controls"></div>
          </div>
        </div>
      `
    })

    it('contains movement control descriptions', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/arrow|wasd/i)
      expect(text).toMatch(/move/i)
    })

    it('contains jump control description', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/space|jump/i)
    })

    it('contains dash control description', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/dash/i)
    })

    it('contains sprint control description', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/sprint/i)
    })

    it('contains restart control description', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/restart/i)
    })

    it('contains wall jump description', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/wall.*(jump|slide)/i)
    })

    it('contains corner vault description', () => {
      setupHowToPlayModal()
      const text = document.getElementById('how-to-play-modal').textContent
      expect(text).toMatch(/vault/i)
    })
  })
})
