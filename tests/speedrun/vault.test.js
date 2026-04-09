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

function jumpInput() {
  return { left: false, right: false, jump: true, jumpPressed: true }
}

describe('corner vault', () => {
  // The vault scenario: player is wall-sliding on a platform edge.
  // Their top half has passed the corner (open space), bottom half is still on the wall.
  // Press jump → vault forward over the platform instead of wall jumping away.
  //
  // Platform layout for most tests:
  //   row 2: [0, 0, 0, 0, 0]   ← open above platform
  //   row 3: [0, 0, 1, 1, 1]   ← platform (1 tile tall)
  //   row 4: [1, 1, 1, 1, 1]   ← floor
  //
  // Player is to the left of col 2, sliding down its left edge.
  // When their top half is above row 3 and bottom half is beside row 3 → vault.

  it('triggers vault when top half is clear and bottom half is on wall', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player flush against left edge of platform at col 2 (x=64).
    // player.x = 64 - PLAYER_WIDTH = 44. Right edge flush with tile.
    // Position so top probe (y+4) is in row 2 (open), bottom probe (y+24) is in row 3 (solid).
    // Row 3 spans y=96..128. Bottom probe at y+24 must be >= 96 → y >= 72.
    // Top probe at y+4 must be < 96 → y < 92. Use y=80.
    const player = createPlayer(44, 80)
    player.vy = 50 // falling / wall sliding
    player.wallDir = 1 // touching wall to the right

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Vault should fire: upward jump + forward momentum (toward the platform)
    expect(player.vy).toBeLessThan(-500)
    expect(player.vx).toBeGreaterThan(100) // pushed right, over the platform
    expect(player.vaultFlashTimer).toBeGreaterThan(0)
  })

  it('does normal wall jump when full body is on the wall', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [0, 0, 1, 1, 1],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player against the wall, entire body beside solid tiles.
    // y=72: top probe at y+4=76 (row 2, solid), bottom probe at y+24=96 (row 3, solid).
    const player = createPlayer(44, 72)
    player.vy = 50
    player.wallDir = 1

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Normal wall jump: pushed AWAY from wall (negative vx)
    expect(player.vx).toBeLessThan(0)
    expect(player.vaultFlashTimer).toBe(0)
  })

  it('vault pushes toward the platform on the left side', () => {
    const config = createPhysicsConfig()
    // Platform to the left
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player flush against right edge of platform at col 2 (right edge at x=96).
    // player.x = 96. Left edge at 96, right edge at 116.
    // wallDir = -1 (wall to the left). Top clear, bottom on wall.
    const player = createPlayer(96, 80)
    player.vy = 50
    player.wallDir = -1

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    expect(player.vy).toBeLessThan(-500)
    expect(player.vx).toBeLessThan(-100) // pushed left, over the platform
    expect(player.vaultFlashTimer).toBeGreaterThan(0)
  })

  it('does not trigger vault when player is grounded', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    const player = createPlayer(44, 4 * 32 - PLAYER_HEIGHT)
    player.grounded = true

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    // Regular ground jump, no vault
    expect(player.vy).toBeLessThan(0)
    expect(player.vaultFlashTimer).toBe(0)
  })

  it('vault triggers when player just landed on platform edge pressing into it', () => {
    const config = createPhysicsConfig()
    // Platform at row 3, cols 2-4. Player just landed on the left edge.
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player grounded on the edge, just landed (groundedTime near 0).
    // Their hitbox overhangs the left edge (player.x=64, col 2 starts at 64,
    // but col 1 at row 3 is air — player's left side is at the boundary).
    // Actually place player so they overhang: x=60, left side in col 1 (air at row 3).
    const player = createPlayer(60, 3 * 32 - PLAYER_HEIGHT)
    player.grounded = true
    player.groundedTime = 0.02 // just landed

    const input = { left: false, right: true, jump: true, jumpPressed: true }
    updatePlayer(player, input, level, 1 / 60, config)

    // Should vault RIGHT (forward over the platform)
    expect(player.vy).toBeLessThan(-500)
    expect(player.vx).toBeGreaterThan(100)
    expect(player.vaultFlashTimer).toBeGreaterThan(0)
  })

  it('does not vault when player walked to edge and was already grounded', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player has been grounded for a while (walked to the edge), pressing right + jump.
    const player = createPlayer(64, 3 * 32 - PLAYER_HEIGHT)
    player.grounded = true
    player.groundedTime = 1.0 // been grounded for a full second

    const input = { left: false, right: true, jump: true, jumpPressed: true }
    updatePlayer(player, input, level, 1 / 60, config)

    // Regular jump, no vault boost
    expect(player.vy).toBeLessThan(0)
    expect(player.vaultFlashTimer).toBe(0)
  })

  it('edge vault triggers on the right side of a platform', () => {
    const config = createPhysicsConfig()
    // Platform at row 3, cols 0-2. Player landed on the right edge.
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player overhangs the right edge: right side extends into col 3 (air at row 3).
    // player.x = 80, right edge = 100, in col 3 (starts at 96). Pressing left into platform.
    const player = createPlayer(80, 3 * 32 - PLAYER_HEIGHT)
    player.grounded = true
    player.groundedTime = 0.02

    const input = { left: true, right: false, jump: true, jumpPressed: true }
    updatePlayer(player, input, level, 1 / 60, config)

    // Should vault LEFT (forward over the platform)
    expect(player.vy).toBeLessThan(-500)
    expect(player.vx).toBeLessThan(-100)
    expect(player.vaultFlashTimer).toBeGreaterThan(0)
  })

  it('edge vault does not trigger when player is in the middle of a platform', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player in the middle of the platform, not overhanging any edge.
    const player = createPlayer(72, 3 * 32 - PLAYER_HEIGHT)
    player.grounded = true
    player.groundedTime = 0.02

    const input = { left: false, right: true, jump: true, jumpPressed: true }
    updatePlayer(player, input, level, 1 / 60, config)

    // Regular jump, no vault
    expect(player.vaultFlashTimer).toBe(0)
  })

  it('edge vault does not trigger at game start', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Fresh player (groundedTime starts at 1, simulating game start)
    const player = createPlayer(60, 3 * 32 - PLAYER_HEIGHT)
    player.grounded = true
    // groundedTime defaults to 1 — not "just landed"

    const input = { left: false, right: true, jump: true, jumpPressed: true }
    updatePlayer(player, input, level, 1 / 60, config)

    expect(player.vaultFlashTimer).toBe(0)
  })

  it('edge vault does not trigger when not pressing into the platform', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    // Player overhangs the left edge, just landed, but pressing LEFT (away from platform)
    const player = createPlayer(60, 3 * 32 - PLAYER_HEIGHT)
    player.grounded = true
    player.groundedTime = 0.02

    const input = { left: true, right: false, jump: true, jumpPressed: true }
    updatePlayer(player, input, level, 1 / 60, config)

    // No vault — wrong direction
    expect(player.vaultFlashTimer).toBe(0)
  })

  it('vault exhausts coyote and jump buffer timers', () => {
    const config = createPhysicsConfig()
    const grid = [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ]
    const level = makeLevel(grid)

    const player = createPlayer(44, 80)
    player.vy = 50
    player.wallDir = 1

    updatePlayer(player, jumpInput(), level, 1 / 60, config)

    expect(player.coyoteTimer).toBeGreaterThanOrEqual(config.coyoteTime)
    expect(player.jumpBufferTimer).toBeGreaterThanOrEqual(config.jumpBufferTime)
  })
})
