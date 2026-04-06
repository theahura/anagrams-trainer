# Noridoc: Root

Path: @/

### Overview

- A daily anagram word game where players add one or more letters to a root word and rearrange to form a new word, styled with Scrabble tile aesthetics
- Pure static HTML/JS with no backend -- puzzle data is pre-computed at build time and served as a JSON file
- Date-seeded PRNG ensures all players worldwide see the same puzzle on a given UTC day

### How it fits into the larger codebase

- `index.html` is the entry point -- it fetches `@/data/puzzles.json`, derives the UTC date string, calls `selectDailyPuzzle()` from `@/src/game.js`, then passes the result to `initUI()` from `@/src/ui.js`
- `style.css` defines the Scrabble board visual theme (green felt background, cream tiles with point subscripts), all answer feedback / round transition animations, a virtual QWERTY keyboard for touch devices, touch-optimized button sizing, the in-game info bar (round indicator, running letter score, timer), and the mute toggle button
- `@/scripts/` contains two alternative build pipelines (`npm run build:words` for TWL06-based, `npm run build:words:web` for web-sourced via wordunscrambler.me) that both produce `@/data/puzzles.json` in the same format
- `@/src/` contains all runtime game logic (PRNG, game rules, word processing, sound synthesis, DOM rendering)
- `@/tests/` contains Vitest test suites covering the non-UI modules

### Core Implementation

- **Data flow at runtime:**
  ```
  index.html
    -> fetch puzzles.json
    -> selectDailyPuzzle(data, dateStr)  [src/game.js]
       -> getDailyRng(dateStr)           [src/prng.js]
       -> picks 11 rounds by difficulty tier
       -> assigns 3 offered letters per round
    -> initUI(puzzle, dateStr)           [src/ui.js]
       -> checks localStorage for saved game
       -> if saved: renders score screen from saved results
       -> if not: renders tiles, handles keyboard input from physical keyboard or virtual touch keyboard (with real-time tile highlighting via matchTypedToTiles), validates answers, plays sound effects via sound.js, shows score with share button, saves to localStorage
  ```
- **Data flow at build time (two alternatives, same output):**
  ```
  Option A: scripts/build-words.js (npm run build:words)
    -> downloads TWL06 word list from GitHub
    -> builds letter-signature index     [src/words.js]
    -> finds expansions for each root word (+1, +2, +3 letters via combinations-with-repetition)
    -> applies size caps
    -> writes data/puzzles.json

  Option B: scripts/build-words-web.js (npm run build:words:web)
    -> downloads TWL06 for candidate root identification
    -> fetches expansions from wordunscrambler.me  [scripts/web-scraper.js]
    -> caches results in data/web-cache.json
    -> applies same size caps
    -> writes data/puzzles.json (identical format)
  ```
- **Difficulty progression:** 11 rounds per game: 3x3-letter roots, 3x4-letter, 3x5-letter, 1x6-letter, 1x7+-letter root
- **Multi-letter expansions:** Expansion keys are variable-length strings (e.g., `"r"`, `"el"`, `"egr"`). Players can use 1, 2, or 3 of the offered letters. The `maxExtraLetters` varies by root length: +3 for roots of length 3-5, +2 for length 6, +1 for length 7+
- **Word acceptance rule:** All valid dictionary words are accepted. The only validation is dictionary lookup (word must exist in the expansion data) and offered-letter availability (the expansion key's letters must be a subset of the offered letters). There is no substring or trivial-extension filtering

### Things to Know

- The PRNG uses cyrb128 for hashing the date string into a seed, then sfc32 as the generator -- both are well-known algorithms chosen for JS portability and determinism
- `puzzles.json` is the only data dependency at runtime; the game works entirely offline once loaded
- The offered letters mechanic guarantees at least one valid single-letter expansion key among the 3 offered, with the remaining slots filled from the alphabet. Answer validation checks whether a given expansion key's letters are a subset of the offered letters (via `isKeySubsetOfOffered` in `@/src/game.js`), which supports both single and multi-letter keys
- When a puzzle pool is smaller than the number of rounds requested, `selectDailyPuzzle` cycles through the pool using modulo indexing
- Real-time tile feedback: as the player types, `matchTypedToTiles` in `@/src/game.js` greedily maps each character to root tiles first, then offered tiles. `@/src/ui.js` toggles `.used` CSS classes on the rack tiles and `.invalid` on input tiles that have no matching available tile. `@/style.css` provides visual states: `.tile.used` (green tint, reduced opacity), `.tile.offered.used` (green tint, scaled down), and `#input-area .tile.invalid` (red tint), all with 0.2s ease-out transitions
- Mobile touch input: an on-screen QWERTY virtual keyboard is rendered in `@/src/ui.js` and shown only on touch devices via `@media (pointer: coarse)` in `@/style.css` (no JS-based detection). Both physical and virtual keyboard paths share `processKeyPress` (a pure function in `@/src/game.js`) through the `handleKeyInput` dispatcher in `ui.js`. The hidden input element uses `opacity: 0.01` with off-screen positioning and `font-size: 16px` (prevents iOS auto-zoom) for iOS Safari compatibility. Touch targets for buttons meet 44-48px minimums via `@media (pointer: coarse)` overrides
- Answer feedback animations are CSS-only, triggered by JS toggling classes on `#input-area`: shake (0.4s) on wrong/invalid-length answers, bounce (0.6s with staggered `--tile-index` delays per tile) on correct answers. Round transitions use fade-out (0.15s) and fade-in (0.2s) on the tile racks and input area. All animations respect `@media (prefers-reduced-motion: reduce)`
- The game-info bar shows three items: round indicator ("Round N of 11"), a running letter score ("Letters: N"), and elapsed timer. The letter score updates after each round completion (submit or skip) by summing answer lengths from `state.completedRounds`
- All input handlers in `ui.js` guard against `state.currentRound >= 11` to prevent accessing `puzzle[11]` (undefined) during the transition window after the last round completes
- Timer starts on first keystroke, not on round render
- Game results persist in `localStorage` keyed by `anagram-trainer-{YYYY-MM-DD}` (UTC). If a player returns the same UTC day, they see their previous score screen instead of replaying
- Streak statistics are stored separately in `localStorage` under the `anagram-trainer-stats` key. On fresh game completion, `ui.js` calls `updateStreakStats` (a pure function in `@/src/game.js`) to compute updated `{ currentStreak, maxStreak, lastPlayedDate, gamesPlayed }`. The streak row displays on the score screen for both fresh and saved games. `isConsecutiveDay` determines day adjacency using a strict 86400000ms check on UTC dates
- Sound effects use Web Audio API synthesis (OscillatorNode + GainNode) with zero external dependencies. AudioContext is lazily created on first user interaction to comply with browser autoplay policies. All sounds route through a master GainNode for mute control. Mute state persists in `localStorage` under `anagram-trainer-sound-muted`. The `#mute-btn` is absolutely positioned in the header, using emoji icons for speaker state. iOS Safari compatibility is handled via `webkitAudioContext` fallback in `@/src/sound.js`
- Vitest is the only dev dependency

Created and maintained by Nori.
