# Noridoc: games/speedrun

Path: @/games/speedrun

### Overview

- **Speedrun** is a daily 2D platformer where players race through a procedurally generated single-screen level, collecting coins and trying to beat personal best times
- Pure HTML5 Canvas game with no framework -- vanilla JS modules, Canvas 2D rendering, DOM-based results overlay
- Seeded PRNG generates one level per UTC day, so all players share the same map for a given date

### How it fits into the larger codebase

- `@/speedrun/index.html` is the Vite entry point (thin HTML shell with `<canvas>` and results overlay div), linked from the games index at `@/index.html`. Includes OpenGraph and Twitter Card meta tags pointing to `@/games/speedrun/og-image.png`
- `@/games/speedrun/og-card.html` is the design template for the OG image (1200x630px) -- rendered and screenshotted to produce `og-image.png`. Same pattern as Reword's `og-card.html`
- `@/vite.config.js` includes the speedrun entry in its multi-page rollup inputs alongside the games index and Reword
- Source modules live in `@/games/speedrun/src/` -- pure-logic modules with no DOM dependencies except `main.js` and `renderer.js`
- `@/games/speedrun/style.css` defines the dark theme, matching the Wordle-style palette used across the repo (#121213 background, #d7dadc text, #538d4e green accents)
- `@/tests/speedrun/` contains Vitest test suites covering physics, level generation, timing, stats, and game-loop integration
- Unlike Reword (Vue 3 SPA), Speedrun has no build-time data pipeline -- levels are generated at runtime from a daily seed
- The global leaderboard uses Firebase Firestore (client SDK, no backend server). The Firebase config is in `@/games/speedrun/src/firebase.js`. Security is enforced by Firestore rules server-side, not client code. Works with the existing GitHub Pages static deployment

### Core Implementation

- **Game loop:** `main.js` orchestrates a `requestAnimationFrame` loop with three states: READY (waiting for keypress), PLAYING (physics + timer active), COMPLETE (results overlay shown). The state machine always cycles through READY before entering PLAYING -- both initial start and post-reset flows go through the READY gate
- **Data flow per frame:**
  ```
  gameLoop(timestamp)
    -> updateTimer(timer, dt)
    -> updatePlayer(player, inputState, level, dt, config)
    -> clearFrameInput(inputState)        // consume jumpPressed, dashPressed
    -> recordFrame(pathRecorder, ...)     // sample position at ~20Hz
    -> interpolatePosition(ghostPath, t)  // compute ghost position from PB path
    -> check player.reachedGoal -> completeRun()
    -> renderer.render(level, player, timer, gameState, stats, daySeed, ghostPos, currentPath)
  ```
- **Level generation:** `level.js` uses `getDailySeed(date)` to derive a UTC date string (e.g. `"2026-04-08"`), then `generateLevel(seed)` builds a 25x19 tile grid using a lane-based system. Three vertical bands (HIGH_LANE rows 3-7, MID_LANE rows 8-10, LOW_LANE rows 11-15) structure platforms into distinct high and low routes connected by mid-lane bridges. Coin placement is route-biased: red coins on high-route platforms, blue coins on low-route/ground surfaces, so 100% red and 100% blue categories require different paths through the level. Both coin pools are filtered to exclude positions within the goal's hitbox (one TILE_SIZE in each axis), since the goal detection would trigger run completion before overlapping coins could be collected. BFS reachability check with bridge platform fallback remains as a safety net
- **Physics:** `physics.js` implements acceleration-based movement, axis-separated AABB collision resolution, gravity with variable jump height (jump-cut multiplier when not holding jump), coyote time, input buffering, wall sliding, wall jumping with a short control delay, dash, and sprint. Wall jump parameters are tuned for Hollow Knight-style same-wall climbing: low horizontal push-away speed (100px/s) and a very brief control override (0.04s) so the player arcs only ~7px from the wall before regaining control to hold back and re-cling. Dash (tap E) applies an instant 500px/s burst in the current movement direction for 0.15s, during which normal horizontal movement is skipped; has a 0.5s cooldown. Sprint (hold E) raises the horizontal speed cap from 250 to 375px/s while held
- **Stats persistence:** `stats.js` stores per-day personal bests in localStorage under `speedrun-stats-{daySeed}` (e.g. `speedrun-stats-2026-04-08`), tracking attempts and best times for three categories (any%, 100% red, 100% blue). Stats also store `bestPaths` -- per-category path data (arrays of `[x, y, t]` tuples) that correspond to the PB run for each category. Old stats without `bestPaths` are handled gracefully via fallback in `updatePersonalBest`
- **Path tracking:** `path.js` provides a path recorder that samples player position at ~20Hz (every 0.05s). On run completion, if the path is complete (final sample within 30s max duration), the path is stored alongside PB times per category. During COMPLETE state, the recorded path is rendered as a line overlay on the canvas
- **Ghost replay:** During PLAYING state, the renderer draws a semi-transparent blue rectangle at the interpolated position from the PB path for the user's selected ghost category. Ghost position is computed via linear interpolation between path samples. Returns null (no ghost drawn) if the current elapsed time exceeds the ghost path's duration
- **Settings:** `settings.js` persists user preferences in localStorage under `speedrun-settings`. Currently stores the ghost category preference (off/anyPercent/hundredRed/hundredBlue, defaulting to anyPercent). A gear button in the HTML opens a settings modal with radio buttons. The settings modal is blocked from opening during PLAYING state, and all keydown events are suppressed while the modal is open
- **Global leaderboard:** Firebase Firestore stores scores in `leaderboards/{daySeed}/scores/{auto-id}` with fields `name`, `time`, `category`, `weekSeed`, `submittedAt`. Submission is manual -- the player clicks "Submit to Leaderboard" on the results screen, enters a name (validated by `@/games/speedrun/src/nameFilter.js`), and each completed category is submitted as a separate Firestore document. The leaderboard modal (accessible from a persistent button in the HTML) shows the top 50 scores per category with tabbed navigation (Any%, 100% Red, 100% Blue). If the player's local PB is outside the top 50, their rank is fetched separately via a count query. The leaderboard is purely additive to the existing localStorage stats system -- it does not replace it
- **Game lifecycle:** `@/games/speedrun/src/game.js` exports both `startRun(timer)` and `restartRun(player, level, timer)` -- the full start/reset lifecycle lives in one testable module. `startRun` only sets `timer.running = true` without clearing input state, so the keypress that triggers game start is preserved and acts as the first movement input. `restartRun` resets player position/velocity, coin collected flags, and timer (set to zero, not running) -- the same generated level is reused. All reset paths transition to READY state (not PLAYING), so the player always sees a "press any key to start" prompt before the next run begins. `startGame()` in `main.js` is the single entry point that transitions from READY to PLAYING by calling `startRun`. Restart is triggered three ways: R key during PLAYING (mid-run reset, counts as an attempt), R key from COMPLETE, or Enter key from COMPLETE. A persistent `handleKeyDown()` listener in `main.js` handles keyboard restart separately from the movement input system in `input.js`
- **HUD:** During gameplay, the renderer shows the day seed (top-right), PB any% time, and attempt count alongside the timer and coin counts. The day seed also appears on the READY screen

### Things to Know

- **Keyboard guard:** `handleKeyDown()` in `main.js` returns early when an `<input>` element is focused (for the name form), when settings are open, or when the leaderboard modal is visible, preventing game actions while the player is typing or browsing scores. Escape closes the leaderboard modal
- Physics constants are derived from desired jump height (3.5 tiles) and time-to-apex (0.35s): gravity and jump speed are calculated to produce that exact arc. This is set up in `createPhysicsConfig()` in `@/games/speedrun/src/physics.js`
- The PRNG (`@/games/speedrun/src/prng.js`) uses the same cyrb128 + sfc32 approach as Reword's PRNG, but is a separate copy -- the two games do not share the module
- Collision resolution happens in two passes: X-axis first, then Y-axis. The Y-axis pass resets `player.grounded` to false at the top, only setting it true if a downward collision is resolved. This order matters for correct corner behavior
- Wall detection uses a 1px probe on each side of the player with 4px vertical insets from top and bottom edges, checked only when airborne
- Coin collection uses circle-distance check (16px radius) against player center, not AABB overlap
- Goal detection uses a tile-sized rectangular proximity check against player center
- The delta-time is clamped to 1/30s maximum to prevent physics tunneling on long frame drops
- `jumpPressed` and `dashPressed` are single-frame edge-triggered flags consumed by `clearFrameInput()` each frame. Critically, `clearFrameInput` is only called inside the game loop (both PLAYING and non-PLAYING branches), never during the READY-to-PLAYING transition -- this means the keypress that starts a run is preserved as a movement input for the first physics frame. The dash input follows the same held/edge-triggered pattern (`dash` + `dashPressed`) as jump (`jump` + `jumpPressed`)

Created and maintained by Nori.
