# Noridoc: src

Path: @/src

### Overview

- Contains all runtime game modules: PRNG, game logic, word processing utilities, sound synthesis, and DOM rendering
- ES modules with no external dependencies -- imported directly by `@/index.html` via `<script type="module">`
- Also imported by `@/scripts/build-words.js` for the word processing functions (`words.js`)

### How it fits into the larger codebase

- `@/index.html` imports `game.js` and `ui.js` as entry points
- `@/scripts/build-words.js` imports `words.js` for `buildSignatureIndex` and `findExpansions`
- `@/scripts/web-scraper.js` imports `letterSignature` from `words.js` for expansion key derivation
- `@/tests/` tests `prng.js`, `game.js` (including streak functions), `words.js`, and `sound.js` directly (ui.js is untested -- it requires DOM)
- `@/data/puzzles.json` is the data contract: `game.js` expects puzzle data keyed by root word length, each entry having `{ root, expansions }` where expansions maps a variable-length key string (e.g., `"r"`, `"el"`, `"egr"`) to a word array

### Core Implementation

- **`prng.js`** -- Date-seeded deterministic randomness
  - `getDailyRng(dateStr)` hashes a date string via cyrb128 into 4 seed values, returns an sfc32 PRNG closure that yields floats in [0, 1)
  - `seededShuffle(array, rng)` -- Fisher-Yates shuffle using the PRNG
  - `seededPick(array, rng)` -- picks a single random element

- **`game.js`** -- Puzzle selection, answer validation, and share text generation
  - `selectDailyPuzzle(puzzleData, dateStr)` selects 11 rounds from the puzzle data pools using the date-seeded PRNG, following a fixed difficulty progression (3+3+3+1+1). Each round gets `offeredLetters` assigned via `getOfferedLetters`
  - `getOfferedLetters(puzzleEntry, rng)` extracts individual letters from all expansion keys (which may be multi-char), guarantees 1 valid single-letter expansion key among 3 total offered letters (falling back to any valid letter if no single-letter keys exist); the other 2 come from a shuffled pool of the full alphabet merged with valid letters
  - `isValidAnswer(answer, round)` iterates all expansion keys and uses `isKeySubsetOfOffered(key, offeredLetters)` to check if the key's letters are available in the offered set. Any word present in the expansion dictionary is accepted -- there is no substring or trivial-extension filtering. The `isKeySubsetOfOffered` helper consumes letters from a copy of the offered array, supporting duplicate letter usage
  - `getAnswersForRound(round)` returns all valid answer words for a round, filtered by `isKeySubsetOfOffered` against offered letters. Used by the score screen to display possible answers for skipped rounds
  - `generateShareText(results, dateStr, totalTimeMs)` is a pure function (no DOM dependency) that produces a Wordle-style share string: header line with date, emoji grid line (green square for solved, white square for skipped), and a score line with solved count and formatted time
  - `matchTypedToTiles(typedLetters, rootLetters, offeredLetters)` is a pure function that maps each typed character to a specific tile position in either the root or offered rack. It builds a unified pool of all available tiles (root first, then offered), then greedily matches each typed letter against unused pool entries with root-first priority. Returns `{ matched, pool }` where `matched` is an array of per-character assignments (`source: 'root' | 'offered' | 'invalid'`, `index`, `used`) and `pool` tracks which rack tiles have been consumed. Used by `renderInput()` in `ui.js` to drive real-time tile highlighting
  - `getSubmitFeedbackType(answer, round)` is a pure function that returns `'correct'`, `'invalid-length'`, or `'wrong'` by checking length bounds and delegating to `isValidAnswer`. Extracts submit validation logic from `ui.js` into a testable location
  - `isConsecutiveDay(todayStr, previousStr)` checks if two UTC date strings (YYYY-MM-DD) are exactly one calendar day apart (86400000ms difference). Only returns true when `todayStr` is one day *after* `previousStr` (not reverse)
  - `updateStreakStats(existingStats, todayDateStr)` is a pure function that computes updated streak statistics. Accepts `null` for first-ever play (returns initial stats with streak 1). Returns unchanged stats on same-day replay. Increments `currentStreak` on consecutive days, resets to 1 on gaps. Tracks `{ currentStreak, maxStreak, lastPlayedDate, gamesPlayed }`
  - `processKeyPress(currentLetters, key, maxLen)` is a pure function that handles keyboard input processing for both physical and virtual keyboards. Accepts `Backspace` (removes last letter), single lowercase/uppercase letters (appends lowercased, respects `maxLen`), and ignores everything else. Returns a new array, never mutates the input
  - `calculateScore(completedRounds)` aggregates total letters, total time, and round count

- **`words.js`** -- Anagram computation (used at both build-time and runtime validation)
  - `letterSignature(word)` sorts a word's letters alphabetically -- two words are anagrams iff their signatures match
  - `buildSignatureIndex(dictionary)` creates a `Map<signature, words[]>` for O(1) anagram lookup
  - `findExpansions(root, dictionaryOrIndex, maxExtraLetters=3)` uses a `combinationsWithRepetition` generator to enumerate all possible letter additions of size 1 through `maxExtraLetters`. For each combination, it computes the target signature via repeated `insertSorted` calls and looks up matching words in the index. Keys in the returned object are the concatenated letter combinations (e.g., `"r"`, `"el"`, `"egr"`)
  - `combinationsWithRepetition(size, start)` is a recursive generator that yields all sorted combinations of `size` lowercase letters (with repetition allowed), ensuring no duplicate keys
- **`sound.js`** -- Web Audio API sound synthesis with zero external dependencies
  - `getAudioContext()` lazily creates an `AudioContext` (with `webkitAudioContext` fallback for iOS Safari), resumes if suspended, and returns `null` if the API is unavailable
  - `initSound(audioCtx)` creates a master `GainNode` connected to the audio destination, instantiates sounds via `createSoundEffects`, and returns `{ sounds, setMuted(val), isMuted() }`. Muting sets the master gain value to 0
  - `createSoundEffects(audioCtx, masterGain)` is a pure factory (no DOM dependencies) that returns play methods for 5 game events: `playKeyClick` (short square wave), `playCorrect` (two-note sine chime: C5 then E5), `playWrong` (low sawtooth), `playSkip` (descending triangle wave), `playGameComplete` (ascending four-note arpeggio: C5-E5-G5-C6). All sounds route through the master gain node for global mute control

- **`ui.js`** -- DOM rendering, interaction, and persistence
  - `initUI(puzzle, dateStr)` builds the entire game UI imperatively inside `#game-container`, managing local state via a closure-scoped `state` object (currentRound, completedRounds, inputLetters, timer state). The `dateStr` parameter is used for localStorage lookup
  - All input handlers (`handleSubmit`, `handleSkip`, `handleKeyInput`, and the `input` event listener) include a `state.currentRound >= 11` bounds guard that returns early, preventing access to `puzzle[11]` (undefined) if input arrives after the last round completes but before the score screen renders
  - `updateLetterScore()` computes the running total of answer letters from `state.completedRounds` and updates a "Letters: N" display in the game-info bar. Called after each round completion in both `handleSubmit` and `handleSkip`
  - On init, checks `localStorage` for a saved game keyed by `anagram-trainer-{dateStr}`. If found, shows the score screen directly without starting a new game
  - On game completion, saves results to `localStorage` under the same key, preventing replay of the same day's puzzle. Also reads/updates streak stats from `anagram-trainer-stats` localStorage key via `updateStreakStats` from `@/src/game.js`
  - On score screen display (both fresh and saved games), reads `anagram-trainer-stats` from localStorage and renders a streak stats row (Games Played, Current Streak, Max Streak) inserted above the share button
  - `showScore(savedResults?)` has dual mode: when called without arguments it uses `state.completedRounds` from the just-finished game; when called with `savedResults` it displays a previously saved game. The score screen shows a per-round breakdown (root word, player answer or "SKIPPED", and possible answers for skipped rounds) plus aggregate stats in a horizontal row. It also renders a "Share Results" button that copies a Wordle-style emoji grid to the clipboard via `generateShareText` from `@/src/game.js`. The clipboard write uses `navigator.clipboard.writeText` with a fallback to a temporary textarea and `document.execCommand('copy')`. The button text temporarily changes to "Copied!" for 2 seconds after a successful copy
  - Each completed round stores `{ answer, timeMs, root, possibleAnswers }` where `possibleAnswers` comes from `getAnswersForRound()` in `@/src/game.js`
  - `renderInput()` calls `matchTypedToTiles` on every keystroke to determine which rack tiles are consumed by the current input. It toggles `.used` CSS classes on root and offered rack tiles based on the `pool` state, and marks input tiles whose characters could not be matched to any available tile with the `.invalid` CSS class. The pool index offset for offered tiles is `round.root.length` since root tiles come first in the pool array
  - Keyboard input has two paths that converge through `handleKeyInput(key)`: (1) a hidden `<input>` element for physical keyboards, and (2) an on-screen QWERTY virtual keyboard for touch devices. Both paths use `processKeyPress` from `@/src/game.js` for letter processing. The virtual keyboard is a 3-row QWERTY layout built imperatively in DOM with Enter and Backspace as wide keys, shown only on touch devices via CSS `@media (pointer: coarse)`. Click events on the virtual keyboard are delegated from the parent `#virtual-keyboard` element using `data-key` attributes
  - The hidden input uses `opacity: 0.01` and off-screen positioning (`left: -9999px`) instead of `opacity: 0; pointer-events: none` for iOS Safari compatibility. It also sets `inputmode="text"` and `enterkeyhint="go"` attributes. Focus is maintained on desktop via a container click handler that excludes clicks on the virtual keyboard
  - Sound integration: `ensureAudio()` lazily initializes the audio system on first user interaction (click or keypress) to comply with browser autoplay policies. A mute toggle button (`#mute-btn`) in the header persists mute state to `localStorage` under the `anagram-trainer-sound-muted` key. `playSound(name)` is a no-op if audio is not yet initialized. Sound triggers: `playKeyClick` on letter input, `playCorrect` on valid answer, `playWrong` on invalid answer or invalid length, `playSkip` on skip, `playGameComplete` on game completion (only for fresh games, not saved replays)
  - `createTile(letter, opts)` renders a single Scrabble tile with point subscript from `SCRABBLE_POINTS` lookup table

### Things to Know

- `words.js` functions are shared between the build script and runtime -- `findExpansions` accepts either a raw dictionary array or a pre-built `Map` index to support both use cases
- The `insertSorted` helper in `words.js` maintains a sorted string when adding a character, which is how anagram matching works via signatures
- `getOfferedLetters` extracts individual characters from multi-char expansion keys (e.g., `"el"` yields `"e"` and `"l"`) using `join('').split('')`, then deduplicates. It prioritizes including a single-letter expansion key in the offered set to ensure at least one straightforward answer exists
- The UI input max length is `root.length + offeredLetters.length`, allowing players to use all offered letters. Submit validation accepts answers between `root.length + 1` and this max
- `isKeySubsetOfOffered` in `game.js` checks whether each character of a multi-letter key can be consumed from the offered letters array (removing used letters to handle duplicates). This is the core mechanism enabling multi-letter expansion matching at runtime
- The virtual keyboard and game interaction elements (racks, input, buttons) are hidden on the score screen via `querySelectorAll` that includes `#virtual-keyboard`
- The UI uses a 600ms `setTimeout` delay between rounds after a correct answer or skip. During this delay, `fadeOutGameArea()` runs a CSS fade-out on the racks and input area; after the timeout, `renderRound()` rebuilds the DOM and `fadeInGameArea()` animates it back in. The `animationend` event listener on `rootRack` cleans up the fade-in classes
- Answer feedback uses CSS-class toggling: `triggerShake()` adds `.shake` to `#input-area` (removes and re-adds with a `void offsetWidth` reflow to allow retriggering), `triggerBounce()` sets `--tile-index` CSS custom properties for staggered delays and adds `.bounce`. Both use `{ once: true }` `animationend` listeners for cleanup
- When skipping a round, `handleSkip()` now displays up to 3 possible answers in the message area (via `getAnswersForRound`) instead of just "Skipped"
- Timer displays elapsed time since the first keystroke of the entire game, not per-round time
- localStorage persistence uses UTC date to match puzzle selection, so the key is always consistent regardless of timezone. Two separate localStorage keys: `anagram-trainer-{YYYY-MM-DD}` for per-date game results, `anagram-trainer-stats` for aggregate streak/play statistics
- Streak calculation is pure (in `game.js`) with localStorage access only in `ui.js`, consistent with the pattern of keeping side effects out of game logic
- Sound synthesis follows the same pure-logic-in-module, side-effects-in-UI pattern: `sound.js` is a pure factory testable with a mock AudioContext, while `ui.js` handles AudioContext creation, localStorage mute persistence, and DOM event hookup. The `ensureAudio()` call is placed inside click and keypress handlers to satisfy browser autoplay restrictions that require user gesture context

Created and maintained by Nori.
