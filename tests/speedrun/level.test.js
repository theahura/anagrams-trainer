import { describe, it, expect } from 'vitest'
import {
  generateLevel,
  getWeeklySeed,
  TILE,
} from '../../games/speedrun/src/level.js'

describe('level generation', () => {
  it('produces a grid of the expected dimensions', () => {
    const level = generateLevel('test-seed-1')
    expect(level.grid.length).toBe(level.height)
    expect(level.grid[0].length).toBe(level.width)
    expect(level.width).toBeGreaterThan(0)
    expect(level.height).toBeGreaterThan(0)
  })

  it('same seed produces the same level', () => {
    const level1 = generateLevel('deterministic-seed')
    const level2 = generateLevel('deterministic-seed')
    expect(level1.grid).toEqual(level2.grid)
    expect(level1.start).toEqual(level2.start)
    expect(level1.goal).toEqual(level2.goal)
    expect(level1.redCoins).toEqual(level2.redCoins)
    expect(level1.blueCoins).toEqual(level2.blueCoins)
  })

  it('different seeds produce different levels', () => {
    const level1 = generateLevel('seed-alpha')
    const level2 = generateLevel('seed-beta')
    // Grids should differ (astronomically unlikely to match)
    const flat1 = level1.grid.flat().join(',')
    const flat2 = level2.grid.flat().join(',')
    expect(flat1).not.toEqual(flat2)
  })

  it('has a start position on ground level', () => {
    const level = generateLevel('start-test')
    expect(level.start).toBeDefined()
    expect(level.start.x).toBeGreaterThanOrEqual(0)
    expect(level.start.y).toBeGreaterThanOrEqual(0)
    // Start should be above a solid tile
    const tileBelow = Math.floor((level.start.y + 28) / level.tileSize)
    const tileCol = Math.floor(level.start.x / level.tileSize)
    expect(level.grid[tileBelow]).toBeDefined()
    expect(level.grid[tileBelow][tileCol]).toBe(TILE.SOLID)
  })

  it('has an end goal position', () => {
    const level = generateLevel('goal-test')
    expect(level.goal).toBeDefined()
    expect(level.goal.x).toBeGreaterThanOrEqual(0)
    expect(level.goal.y).toBeGreaterThanOrEqual(0)
  })

  it('has red coins and blue coins', () => {
    const level = generateLevel('coins-test')
    expect(level.redCoins.length).toBeGreaterThan(0)
    expect(level.blueCoins.length).toBeGreaterThan(0)
    // Each coin should have x, y coordinates
    for (const coin of [...level.redCoins, ...level.blueCoins]) {
      expect(coin.x).toBeGreaterThanOrEqual(0)
      expect(coin.y).toBeGreaterThanOrEqual(0)
    }
  })

  it('has a valid path from start to end', () => {
    // Generate several levels and verify all are reachable
    for (let i = 0; i < 5; i++) {
      const level = generateLevel(`reachability-${i}`)
      // BFS from start to goal using player-jumpable movement
      const reachable = canReach(level)
      expect(reachable).toBe(true)
    }
  })
})

describe('multi-route level generation', () => {
  it('red coins are predominantly in the upper half of the level', () => {
    let totalRed = 0
    let highRed = 0
    for (let i = 0; i < 10; i++) {
      const level = generateLevel(`route-red-${i}`)
      const midY = (level.height * level.tileSize) / 2
      for (const coin of level.redCoins) {
        totalRed++
        if (coin.y <= midY) highRed++
      }
    }
    expect(highRed / totalRed).toBeGreaterThanOrEqual(0.6)
  })

  it('blue coins are predominantly in the lower half of the level', () => {
    let totalBlue = 0
    let lowBlue = 0
    for (let i = 0; i < 10; i++) {
      const level = generateLevel(`route-blue-${i}`)
      const midY = (level.height * level.tileSize) / 2
      for (const coin of level.blueCoins) {
        totalBlue++
        if (coin.y > midY) lowBlue++
      }
    }
    expect(lowBlue / totalBlue).toBeGreaterThanOrEqual(0.6)
  })

})

describe('weekly seed', () => {
  it('same date within a week produces same seed', () => {
    // Monday and Tuesday of the same week
    const monday = new Date(Date.UTC(2026, 3, 6)) // April 6, 2026 is a Monday
    const tuesday = new Date(Date.UTC(2026, 3, 7))
    expect(getWeeklySeed(monday)).toBe(getWeeklySeed(tuesday))
  })

  it('different weeks produce different seeds', () => {
    const week1 = new Date(Date.UTC(2026, 3, 6)) // Week 15
    const week2 = new Date(Date.UTC(2026, 3, 13)) // Week 16
    expect(getWeeklySeed(week1)).not.toBe(getWeeklySeed(week2))
  })
})

// Simple BFS reachability check — can a player physically reach the goal?
function canReach(level) {
  const { grid, start, goal, tileSize } = level
  const startTileX = Math.floor(start.x / tileSize)
  const startTileY = Math.floor(start.y / tileSize)
  const goalTileX = Math.floor(goal.x / tileSize)
  const goalTileY = Math.floor(goal.y / tileSize)

  // BFS over tile grid, allowing horizontal moves and jumps (up to 4 tiles up)
  const visited = new Set()
  const queue = [[startTileX, startTileY]]
  visited.add(`${startTileX},${startTileY}`)

  const jumpHeight = 4 // tiles the player can jump
  const jumpDist = 5 // tiles the player can jump horizontally

  while (queue.length > 0) {
    const [x, y] = queue.shift()
    if (x === goalTileX && y === goalTileY) return true

    // Try moves: walk left/right, jump up, fall down
    const moves = []
    for (let dx = -jumpDist; dx <= jumpDist; dx++) {
      for (let dy = -jumpHeight; dy <= jumpHeight; dy++) {
        if (dx === 0 && dy === 0) continue
        moves.push([x + dx, y + dy])
      }
    }

    for (const [nx, ny] of moves) {
      if (nx < 0 || nx >= level.width || ny < 0 || ny >= level.height) continue
      const key = `${nx},${ny}`
      if (visited.has(key)) continue
      if (grid[ny][nx] === TILE.SOLID) continue
      visited.add(key)
      queue.push([nx, ny])
    }
  }

  return false
}
