# Noridoc: src

Path: @/src

### Overview

- Contains all runtime game modules: PRNG, game logic, word processing utilities, and DOM rendering
- ES modules with no external dependencies -- imported directly by `@/index.html` via `<script type="module">`
- Also imported by `@/scripts/build-words.js` for the word processing functions (`words.js`)

### How it fits into the larger codebase

- `@/index.html` imports `game.js` and `ui.js` as entry points
- `@/scripts/build-words.js` imports `words.js` for `buildSignatureIndex`, `findExpansions`, and `filterTrivialExpansions`
- `@/tests/` tests `prng.js`, `game.js`, and `words.js` directly (ui.js is untested -- it requires DOM)
- `@/data/puzzles.json` is the data contract: `game.js` expects puzzle data keyed by root word length, each entry having `{ root, expansions }` where expansions maps letter -> word array

### Core Implementation

- **`prng.js`** -- Date-seeded deterministic randomness
  - `getDailyRng(dateStr)` hashes a date string via cyrb128 into 4 seed values, returns an sfc32 PRNG closure that yields floats in [0, 1)
  - `seededShuffle(array, rng)` -- Fisher-Yates shuffle using the PRNG
  - `seededPick(array, rng)` -- picks a single random element

- **`game.js`** -- Puzzle selection and answer validation
  - `selectDailyPuzzle(puzzleData, dateStr)` selects 11 rounds from the puzzle data pools using the date-seeded PRNG, following a fixed difficulty progression (3+3+3+1+1). Each round gets `offeredLetters` assigned via `getOfferedLetters`
  - `getOfferedLetters(puzzleEntry, rng)` guarantees 1 valid expansion letter among 3 total offered letters; the other 2 come from a shuffled pool of the full alphabet merged with valid letters
  - `isValidAnswer(answer, round)` checks that the answer appears in the round's expansion lists AND is not a trivial extension
  - `isTrivialExtension(root, answer)` returns true if the answer contains the root as a substring (case-insensitive)
  - `calculateScore(completedRounds)` aggregates total letters, total time, and round count

- **`words.js`** -- Anagram computation (used at both build-time and runtime validation)
  - `letterSignature(word)` sorts a word's letters alphabetically -- two words are anagrams iff their signatures with one extra letter match
  - `buildSignatureIndex(dictionary)` creates a `Map<signature, words[]>` for O(1) anagram lookup
  - `findExpansions(root, dictionaryOrIndex)` iterates a-z, computes the target signature for `root + letter`, and looks up matching words
  - `filterTrivialExpansions(root, expansions)` removes any expansion word containing the root as a substring

- **`ui.js`** -- DOM rendering and interaction
  - `initUI(puzzle)` builds the entire game UI imperatively inside `#game-container`, managing local state via a closure-scoped `state` object (currentRound, completedRounds, inputLetters, timer state)
  - Keyboard input captured via a hidden `<input>` element that stays focused; `input` event updates tile display, `Enter` triggers submit
  - `createTile(letter, opts)` renders a single Scrabble tile with point subscript from `SCRABBLE_POINTS` lookup table

### Things to Know

- `words.js` functions are shared between the build script and runtime -- `findExpansions` accepts either a raw dictionary array or a pre-built `Map` index to support both use cases
- The `insertSorted` helper in `words.js` maintains a sorted string when adding a character, which is how anagram matching works via signatures
- `getOfferedLetters` builds a merged pool of valid letters + full alphabet, so valid letters have a slightly higher chance of appearing (they appear in the pool twice -- once as valid, once from the alphabet)
- The UI uses a 600ms `setTimeout` delay between rounds after a correct answer or skip, for visual feedback
- Timer displays elapsed time since the first keystroke of the entire game, not per-round time

Created and maintained by Nori.
