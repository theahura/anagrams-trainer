import { getSeededRng } from './prng.js'
import { PLAYER_HEIGHT } from './player.js'

export const TILE = {
  EMPTY: 0,
  SOLID: 1,
}

const GRID_W = 25
const GRID_H = 19
const TILE_SIZE = 32

const JUMP_H = 4
const JUMP_D = 5

const HIGH_LANE = { minRow: 3, maxRow: 7 }
const LOW_LANE = { minRow: 11, maxRow: 15 }
const MID_LANE = { minRow: 8, maxRow: 10 }

export function getDailySeed(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function generateLevel(seed) {
  const rng = getSeededRng(seed)
  const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE.EMPTY))

  // Bottom 2 rows are ground
  for (let x = 0; x < GRID_W; x++) {
    grid[GRID_H - 1][x] = TILE.SOLID
    grid[GRID_H - 2][x] = TILE.SOLID
  }

  // Add ground gaps (pits)
  for (let x = 4; x < GRID_W - 4; x++) {
    if (rng() < 0.12) {
      grid[GRID_H - 1][x] = TILE.EMPTY
      grid[GRID_H - 2][x] = TILE.EMPTY
      if (x + 1 < GRID_W - 4 && rng() < 0.5) {
        grid[GRID_H - 1][x + 1] = TILE.EMPTY
        grid[GRID_H - 2][x + 1] = TILE.EMPTY
        x++
      }
    }
  }

  // Add wall columns on left and right edges
  for (let y = 0; y < GRID_H; y++) {
    grid[y][0] = TILE.SOLID
    grid[y][GRID_W - 1] = TILE.SOLID
  }

  // Generate platform chains for high and low routes
  const highPlatforms = generateLaneChain(grid, HIGH_LANE, rng, 2, GRID_W - 3)
  const lowPlatforms = generateLaneChain(grid, LOW_LANE, rng, 2, GRID_W - 3)

  // Add connector platforms in the mid lane
  const connectors = placeConnectors(grid, highPlatforms, lowPlatforms, rng)

  // Start position: left side, on ground
  const startX = 2 * TILE_SIZE
  const startY = findGroundY(grid, 2) * TILE_SIZE - PLAYER_HEIGHT

  // Goal position: highest right-half high-route platform
  let goalX, goalY
  const rightHighPlatforms = highPlatforms
    .filter(p => p.x + p.width / 2 > GRID_W / 2)
    .sort((a, b) => a.y - b.y)
  if (rightHighPlatforms.length > 0) {
    const goalPlat = rightHighPlatforms[0]
    goalX = (goalPlat.x + Math.floor(goalPlat.width / 2)) * TILE_SIZE
    goalY = (goalPlat.y - 1) * TILE_SIZE
  } else if (highPlatforms.length > 0) {
    const goalPlat = highPlatforms[highPlatforms.length - 1]
    goalX = (goalPlat.x + Math.floor(goalPlat.width / 2)) * TILE_SIZE
    goalY = (goalPlat.y - 1) * TILE_SIZE
  } else {
    goalX = (GRID_W - 3) * TILE_SIZE
    goalY = findGroundY(grid, GRID_W - 3) * TILE_SIZE - PLAYER_HEIGHT
  }

  // Route-biased coin placement
  const goalCenterX = goalX + TILE_SIZE / 2
  const goalCenterY = goalY + TILE_SIZE / 2
  const isOutsideGoal = (pos) =>
    Math.abs(pos.x - goalCenterX) >= TILE_SIZE || Math.abs(pos.y - goalCenterY) >= TILE_SIZE

  const allHighPositions = collectSurfacePositions(grid, highPlatforms)
  const allLowPositions = collectSurfacePositions(grid, lowPlatforms)

  // Add ground-level positions to low route
  for (let x = 3; x < GRID_W - 3; x++) {
    const gy = findGroundY(grid, x)
    if (gy > 0 && grid[gy - 1][x] === TILE.EMPTY) {
      allLowPositions.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: (gy - 1) * TILE_SIZE + TILE_SIZE / 2 })
    }
  }

  const highPositions = allHighPositions.filter(isOutsideGoal)
  const lowPositions = allLowPositions.filter(isOutsideGoal)

  shuffle(highPositions, rng)
  shuffle(lowPositions, rng)

  const numRed = 3 + Math.floor(rng() * 3)
  const numBlue = 3 + Math.floor(rng() * 3)

  // Red coins from high positions, blue from low positions
  // Fall back to the other pool if primary is empty
  const redCoins = pickCoins(numRed, highPositions.length > 0 ? highPositions : lowPositions)
  const blueCoins = pickCoins(numBlue, lowPositions.length > 0 ? lowPositions : highPositions)

  const level = {
    grid,
    width: GRID_W,
    height: GRID_H,
    tileSize: TILE_SIZE,
    start: { x: startX, y: startY },
    goal: { x: goalX, y: goalY },
    redCoins,
    blueCoins,
  }

  if (!isReachable(level)) {
    addBridgePlatforms(grid, level, rng)
  }

  return level
}

function generateLaneChain(grid, lane, rng, startCol, endCol) {
  const platforms = []
  let currentX = startCol

  while (currentX < endCol - 1) {
    const platWidth = 2 + Math.floor(rng() * 3)
    const gap = 2 + Math.floor(rng() * (JUMP_D - 2))
    const platX = currentX + gap

    if (platX + platWidth > endCol) break

    let platY
    if (platforms.length === 0) {
      platY = lane.minRow + Math.floor(rng() * (lane.maxRow - lane.minRow + 1))
    } else {
      const prev = platforms[platforms.length - 1]
      const minY = Math.max(lane.minRow, prev.y - JUMP_H + 1)
      const maxY = Math.min(lane.maxRow, prev.y + JUMP_H - 1)
      platY = minY + Math.floor(rng() * (maxY - minY + 1))
    }

    if (canPlacePlatform(grid, platX, platY, platWidth)) {
      for (let dx = 0; dx < platWidth; dx++) {
        grid[platY][platX + dx] = TILE.SOLID
      }
      platforms.push({ x: platX, y: platY, width: platWidth })
      currentX = platX + platWidth
    } else {
      currentX = platX + 1
    }
  }

  return platforms
}

function canPlacePlatform(grid, x, y, width) {
  for (let dx = 0; dx < width; dx++) {
    const col = x + dx
    if (col < 0 || col >= GRID_W || y < 0 || y >= GRID_H) return false
    if (grid[y][col] === TILE.SOLID) return false
    if (y > 0 && grid[y - 1][col] === TILE.SOLID) return false
    if (y + 1 < GRID_H && grid[y + 1][col] === TILE.SOLID) return false
  }
  return true
}

function placeConnectors(grid, highPlatforms, lowPlatforms, rng) {
  const connectors = []
  const numConnectors = 2 + Math.floor(rng() * 2)

  const candidateCols = []
  for (const hp of highPlatforms) {
    for (const lp of lowPlatforms) {
      const midCol = Math.floor((hp.x + hp.width / 2 + lp.x + lp.width / 2) / 2)
      candidateCols.push(midCol)
    }
  }

  if (candidateCols.length === 0) {
    for (let i = 0; i < numConnectors; i++) {
      candidateCols.push(3 + Math.floor(rng() * (GRID_W - 6)))
    }
  }

  shuffle(candidateCols, rng)

  for (let i = 0; i < Math.min(numConnectors, candidateCols.length); i++) {
    const col = candidateCols[i]
    const width = 2 + Math.floor(rng() * 2)
    const row = MID_LANE.minRow + Math.floor(rng() * (MID_LANE.maxRow - MID_LANE.minRow + 1))

    if (canPlacePlatform(grid, col, row, width)) {
      for (let dx = 0; dx < width; dx++) {
        grid[row][col + dx] = TILE.SOLID
      }
      connectors.push({ x: col, y: row, width })
    }
  }

  return connectors
}

function collectSurfacePositions(grid, platforms) {
  const positions = []
  for (const plat of platforms) {
    for (let dx = 0; dx < plat.width; dx++) {
      const cx = plat.x + dx
      const cy = plat.y - 1
      if (cy >= 0 && grid[cy][cx] === TILE.EMPTY) {
        positions.push({ x: cx * TILE_SIZE + TILE_SIZE / 2, y: cy * TILE_SIZE + TILE_SIZE / 2 })
      }
    }
  }
  return positions
}

function pickCoins(count, positions) {
  const coins = []
  for (let i = 0; i < Math.min(count, positions.length); i++) {
    coins.push({ ...positions[i], collected: false })
  }
  return coins
}

function findGroundY(grid, col) {
  for (let y = 0; y < grid.length; y++) {
    if (grid[y][col] === TILE.SOLID) return y
  }
  return grid.length - 1
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function isReachable(level) {
  const { grid, start, goal, tileSize } = level
  const startTX = Math.floor(start.x / tileSize)
  const startTY = Math.floor(start.y / tileSize)
  const goalTX = Math.floor(goal.x / tileSize)
  const goalTY = Math.floor(goal.y / tileSize)

  const visited = new Set()
  const queue = [[startTX, startTY]]
  visited.add(`${startTX},${startTY}`)

  while (queue.length > 0) {
    const [x, y] = queue.shift()
    if (x === goalTX && y === goalTY) return true

    for (let dx = -JUMP_D; dx <= JUMP_D; dx++) {
      for (let dy = -JUMP_H; dy <= JUMP_H; dy++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) continue
        const key = `${nx},${ny}`
        if (visited.has(key)) continue
        if (grid[ny][nx] === TILE.SOLID) continue
        visited.add(key)
        queue.push([nx, ny])
      }
    }
  }
  return false
}

function addBridgePlatforms(grid, level, rng) {
  const { start, goal, tileSize } = level
  const startTX = Math.floor(start.x / tileSize)
  const goalTX = Math.floor(goal.x / tileSize)
  const goalTY = Math.floor(goal.y / tileSize)

  const steps = 3 + Math.floor(rng() * 3)
  for (let i = 1; i <= steps; i++) {
    const fraction = i / (steps + 1)
    const bx = Math.floor(startTX + (goalTX - startTX) * fraction)
    const by = Math.floor(level.height - 4 - (level.height - 4 - goalTY) * fraction)
    if (by >= 0 && by < level.height && bx >= 0 && bx < level.width) {
      const w = 2 + Math.floor(rng() * 2)
      for (let dx = 0; dx < w && bx + dx < level.width - 1; dx++) {
        grid[by][bx + dx] = TILE.SOLID
      }
    }
  }
}
