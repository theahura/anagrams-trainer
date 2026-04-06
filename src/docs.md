# Noridoc: src

Path: @/src

### Overview

- Contains all runtime game modules: Vue 3 SFC components, pure game logic, PRNG, word processing, and sound synthesis
- `main.js` is the entry point, mounting the Vue app; pure-logic modules have no framework dependencies
- Also imported by `@/scripts/build-words.js` for the word processing functions (`words.js`)

### How it fits into the larger codebase

- `@/index.html` loads `src/main.js` which creates the Vue app from `App.vue`
- `@/scripts/build-words.js` imports `words.js` for `buildSignatureIndex` and `findExpansions`
- `@/scripts/web-scraper.js` imports `letterSignature` from `words.js` for expansion key derivation
- `@/tests/` tests `prng.js`, `game.js`, `words.js`, `sound.js` directly, and Vue components via `@vue/test-utils`
- `@/data/puzzles.json` is the data contract: `game.js` expects puzzle data keyed by root word length, each entry having `{ root, expansions }` where expansions maps a variable-length key string (e.g., `"r"`, `"el"`, `"egr"`) to a word array

### Core Implementation

- **`main.js`** -- Vue app entry point
  - `createApp(App).mount('#app')` -- mounts the root component into the `#app` div

- **`components/App.vue`** -- Root component, owns all game state
  - All game state lives in a `reactive()` object: `{ currentRound, completedRounds, inputLetters, roundStartTime, transitioning }`. UI flags (`loading`, `gameComplete`, `muted`, `showHowToPlay`, etc.) are individual `ref()` values
  - On mount: checks `reword-seen-how-to-play` localStorage to auto-show `HowToPlay` on first visit, fetches `puzzles.json`, derives UTC date string, selects daily puzzle, and checks for saved game (with fallback read from old `anagram-trainer-*` keys)
  - `handleKeyInput(key)` dispatches to `processKeyPress` from `game.js` for letter processing, and to `handleSubmit` for Enter
  - `handleSubmit()` and `handleSkip()` use `state.transitioning` flag and `state.currentRound >= 11` guard to prevent double-submission
  - `showScore(savedResults?)` dual mode: fresh game results or saved replay. On fresh completion, persists to `reword-{date}` and updates `reword-stats` via `updateStreakStats`
  - Physical keyboard handled via a document-level `keydown` listener that guards against `gameComplete`, `loading`, and `showHowToPlay` states
  - Audio lazily initialized via `ensureAudio()` on first user interaction

- **`components/GameBoard.vue`** -- Game area: tile racks, input area, submit/skip buttons
  - Uses computed `matchTypedToTiles()` result to derive per-tile CSS classes for real-time feedback (invalid tiles highlighted)
  - Renders empty placeholder tiles up to `minLen` via `displayLen` computed property
  - Exposes a `#timer` slot used by `App.vue` to inject letter score and timer display

- **`components/ScoreScreen.vue`** -- End-of-game display with countdown
  - Shows per-round breakdown (root, answer or SKIPPED, possible answers for skipped rounds)
  - Displays a "Next puzzle in: HH:MM:SS" countdown using `formatCountdown()` and `getTimeUntilMidnightUTC()` from `game.js`, ticked every second via `setInterval`

- **`components/HowToPlay.vue`** -- Tutorial modal with example tiles, closes on overlay click or X button

- **`components/ScrabbleTile.vue`** -- Single tile displaying an uppercase letter. No Scrabble point subscripts

- **`components/TileRack.vue`** -- Row of `ScrabbleTile` components, accepts letters array and optional CSS class

- **`components/VirtualKeyboard.vue`** -- 3-row QWERTY layout with Enter and Backspace wide keys. Emits `key-press` events; shown only on touch devices via CSS

- **`prng.js`** -- Date-seeded deterministic randomness
  - `getDailyRng(dateStr)` hashes a date string via cyrb128 into 4 seed values, returns an sfc32 PRNG closure that yields floats in [0, 1)
  - `seededShuffle(array, rng)` -- Fisher-Yates shuffle using the PRNG
  - `seededPick(array, rng)` -- picks a single random element

- **`game.js`** -- Puzzle selection, answer validation, share text, and countdown utilities
  - `selectDailyPuzzle(puzzleData, dateStr)` selects 11 rounds using date-seeded PRNG, difficulty progression (3+3+3+1+1)
  - `isValidAnswer(answer, round)` checks expansion dictionary and offered-letter availability, and rejects trivial suffix appends (s, ed, er) via `TRIVIAL_SUFFIXES` constant
  - `generateShareText(results, dateStr, totalTimeMs)` produces share string with "Reword" header (not "Anagram Trainer")
  - `matchTypedToTiles(typedLetters, rootLetters, offeredLetters)` maps each typed character to a tile position with root-first priority, used by `GameBoard.vue` for real-time feedback
  - `ROUND_TIME_LIMIT_MS` (60000) defines the per-round countdown duration
  - `formatRoundTimer(ms)` converts remaining milliseconds to `M:SS` display string (floors to whole seconds)
  - `formatCountdown(ms)` converts milliseconds to `HH:MM:SS` string (used by `ScoreScreen` for next-puzzle countdown)
  - `getTimeUntilMidnightUTC()` returns milliseconds until next UTC midnight
  - Other pure functions: `getOfferedLetters`, `getAnswersForRound`, `getSubmitFeedbackType`, `isConsecutiveDay`, `updateStreakStats`, `processKeyPress`, `calculateScore`

- **`words.js`** -- Anagram computation (used at both build-time and runtime validation)
  - `letterSignature(word)` sorts a word's letters alphabetically -- two words are anagrams iff their signatures match
  - `buildSignatureIndex(dictionary)` creates a `Map<signature, words[]>` for O(1) anagram lookup
  - `findExpansions(root, dictionaryOrIndex, maxExtraLetters=3)` enumerates letter additions via `combinationsWithRepetition` generator, looks up matching words in the index

- **`sound.js`** -- Web Audio API sound synthesis with zero external dependencies
  - `getAudioContext()` lazily creates an `AudioContext` (with `webkitAudioContext` fallback for iOS Safari)
  - `initSound(audioCtx)` creates master `GainNode`, returns `{ sounds, setMuted(val), isMuted() }`
  - `createSoundEffects(audioCtx, masterGain)` returns play methods: `playKeyClick` (filtered white noise burst -- bandpass at 1200Hz, Q=2), `playCorrect` (two-note sine chime: C5 then E5), `playWrong` (low sawtooth), `playSkip` (descending triangle wave), `playGameComplete` (ascending four-note arpeggio: C5-E5-G5-C6)

- **`ui.js`** -- Legacy DOM rendering module, no longer imported. Kept in the codebase but unused; all UI logic has been migrated to Vue components

### Things to Know

- `words.js` functions are shared between the build script and runtime -- `findExpansions` accepts either a raw dictionary array or a pre-built `Map` index to support both use cases
- `getOfferedLetters` extracts individual characters from multi-char expansion keys (e.g., `"el"` yields `"e"` and `"l"`) using `join('').split('')`, then deduplicates. It prioritizes including a single-letter expansion key in the offered set to ensure at least one straightforward answer exists
- The UI input max length is `root.length + offeredLetters.length`, allowing players to use all offered letters. Submit validation accepts answers between `root.length + 1` and this max
- `isKeySubsetOfOffered` in `game.js` checks whether each character of a multi-letter key can be consumed from the offered letters array (removing used letters to handle duplicates). This is the core mechanism enabling multi-letter expansion matching at runtime
- The `state.transitioning` flag in `App.vue` prevents input during the 700ms (correct) or 1200ms (skip with possible answers) delay between rounds
- Timer counts down from 60 seconds per round. `startTimer()` resets the display to `1:00`, records `roundStartTime`, and ticks every 100ms. When remaining time hits 0, the interval auto-calls `handleSkip()`. Both `handleSubmit()` and `handleSkip()` clear the interval and cap recorded `timeMs` at `ROUND_TIME_LIMIT_MS`. The timer auto-starts on puzzle load (in `onMounted`) and on each `advanceRound()` call
- `showScore()` computes `totalTimeMs` as the sum of per-round `timeMs` values (not wall-clock time)
- Streak calculation is pure (in `game.js`) with localStorage access only in `App.vue`, consistent with the pattern of keeping side effects out of game logic
- Sound synthesis follows the same pure-logic-in-module, side-effects-in-UI pattern: `sound.js` is a pure factory testable with a mock AudioContext, while `App.vue` handles AudioContext creation, localStorage mute persistence, and event hookup

Created and maintained by Nori.
