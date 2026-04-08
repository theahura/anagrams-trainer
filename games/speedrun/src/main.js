import { generateLevel, getDailySeed } from './level.js'
import { createPlayer } from './player.js'
import { createPhysicsConfig, updatePlayer } from './physics.js'
import { createInputState, setupInputListeners, clearFrameInput } from './input.js'
import { createTimer, updateTimer, formatTime, createCompletionRecord } from './timing.js'
import { loadStats, saveStats, updatePersonalBest } from './stats.js'
import { createRenderer } from './renderer.js'
import { restartRun } from './game.js'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 608

let gameState = 'READY' // READY, PLAYING, COMPLETE
let level, player, timer, stats, config, renderer, inputState
let daySeed
let lastTime = 0

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

  document.addEventListener('keydown', handleKeyDown)

  requestAnimationFrame(gameLoop)
}

function startGame() {
  gameState = 'PLAYING'
  timer.running = true
  clearFrameInput(inputState)
}

function gameLoop(timestamp) {
  const dt = lastTime === 0 ? 1 / 60 : Math.min((timestamp - lastTime) / 1000, 1 / 30)
  lastTime = timestamp

  if (gameState === 'PLAYING') {
    updateTimer(timer, dt)
    updatePlayer(player, inputState, level, dt, config)
    clearFrameInput(inputState)

    if (player.reachedGoal) {
      completeRun()
    }
  } else {
    clearFrameInput(inputState)
  }

  renderer.render(level, player, timer, gameState, stats, daySeed)
  requestAnimationFrame(gameLoop)
}

function completeRun() {
  gameState = 'COMPLETE'
  timer.running = false

  const record = createCompletionRecord(timer, player, level)
  stats.attempts++
  stats = updatePersonalBest(stats, record)
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

function handleKeyDown(e) {
  if (gameState === 'READY') {
    startGame()
    return
  }
  if (e.key === 'r' || e.key === 'R') {
    if (gameState === 'PLAYING') {
      stats.attempts++
      saveStats(daySeed, stats)
      restartRun(player, level, timer)
    } else if (gameState === 'COMPLETE') {
      restart()
    }
  } else if (e.key === 'Enter' && gameState === 'COMPLETE') {
    restart()
  }
}

function restart() {
  const overlay = document.getElementById('results-overlay')
  overlay.classList.add('hidden')

  restartRun(player, level, timer)
  gameState = 'PLAYING'
}

document.addEventListener('DOMContentLoaded', init)
