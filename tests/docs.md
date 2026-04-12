# Noridoc: tests

Path: @/tests

### Overview

- Vitest test suites covering pure-logic runtime modules for both Reword and Speedrun, Vue components, and monorepo structure invariants
- Tests run via `npm test` (vitest run) or `npm run test:watch` (vitest watch mode)

### How it fits into the larger codebase

- Tests import directly from `@/games/reword/src/prng.js`, `@/games/reword/src/game.js`, `@/games/reword/src/words.js`, `@/games/reword/src/sound.js`, and `@/scripts/web-scraper.js`
- Vue component tests use `@vue/test-utils` to mount components from `@/games/reword/src/components/`
- `build-words.test.js` tests the word processing functions from `@/games/reword/src/words.js` and the `trimPuzzleData` function exported from `@/scripts/build-words.js`
- `web-scraper.test.js` tests the pure functions in `@/scripts/web-scraper.js`: HTML parsing, expansion key derivation, and grouping words by expansion key
- `@/tests/speedrun/` contains test suites that import from `@/games/speedrun/src/` modules -- physics, level generation, timing, stats, and game-loop integration

### Core Implementation

- **`prng.test.js`** -- Verifies PRNG determinism (same date -> same sequence), distinctness (different dates -> different sequences), and output range [0, 1). Also tests `seededShuffle` determinism and element preservation, and `seededPick` determinism
- **`game.test.js`** -- Tests daily puzzle selection, answer validation (including trivial suffix rejection for s/ed/er), offered letter guarantees, `getAnswersForRound`, share text generation (verifies "Reword" header, and `timerDisabled` param omitting time from output), `matchTypedToTiles`, `getSubmitFeedbackType`, `isConsecutiveDay`, `updateStreakStats`, `updateLifetimeStats` (first game init, accumulation, min/max semantics for fastest time and best score, longest word tracking, all-skips edge case, `timerDisabled` excluding games from perfect tracking), `processKeyPress`, `calculateScore`, `formatCountdown` (HH:MM:SS formatting for various durations), and `getTimeUntilMidnightUTC` (returns positive number less than 24 hours)
- **`components.test.js`** -- Vue component tests using `@vue/test-utils`:
  - `ScrabbleTile`: renders uppercase letters, no `.points` element, applies tileClass prop
  - `TileRack`: renders each letter, handles empty arrays and tileClass propagation
  - `VirtualKeyboard`: emits `key-press` with lowercased letters, Enter, and Backspace
  - `LoadingScreen`: verifies SVG element exists, loading text is present, and `role="status"` accessibility attribute is set
  - `GameBoard`: renders root word and offered letters in tile racks, shows round indicator, emits submit/skip events, fly-up class and `--tile-index` style application based on `flyUp` prop, and message rendering behavior (DOM presence/absence tied to the `message` prop)
  - `ScoreScreen`: displays solved count, per-round results, countdown timer, and conditionally renders lifetime stats section (present when prop provided, hidden when null). Tests `timerDisabled` prop behavior (hides "Total Time" when true, shows when false)
  - `HowToPlay`: renders modal content and emits close on button click. Tests timer toggle checkbox: emits `toggle-timer`, reflects `timerDisabled` prop as checked state, is disabled when `gameInProgress` is true, and does not emit when disabled
- **`build-words.test.js`** -- Tests letter signature sorting, expansion finding, a regression test verifying that "ski" + "r" produces "risk", and `trimPuzzleData` behavior (all expansion keys are preserved regardless of count, words-per-key limiting works)
- **`web-scraper.test.js`** -- Tests the pure functions in `@/scripts/web-scraper.js`: HTML parsing, expansion key derivation, and grouping words by expansion key
- **`sound.test.js`** -- Tests the sound module using a mock AudioContext. Verifies all play methods exist, mute/unmute toggling, and that all sound methods can be called without throwing
- **`meta-tags.test.js`** -- Parses HTML entry points (`@/reword/index.html`, `@/speedrun/index.html`, and `@/index.html`) via `happy-dom` and verifies OG and Twitter Card meta tags are present with expected values. Also checks that `og-image.png` files exist both at their source paths and in `@/public/` at paths matching the URLs in the meta tags -- this catches the deployment gap where Vite does not process `<meta content="">` as asset references. Tests assert absolute URLs for image tags and correct card types (`summary_large_image` for Reword, `summary` for games index). A separate `games index card images` suite verifies that game cards on the index page contain expected visual elements (e.g., the Reword card embeds the og-image with alt text)
- **`repo-structure.test.js`** -- Filesystem-level tests that verify the monorepo layout: root package name, games index page linking to Reword, Reword entry page referencing assets in `@/games/reword/`, and favicon existence with its HTML link tag in `@/reword/index.html`
- **`speedrun/physics.test.js`** -- Tests gravity, platform landing, horizontal collision, variable jump height, coyote time, input buffering, wall sliding, wall jumping, wall jump control delay (verifying forced direction during delay window and input resumption after expiry), acceleration-based movement, max fall speed clamping, and directional dash behavior (horizontal dash zeroes vy, down-dash zeroes vx, gravity freeze during dash, velocity restoration after dash expires, horizontal priority over down, no up-dash). Uses inline grid fixtures and a `makeLevel()` helper
- **`speedrun/vault.test.js`** -- Tests the corner vault mechanic: vault trigger conditions (bottom ~6px clips a platform corner with open space above), negative cases (overlap too large, player grounded, space above corner is solid), momentum direction (pushes away from the corner on both left and right sides), Y-position snapping to clear the corner, timer exhaustion (coyote and jump buffer), and wall jump priority over vault when `wallDir` is set
- **`speedrun/level.test.js`** -- Tests grid dimensions, seed determinism, start/goal placement, coin generation, and BFS reachability (verified across multiple seeds). A "multi-route level generation" suite verifies the lane-based design: red coins cluster in the upper half, blue coins cluster in the lower half, coins exist in both halves, and the two colors occupy spatially distinct regions (average Y positions). Also tests daily seed format, same-day consistency, and cross-day divergence
- **`speedrun/timing.test.js`** -- Tests timer start state, elapsed tracking, pause/resume, `formatTime` output format (M:SS.mmm), and `createCompletionRecord` category logic (any% always recorded, 100% red/blue only when all coins of that color collected)
- **`speedrun/stats.test.js`** -- Tests default stats on empty localStorage, round-trip persistence, per-day isolation, personal best update logic (faster replaces, slower keeps old), first-time PB from null, path storage alongside PB times, path preservation when PB does not improve, backwards compatibility with old stats lacking `bestPaths`, independent per-category path storage, and default stats shape including `bestPaths`
- **`speedrun/path.test.js`** -- Tests path recorder creation, frame recording at sample interval, recorder reset, `isPathComplete` logic (empty path, within max duration, exceeding max duration), and `interpolatePosition` (before path start, exact sample match, midpoint interpolation, past path end, null/empty path)
- **`speedrun/settings.test.js`** -- Tests default settings on empty localStorage, round-trip persistence, corrupted data fallback, and default ghost category value
- **`speedrun/name-filter.test.js`** -- Tests player name validation: length constraints (3-12 chars), allowed character set (alphanumeric + underscore), profanity rejection via leo-profanity, whitespace trimming, and the `valid: true`/`valid: false` return shape
- **`speedrun/leaderboard.test.js`** -- Tests `submitScore` input validation: category must be one of anyPercent/hundredRed/hundredBlue, time must be positive finite number under 3600, name must pass validation. Uses mocked firebase/firestore at the module boundary
- **`speedrun/game-loop.test.js`** -- Integration tests: player initialization at start position, coin collection through simulated movement, goal detection through simulated movement, and `restartRun()` behavior (resets player position/velocity, coin counts, timer, and coin collected flags)

### Things to Know

- Tests use small inline dictionaries and puzzle data fixtures rather than loading `@/games/reword/data/puzzles.json`
- The `game.test.js` test data includes crafted edge cases for answer validation, including a regression test ensuring "master" from root "aster" + letter "m" is accepted (not blocked by trivial suffix filter since "master" is not root + "s"/"ed"/"er")
- Some tests use a constant RNG (`() => 0.5`) to make offered letter tests deterministic without depending on the PRNG implementation
- Component tests mount individual components in isolation with props, not the full `App.vue` (which requires fetch and localStorage)
- `components.test.js` also includes `App` integration tests (mounting with mocked `fetch` and `localStorage`) that verify the `state.transitioning` guard prevents typing and message clearing during round transitions
- `tile-aspect-ratio.test.js` is a CSS regression test that reads `@/games/reword/style.css` as a string and verifies `#input-area .tile` has `aspect-ratio: 1` and `height: auto`, ensuring input tiles stay square when they shrink below their flex-basis

Created and maintained by Nori.
