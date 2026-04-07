import { describe, it, expect } from 'vitest'
import { generateLevel, TILE } from '../../games/speedrun/src/level.js'
import { createPlayer } from '../../games/speedrun/src/player.js'
import { createPhysicsConfig, updatePlayer } from '../../games/speedrun/src/physics.js'
import { restartRun } from '../../games/speedrun/src/game.js'
import { createTimer } from '../../games/speedrun/src/timing.js'

describe('game integration', () => {
  it('initializes with player at start position', () => {
    const level = generateLevel('integration-test')
    const player = createPlayer(level.start.x, level.start.y)

    expect(player.x).toBe(level.start.x)
    expect(player.y).toBe(level.start.y)
    expect(player.redCoins).toBe(0)
    expect(player.blueCoins).toBe(0)
  })

  it('collecting a coin updates player state', () => {
    const config = createPhysicsConfig()
    // Create a small level with a coin right next to the player
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const tileSize = 32
    const level = {
      grid,
      width: 5,
      height: 5,
      tileSize,
      start: { x: 32, y: 4 * 32 - 28 },
      goal: { x: 128, y: 4 * 32 - 28 },
      redCoins: [{ x: 48, y: 4 * 32 - 20, collected: false }],
      blueCoins: [],
    }

    const player = createPlayer(32, 4 * 32 - 28)
    player.grounded = true

    // Move player toward the coin
    const input = { left: false, right: true, jump: false, jumpPressed: false }
    for (let i = 0; i < 60; i++) {
      updatePlayer(player, input, level, 1 / 60, config)
    }

    // Player should have collected the red coin
    expect(player.redCoins).toBe(1)
  })

  it('reaching the goal sets reachedGoal flag', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const tileSize = 32
    const level = {
      grid,
      width: 5,
      height: 5,
      tileSize,
      start: { x: 32, y: 4 * 32 - 28 },
      goal: { x: 96, y: 4 * 32 - 28 },
      redCoins: [],
      blueCoins: [],
    }

    const player = createPlayer(32, 4 * 32 - 28)
    player.grounded = true

    const input = { left: false, right: true, jump: false, jumpPressed: false }
    for (let i = 0; i < 60; i++) {
      if (player.reachedGoal) break
      updatePlayer(player, input, level, 1 / 60, config)
    }

    expect(player.reachedGoal).toBe(true)
  })
})

describe('restartRun', () => {
  function makeLevel() {
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    return {
      grid,
      width: 5,
      height: 5,
      tileSize: 32,
      start: { x: 32, y: 4 * 32 - 28 },
      goal: { x: 128, y: 4 * 32 - 28 },
      redCoins: [
        { x: 48, y: 80, collected: true },
        { x: 80, y: 80, collected: true },
      ],
      blueCoins: [
        { x: 112, y: 80, collected: true },
      ],
    }
  }

  it('resets player position and velocity to start', () => {
    const level = makeLevel()
    const player = createPlayer(100, 50)
    player.vx = 200
    player.vy = -100
    player.redCoins = 2
    player.blueCoins = 1
    player.reachedGoal = true
    const timer = createTimer()
    timer.elapsed = 15.5
    timer.running = false

    restartRun(player, level, timer)

    expect(player.x).toBe(level.start.x)
    expect(player.y).toBe(level.start.y)
    expect(player.vx).toBe(0)
    expect(player.vy).toBe(0)
    expect(player.reachedGoal).toBe(false)
  })

  it('resets player coin counts to zero', () => {
    const level = makeLevel()
    const player = createPlayer(100, 50)
    player.redCoins = 2
    player.blueCoins = 1
    const timer = createTimer()
    timer.elapsed = 5.0

    restartRun(player, level, timer)

    expect(player.redCoins).toBe(0)
    expect(player.blueCoins).toBe(0)
  })

  it('resets timer to zero and starts it running', () => {
    const level = makeLevel()
    const player = createPlayer(100, 50)
    const timer = createTimer()
    timer.elapsed = 23.7
    timer.running = false

    restartRun(player, level, timer)

    expect(timer.elapsed).toBe(0)
    expect(timer.running).toBe(true)
  })

  it('resets all coin collected flags to false', () => {
    const level = makeLevel()
    const player = createPlayer(100, 50)
    const timer = createTimer()

    restartRun(player, level, timer)

    for (const coin of level.redCoins) {
      expect(coin.collected).toBe(false)
    }
    for (const coin of level.blueCoins) {
      expect(coin.collected).toBe(false)
    }
  })
})
