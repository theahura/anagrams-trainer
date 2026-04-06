# Noridoc: scripts

Path: @/scripts

### Overview

- Contains `build-words.js`, the offline build script that generates `@/data/puzzles.json`
- Run via `npm run build:words` -- downloads the TWL06 Scrabble dictionary from GitHub, computes valid puzzle entries, and writes the JSON output

### How it fits into the larger codebase

- Imports word processing functions from `@/src/words.js` (`buildSignatureIndex`, `findExpansions`, `filterTrivialExpansions`)
- Outputs to `@/data/puzzles.json`, which is the sole data dependency for the runtime game
- Tested indirectly through `@/tests/build-words.test.js` which tests the word processing functions it relies on

### Core Implementation

- Downloads TWL06 from `https://raw.githubusercontent.com/cviebrock/wordlists/master/TWL06.txt`
- Builds a signature index from the full dictionary for efficient anagram lookup
- Iterates root word lengths 3-8, calling `findExpansions(root, index, maxExtra)` where `maxExtra` varies by root length:

  | Root Length | maxExtraLetters |
  |---|---|
  | 3-5 | 3 |
  | 6 | 2 |
  | 7+ | 1 |

- Applies size caps to keep `puzzles.json` manageable:
  - Max 500 roots per word length, sorted to prioritize roots with the most single-letter expansion variety first, then total expansion key count as tiebreaker
  - Max 30 keys per root, prioritizing single-letter keys then shorter multi-letter keys (sorted by length then alphabetically)
  - Max 5 words per expansion key

### Things to Know

- The `MIN_EXPANSIONS = 3` threshold ensures every root in the puzzle data has at least 3 different expansion keys that produce valid answers -- this is what makes the "pick one of 3 offered letters" mechanic work
- The 500-root-per-length cap provides years of non-repeating daily puzzles. The resulting file is larger than the single-letter-only era (~1.7MB) due to multi-letter expansion entries
- The `maxExtraLetters` scaling by root length controls combinatorial explosion: longer roots produce exponentially more multi-letter combinations, so the cap is tighter
- The script uses `import.meta.url` to resolve the output path relative to itself

Created and maintained by Nori.
