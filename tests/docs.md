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
- **`game.test.js`** -- Tests daily puzzle selection, answer validation (including trivial suffix rejection for s/ed/er), offered letter guarantees, `getAnswersForRound`, share text generation (verifies "Reword" header), `matchTypedToTiles`, `getSubmitFeedbackType`, `isConsecutiveDay`, `updateStreakStats`, `processKeyPress`, `calculateScore`, `formatCountdown` (HH:MM:SS formatting for various durations), and `getTimeUntilMidnightUTC` (returns positive number less than 24 hours)
- **`components.test.js`** -- Vue component tests using `@vue/test-utils`:
  - `ScrabbleTile`: renders uppercase letters, no `.points` element, applies tileClass prop
  - `TileRack`: renders each letter, handles empty arrays and tileClass propagation
  - `VirtualKeyboard`: emits `key-press` with lowercased letters, Enter, and Backspace
  - `GameBoard`: renders root word and offered letters in tile racks, shows round indicator, emits submit/skip events
  - `ScoreScreen`: displays solved count, per-round results, and countdown timer
  - `HowToPlay`: renders modal content and emits close on button click
- **`build-words.test.js`** -- Tests letter signature sorting, expansion finding, and a regression test verifying that "ski" + "r" produces "risk"
- **`web-scraper.test.js`** -- Tests the pure functions in `@/scripts/web-scraper.js`: HTML parsing, expansion key derivation, and grouping words by expansion key
- **`sound.test.js`** -- Tests the sound module using a mock AudioContext. Verifies all play methods exist, mute/unmute toggling, and that all sound methods can be called without throwing
- **`static-assets.test.js`** -- Reads `index.html` from disk and verifies it contains a `<link rel="icon" ...>` tag, ensuring the favicon reference is not accidentally removed

### Things to Know

- Tests use small inline dictionaries and puzzle data fixtures rather than loading `@/data/puzzles.json`
- The `game.test.js` test data includes crafted edge cases for answer validation, including a regression test ensuring "master" from root "aster" + letter "m" is accepted (not blocked by trivial suffix filter since "master" is not root + "s"/"ed"/"er")
- Some tests use a constant RNG (`() => 0.5`) to make offered letter tests deterministic without depending on the PRNG implementation
- Component tests mount individual components in isolation with props, not the full `App.vue` (which requires fetch and localStorage)

Created and maintained by Nori.
