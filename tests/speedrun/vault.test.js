import { describe, it, expect } from 'vitest'
import { createPlayer, PLAYER_WIDTH, PLAYER_HEIGHT } from '../../games/speedrun/src/player.js'
import { createPhysicsConfig, updatePlayer } from '../../games/speedrun/src/physics.js'

function makeLevel(grid) {
  const tileSize = 32
  return {
    grid,
    width: grid[0].length,
    height: grid.length,
    tileSize,
    start: { x: 32, y: 32 },
    goal: { x: 9999, y: 9999 },
    redCoins: [],
    blueCoins: [],
  }
}

function noInput() {
  return { left: false, right: false, jump: false, jumpPressed: false }
}

function jumpInput() {
  return { left: false, right: false, jump: true, jumpPressed: true }
}

describe('corner vault', () => {
  it('triggers vault when bottom 20% clips a platform corner and jump is pressed', () => {
    const config = createPhysicsConfig()
    // Platform block at row 3, col 2. Open space above at row 2, col 2.
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Place player just to the left of the platform at col 2 (x=64).
    // Player's right edge is at player.x + PLAYER_WIDTH.
    // Player's bottom edge overlaps into tile row 3 by 4px (within 20% = ~6px).
    // Tile row 3 top = 3*32 = 96. Player bottom = player.y + 28 = 100. So player.y = 72.
    // Overlap = 100 - 96 = 4px. Within threshold.
    // Player is to the left: player.x + PLAYER_WIDTH < 64 (tile left edge).
    // So player.x = 64 - PLAYER_WIDTH - 1 = 43
    const player = createPlayer(43, 72)
    player.vy = 50 // falling

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Vault should fire: vy should be strongly negative (upward jump)
    expect(player.vy).toBeLessThan(-500)
    // Player is to the LEFT of the corner, so boost should push left (away from block).
    expect(player.vx).toBeLessThan(0)
  })

  it('does not trigger vault when overlap exceeds 20% of player height', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Tile row 3 top = 96. Overlap = 8px (> 6px threshold).
    // Player bottom = player.y + 28 = 104. player.y = 76.
    const player = createPlayer(43, 76)
    player.vy = 50

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Should NOT vault — player should still be falling (vy positive)
    expect(player.vy).toBeGreaterThan(0)
  })

  it('does not trigger vault when player is grounded', () => {
    const config = createPhysicsConfig()
    // Flat floor with a step up
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player standing on the floor (row 4, top = 128).
    // Grounded on the floor at row 4.
    const player = createPlayer(43, 4 * 32 - PLAYER_HEIGHT)
    player.grounded = true

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Regular jump should fire (not vault). vy should be negative (upward).
    // vx should NOT have a vault boost (should stay ~0).
    expect(player.vy).toBeLessThan(0)
    expect(Math.abs(player.vx)).toBeLessThan(10) // no significant horizontal boost
  })

  it('vault adds momentum away from corner on the left side', () => {
    const config = createPhysicsConfig()
    // Platform block at row 3, col 1. Player to the right.
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Tile col 1 right edge = 64. Player's left edge just past the right edge of the block.
    // player.x = 64 + 1 = 65. Player bottom clips into tile row 3.
    // Tile row 3 top = 96. Player.y = 72 → bottom = 100 → overlap = 4px.
    const player = createPlayer(65, 72)
    player.vy = 50

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Vault should fire: vy should be strongly negative (upward jump)
    expect(player.vy).toBeLessThan(-500)
    // Corner is to the LEFT, so boost should push RIGHT (away from block)
    expect(player.vx).toBeGreaterThan(0)
  })

  it('does not trigger vault when space above corner is solid', () => {
    const config = createPhysicsConfig()
    // Both row 2 and row 3 at col 2 are solid — no space above
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    const player = createPlayer(43, 72)
    player.vy = 50

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Should NOT vault — player should still be falling (vy positive)
    expect(player.vy).toBeGreaterThan(0)
  })

  it('vault snaps player Y to clear the corner', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    const player = createPlayer(43, 72)
    player.vy = 50

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // After vault, player feet should be at or above tile row 3 top (96)
    // player.y + PLAYER_HEIGHT <= 96
    expect(player.y + PLAYER_HEIGHT).toBeLessThanOrEqual(96)
  })

  it('vault exhausts coyote and jump buffer timers', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    const player = createPlayer(43, 72)
    player.vy = 50

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    expect(player.coyoteTimer).toBeGreaterThanOrEqual(config.coyoteTime)
    expect(player.jumpBufferTimer).toBeGreaterThanOrEqual(config.jumpBufferTime)
  })

  it('wall jump takes priority over vault when wallDir is set', () => {
    const config = createPhysicsConfig()
    // Wall on the right side, player touching it
    const grid = [
      [0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player touching the wall on the right. wallDir = 1.
    // Also position so bottom clips a corner.
    const player = createPlayer(3 * 32 - PLAYER_WIDTH - 1, 72)
    player.vy = 50
    player.wallDir = 1

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Wall jump should fire: vx pushed away from wall (negative, away from right wall)
    expect(player.vx).toBeLessThan(0)
  })
})
