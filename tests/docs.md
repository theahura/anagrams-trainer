# Noridoc: tests

Path: @/tests

### Overview

- Vitest test suites covering the non-UI runtime modules
- Tests run via `npm test` (vitest run) or `npm run test:watch` (vitest watch mode)

### How it fits into the larger codebase

- Tests import directly from `@/src/prng.js`, `@/src/game.js`, and `@/src/words.js`
- `ui.js` is not tested (requires DOM)
- `build-words.test.js` tests the word processing functions that `@/scripts/build-words.js` depends on, not the build script itself

### Core Implementation

- **`prng.test.js`** -- Verifies PRNG determinism (same date -> same sequence), distinctness (different dates -> different sequences), and output range [0, 1). Also tests `seededShuffle` determinism and element preservation, and `seededPick` determinism
- **`game.test.js`** -- Tests trivial extension detection, daily puzzle selection (11 rounds, correct difficulty progression, date determinism), answer validation (valid words, invalid words, trivial rejections, case insensitivity, rejection of non-offered expansion letters, multi-letter key answer validation), offered letter guarantees (exactly 3, at least 1 valid), `getAnswersForRound` (offered-letter filtering, empty results, multi-word flattening, multi-letter key answer retrieval), and score calculation
- **`build-words.test.js`** -- Tests letter signature sorting, expansion finding (correct words, correct length, multi-letter expansions for +2 and +3 letters), trivial expansion filtering (substring removal, key cleanup, middle-of-word substring detection), and a regression test verifying that "ski" + "r" produces "risk"

### Things to Know

- Tests use small inline dictionaries and puzzle data fixtures rather than loading `@/data/puzzles.json`
- The `game.test.js` test data includes intentionally crafted edge cases like "rinds" from "rind" (trivial) and "grind" from "rind" (trivial -- substring at position 1)
- Some tests use a constant RNG (`() => 0.5`) to make offered letter tests deterministic without depending on the PRNG implementation

Created and maintained by Nori.
