# Noridoc: games/speedrun

Path: @/games/speedrun

### Overview

- **Speedrun** is a weekly 2D platformer where players race through a procedurally generated single-screen level, collecting coins and trying to beat personal best times
- Pure HTML5 Canvas game with no framework -- vanilla JS modules, Canvas 2D rendering, DOM-based results overlay
- Seeded PRNG generates one level per ISO week, so all players share the same map for a given week

### How it fits into the larger codebase

- `@/speedrun/index.html` is the Vite entry point (thin HTML shell with `<canvas>` and results overlay div), linked from the games index at `@/index.html`
- `@/vite.config.js` includes the speedrun entry in its multi-page rollup inputs alongside the games index and Reword
- Source modules live in `@/games/speedrun/src/` -- pure-logic modules with no DOM dependencies except `main.js` and `renderer.js`
- `@/games/speedrun/style.css` defines the dark theme, matching the Wordle-style palette used across the repo (#121213 background, #d7dadc text, #538d4e green accents)
- `@/tests/speedrun/` contains Vitest test suites covering physics, level generation, timing, stats, and game-loop integration
- Unlike Reword (Vue 3 SPA), Speedrun has no build-time data pipeline -- levels are generated at runtime from a weekly seed

### Core Implementation

- **Game loop:** `main.js` orchestrates a `requestAnimationFrame` loop with three states: READY (waiting for keypress), PLAYING (physics + timer active), COMPLETE (results overlay shown)
- **Data flow per frame:**
  ```
  gameLoop(timestamp)
    -> updateTimer(timer, dt)
    -> updatePlayer(player, inputState, level, dt, config)
    -> clearFrameInput(inputState)        // consume jumpPressed
    -> check player.reachedGoal -> completeRun()
    -> renderer.render(level, player, timer, gameState)
  ```
- **Level generation:** `level.js` uses `getWeeklySeed(date)` to derive an ISO week string (e.g. `"2026-W15"`), then `generateLevel(seed)` builds a 25x19 tile grid with ground, pits, platforms, wall columns, coins, start/goal positions, and a BFS reachability check that adds bridge platforms if needed
- **Physics:** `physics.js` implements acceleration-based movement, axis-separated AABB collision resolution, gravity with variable jump height (jump-cut multiplier when not holding jump), coyote time, input buffering, wall sliding, and wall jumping
- **Stats persistence:** `stats.js` stores per-week personal bests in localStorage under `speedrun-stats-{weekSeed}`, tracking attempts and best times for three categories (any%, 100% red, 100% blue)
- **Restart:** On "Try Again", coins are reset to uncollected, player is repositioned to start, timer restarts -- the same generated level is reused

### Things to Know

- Physics constants are derived from desired jump height (3.5 tiles) and time-to-apex (0.35s): gravity and jump speed are calculated to produce that exact arc. This is set up in `createPhysicsConfig()` in `@/games/speedrun/src/physics.js`
- The PRNG (`@/games/speedrun/src/prng.js`) uses the same cyrb128 + sfc32 approach as Reword's PRNG, but is a separate copy -- the two games do not share the module
- Collision resolution happens in two passes: X-axis first, then Y-axis. The Y-axis pass resets `player.grounded` to false at the top, only setting it true if a downward collision is resolved. This order matters for correct corner behavior
- Wall detection uses a 1px probe on each side of the player with 4px vertical insets from top and bottom edges, checked only when airborne
- Coin collection uses circle-distance check (16px radius) against player center, not AABB overlap
- Goal detection uses a tile-sized rectangular proximity check against player center
- The delta-time is clamped to 1/30s maximum to prevent physics tunneling on long frame drops
- `jumpPressed` is a single-frame flag consumed by `clearFrameInput()` each frame -- this is what makes input buffering work as a timer rather than a boolean

Created and maintained by Nori.
