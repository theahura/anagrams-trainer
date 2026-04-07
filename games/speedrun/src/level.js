import { getSeededRng } from './prng.js'
import { PLAYER_HEIGHT } from './player.js'

export const TILE = {
  EMPTY: 0,
  SOLID: 1,
}

const GRID_W = 25
const GRID_H = 19
const TILE_SIZE = 32

export function getWeeklySeed(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayOfWeek = d.getUTCDay() || 7 // Convert Sunday=0 to 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek) // Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

export function generateLevel(seed) {
  const rng = getSeededRng(seed)
  const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE.EMPTY))

  // Bottom 2 rows are ground
  for (let x = 0; x < GRID_W; x++) {
    grid[GRID_H - 1][x] = TILE.SOLID
    grid[GRID_H - 2][x] = TILE.SOLID
  }

  // Add some ground gaps (pits) — skip first 3 and last 3 columns to keep start/end safe
  for (let x = 4; x < GRID_W - 4; x++) {
    if (rng() < 0.12) {
      grid[GRID_H - 1][x] = TILE.EMPTY
      grid[GRID_H - 2][x] = TILE.EMPTY
      // Sometimes make wider pits
      if (x + 1 < GRID_W - 4 && rng() < 0.5) {
        grid[GRID_H - 1][x + 1] = TILE.EMPTY
        grid[GRID_H - 2][x + 1] = TILE.EMPTY
        x++ // skip next column
      }
    }
  }

  // Place platforms
  const platforms = []
  const numPlatforms = 8 + Math.floor(rng() * 5) // 8-12 platforms
  for (let i = 0; i < numPlatforms; i++) {
    const platWidth = 2 + Math.floor(rng() * 4) // 2-5 tiles wide
    const platX = 1 + Math.floor(rng() * (GRID_W - platWidth - 2))
    const platY = 4 + Math.floor(rng() * (GRID_H - 7)) // rows 4 to GRID_H-4

    let canPlace = true
    for (let dx = 0; dx < platWidth; dx++) {
      if (grid[platY][platX + dx] === TILE.SOLID) {
        canPlace = false
        break
      }
      // Don't place too close to other platforms vertically
      if (platY > 0 && grid[platY - 1][platX + dx] === TILE.SOLID) {
        canPlace = false
        break
      }
      if (platY + 1 < GRID_H && grid[platY + 1][platX + dx] === TILE.SOLID) {
        canPlace = false
        break
      }
    }

    if (canPlace) {
      for (let dx = 0; dx < platWidth; dx++) {
        grid[platY][platX + dx] = TILE.SOLID
      }
      platforms.push({ x: platX, y: platY, width: platWidth })
    }
  }

  // Add wall columns on left and right edges
  for (let y = 0; y < GRID_H; y++) {
    grid[y][0] = TILE.SOLID
    grid[y][GRID_W - 1] = TILE.SOLID
  }

  // Start position: left side, on ground
  const startX = 2 * TILE_SIZE
  const startY = findGroundY(grid, 2) * TILE_SIZE - PLAYER_HEIGHT // player height

  // Goal position: right side, on a high platform or ground
  let goalX, goalY
  // Try to place goal on the highest platform on the right half
  const rightPlatforms = platforms.filter(p => p.x + p.width / 2 > GRID_W / 2).sort((a, b) => a.y - b.y)
  if (rightPlatforms.length > 0) {
    const goalPlat = rightPlatforms[0]
    goalX = (goalPlat.x + Math.floor(goalPlat.width / 2)) * TILE_SIZE
    goalY = (goalPlat.y - 1) * TILE_SIZE
  } else {
    goalX = (GRID_W - 3) * TILE_SIZE
    goalY = findGroundY(grid, GRID_W - 3) * TILE_SIZE - PLAYER_HEIGHT
  }

  // Place coins on platform surfaces
  const coinPositions = []
  for (const plat of platforms) {
    for (let dx = 0; dx < plat.width; dx++) {
      const cx = plat.x + dx
      const cy = plat.y - 1
      if (cy >= 0 && grid[cy][cx] === TILE.EMPTY) {
        coinPositions.push({ x: cx * TILE_SIZE + TILE_SIZE / 2, y: cy * TILE_SIZE + TILE_SIZE / 2 })
      }
    }
  }
  // Also add some ground-level coin positions
  for (let x = 3; x < GRID_W - 3; x++) {
    const gy = findGroundY(grid, x)
    if (gy > 0) {
      coinPositions.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: (gy - 1) * TILE_SIZE + TILE_SIZE / 2 })
    }
  }

  // Shuffle and pick coins
  shuffle(coinPositions, rng)
  const numRed = 3 + Math.floor(rng() * 3) // 3-5
  const numBlue = 3 + Math.floor(rng() * 3) // 3-5
  const redCoins = coinPositions.slice(0, Math.min(numRed, coinPositions.length))
    .map(c => ({ ...c, collected: false }))
  const blueCoins = coinPositions.slice(numRed, Math.min(numRed + numBlue, coinPositions.length))
    .map(c => ({ ...c, collected: false }))

  // Verify reachability — if not reachable, add bridge platforms
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

  const jumpH = 4
  const jumpD = 5

  while (queue.length > 0) {
    const [x, y] = queue.shift()
    if (x === goalTX && y === goalTY) return true

    for (let dx = -jumpD; dx <= jumpD; dx++) {
      for (let dy = -jumpH; dy <= jumpH; dy++) {
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

  // Add stepping-stone platforms from left to right, ascending toward goal
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
