import { TILE } from './level.js'
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './player.js'

export function createPhysicsConfig() {
  const jumpHeight = 3.5 * 32 // 3.5 tiles
  const timeToApex = 0.35 // seconds
  const gravity = (2 * jumpHeight) / (timeToApex * timeToApex)
  const jumpSpeed = -(2 * jumpHeight) / timeToApex // negative = upward

  return {
    gravity,
    jumpSpeed,
    jumpCutMultiplier: 3.0,
    fallMultiplier: 1.6,
    maxFallSpeed: 500,
    maxRunSpeed: 250,
    groundAccel: 2000,
    airAccel: 1200,
    groundDecel: 1800,
    coyoteTime: 0.1,
    jumpBufferTime: 0.1,
    wallSlideMaxSpeed: 60,
    wallJumpHorizontalSpeed: 200,
    wallJumpVerticalSpeed: jumpSpeed * 0.85,
    wallJumpControlDelay: 0.15,
  }
}

export function updatePlayer(player, input, level, dt, config) {
  const wasGrounded = player.grounded

  // Tick wall jump control timer
  if (player.wallJumpControlTimer > 0) {
    player.wallJumpControlTimer = Math.max(0, player.wallJumpControlTimer - dt)
  }

  // Clear control timer on grounding
  if (player.grounded) {
    player.wallJumpControlTimer = 0
  }

  // Update coyote timer
  if (wasGrounded) {
    player.coyoteTimer = 0
  } else {
    player.coyoteTimer += dt
  }

  // Update jump buffer
  if (input.jumpPressed) {
    player.jumpBufferTimer = 0
  } else {
    player.jumpBufferTimer += dt
  }

  // Track jump held state
  player.jumpHeld = input.jump

  // Horizontal movement
  const accel = player.grounded ? config.groundAccel : config.airAccel
  const decel = config.groundDecel

  // During wall jump control delay, override input with forced direction
  let moveLeft = input.left
  let moveRight = input.right
  if (player.wallJumpControlTimer > 0) {
    moveLeft = player.wallJumpForceDir < 0
    moveRight = player.wallJumpForceDir > 0
  }

  if (moveLeft) {
    player.vx = moveToward(player.vx, -config.maxRunSpeed, accel * dt)
  } else if (moveRight) {
    player.vx = moveToward(player.vx, config.maxRunSpeed, accel * dt)
  } else {
    player.vx = moveToward(player.vx, 0, decel * dt)
  }

  // Jumping
  const canCoyoteJump = player.coyoteTimer < config.coyoteTime
  const hasBufferedJump = player.jumpBufferTimer < config.jumpBufferTime

  if (input.jumpPressed || hasBufferedJump) {
    if (player.grounded || canCoyoteJump) {
      // Regular jump
      player.vy = config.jumpSpeed
      player.grounded = false
      player.coyoteTimer = config.coyoteTime // exhaust coyote time
      player.jumpBufferTimer = config.jumpBufferTime // exhaust buffer
      player.jumpHeld = true
    } else if (player.wallDir !== 0) {
      // Wall jump
      player.vy = config.wallJumpVerticalSpeed
      player.vx = -player.wallDir * config.wallJumpHorizontalSpeed
      player.wallJumpForceDir = -player.wallDir
      player.wallJumpControlTimer = config.wallJumpControlDelay
      player.wallDir = 0
      player.coyoteTimer = config.coyoteTime
      player.jumpBufferTimer = config.jumpBufferTime
      player.jumpHeld = true
    }
  }

  // Variable jump height — increased gravity when not holding jump while rising
  let gravMultiplier = 1.0
  if (player.vy < 0) {
    // Rising
    if (!player.jumpHeld) {
      gravMultiplier = config.jumpCutMultiplier
    }
  } else if (player.vy > 0) {
    // Falling
    gravMultiplier = config.fallMultiplier
  }

  player.vy += config.gravity * gravMultiplier * dt

  // Wall sliding
  if (player.wallDir !== 0 && player.vy > 0 && !player.grounded) {
    if ((player.wallDir === 1 && moveRight) || (player.wallDir === -1 && moveLeft)) {
      player.vy = Math.min(player.vy, config.wallSlideMaxSpeed)
    }
  }

  // Clamp fall speed
  if (player.vy > config.maxFallSpeed) {
    player.vy = config.maxFallSpeed
  }

  // Move X and resolve collisions
  player.x += player.vx * dt
  resolveCollisionX(player, level)

  // Move Y and resolve collisions
  player.y += player.vy * dt
  resolveCollisionY(player, level)

  // Detect wall contact
  player.wallDir = 0
  if (!player.grounded) {
    // Check left wall
    if (isSolidAt(player.x - 1, player.y + 4, level) ||
        isSolidAt(player.x - 1, player.y + PLAYER_HEIGHT - 4, level)) {
      player.wallDir = -1
    }
    // Check right wall
    if (isSolidAt(player.x + PLAYER_WIDTH + 1, player.y + 4, level) ||
        isSolidAt(player.x + PLAYER_WIDTH + 1, player.y + PLAYER_HEIGHT - 4, level)) {
      player.wallDir = 1
    }
  }

  // Check coin collection
  const playerCenterX = player.x + PLAYER_WIDTH / 2
  const playerCenterY = player.y + PLAYER_HEIGHT / 2
  const coinRadius = 16

  for (const coin of level.redCoins) {
    if (coin.collected) continue
    const dx = playerCenterX - coin.x
    const dy = playerCenterY - coin.y
    if (dx * dx + dy * dy < coinRadius * coinRadius) {
      coin.collected = true
      player.redCoins++
    }
  }

  for (const coin of level.blueCoins) {
    if (coin.collected) continue
    const dx = playerCenterX - coin.x
    const dy = playerCenterY - coin.y
    if (dx * dx + dy * dy < coinRadius * coinRadius) {
      coin.collected = true
      player.blueCoins++
    }
  }

  // Check goal
  if (!player.reachedGoal) {
    const goalDx = playerCenterX - (level.goal.x + level.tileSize / 2)
    const goalDy = playerCenterY - (level.goal.y + level.tileSize / 2)
    if (Math.abs(goalDx) < level.tileSize && Math.abs(goalDy) < level.tileSize) {
      player.reachedGoal = true
    }
  }

  // Respawn if fallen off the bottom
  if (player.y > level.height * level.tileSize) {
    player.x = level.start.x
    player.y = level.start.y
    player.vx = 0
    player.vy = 0
    player.grounded = false
    player.wallJumpControlTimer = 0
  }
}

function moveToward(current, target, maxDelta) {
  if (current < target) {
    return Math.min(current + maxDelta, target)
  } else {
    return Math.max(current - maxDelta, target)
  }
}

function isSolidAt(px, py, level) {
  const tx = Math.floor(px / level.tileSize)
  const ty = Math.floor(py / level.tileSize)
  if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) return false
  return level.grid[ty][tx] === TILE.SOLID
}

function resolveCollisionX(player, level) {
  const ts = level.tileSize
  const left = Math.floor(player.x / ts)
  const right = Math.floor((player.x + PLAYER_WIDTH - 1) / ts)
  const top = Math.floor(player.y / ts)
  const bottom = Math.floor((player.y + PLAYER_HEIGHT - 1) / ts)

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) continue
      if (level.grid[ty][tx] !== TILE.SOLID) continue

      const tileLeft = tx * ts
      const tileRight = tileLeft + ts
      const overlapLeft = (player.x + PLAYER_WIDTH) - tileLeft
      const overlapRight = tileRight - player.x

      if (overlapLeft < overlapRight) {
        player.x = tileLeft - PLAYER_WIDTH
      } else {
        player.x = tileRight
      }
      player.vx = 0
    }
  }
}

function resolveCollisionY(player, level) {
  const ts = level.tileSize
  const left = Math.floor(player.x / ts)
  const right = Math.floor((player.x + PLAYER_WIDTH - 1) / ts)
  const top = Math.floor(player.y / ts)
  const bottom = Math.floor((player.y + PLAYER_HEIGHT - 1) / ts)

  player.grounded = false

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) continue
      if (level.grid[ty][tx] !== TILE.SOLID) continue

      const tileTop = ty * ts
      const tileBottom = tileTop + ts
      const overlapTop = (player.y + PLAYER_HEIGHT) - tileTop
      const overlapBottom = tileBottom - player.y

      if (overlapTop < overlapBottom) {
        player.y = tileTop - PLAYER_HEIGHT
        player.vy = 0
        player.grounded = true
      } else {
        player.y = tileBottom
        player.vy = 0
      }
    }
  }
}
