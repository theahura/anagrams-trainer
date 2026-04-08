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
    -> recordFrame(pathRecorder, ...)     // sample position at ~20Hz
    -> interpolatePosition(ghostPath, t)  // compute ghost position from PB path
    -> check player.reachedGoal -> completeRun()
    -> renderer.render(level, player, timer, gameState, stats, weekSeed, ghostPos, currentPath)
  ```
- **Level generation:** `level.js` uses `getWeeklySeed(date)` to derive an ISO week string (e.g. `"2026-W15"`), then `generateLevel(seed)` builds a 25x19 tile grid using a lane-based system. Three vertical bands (HIGH_LANE rows 3-7, MID_LANE rows 8-10, LOW_LANE rows 11-15) structure platforms into distinct high and low routes connected by mid-lane bridges. Coin placement is route-biased: red coins on high-route platforms, blue coins on low-route/ground surfaces, so 100% red and 100% blue categories require different paths through the level. Both coin pools are filtered to exclude positions within the goal's hitbox (one TILE_SIZE in each axis), since the goal detection would trigger run completion before overlapping coins could be collected. BFS reachability check with bridge platform fallback remains as a safety net
- **Physics:** `physics.js` implements acceleration-based movement, axis-separated AABB collision resolution, gravity with variable jump height (jump-cut multiplier when not holding jump), coyote time, input buffering, wall sliding, and wall jumping with a short control delay. Wall jump parameters are tuned for Hollow Knight-style same-wall climbing: low horizontal push-away speed (100px/s) and a very brief control override (0.04s) so the player arcs only ~7px from the wall before regaining control to hold back and re-cling
- **Stats persistence:** `stats.js` stores per-week personal bests in localStorage under `speedrun-stats-{weekSeed}`, tracking attempts and best times for three categories (any%, 100% red, 100% blue). Stats also store `bestPaths` -- per-category path data (arrays of `[x, y, t]` tuples) that correspond to the PB run for each category. Old stats without `bestPaths` are handled gracefully via fallback in `updatePersonalBest`
- **Path tracking:** `path.js` provides a path recorder that samples player position at ~20Hz (every 0.05s). On run completion, if the path is complete (final sample within 30s max duration), the path is stored alongside PB times per category. During COMPLETE state, the recorded path is rendered as a line overlay on the canvas
- **Ghost replay:** During PLAYING state, the renderer draws a semi-transparent blue rectangle at the interpolated position from the PB path for the user's selected ghost category. Ghost position is computed via linear interpolation between path samples. Returns null (no ghost drawn) if the current elapsed time exceeds the ghost path's duration
- **Settings:** `settings.js` persists user preferences in localStorage under `speedrun-settings`. Currently stores the ghost category preference (off/anyPercent/hundredRed/hundredBlue, defaulting to anyPercent). A gear button in the HTML opens a settings modal with radio buttons. The settings modal is blocked from opening during PLAYING state, and all keydown events are suppressed while the modal is open
- **Restart:** `restartRun()` in `@/games/speedrun/src/game.js` resets player position/velocity, coin collected flags, and timer -- the same generated level is reused. Restart also resets the path recorder. Restart is triggered three ways: R key during PLAYING (mid-run reset, counts as an attempt), R key from COMPLETE, or Enter key from COMPLETE. A persistent `handleKeyDown()` listener in `main.js` handles keyboard restart separately from the movement input system in `input.js`
- **HUD:** During gameplay, the renderer shows the week seed (top-right), PB any% time, and attempt count alongside the timer and coin counts. The week seed also appears on the READY screen

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
