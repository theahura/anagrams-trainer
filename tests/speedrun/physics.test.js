import { describe, it, expect } from 'vitest'
import {
  createPhysicsConfig,
  updatePlayer,
} from '../../games/speedrun/src/physics.js'
import { createPlayer } from '../../games/speedrun/src/player.js'
import { TILE } from '../../games/speedrun/src/level.js'

function makeLevel(grid) {
  const tileSize = 32
  return {
    grid,
    width: grid[0].length,
    height: grid.length,
    tileSize,
    start: { x: tileSize, y: (grid.length - 2) * tileSize },
    goal: { x: (grid[0].length - 2) * tileSize, y: tileSize },
    redCoins: [],
    blueCoins: [],
  }
}

function emptyInput() {
  return { left: false, right: false, jump: false, jumpPressed: false }
}

describe('physics', () => {
  it('player falls due to gravity when not on ground', () => {
    const config = createPhysicsConfig()
    // 5x5 grid, all empty except bottom row
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    const player = createPlayer(64, 32) // in the air
    const input = emptyInput()

    const dt = 1 / 60
    updatePlayer(player, input, level, dt, config)

    expect(player.vy).toBeGreaterThan(0) // positive Y is downward
    expect(player.y).toBeGreaterThan(32)
  })

  it('player lands on a platform and stops falling', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    // Place player just above the platform
    const platformTop = 3 * 32
    const player = createPlayer(64, platformTop - 28) // player height = 28
    player.vy = 100

    const input = emptyInput()
    updatePlayer(player, input, level, 1 / 60, config)

    expect(player.grounded).toBe(true)
    expect(player.vy).toBe(0)
  })

  it('player cannot move through solid tiles horizontally', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    // Player to the left of the wall, on the ground
    const player = createPlayer(32, 3 * 32 - 28)
    player.grounded = true
    player.vx = 300 // moving right fast

    const input = { left: false, right: true, jump: false, jumpPressed: false }
    updatePlayer(player, input, level, 1 / 60, config)

    // Player should not pass through the wall at column 2
    expect(player.x).toBeLessThan(2 * 32 - 20) // player width = 20
  })

  it('variable jump: releasing jump gives lower height', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    const groundY = 4 * 32 - 28

    // Full jump: hold jump for 30 frames
    const playerFull = createPlayer(64, groundY)
    playerFull.grounded = true
    const inputHeld = { left: false, right: false, jump: true, jumpPressed: true }
    updatePlayer(playerFull, inputHeld, level, 1 / 60, config) // initiate jump

    for (let i = 0; i < 29; i++) {
      updatePlayer(playerFull, { ...inputHeld, jumpPressed: false }, level, 1 / 60, config)
    }
    const fullHeight = groundY - playerFull.y

    // Short jump: release jump after 5 frames
    const playerShort = createPlayer(64, groundY)
    playerShort.grounded = true
    updatePlayer(playerShort, { ...inputHeld, jumpPressed: true }, level, 1 / 60, config)

    const inputReleased = { left: false, right: false, jump: false, jumpPressed: false }
    for (let i = 0; i < 29; i++) {
      updatePlayer(playerShort, inputReleased, level, 1 / 60, config)
    }
    const shortHeight = groundY - playerShort.y

    expect(fullHeight).toBeGreaterThan(shortHeight)
  })

  it('coyote time: player can jump shortly after leaving an edge', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0], // platform only on left side
      [1, 1, 0, 0, 0],
    ]
    const level = makeLevel(grid)
    const player = createPlayer(32, 3 * 32 - 28)
    player.grounded = true
    player.vx = 200

    // Walk off the edge
    const inputRight = { left: false, right: true, jump: false, jumpPressed: false }
    for (let i = 0; i < 5; i++) {
      updatePlayer(player, inputRight, level, 1 / 60, config)
    }

    // Player should be off the edge now but within coyote time
    expect(player.grounded).toBe(false)

    // Try to jump during coyote time
    const inputJump = { left: false, right: false, jump: true, jumpPressed: true }
    updatePlayer(player, inputJump, level, 1 / 60, config)
    // Should have jumped (velocity upward)
    expect(player.vy).toBeLessThan(0)
  })

  it('input buffer: jump pressed just before landing executes on land', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    // Player very close to the ground, falling
    const groundY = 4 * 32 - 28
    const player = createPlayer(64, groundY - 5) // just 5px above ground
    player.vy = 100

    // Press jump while in air (before landing) — should buffer
    const inputJump = { left: false, right: false, jump: true, jumpPressed: true }
    updatePlayer(player, inputJump, level, 1 / 60, config)

    // Continue with jump held — player should land and buffered jump should fire
    const inputHeld = { left: false, right: false, jump: true, jumpPressed: false }
    for (let i = 0; i < 5; i++) {
      updatePlayer(player, inputHeld, level, 1 / 60, config)
    }

    // After landing with buffered input, player should jump
    expect(player.vy).toBeLessThan(0) // negative = upward
  })

  it('wall slide: falling speed reduced when touching wall', () => {
    const config = createPhysicsConfig()
    // Tall grid with no ground so free fall player doesn't land
    const grid = Array.from({ length: 20 }, () => [0, 0, 1, 0, 0])
    const level = makeLevel(grid)

    // Player in free fall (no wall, no ground)
    const freeFallPlayer = createPlayer(96, 32)
    freeFallPlayer.vy = 0
    const input = emptyInput()
    for (let i = 0; i < 30; i++) {
      updatePlayer(freeFallPlayer, input, level, 1 / 60, config)
    }

    // Player wall sliding (touching wall, pressing into it)
    const wallPlayer = createPlayer(2 * 32 - 20 - 1, 32)
    wallPlayer.vy = 0
    const wallInput = { left: false, right: true, jump: false, jumpPressed: false }
    for (let i = 0; i < 30; i++) {
      updatePlayer(wallPlayer, wallInput, level, 1 / 60, config)
    }

    // Wall slider should have lower fall speed
    expect(wallPlayer.vy).toBeLessThan(freeFallPlayer.vy)
  })

  it('wall jump: player gets velocity away from wall and upward', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    // Player next to wall, sliding down
    const player = createPlayer(2 * 32 - 20 - 1, 64)
    player.vy = 50
    player.wallDir = 1 // touching wall on right

    const wallInput = { left: false, right: true, jump: false, jumpPressed: false }
    // Slide into wall for a few frames to establish wall contact
    for (let i = 0; i < 3; i++) {
      updatePlayer(player, wallInput, level, 1 / 60, config)
    }

    // Now wall jump
    const jumpInput = { left: false, right: false, jump: true, jumpPressed: true }
    updatePlayer(player, jumpInput, level, 1 / 60, config)

    expect(player.vy).toBeLessThan(0) // upward
    expect(player.vx).toBeLessThan(0) // away from right wall
  })

  it('horizontal movement uses acceleration, not instant velocity', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)
    const player = createPlayer(64, 4 * 32 - 28)
    player.grounded = true

    const input = { left: false, right: true, jump: false, jumpPressed: false }
    updatePlayer(player, input, level, 1 / 60, config)

    // After one frame, velocity should be positive but less than max speed
    expect(player.vx).toBeGreaterThan(0)
    expect(player.vx).toBeLessThan(config.maxRunSpeed)
  })

  it('player respects max fall speed', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0], // no ground — player falls forever
    ]
    const level = makeLevel(grid)
    const player = createPlayer(64, 0)

    const input = emptyInput()
    // Fall for many frames
    for (let i = 0; i < 300; i++) {
      updatePlayer(player, input, level, 1 / 60, config)
    }

    expect(player.vy).toBeLessThanOrEqual(config.maxFallSpeed)
  })
})
