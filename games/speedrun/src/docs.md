# Noridoc: games/speedrun/src

Path: @/games/speedrun/src

### Overview

- Runtime source modules for the Speedrun game, organized as pure-logic ES modules plus two DOM-touching modules (`main.js` for game loop/lifecycle, `renderer.js` for Canvas 2D drawing)
- All game state is plain mutable objects (player, timer, level, inputState) -- no reactive framework, no classes

### How it fits into the larger codebase

- `@/speedrun/index.html` loads `main.js` as the entry point via `<script type="module">`
- `@/tests/speedrun/` imports directly from these modules for unit and integration testing
- `@/games/speedrun/style.css` (sibling directory) styles the HTML shell and results overlay that `main.js` manipulates via DOM
- The PRNG in `prng.js` is a standalone copy of the cyrb128+sfc32 pattern also used in `@/games/reword/src/prng.js`

### Core Implementation

- **`game.js`** -- Extracted game logic module holding `restartRun(player, level, timer)`, which resets player (via `resetPlayer`), clears all coin `collected` flags, and restarts the timer. Exists as a separate module from `main.js` so restart logic is testable without DOM side effects
- **`main.js`** -- Entry point. Creates all game objects on DOMContentLoaded, runs `requestAnimationFrame` loop, manages three-state lifecycle (READY/PLAYING/COMPLETE), builds the results overlay DOM on completion. A persistent `handleKeyDown()` listener enables R key restart (mid-run or from results) and Enter key restart (from results only). Mid-run R restart increments the attempt counter and saves stats before resetting. Keyboard restart handling is deliberately separate from the movement input system in `input.js`
- **`physics.js`** -- Exports `createPhysicsConfig()` (derived constants) and `updatePlayer()` (the per-frame simulation). Handles horizontal acceleration/deceleration, jumping (with coyote time + input buffering), variable jump height, wall sliding, wall jumping with control delay, gravity, AABB collision resolution (X then Y), coin collection, goal detection, and off-bottom respawn. Wall jump uses two key parameters: `wallJumpHorizontalSpeed` (100px/s) controls how far the player is pushed away from the wall, and `wallJumpControlDelay` (0.04s) controls how long player input is overridden with the away-from-wall direction. These values are tuned for Hollow Knight-style repeated same-wall jumping -- the brief displacement (~7px) lets players immediately hold back toward the wall to re-cling and climb vertically. The timer is ticked each frame, cleared on grounding, and set alongside `wallJumpForceDir` when a wall jump fires
- **`level.js`** -- Exports `generateLevel(seed)` and `getDailySeed(date)`. Builds a 25x19 tile grid using a lane-based system designed to create distinct high and low routes through the level:
  - Three lane bands divide the grid vertically: HIGH_LANE (rows 3-7), MID_LANE (rows 8-10), LOW_LANE (rows 11-15). Ground occupies the bottom two rows with random pits
  - `generateLaneChain()` places platform chains left-to-right within a lane, constrained by jump height/distance constants (JUMP_H=4, JUMP_D=5) so consecutive platforms are always reachable
  - `placeConnectors()` adds mid-lane platforms at columns between overlapping high/low platforms, allowing players to transition between routes
  - Coin placement is route-biased: red coins are placed on high-lane platform surfaces (`collectSurfacePositions()`), blue coins on low-lane platforms plus ground-level positions. This means 100% red and 100% blue completion categories require different paths. Both position pools are filtered by `isOutsideGoal()` before shuffling, which excludes any position within one TILE_SIZE of the goal center in each axis -- this prevents coins from spawning inside the goal hitbox where they would be uncollectable (the goal triggers run completion before the player can pick them up)
  - Goal is placed on the highest right-half high-route platform; start is on the ground at the left. Goal placement must happen before coin placement because the coin filter depends on the goal's coordinates
  - BFS reachability check + `addBridgePlatforms()` fallback is retained as a safety net. The level object shape is unchanged from previous versions
- **`player.js`** -- Exports `createPlayer(x, y)`, `resetPlayer(player, x, y)`, and dimension constants (`PLAYER_WIDTH=20`, `PLAYER_HEIGHT=28`). Player state is a plain object with position, velocity, grounded/wall flags, jump timers, wall jump control state (`wallJumpControlTimer`, `wallJumpForceDir`), coin counts, and goal flag. Both `createPlayer` and `resetPlayer` initialize the wall jump control fields to zero
- **`input.js`** -- Exports `createInputState()`, `setupInputListeners(inputState)`, `clearFrameInput(inputState)`. Maps arrow keys, WASD, and spacebar to `left`/`right`/`jump`/`jumpPressed` state. `jumpPressed` is set on keydown (edge-triggered) and cleared each frame
- **`renderer.js`** -- Exports `createRenderer(canvas)` which returns `{ render(level, player, timer, state, stats, daySeed) }`. Draws tiles, goal with glow, coins as circles, player as rectangle, and HUD. The HUD shows: day seed in top-right (on both READY and PLAYING screens), "press any key" prompt on READY, and during PLAYING: timer, coin counts, PB any% time, and attempt count
- **`timing.js`** -- Exports timer creation/update, `formatTime(seconds)` (M:SS.mmm format), and `createCompletionRecord()` which produces `{ anyPercent, hundredRed, hundredBlue }` where category times are null if not all coins of that color were collected
- **`stats.js`** -- Exports `loadStats(seed)`, `saveStats(seed, stats)`, `updatePersonalBest(stats, record)`. localStorage key pattern: `speedrun-stats-{seed}` (e.g. `speedrun-stats-2026-04-08`). Personal bests update only if the new time is strictly faster
- **`prng.js`** -- Exports `getSeededRng(seed)`. Uses cyrb128 to hash a string seed into four 32-bit values, then sfc32 as the generator returning floats in [0, 1)

### Things to Know

- State ownership: `main.js` owns all state objects and passes them into pure functions. No module maintains its own mutable state (except input listeners mutating the shared `inputState` object)
- The `updatePlayer()` function in `physics.js` is the largest function -- it handles the entire simulation step including movement, collision, coin pickup, goal check, and respawn. This is intentional: all physics side effects happen in one place per frame
- `createCompletionRecord()` uses the same elapsed time for all categories -- there is no split timing. A category time is recorded only if all coins of that color were collected before reaching the goal
- `updatePersonalBest()` returns a new stats object (spread copy) rather than mutating in place

Created and maintained by Nori.
