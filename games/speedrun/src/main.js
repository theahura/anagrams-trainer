import { generateLevel, getDailySeed } from './level.js'
import { createPlayer } from './player.js'
import { createPhysicsConfig, updatePlayer } from './physics.js'
import { createInputState, setupInputListeners, clearFrameInput } from './input.js'
import { createTimer, updateTimer, formatTime, createCompletionRecord } from './timing.js'
import { loadStats, saveStats, updatePersonalBest } from './stats.js'
import { createRenderer } from './renderer.js'
import { restartRun } from './game.js'
import { createPathRecorder, recordFrame, resetRecorder, getPath, isPathComplete, interpolatePosition } from './path.js'
import { loadSettings, saveSettings } from './settings.js'
import { validateName, getSavedName, setSavedName } from './nameFilter.js'
import { submitScore, fetchLeaderboard, fetchPlayerRank } from './leaderboard.js'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 608

let gameState = 'READY' // READY, PLAYING, COMPLETE
let level, player, timer, stats, config, renderer, inputState
let daySeed
let lastTime = 0
let pathRecorder
let settings
let settingsOpen = false

function init() {
  const canvas = document.getElementById('game-canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  daySeed = getDailySeed(new Date())
  level = generateLevel(daySeed)
  player = createPlayer(level.start.x, level.start.y)
  timer = createTimer()
  config = createPhysicsConfig()
  stats = loadStats(daySeed)
  renderer = createRenderer(canvas)
  inputState = createInputState()
  setupInputListeners(inputState)
  pathRecorder = createPathRecorder()
  settings = loadSettings()

  setupSettingsUI()

  document.addEventListener('keydown', handleKeyDown)
  setupLeaderboardModal()

  requestAnimationFrame(gameLoop)
}

function updateSettingsButtonState() {
  const btn = document.getElementById('settings-btn')
  if (btn) btn.classList.toggle('disabled', gameState !== 'READY')
}

function startGame() {
  gameState = 'PLAYING'
  timer.running = true
  clearFrameInput(inputState)
  updateSettingsButtonState()
}

function getGhostPath() {
  if (settings.ghostCategory === 'off') return null
  if (!stats.bestPaths) return null
  return stats.bestPaths[settings.ghostCategory] || null
}

function gameLoop(timestamp) {
  const dt = lastTime === 0 ? 1 / 60 : Math.min((timestamp - lastTime) / 1000, 1 / 30)
  lastTime = timestamp

  let ghostPos = null

  if (gameState === 'PLAYING') {
    updateTimer(timer, dt)
    updatePlayer(player, inputState, level, dt, config)
    clearFrameInput(inputState)

    recordFrame(pathRecorder, player.x, player.y, timer.elapsed)

    const ghostPath = getGhostPath()
    ghostPos = interpolatePosition(ghostPath, timer.elapsed)

    if (player.reachedGoal) {
      completeRun()
    }
  } else {
    clearFrameInput(inputState)
  }

  const currentPath = gameState === 'COMPLETE' ? getPath(pathRecorder) : null
  renderer.render(level, player, timer, gameState, stats, daySeed, ghostPos, currentPath)
  requestAnimationFrame(gameLoop)
}

function completeRun() {
  gameState = 'COMPLETE'
  timer.running = false
  updateSettingsButtonState()

  const record = createCompletionRecord(timer, player, level)
  const recordedPath = getPath(pathRecorder)
  const pathComplete = isPathComplete(pathRecorder)

  const paths = pathComplete ? {
    anyPercent: record.anyPercent !== null ? recordedPath : null,
    hundredRed: record.hundredRed !== null ? recordedPath : null,
    hundredBlue: record.hundredBlue !== null ? recordedPath : null,
  } : undefined

  stats.attempts++
  stats = updatePersonalBest(stats, record, paths)
  saveStats(daySeed, stats)

  showResults(record)
}

function showResults(record) {
  const overlay = document.getElementById('results-overlay')
  const content = document.getElementById('results-content')
  content.textContent = ''

  function makeTimeRow(label, time, pb) {
    const row = document.createElement('div')
    row.className = 'result-row'

    const labelEl = document.createElement('span')
    labelEl.className = 'result-label'
    labelEl.textContent = label

    const timeEl = document.createElement('span')
    timeEl.className = 'result-time'
    timeEl.textContent = time !== null ? formatTime(time) : '—'

    const pbEl = document.createElement('span')
    pbEl.className = 'result-pb'
    pbEl.textContent = 'PB: ' + (pb !== null ? formatTime(pb) : '—')

    row.append(labelEl, timeEl, pbEl)
    return row
  }

  const heading = document.createElement('h2')
  heading.textContent = 'Run Complete!'
  content.appendChild(heading)

  const timesDiv = document.createElement('div')
  timesDiv.className = 'results-times'
  timesDiv.appendChild(makeTimeRow('Any%', record.anyPercent, stats.bestAnyPercent))
  timesDiv.appendChild(makeTimeRow('100% Red', record.hundredRed, stats.bestHundredRed))
  timesDiv.appendChild(makeTimeRow('100% Blue', record.hundredBlue, stats.bestHundredBlue))
  content.appendChild(timesDiv)

  const statsDiv = document.createElement('div')
  statsDiv.className = 'results-stats'
  const attemptsSpan = document.createElement('span')
  attemptsSpan.textContent = `Attempts: ${stats.attempts}`
  statsDiv.appendChild(attemptsSpan)
  content.appendChild(statsDiv)

  content.appendChild(createSubmitSection(record))

  const btn = document.createElement('button')
  btn.id = 'restart-btn'
  btn.textContent = 'Try Again'
  btn.addEventListener('click', restart)
  content.appendChild(btn)

  const hint = document.createElement('div')
  hint.className = 'results-hint'
  hint.textContent = 'Press R or Enter to restart'
  content.appendChild(hint)

  overlay.classList.remove('hidden')
}

function createSubmitSection(record) {
  const section = document.createElement('div')
  section.className = 'submit-section'

  const submitBtn = document.createElement('button')
  submitBtn.className = 'submit-btn'
  submitBtn.textContent = 'Submit to Leaderboard'
  submitBtn.addEventListener('click', () => {
    section.textContent = ''
    section.appendChild(createNameForm(record))
  })
  section.appendChild(submitBtn)

  return section
}

function createNameForm(record) {
  const form = document.createElement('div')
  form.className = 'name-form'

  const savedName = getSavedName()

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'name-input'
  input.placeholder = 'Enter name (3-12 chars)'
  input.maxLength = 12
  if (savedName) input.value = savedName

  const errorEl = document.createElement('div')
  errorEl.className = 'name-error'

  const confirmBtn = document.createElement('button')
  confirmBtn.className = 'submit-btn'
  confirmBtn.textContent = 'Submit'
  confirmBtn.addEventListener('click', () => handleSubmit(input, errorEl, confirmBtn, record))

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit(input, errorEl, confirmBtn, record)
    e.stopPropagation()
  })
  input.addEventListener('keyup', (e) => e.stopPropagation())

  form.append(input, errorEl, confirmBtn)
  return form
}

async function handleSubmit(input, errorEl, confirmBtn, record) {
  const name = input.value.trim()
  const result = validateName(name)

  if (!result.valid) {
    errorEl.textContent = result.error
    return
  }

  confirmBtn.disabled = true
  confirmBtn.textContent = 'Submitting...'
  errorEl.textContent = ''

  const categories = [
    ['anyPercent', record.anyPercent],
    ['hundredRed', record.hundredRed],
    ['hundredBlue', record.hundredBlue],
  ]

  try {
    for (const [category, time] of categories) {
      if (time !== null) {
        await submitScore(daySeed, category, time, name)
      }
    }
    setSavedName(name)
    const section = confirmBtn.closest('.submit-section')
    section.textContent = ''
    const success = document.createElement('div')
    success.className = 'submit-success'
    success.textContent = 'Submitted!'
    section.appendChild(success)
  } catch (err) {
    errorEl.textContent = 'Failed to submit. Try again.'
    confirmBtn.disabled = false
    confirmBtn.textContent = 'Submit'
  }
}

function openLeaderboard() {
  const modal = document.getElementById('leaderboard-modal')
  modal.classList.remove('hidden')
  showLeaderboardTab('anyPercent')
}

function closeLeaderboard() {
  const modal = document.getElementById('leaderboard-modal')
  modal.classList.add('hidden')
}

async function showLeaderboardTab(category) {
  const tabs = document.querySelectorAll('.lb-tab')
  tabs.forEach((tab) => {
    tab.classList.toggle('lb-tab-active', tab.dataset.category === category)
  })

  const body = document.getElementById('lb-body')
  body.textContent = 'Loading...'

  try {
    const entries = await fetchLeaderboard(daySeed, category)
    body.textContent = ''

    if (entries.length === 0) {
      body.textContent = 'No scores yet. Be the first!'
      return
    }

    const table = document.createElement('div')
    table.className = 'lb-table'

    entries.forEach((entry, i) => {
      const row = document.createElement('div')
      row.className = 'lb-row'

      const rank = document.createElement('span')
      rank.className = 'lb-rank'
      rank.textContent = `#${i + 1}`

      const name = document.createElement('span')
      name.className = 'lb-name'
      name.textContent = entry.name

      const time = document.createElement('span')
      time.className = 'lb-time'
      time.textContent = formatTime(entry.time)

      row.append(rank, name, time)
      table.appendChild(row)
    })

    body.appendChild(table)

    const bestLocal = getBestTimeForCategory(category)
    if (bestLocal !== null && (entries.length >= 50 || !entries.some((e) => e.time === bestLocal))) {
      const playerRank = await fetchPlayerRank(daySeed, category, bestLocal)
      if (playerRank > 50) {
        const yourRank = document.createElement('div')
        yourRank.className = 'lb-your-rank'
        yourRank.textContent = `Your best: #${playerRank} (${formatTime(bestLocal)})`
        body.appendChild(yourRank)
      }
    }
  } catch {
    body.textContent = 'Leaderboard unavailable.'
  }
}

function getBestTimeForCategory(category) {
  if (category === 'anyPercent') return stats.bestAnyPercent
  if (category === 'hundredRed') return stats.bestHundredRed
  if (category === 'hundredBlue') return stats.bestHundredBlue
  return null
}

function setupLeaderboardModal() {
  const modal = document.getElementById('leaderboard-modal')
  if (!modal) return

  document.getElementById('lb-close').addEventListener('click', closeLeaderboard)

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLeaderboard()
  })

  document.querySelectorAll('.lb-tab').forEach((tab) => {
    tab.addEventListener('click', () => showLeaderboardTab(tab.dataset.category))
  })

  document.getElementById('lb-open').addEventListener('click', openLeaderboard)
}

function handleKeyDown(e) {
  if (e.target.tagName === 'INPUT') return
  if (settingsOpen) return

  const lbModal = document.getElementById('leaderboard-modal')
  if (lbModal && !lbModal.classList.contains('hidden')) {
    if (e.key === 'Escape') closeLeaderboard()
    return
  }

  if (gameState === 'READY') {
    startGame()
    return
  }
  if (e.key === 'r' || e.key === 'R') {
    if (gameState === 'PLAYING') {
      stats.attempts++
      saveStats(daySeed, stats)
      resetToReady()
    } else if (gameState === 'COMPLETE') {
      restart()
    }
  } else if (e.key === 'Enter' && gameState === 'COMPLETE') {
    restart()
  }
}

function resetToReady() {
  restartRun(player, level, timer)
  resetRecorder(pathRecorder)
  gameState = 'READY'
  updateSettingsButtonState()
}

function restart() {
  const overlay = document.getElementById('results-overlay')
  overlay.classList.add('hidden')
  resetToReady()
}

function setupSettingsUI() {
  const gearBtn = document.getElementById('settings-btn')
  const overlay = document.getElementById('settings-overlay')
  if (!gearBtn || !overlay) return

  gearBtn.addEventListener('click', () => {
    if (gameState !== 'READY') return
    settingsOpen = true
    overlay.classList.remove('hidden')
    updateSettingsUI()
  })

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings()
  })

  const closeBtn = overlay.querySelector('.settings-close')
  if (closeBtn) closeBtn.addEventListener('click', closeSettings)

  const radios = overlay.querySelectorAll('input[name="ghost-category"]')
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      settings.ghostCategory = radio.value
      saveSettings(settings)
    })
  })
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay')
  overlay.classList.add('hidden')
  settingsOpen = false
}

function updateSettingsUI() {
  const overlay = document.getElementById('settings-overlay')
  const radios = overlay.querySelectorAll('input[name="ghost-category"]')
  radios.forEach(radio => {
    radio.checked = radio.value === settings.ghostCategory
  })
}

document.addEventListener('DOMContentLoaded', init)
