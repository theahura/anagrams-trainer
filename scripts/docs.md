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
- Iterates root word lengths 3-8, finding all roots that have at least 3 valid (non-trivial) expansion letters
- Applies two size caps to keep `puzzles.json` manageable:
  - Max 500 roots per word length, keeping roots with the most expansion variety (sorted by number of distinct valid expansion letters, descending)
  - Max 3 words per expansion letter per root

### Things to Know

- The `MIN_EXPANSIONS = 3` threshold ensures every root in the puzzle data has at least 3 different letters that produce valid answers -- this is what makes the "pick one of 3 offered letters" mechanic work
- The 500-root-per-length cap is chosen to provide years of non-repeating daily puzzles while keeping file size around 155KB gzipped
- The script uses `import.meta.url` to resolve the output path relative to itself

Created and maintained by Nori.
