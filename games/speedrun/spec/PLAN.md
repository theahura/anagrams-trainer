# Speedrun Game Implementation Plan

**Goal:** Build a 2D platformer game where players race to complete a single-screen, weekly-generated level, with emphasis on polished movement and speedrunning joy.

**Architecture:** Pure HTML5 Canvas game with no framework. Separate pure-logic modules (physics, level generation, player state) from rendering and input. Game loop uses requestAnimationFrame with delta-time clamping. Canvas for gameplay, DOM overlay for UI (timers, results).

**Tech Stack:** HTML5 Canvas, vanilla JavaScript (ES modules), CSS, Vitest for testing

---

## Testing Plan

Tests go in `tests/speedrun/` directory. All pure logic modules are tested independently.

### Unit Tests — `tests/speedrun/physics.test.js`
- Player falls due to gravity when not on ground
- Player lands on a platform and stops falling
- Player cannot move through solid tiles (collision from left, right, top, bottom)
- Variable jump: tap jump gives lower height than held jump
- Coyote time: player can jump within grace period after walking off edge
- Input buffer: jump pressed just before landing executes on land
- Wall slide: falling speed reduced when touching wall
- Wall jump: player gets velocity away from wall and upward
- Horizontal movement uses acceleration, not instant velocity
- Player respects max fall speed

### Unit Tests — `tests/speedrun/level.test.js`
- Level generation produces a grid of the expected dimensions
- Same seed always produces the same level
- Different seeds produce different levels
- Generated level has a start position on ground level
- Generated level has an end goal position
- Generated level has red coins and blue coins
- Generated level has a valid path from start to end (BFS reachability)
- Weekly seed: same date within a week produces same seed string

### Unit Tests — `tests/speedrun/player.test.js`
- Player starts at the level's start position
- Player state tracks collected coins (red and blue separately)
- Player state tracks completion time
- Reset clears all collected coins and timer

### Unit Tests — `tests/speedrun/timing.test.js`
- Timer starts at zero
- Timer tracks elapsed time
- Timer can be paused and resumed
- Completion records any%, 100% red, and 100% blue times correctly
- Any% time recorded when reaching goal regardless of coins
- 100% red time only recorded when all red coins collected
- 100% blue time only recorded when all blue coins collected

### Unit Tests — `tests/speedrun/stats.test.js`
- Stats save to and load from localStorage
- Personal best times are tracked per category (any%, 100% red, 100% blue)
- New time replaces PB only if faster
- Stats include attempt count

### Integration Test — `tests/speedrun/game-loop.test.js`
- Game initializes with a level and player at start position
- Collecting a coin updates player state
- Reaching the end goal with no coins records any% time
- Reaching the end goal with all red coins records 100% red time

NOTE: I will write *all* tests before I add any implementation behavior.

---

## Task 1: Project Scaffolding

### Files to create:
- `speedrun/index.html` — Vite entry point (thin HTML shell, references `../games/speedrun/`)
- `games/speedrun/src/main.js` — Game initialization, game loop
- `games/speedrun/src/physics.js` — Player physics, collision detection
- `games/speedrun/src/level.js` — Level grid, procedural generation
- `games/speedrun/src/player.js` — Player state and coin tracking
- `games/speedrun/src/input.js` — Keyboard state tracking
- `games/speedrun/src/renderer.js` — Canvas drawing
- `games/speedrun/src/timing.js` — Timer and completion tracking
- `games/speedrun/src/stats.js` — localStorage persistence
- `games/speedrun/src/prng.js` — Copy from reword (same cyrb128 + sfc32)
- `games/speedrun/style.css` — Game-specific styles

### Files to modify:
- `vite.config.js` — Add `speedrun: resolve(__dirname, 'speedrun/index.html')` to rollup inputs
- `index.html` — Add Speedrun game card to the games list

## Task 2: Pure Logic Modules

### `physics.js` — Core physics engine
Exports:
- `createPhysicsConfig()` — Returns tuning constants (gravity, jumpSpeed, coyoteTime, jumpBufferTime, wallSlideSpeed, acceleration values, maxFallSpeed)
- `updatePlayer(player, input, level, dt, config)` — Main physics update. Returns new player state. Steps:
  1. Apply horizontal acceleration based on input and ground/air state
  2. Handle jump (check grounded, coyote time, input buffer, wall jump)
  3. Apply gravity (with variable jump cut and fall multiplier)
  4. Move X, resolve X collisions
  5. Move Y, resolve Y collisions
  6. Update grounded/wall-touching flags
  7. Check coin collection (overlap with coin positions)
  8. Check goal reached (overlap with end position)
- `checkTileCollision(x, y, width, height, level)` — AABB vs tile grid
- `resolveCollisionX(player, level)` — Push player out of tiles horizontally
- `resolveCollisionY(player, level)` — Push player out of tiles vertically, set grounded flag

Key constants to tune:
- Tile size: 32px
- Player size: 20x28px (slightly smaller than a tile for tight gaps)
- Jump height: ~3.5 tiles
- Coyote time: 0.1s
- Jump buffer: 0.1s
- Wall slide max speed: 60px/s (vs normal max fall ~500px/s)
- Ground accel: 2000px/s², air accel: 1200px/s², decel: 1800px/s²
- Max run speed: 250px/s

### `level.js` — Level data and generation
Exports:
- `TILE` — Enum: `{ EMPTY: 0, SOLID: 1, RED_COIN: 2, BLUE_COIN: 3, START: 4, GOAL: 5 }`
- `generateLevel(seed)` — Returns `{ grid: number[][], start: {x,y}, goal: {x,y}, redCoins: [{x,y}], blueCoins: [{x,y}], width, height }`
- `getWeeklySeed(date)` — Returns `"YYYY-WNN"` string for the ISO week containing `date`
- `isReachable(grid, start, goal)` — BFS/flood fill to verify path exists

Generation algorithm:
1. Create 25x19 grid (800x608 at 32px tiles)
2. Fill bottom 2 rows with solid tiles (ground)
3. Add some ground gaps (pits)
4. Place 8-12 platforms of 2-5 tiles wide at various heights, using seeded RNG
5. Place start position on ground, left side
6. Place goal on a high platform, right side
7. Run BFS to verify reachability; if not reachable, add bridge platforms
8. Place 3-5 red coins and 3-5 blue coins on platform surfaces
9. Return level data

### `player.js` — Player state
Exports:
- `createPlayer(startX, startY)` — Returns player state object: `{ x, y, vx, vy, grounded, wallDir, coyoteTimer, jumpBufferTimer, jumpHeld, redCoins, blueCoins, reachedGoal }`
- `resetPlayer(player, startX, startY)` — Reset position and collected items

### `input.js` — Input management
Exports:
- `createInputState()` — Returns `{ left, right, jump, jumpPressed }` (all false)
- `setupInputListeners(inputState)` — Adds keydown/keyup on document for ArrowLeft/Right/A/D, Space/ArrowUp/W
- `clearInputState(inputState)` — Clears per-frame flags (jumpPressed)

### `timing.js` — Timer and completion
Exports:
- `createTimer()` — Returns `{ elapsed: 0, running: false }`
- `updateTimer(timer, dt)` — Add dt if running
- `formatTime(seconds)` — Returns `"M:SS.ms"` string
- `createCompletionRecord(timer, player, level)` — Returns `{ anyPercent, hundredRed, hundredBlue }` where each is the time or null

### `stats.js` — localStorage persistence
Exports:
- `loadStats(weekSeed)` — Load from `speedrun-stats-{weekSeed}`
- `saveStats(weekSeed, stats)` — Save to localStorage
- `updatePersonalBest(stats, completionRecord)` — Update PB if new time is faster

### `prng.js` — Copy from reword
Same `getDailyRng`, `seededShuffle`, `seededPick`.

## Task 3: Rendering (`renderer.js`)
Exports:
- `createRenderer(canvas)` — Returns renderer object with `render(level, player, timer)` method
- Colors: solid tiles = `#3a3a3c`, player = `#d7dadc`, red coins = `#e74c3c`, blue coins = `#3498db`, goal = `#538d4e`, background = `#121213`
- Player is a rectangle, coins are small circles, goal is a flag/rectangle with glow
- HUD overlay: timer display, coin counts (drawn on canvas, top area)

## Task 4: Game Loop (`main.js`)
- Initialize canvas, create level from weekly seed, create player at start
- Game states: `READY`, `PLAYING`, `COMPLETE`
- On READY: show "Press any key to start", level visible
- On PLAYING: update physics, render, track time
- On COMPLETE: show results overlay (DOM), times for each category, personal bests, restart button
- Handle restart: reset player, keep same level, increment attempt count

## Task 5: HTML/CSS Structure

### `speedrun/index.html`
- Canvas element sized to game dimensions
- DOM overlay for results screen
- Link to `../games/speedrun/style.css` and `../games/speedrun/src/main.js`

### `games/speedrun/style.css`
- Dark theme matching the repo style
- Canvas centered in viewport
- Results overlay styling (semi-transparent backdrop, card layout)
- Timer/HUD text styling

## Edge Cases
- Tab loses focus: pause the timer, don't accumulate huge dt on return
- Very fast frame rates (>120fps): clamp dt to minimum 1/120s
- Very slow frame rates: clamp dt to maximum 1/30s to prevent tunneling
- Player falls off bottom of screen: respawn at start, keep timer running (speedrun penalty)
- Level generation fails reachability: retry with modified seed (append retry count)

## Backwards Compatibility
- No existing speedrun code — this is a new game, no compatibility concerns
- Root `index.html` game card addition is additive
- Vite config change is additive (new entry, existing entries unchanged)

## Questions
- Should the game support mobile/touch controls? The spec doesn't mention it. I'll skip it for now since platformers need precise input.
- The spec says "weekly" maps — I'll use ISO week number. But should Monday or Sunday be the reset day? I'll use Monday (ISO standard).

---

**Testing Details** Tests cover all pure logic modules as black boxes: physics behavior (gravity, jumping, collision, game-feel mechanics), level generation (determinism, structure, reachability), timing (elapsed tracking, completion categories), and stats persistence (localStorage round-trip, PB comparison). No rendering tests — canvas output is visually verified.

**Implementation Details**
- Tile-based AABB collision with axis-separated resolution (X then Y)
- Physics derived from jump height and apex time for intuitive tuning
- Coyote time + input buffering + variable jump height for polished feel
- Wall slide reduces fall speed; wall jump applies opposing horizontal velocity
- Procedural generation uses seeded PRNG with BFS reachability verification
- Canvas 2D for all game rendering; DOM only for results overlay
- Weekly seed from ISO week number ensures all players get same level
- Stats keyed per week in localStorage
- Player respawns at start on death (falling off screen), timer keeps running

**Questions** Mobile controls and weekly reset day (defaulting Monday/ISO standard) as noted above.

---
