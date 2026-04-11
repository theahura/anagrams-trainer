# Noridoc: src

Path: @/games/reword/src

### Overview

- Contains all runtime game modules: Vue 3 SFC components, pure game logic, PRNG, word processing, and sound synthesis
- `main.js` is the entry point for the published `reword/` page; pure-logic modules have no framework dependencies
- Also imported by `@/scripts/build-words.js` for the word processing functions (`words.js`)

### How it fits into the larger codebase

- `@/reword/index.html` loads `@/games/reword/src/main.js` which creates the Vue app from `App.vue`
- `@/scripts/build-words.js` imports `words.js` for `buildSignatureIndex` and `findExpansions`
- `@/scripts/web-scraper.js` imports `letterSignature` from `words.js` for expansion key derivation
- `@/tests/` tests `prng.js`, `game.js`, `words.js`, `sound.js` directly, and Vue components via `@vue/test-utils`
- `@/games/reword/data/puzzles.json` is the data contract: `game.js` expects puzzle data keyed by root word length, each entry having `{ root, expansions }` where expansions maps a variable-length key string (e.g., `"r"`, `"el"`, `"egr"`) to a word array

### Core Implementation

- **`main.js`** -- Vue app entry point
  - `createApp(App).mount('#app')` -- mounts the root component into the `#app` div

- **`components/LoadingScreen.vue`** -- Displays a spinning favicon SVG (green "R" tile) above "Loading puzzle data..." text while puzzle data is being fetched. Uses `role="status"` for screen reader accessibility. The spin animation and layout are defined in `@/games/reword/style.css`

- **`components/App.vue`** -- Root component, owns all game state
  - Renders `<LoadingScreen v-if="loading" />` during puzzle fetch, then switches to the game UI
  - All game state lives in a `reactive()` object: `{ currentRound, completedRounds, inputLetters, startTime, roundStartTime, roundDeadline, transitioning }`. UI flags (`loading`, `gameComplete`, `muted`, `showHowToPlay`, `timerDisabled`, etc.) are individual `ref()` values. `timerDisabled` is persisted to `reword-timer-disabled` in localStorage and restored on mount. A `gameInProgress` computed (`startTime !== null && !gameComplete`) prevents the timer toggle from being changed mid-game
  - On mount: checks `reword-seen-how-to-play` localStorage to auto-show `HowToPlay` on first visit, fetches `puzzles.json`, derives UTC date string, selects daily puzzle, and checks for saved game (with fallback read from old `anagram-trainer-*` keys)
  - `handleKeyInput(key)` dispatches to `processKeyPress` from `game.js` for letter processing, and to `handleSubmit` for Enter
  - `handleSubmit()` and `handleSkip()` use `state.transitioning` flag and `state.currentRound >= 11` guard to prevent double-submission. `handleSubmit()` uses `getSubmitFeedbackType()` to dispatch to different error messages: `'invalid-length'` shows length constraints, `'trivial-suffix'` shows "Not a true anagram", and `'wrong'` shows generic invalid message
  - `showScore(savedResults?)` dual mode: fresh game results or saved replay. On fresh completion, persists to `reword-{date}` (including a `timerDisabled` flag alongside results and totalTimeMs), updates `reword-stats` via `updateStreakStats`, and updates `reword-lifetime-stats` via `updateLifetimeStats` (passing `timerDisabled`). Lifetime stats are only written on fresh completion (not saved game restore) to prevent double-counting. Both streak and lifetime stats are loaded for display in both paths. When restoring a saved game, the saved `timerDisabled` value is applied to the current session
  - Physical keyboard handled via a document-level `keydown` listener that guards against `gameComplete`, `loading`, and `showHowToPlay` states
  - Audio lazily initialized via `ensureAudio()` on first user interaction

- **`components/GameBoard.vue`** -- Game area: tile racks, input area, submit/skip buttons
  - Uses computed `matchTypedToTiles()` result to derive per-tile CSS classes for real-time feedback (invalid tiles highlighted)
  - Renders empty placeholder tiles up to `minLen` via `displayLen` computed property
  - Exposes a `#timer` slot used by `App.vue` to inject letter score and timer display
  - Accepts a `flyUp` boolean prop; when true, applies the `fly-up` CSS class to `#input-area` and sets `--tile-index` as an inline style on each input tile for per-tile stagger delay
  - The `#message` area wraps its content in a Vue `<Transition name="message-fade">` with `v-if` on a `<span>`, so messages (errors, "Possible: ..." lists) fade in/out rather than appearing instantly. The `:key="message"` binding ensures the transition fires on every message text change

- **`components/ScoreScreen.vue`** -- End-of-game display with countdown
  - Shows per-round breakdown (root, answer or SKIPPED, possible answers for skipped rounds)
  - Displays a "Next puzzle in: HH:MM:SS" countdown using `formatCountdown()` and `getTimeUntilMidnightUTC()` from `game.js`, ticked every second via `setInterval`
  - Accepts a `timerDisabled` prop; when true, the "Total Time" stat is hidden from the stats row
  - Conditionally renders a "Lifetime Stats" section (via `v-if` on the `lifetimeStats` prop) showing cumulative totals, fastest time, average time, best letter score, and longest word. Fastest time and average time are derived exclusively from perfect games (`perfectGamesPlayed`, `perfectGamesTotalTimeMs`); displays "N/A" when no perfect games exist. Uses a local `formatTime(ms)` helper for time display

- **`components/HowToPlay.vue`** -- Tutorial modal with example tiles, closes on overlay click or X button. Accepts `timerDisabled` and `gameInProgress` props and emits `toggle-timer`. Contains a "Disable Timer" checkbox (`data-testid="timer-toggle"`) that is disabled when `gameInProgress` is true, preventing timer toggling mid-game. Instructions explicitly state that simply adding a letter to the end doesn't count -- the word must be a true anagram

- **`components/ScrabbleTile.vue`** -- Single tile displaying an uppercase letter. No Scrabble point subscripts

- **`components/TileRack.vue`** -- Row of `ScrabbleTile` components, accepts letters array and optional CSS class

- **`components/VirtualKeyboard.vue`** -- 3-row QWERTY layout with Enter and Backspace wide keys. Emits `key-press` events; shown only on touch devices via CSS

- **`prng.js`** -- Date-seeded deterministic randomness
  - `getDailyRng(dateStr)` hashes a date string via cyrb128 into 4 seed values, returns an sfc32 PRNG closure that yields floats in [0, 1)
  - `seededShuffle(array, rng)` -- Fisher-Yates shuffle using the PRNG
  - `seededPick(array, rng)` -- picks a single random element

- **`game.js`** -- Puzzle selection, answer validation, share text, and countdown utilities
  - `selectDailyPuzzle(puzzleData, dateStr)` selects 11 rounds using date-seeded PRNG, difficulty progression (3+3+3+1+1)
  - `isTrivialSuffix(answer, root)` is a standalone exported check for whether a word is just root + one of the `TRIVIAL_SUFFIXES` (`s`, `ed`, `er`). Used by `isValidAnswer`, `getSubmitFeedbackType`, and `getAnswersForRound` to enforce the "true anagram" rule consistently
  - `isValidAnswer(answer, round)` checks expansion dictionary and offered-letter availability, and rejects trivial suffix appends via `isTrivialSuffix()`
  - `generateShareText(results, dateStr, totalTimeMs, timerDisabled)` produces share string with "Reword" header (not "Anagram Trainer"). When `timerDisabled` is true, the time portion is omitted from the share text
  - `matchTypedToTiles(typedLetters, rootLetters, offeredLetters)` maps each typed character to a tile position with root-first priority, used by `GameBoard.vue` for real-time feedback
  - `formatCountdown(ms)` converts milliseconds to `HH:MM:SS` string
  - `getTimeUntilMidnightUTC()` returns milliseconds until next UTC midnight
  - `updateLifetimeStats(existingStats, completedRounds, totalTimeMs, timerDisabled)` accumulates cross-game stats: totalLetters, totalWords, fastestTimeMs, totalTimeMs, gamesPlayed, bestLetterScore, longestWord, totalSkips, perfectGamesPlayed, perfectGamesTotalTimeMs. A game is "perfect" when `completedRounds.length === 11 && gameSkips === 0 && !timerDisabled`. Games with the timer disabled are excluded from perfect game tracking. `fastestTimeMs` is only updated by perfect games (returns `null` when no perfect games have been played). Returns a fresh stats object on first game, or merges with existing stats using min (fastest time, perfect only), max (best score, longest word), and sum (totals) semantics
  - `getSubmitFeedbackType(answer, round)` returns one of `'invalid-length'`, `'correct'`, `'trivial-suffix'`, or `'wrong'`. The `'trivial-suffix'` type allows `App.vue` to show a distinct error message ("Not a true anagram -- try rearranging the letters") instead of the generic "Not a valid answer" message
  - `getAnswersForRound(round)` returns all valid answers for a round, filtering out trivial suffix words so the "possible words" shown on skip/score screens only includes words the game would actually accept
  - Other pure functions: `getOfferedLetters`, `isConsecutiveDay`, `updateStreakStats`, `processKeyPress`, `calculateScore`

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
- The `state.transitioning` flag in `App.vue` prevents input during the 700ms (correct) or 2500ms (skip with possible answers) delay between rounds. On correct answer, `App.vue` sets `flyUp=true` instead of showing a "Correct!" message text; the fly-up animation plays during the 700ms transition, then `flyUp` is reset in `advanceRound()`
- Each round has a countdown timer (`ROUND_TIME_MS`): 60 seconds on desktop, 70 seconds on touch devices (detected via `pointer: coarse` media query at module load). `roundDeadline` tracks the absolute expiration time; when remaining time hits 0, `handleSkip()` is called automatically. The timer display turns red and pulses when under 10 seconds remain (CSS class `timer-warning`), respecting `prefers-reduced-motion`. `formatRoundTime(ms)` formats remaining milliseconds for the countdown display. When `timerDisabled` is true, `startTimer()` still sets `startTime` and `roundStartTime` (so elapsed time is tracked) but skips setting `roundDeadline`, the interval, and auto-skip. The timer display is hidden via `v-if` in the template
- Both streak and lifetime stat calculation are pure (in `game.js`) with localStorage access only in `App.vue`, consistent with the pattern of keeping side effects out of game logic
- Sound synthesis follows the same pure-logic-in-module, side-effects-in-UI pattern: `sound.js` is a pure factory testable with a mock AudioContext, while `App.vue` handles AudioContext creation, localStorage mute persistence, and event hookup

Created and maintained by Nori.
