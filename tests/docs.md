# Noridoc: tests

Path: @/tests

### Overview

- Vitest test suites covering pure-logic runtime modules for both Reword and Speedrun, Vue components, and monorepo structure invariants
- Tests run via `npm test` (vitest run) or `npm run test:watch` (vitest watch mode)

### How it fits into the larger codebase

- Tests import directly from `@/games/reword/src/prng.js`, `@/games/reword/src/game.js`, `@/games/reword/src/words.js`, `@/games/reword/src/sound.js`, and `@/scripts/web-scraper.js`
- Vue component tests use `@vue/test-utils` to mount components from `@/games/reword/src/components/`
- `build-words.test.js` tests the word processing functions from `@/games/reword/src/words.js` and the `trimPuzzleData` function exported from `@/scripts/build-words.js`
- `web-scraper.test.js` tests the HTML parsing and expansion key derivation functions used by the web-sourced build pipeline
- `@/tests/speedrun/` contains test suites that import from `@/games/speedrun/src/` modules -- physics, level generation, timing, stats, and game-loop integration

### Core Implementation

- **`prng.test.js`** -- Verifies PRNG determinism (same date -> same sequence), distinctness (different dates -> different sequences), and output range [0, 1). Also tests `seededShuffle` determinism and element preservation, and `seededPick` determinism
- **`game.test.js`** -- Tests daily puzzle selection, answer validation (including trivial suffix rejection for s/ed/er), offered letter guarantees, `getAnswersForRound`, share text generation (verifies "Reword" header), `matchTypedToTiles`, `getSubmitFeedbackType`, `isConsecutiveDay`, `updateStreakStats`, `updateLifetimeStats` (first game init, accumulation, min/max semantics for fastest time and best score, longest word tracking, all-skips edge case), `processKeyPress`, `calculateScore`, `formatCountdown` (HH:MM:SS formatting for various durations), and `getTimeUntilMidnightUTC` (returns positive number less than 24 hours)
- **`components.test.js`** -- Vue component tests using `@vue/test-utils`:
  - `ScrabbleTile`: renders uppercase letters, no `.points` element, applies tileClass prop
  - `TileRack`: renders each letter, handles empty arrays and tileClass propagation
  - `VirtualKeyboard`: emits `key-press` with lowercased letters, Enter, and Backspace
  - `GameBoard`: renders root word and offered letters in tile racks, shows round indicator, emits submit/skip events, fly-up class and `--tile-index` style application based on `flyUp` prop
  - `ScoreScreen`: displays solved count, per-round results, countdown timer, and conditionally renders lifetime stats section (present when prop provided, hidden when null)
  - `HowToPlay`: renders modal content and emits close on button click
- **`build-words.test.js`** -- Tests letter signature sorting, expansion finding, a regression test verifying that "ski" + "r" produces "risk", and `trimPuzzleData` behavior (all expansion keys are preserved regardless of count, words-per-key limiting works)
- **`web-scraper.test.js`** -- Tests the pure functions in `@/scripts/web-scraper.js`: HTML parsing, expansion key derivation, and grouping words by expansion key
- **`sound.test.js`** -- Tests the sound module using a mock AudioContext. Verifies all play methods exist, mute/unmute toggling, and that all sound methods can be called without throwing
- **`meta-tags.test.js`** -- Parses both HTML entry points (`@/reword/index.html` and `@/index.html`) via `happy-dom` and verifies OG and Twitter Card meta tags are present with expected values. Also checks that the `og-image.png` file exists on disk. Tests assert absolute URLs for image tags and correct card types (`summary_large_image` for Reword, `summary` for games index). A separate `games index card images` suite verifies that game cards on the index page contain expected visual elements (e.g., the Reword card embeds the og-image with alt text)
- **`repo-structure.test.js`** -- Filesystem-level tests that verify the monorepo layout: root package name, games index page linking to Reword, Reword entry page referencing assets in `@/games/reword/`, and favicon existence with its HTML link tag in `@/reword/index.html`
- **`speedrun/physics.test.js`** -- Tests gravity, platform landing, horizontal collision, variable jump height, coyote time, input buffering, wall sliding, wall jumping, wall jump control delay (verifying forced direction during delay window and input resumption after expiry), acceleration-based movement, and max fall speed clamping. Uses inline grid fixtures and a `makeLevel()` helper
- **`speedrun/level.test.js`** -- Tests grid dimensions, seed determinism, start/goal placement, coin generation, and BFS reachability (verified across multiple seeds). A "multi-route level generation" suite verifies the lane-based design: red coins cluster in the upper half, blue coins cluster in the lower half, coins exist in both halves, and the two colors occupy spatially distinct regions (average Y positions). Also tests weekly seed consistency within a week and divergence across weeks
- **`speedrun/timing.test.js`** -- Tests timer start state, elapsed tracking, pause/resume, `formatTime` output format (M:SS.mmm), and `createCompletionRecord` category logic (any% always recorded, 100% red/blue only when all coins of that color collected)
- **`speedrun/stats.test.js`** -- Tests default stats on empty localStorage, round-trip persistence, per-week isolation, personal best update logic (faster replaces, slower keeps old), and first-time PB from null
- **`speedrun/game-loop.test.js`** -- Integration tests: player initialization at start position, coin collection through simulated movement, goal detection through simulated movement, and `restartRun()` behavior (resets player position/velocity, coin counts, timer, and coin collected flags)

### Things to Know

- Tests use small inline dictionaries and puzzle data fixtures rather than loading `@/games/reword/data/puzzles.json`
- The `game.test.js` test data includes crafted edge cases for answer validation, including a regression test ensuring "master" from root "aster" + letter "m" is accepted (not blocked by trivial suffix filter since "master" is not root + "s"/"ed"/"er")
- Some tests use a constant RNG (`() => 0.5`) to make offered letter tests deterministic without depending on the PRNG implementation
- Component tests mount individual components in isolation with props, not the full `App.vue` (which requires fetch and localStorage)

Created and maintained by Nori.
