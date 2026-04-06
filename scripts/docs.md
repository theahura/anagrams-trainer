# Noridoc: scripts

Path: @/scripts

### Overview

- Contains two alternative build pipelines that each produce `@/data/puzzles.json` in the same format
- **`build-words.js`** (TWL06-based, `npm run build:words`) -- fast offline build using a bundled dictionary
- **`build-words-web.js`** (web-sourced, `npm run build:words:web`) -- fetches expansion data from wordunscrambler.me, with `web-scraper.js` as its scraping/parsing module

### How it fits into the larger codebase

- Both build scripts import word processing functions from `@/src/words.js` (`letterSignature`, `buildSignatureIndex`, `findExpansions`, etc.)
- Both output to `@/data/puzzles.json` in an identical format -- no runtime code changes are needed when switching between builds
- `web-scraper.js` is a utility module imported only by `build-words-web.js`, tested independently via `@/tests/web-scraper.test.js`
- The TWL06-based build is tested indirectly through `@/tests/build-words.test.js`

### Core Implementation

- **`build-words.js` (TWL06 pipeline):**
  - Downloads TWL06 from GitHub, builds a signature index for O(1) anagram lookup
  - Iterates root word lengths 3-8, calling `findExpansions(root, index, maxExtra)` where `maxExtra` varies by root length:

    | Root Length | maxExtraLetters |
    |---|---|
    | 3-5 | 3 |
    | 6 | 2 |
    | 7+ | 1 |

  - Applies size caps: 500 roots per length, 30 keys per root, 5 words per key

- **`build-words-web.js` (web pipeline):**
  - Downloads TWL06 only to identify candidate root words (same dictionary as the offline build)
  - For each candidate root, calls `fetchExpansionsFromWeb(root, 2)` which queries wordunscrambler.me with wildcard patterns (e.g., `rind*`, `rind**`)
  - Results are cached in `data/web-cache.json` (gitignored) to avoid redundant scraping; cache is saved every 50 fetches
  - Rate-limited with a 500ms delay between non-cached fetches
  - Applies the same size caps as the TWL06 build
  - Website limitation: max 2 wildcards, so only +1 and +2 letter expansions come from the web

- **`web-scraper.js` (scraping module):**
  - `parseWordsFromHtml(html)` -- regex extracts words from `<a href="/dictionary/...">` links in the HTML response, deduplicates
  - `deriveExpansionKey(root, answer)` -- compares letter signatures of root and answer to determine which letters were added; returns `null` if the answer is not a valid expansion
  - `groupByExpansionKey(root, words)` -- groups a list of answer words by their derived expansion key
  - `fetchWordsFromWeb(query)` / `fetchExpansionsFromWeb(root, maxWildcards)` -- async functions that hit wordunscrambler.me and return grouped expansions

### Things to Know

- The `MIN_EXPANSIONS = 3` threshold (in both build scripts) ensures every root has at least 3 different expansion keys -- this is what makes the "pick one of 3 offered letters" mechanic work
- The web-sourced build caches all fetch results in `data/web-cache.json` keyed by root word. A full build from empty cache takes hours due to rate limiting; subsequent runs are near-instant for cached roots
- `deriveExpansionKey` works by comparing sorted letter signatures: it subtracts the root's letters from the answer's letters and returns whatever remains, sorted alphabetically. If not all root letters are consumed, it returns `null`
- Both scripts use `import.meta.url` to resolve output paths relative to themselves

Created and maintained by Nori.
