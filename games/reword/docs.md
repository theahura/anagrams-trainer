# Noridoc: games/reword

Path: @/games/reword

### Overview

- **Reword** is a daily anagram word game where players add one or more letters to a root word and rearrange to form a new word
- Vue 3 SFC frontend with Vite build tooling; no backend -- puzzle data is pre-computed at build time and served as a JSON file
- Date-seeded PRNG ensures all players worldwide see the same puzzle on a given UTC day
- Dark Wordle-style visual theme (#121213 background, #d7dadc text, green accents for correct states)

### How it fits into the larger codebase

- `@/index.html` is the games index page for the published site
- `@/reword/index.html` is the standalone entry page for the Reword game
- `@/games/reword/style.css` defines the Reword game theme, tile styles, animations, virtual keyboard layout for touch devices, and score screen styling including countdown timer
- `@/scripts/` contains two alternative build pipelines (`npm run build:words` for TWL06-based, `npm run build:words:web` for web-sourced via wordunscrambler.me) that both produce `@/games/reword/data/puzzles.json` in the same format
- `@/games/reword/src/` contains the Reword runtime logic: Vue components plus pure-logic modules (`game.js`, `prng.js`, `words.js`, `sound.js`)
- `@/tests/` contains Vitest test suites covering the pure-logic modules and Vue components

### Core Implementation

- **Data flow at runtime:**
  ```
  @/reword/index.html
    -> @/games/reword/src/main.js: createApp(App).mount('#app')
    -> App.vue onMounted:
       -> fetch bundled puzzles asset
       -> selectDailyPuzzle(data, dateStr)  [@/games/reword/src/game.js]
       -> checks localStorage for saved game (reword-{date}, falls back to anagram-trainer-{date})
       -> if saved: renders ScoreScreen with previous results
       -> if not: renders GameBoard with VirtualKeyboard, handles input, validates, plays sounds, saves on completion
  ```
  ```
  Component hierarchy:
    App.vue
      -> HowToPlay.vue (modal, auto-shows on first visit)
      -> GameBoard.vue
      -> ScoreScreen.vue (with countdown to next puzzle)
  ```
- **Data flow at build time (two alternatives, same output):**
  ```
  Option A: @/scripts/build-words.js (npm run build:words)
    -> downloads TWL06 word list from GitHub
    -> builds letter-signature index     [@/games/reword/src/words.js]
    -> finds expansions for each root word (+1, +2, +3 letters via combinations-with-repetition)
    -> applies size caps
    -> writes @/games/reword/data/puzzles.json

  Option B: @/scripts/build-words-web.js (npm run build:words:web)
    -> downloads TWL06 for candidate root identification
    -> fetches expansions from wordunscrambler.me  [@/scripts/web-scraper.js]
    -> caches results in @/games/reword/data/web-cache.json
    -> applies same size caps
    -> writes @/games/reword/data/puzzles.json (identical format)
  ```
- **Difficulty progression:** 11 rounds per game: 3x3-letter roots, 3x4-letter, 3x5-letter, 1x6-letter, 1x7+-letter root
- **Multi-letter expansions:** Expansion keys are variable-length strings (for example, `"r"`, `"el"`, `"egr"`). Players can use 1, 2, or 3 of the offered letters. `maxExtraLetters` varies by root length: +3 for roots of length 3-5, +2 for length 6, +1 for length 7+
- **Word acceptance rule:** Valid dictionary words are accepted unless they are trivial suffix appends (`s`, `ed`, `er`). Validation checks dictionary lookup, offered-letter availability (the expansion key's letters must be a subset of the offered letters), and rejects trivial suffixes via `TRIVIAL_SUFFIXES` in `@/games/reword/src/game.js`

### Things to Know

- The PRNG uses cyrb128 for hashing the date string into a seed, then sfc32 as the generator -- both are well-known algorithms chosen for JS portability and determinism
- `@/games/reword/data/puzzles.json` is the only data dependency at runtime; the game works entirely offline once loaded
- **State management:** All game state lives in `App.vue` as Vue reactive state (`reactive()` for round/input state, `ref()` for UI flags). Pure logic modules (`game.js`, `prng.js`, `words.js`, `sound.js`) have no state of their own
- **localStorage migration:** Keys migrated from `anagram-trainer-*` to `reword-*`. All reads include backwards-compatible fallback to the old key names (for example, `localStorage.getItem('reword-' + date) || localStorage.getItem('anagram-trainer-' + date)`)
- **localStorage keys:** `reword-{YYYY-MM-DD}` for per-date game results, `reword-stats` for streak statistics, `reword-lifetime-stats` for cumulative cross-game statistics, `reword-sound-muted` for mute state, `reword-seen-how-to-play` for first-visit flag
- Real-time tile feedback: as the player types, `matchTypedToTiles` in `@/games/reword/src/game.js` greedily maps each character to root tiles first, then offered tiles. `GameBoard.vue` uses computed properties to derive tile classes (invalid when no matching tile available)
- Mobile touch input: `VirtualKeyboard.vue` renders an on-screen QWERTY keyboard shown only on touch devices via `@/games/reword/style.css`. Both physical keyboard (document keydown listener in `App.vue`) and virtual keyboard paths converge through `handleKeyInput` in `App.vue`
- The score screen shows a "Next puzzle in: HH:MM:SS" countdown to UTC midnight, using `formatCountdown()` and `getTimeUntilMidnightUTC()` pure functions from `@/games/reword/src/game.js`, ticked every second in `ScoreScreen.vue`
- Timer starts on first keystroke, not on round render
- Sound effects use Web Audio API synthesis with zero external dependencies. `playKeyClick` uses a filtered white noise burst (bandpass filter at 1200Hz). AudioContext is lazily created on first user interaction. iOS Safari compatibility via `webkitAudioContext` fallback
- `@/games/reword/src/ui.js` still exists in the codebase but is unused -- all UI logic was migrated to Vue components
- Vite is the build tool; Vue 3 and Vitest are the primary dev dependencies

Created and maintained by Nori.
