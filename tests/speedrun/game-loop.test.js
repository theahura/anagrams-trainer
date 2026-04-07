import { describe, it, expect } from 'vitest'
import { generateLevel, TILE } from '../../games/speedrun/src/level.js'
import { createPlayer } from '../../games/speedrun/src/player.js'
import { createPhysicsConfig, updatePlayer } from '../../games/speedrun/src/physics.js'

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
