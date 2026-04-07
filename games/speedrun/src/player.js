export function createPlayer(x, y) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: false,
    wallDir: 0, // -1 = touching left wall, 1 = touching right wall, 0 = none
    coyoteTimer: 1, // start expired
    jumpBufferTimer: 1, // start expired
    jumpHeld: false,
    redCoins: 0,
    blueCoins: 0,
    reachedGoal: false,
  }
}

export function resetPlayer(player, x, y) {
  player.x = x
  player.y = y
  player.vx = 0
  player.vy = 0
  player.grounded = false
  player.wallDir = 0
  player.coyoteTimer = 1
  player.jumpBufferTimer = 1
  player.jumpHeld = false
  player.redCoins = 0
  player.blueCoins = 0
  player.reachedGoal = false
}

export const PLAYER_WIDTH = 20
export const PLAYER_HEIGHT = 28
