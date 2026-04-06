# Noridoc: Root

Path: @/

### Overview

- A daily anagram word game where players add one or more letters to a root word and rearrange to form a new word, styled with Scrabble tile aesthetics
- Pure static HTML/JS with no backend -- puzzle data is pre-computed at build time and served as a JSON file
- Date-seeded PRNG ensures all players worldwide see the same puzzle on a given UTC day

### How it fits into the larger codebase

- `index.html` is the entry point -- it fetches `@/data/puzzles.json`, derives the UTC date string, calls `selectDailyPuzzle()` from `@/src/game.js`, then passes the result to `initUI()` from `@/src/ui.js`
- `style.css` defines the Scrabble board visual theme (green felt background, cream tiles with point subscripts)
- `@/scripts/` contains two alternative build pipelines (`npm run build:words` for TWL06-based, `npm run build:words:web` for web-sourced via wordunscrambler.me) that both produce `@/data/puzzles.json` in the same format
- `@/src/` contains all runtime game logic (PRNG, game rules, word processing, DOM rendering)
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
       -> if not: renders tiles, handles keyboard input, validates answers, shows score, saves to localStorage
  ```
- **Data flow at build time (two alternatives, same output):**
  ```
  Option A: scripts/build-words.js (npm run build:words)
    -> downloads TWL06 word list from GitHub
    -> builds letter-signature index     [src/words.js]
    -> finds expansions for each root word (+1, +2, +3 letters via combinations-with-repetition)
    -> filters trivial extensions (substring matches, single-letter keys only)
    -> writes data/puzzles.json

  Option B: scripts/build-words-web.js (npm run build:words:web)
    -> downloads TWL06 for candidate root identification
    -> fetches expansions from wordunscrambler.me  [scripts/web-scraper.js]
    -> caches results in data/web-cache.json
    -> filters trivial extensions, applies same size caps
    -> writes data/puzzles.json (identical format)
  ```
- **Difficulty progression:** 11 rounds per game: 3x3-letter roots, 3x4-letter, 3x5-letter, 1x6-letter, 1x7+-letter root
- **Multi-letter expansions:** Expansion keys are variable-length strings (e.g., `"r"`, `"el"`, `"egr"`). Players can use 1, 2, or 3 of the offered letters. The `maxExtraLetters` varies by root length: +3 for roots of length 3-5, +2 for length 6, +1 for length 7+
- **Trivial extension filter:** An answer is rejected if the root word appears as a substring of the answer (e.g., "rinds" from "rind"). This filter applies **only to single-letter expansion keys** -- multi-letter additions involve enough rearrangement that substring coincidence is not considered trivial. The filter runs both at build time and at runtime

### Things to Know

- The PRNG uses cyrb128 for hashing the date string into a seed, then sfc32 as the generator -- both are well-known algorithms chosen for JS portability and determinism
- `puzzles.json` is the only data dependency at runtime; the game works entirely offline once loaded
- The offered letters mechanic guarantees at least one valid single-letter expansion key among the 3 offered, with the remaining slots filled from the alphabet. Answer validation checks whether a given expansion key's letters are a subset of the offered letters (via `isKeySubsetOfOffered` in `@/src/game.js`), which supports both single and multi-letter keys
- When a puzzle pool is smaller than the number of rounds requested, `selectDailyPuzzle` cycles through the pool using modulo indexing
- Timer starts on first keystroke, not on round render
- Game results persist in `localStorage` keyed by `anagram-trainer-{YYYY-MM-DD}` (UTC). If a player returns the same UTC day, they see their previous score screen instead of replaying
- Vitest is the only dev dependency

Created and maintained by Nori.
