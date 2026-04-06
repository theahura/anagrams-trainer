# Noridoc: tests

Path: @/tests

### Overview

- Vitest test suites covering the pure-logic runtime modules and Vue components
- Tests run via `npm test` (vitest run) or `npm run test:watch` (vitest watch mode)

### How it fits into the larger codebase

- Tests import directly from `@/src/prng.js`, `@/src/game.js`, `@/src/words.js`, `@/src/sound.js`, and `@/scripts/web-scraper.js`
- Vue component tests use `@vue/test-utils` to mount components from `@/src/components/`
- `build-words.test.js` tests the word processing functions that `@/scripts/build-words.js` depends on, not the build script itself
- `web-scraper.test.js` tests the HTML parsing and expansion key derivation functions used by the web-sourced build pipeline

### Core Implementation

- **`prng.test.js`** -- Verifies PRNG determinism (same date -> same sequence), distinctness (different dates -> different sequences), and output range [0, 1). Also tests `seededShuffle` determinism and element preservation, and `seededPick` determinism
- **`game.test.js`** -- Tests daily puzzle selection, answer validation (including acceptance of root+suffix words when present in expansion dictionary), offered letter guarantees, `getAnswersForRound`, share text generation (verifies "Reword" header), `matchTypedToTiles`, `getSubmitFeedbackType`, `isConsecutiveDay`, `updateStreakStats`, `processKeyPress`, `calculateScore`, `formatCountdown` (HH:MM:SS formatting for various durations), `formatRoundTimer` (M:SS countdown formatting including boundary values and floor behavior), `getTimeUntilMidnightUTC` (returns positive number less than 24 hours), and `serializeGameState`/`deserializeGameState` round-trip and edge cases (round-trip recovery, elapsed time computation, capping at `ROUND_TIME_LIMIT_MS`, null returns for complete/legacy/null/undefined inputs)
- **`components.test.js`** -- Vue component tests using `@vue/test-utils`:
  - `ScrabbleTile`: renders uppercase letters, no `.points` element, applies tileClass prop
  - `TileRack`: renders each letter, handles empty arrays and tileClass propagation
  - `VirtualKeyboard`: emits `key-press` with lowercased letters, Enter, and Backspace
  - `GameBoard`: renders root word and offered letters in tile racks, shows round indicator, emits submit/skip events
  - `ScoreScreen`: displays solved count, per-round results, and countdown timer. Tests the 5-answer cap on possible answers for skipped rounds (shows all when <=5, truncates with "+N more" when >5). Verifies possible answers are not shown for solved rounds
  - `HowToPlay`: renders modal content and emits close on button click. Tests that the modal mentions the 60-second timer and letter-based scoring rules
  - `App` (integration): mounts the full App component with mocked fetch and localStorage. Tests that the 60-second timer pauses when the HowToPlay modal is opened mid-game and resumes from the paused position when the modal closes (uses `vi.useFakeTimers` to control time progression)
- **`build-words.test.js`** -- Tests letter signature sorting, expansion finding, and a regression test verifying that "ski" + "r" produces "risk"
- **`web-scraper.test.js`** -- Tests the pure functions in `@/scripts/web-scraper.js`: HTML parsing, expansion key derivation, and grouping words by expansion key
- **`sound.test.js`** -- Tests the sound module using a mock AudioContext. Verifies all play methods exist, mute/unmute toggling, and that all sound methods can be called without throwing


### Things to Know

- Tests use small inline dictionaries and puzzle data fixtures rather than loading `@/data/puzzles.json`
- The `game.test.js` test data includes crafted edge cases for answer validation, including a regression test ensuring "master" from root "aster" + letter "m" is accepted. Tests verify that root+suffix words (e.g., "rinds", "planted", "faster") are accepted when present in the expansion dictionary
- Some tests use a constant RNG (`() => 0.5`) to make offered letter tests deterministic without depending on the PRNG implementation
- Most component tests mount individual components in isolation with props. The App.vue integration tests are the exception -- they mount the full app with mocked `fetch`, `localStorage`, and `AudioContext`

Created and maintained by Nori.
