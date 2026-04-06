# Noridoc: src

Path: @/src

### Overview

- Contains all runtime game modules: PRNG, game logic, word processing utilities, and DOM rendering
- ES modules with no external dependencies -- imported directly by `@/index.html` via `<script type="module">`
- Also imported by `@/scripts/build-words.js` for the word processing functions (`words.js`)

### How it fits into the larger codebase

- `@/index.html` imports `game.js` and `ui.js` as entry points
- `@/scripts/build-words.js` imports `words.js` for `buildSignatureIndex`, `findExpansions`, and `filterTrivialExpansions`
- `@/scripts/web-scraper.js` imports `letterSignature` from `words.js` for expansion key derivation
- `@/scripts/build-words-web.js` imports `filterTrivialExpansions` from `words.js`
- `@/tests/` tests `prng.js`, `game.js`, and `words.js` directly (ui.js is untested -- it requires DOM)
- `@/data/puzzles.json` is the data contract: `game.js` expects puzzle data keyed by root word length, each entry having `{ root, expansions }` where expansions maps a variable-length key string (e.g., `"r"`, `"el"`, `"egr"`) to a word array

### Core Implementation

- **`prng.js`** -- Date-seeded deterministic randomness
  - `getDailyRng(dateStr)` hashes a date string via cyrb128 into 4 seed values, returns an sfc32 PRNG closure that yields floats in [0, 1)
  - `seededShuffle(array, rng)` -- Fisher-Yates shuffle using the PRNG
  - `seededPick(array, rng)` -- picks a single random element

- **`game.js`** -- Puzzle selection and answer validation
  - `selectDailyPuzzle(puzzleData, dateStr)` selects 11 rounds from the puzzle data pools using the date-seeded PRNG, following a fixed difficulty progression (3+3+3+1+1). Each round gets `offeredLetters` assigned via `getOfferedLetters`
  - `getOfferedLetters(puzzleEntry, rng)` extracts individual letters from all expansion keys (which may be multi-char), guarantees 1 valid single-letter expansion key among 3 total offered letters (falling back to any valid letter if no single-letter keys exist); the other 2 come from a shuffled pool of the full alphabet merged with valid letters
  - `isValidAnswer(answer, round)` iterates all expansion keys and uses `isKeySubsetOfOffered(key, offeredLetters)` to check if the key's letters are available in the offered set. The trivial extension check only applies to single-letter keys. The `isKeySubsetOfOffered` helper consumes letters from a copy of the offered array, supporting duplicate letter usage
  - `getAnswersForRound(round)` returns all valid answer words for a round, filtered by `isKeySubsetOfOffered` against offered letters. Trivial extension filtering only applies to single-letter keys. Used by the score screen to display possible answers for skipped rounds
  - `isTrivialExtension(root, answer)` returns true if the answer contains the root as a substring (case-insensitive)
  - `calculateScore(completedRounds)` aggregates total letters, total time, and round count

- **`words.js`** -- Anagram computation (used at both build-time and runtime validation)
  - `letterSignature(word)` sorts a word's letters alphabetically -- two words are anagrams iff their signatures match
  - `buildSignatureIndex(dictionary)` creates a `Map<signature, words[]>` for O(1) anagram lookup
  - `findExpansions(root, dictionaryOrIndex, maxExtraLetters=3)` uses a `combinationsWithRepetition` generator to enumerate all possible letter additions of size 1 through `maxExtraLetters`. For each combination, it computes the target signature via repeated `insertSorted` calls and looks up matching words in the index. Keys in the returned object are the concatenated letter combinations (e.g., `"r"`, `"el"`, `"egr"`)
  - `combinationsWithRepetition(size, start)` is a recursive generator that yields all sorted combinations of `size` lowercase letters (with repetition allowed), ensuring no duplicate keys
  - `filterTrivialExpansions(root, expansions)` removes expansion words containing the root as a substring, but **only for single-letter keys**. Multi-letter keys pass through unfiltered because the additional rearrangement makes substring coincidence non-trivial

- **`ui.js`** -- DOM rendering, interaction, and persistence
  - `initUI(puzzle, dateStr)` builds the entire game UI imperatively inside `#game-container`, managing local state via a closure-scoped `state` object (currentRound, completedRounds, inputLetters, timer state). The `dateStr` parameter is used for localStorage lookup
  - On init, checks `localStorage` for a saved game keyed by `anagram-trainer-{dateStr}`. If found, shows the score screen directly without starting a new game
  - On game completion, saves results to `localStorage` under the same key, preventing replay of the same day's puzzle
  - `showScore(savedResults?)` has dual mode: when called without arguments it uses `state.completedRounds` from the just-finished game; when called with `savedResults` it displays a previously saved game. The score screen shows a per-round breakdown (root word, player answer or "SKIPPED", and possible answers for skipped rounds) plus aggregate stats in a horizontal row
  - Each completed round stores `{ answer, timeMs, root, possibleAnswers }` where `possibleAnswers` comes from `getAnswersForRound()` in `@/src/game.js`
  - Keyboard input captured via a hidden `<input>` element that stays focused; `input` event updates tile display, `Enter` triggers submit
  - `createTile(letter, opts)` renders a single Scrabble tile with point subscript from `SCRABBLE_POINTS` lookup table

### Things to Know

- `words.js` functions are shared between the build script and runtime -- `findExpansions` accepts either a raw dictionary array or a pre-built `Map` index to support both use cases
- The `insertSorted` helper in `words.js` maintains a sorted string when adding a character, which is how anagram matching works via signatures
- `getOfferedLetters` extracts individual characters from multi-char expansion keys (e.g., `"el"` yields `"e"` and `"l"`) using `join('').split('')`, then deduplicates. It prioritizes including a single-letter expansion key in the offered set to ensure at least one straightforward answer exists
- The UI input max length is `root.length + offeredLetters.length`, allowing players to use all offered letters. Submit validation accepts answers between `root.length + 1` and this max
- `isKeySubsetOfOffered` in `game.js` checks whether each character of a multi-letter key can be consumed from the offered letters array (removing used letters to handle duplicates). This is the core mechanism enabling multi-letter expansion matching at runtime
- The UI uses a 600ms `setTimeout` delay between rounds after a correct answer or skip, for visual feedback
- Timer displays elapsed time since the first keystroke of the entire game, not per-round time
- localStorage persistence uses UTC date to match puzzle selection, so the key is always consistent regardless of timezone

Created and maintained by Nori.
