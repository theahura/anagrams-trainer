# Research Notes

## scrabblewordfinder.org API
- **No REST API available.** The `/solver` endpoint uses form-based POST, returns server-rendered HTML. `/solver/rind?` returns 404.
- **Sister site wordunscrambler.me** has URL-based access: `https://wordunscrambler.me/unscramble/rind*` returns results as HTML
- Wildcard: append `*` for each blank tile (max 2)
- Returns words grouped by length in descending order
- **CORS blocks client-side fetch** - cannot call from browser JS directly
- Verified: "rind*" returns 5-letter words: `dinar`, `diner`, `drain`, `drink`, `grind`, `indri`, `nadir`, `ranid`, `rinds`, `rindy`

## Architecture Decision: Bundled Word List
Since the API can't be called client-side, and we need a static HTML/JS game:
- **Approach:** Bundle TWL06 Scrabble dictionary (~178K words) and compute everything client-side
- Source: `github.com/cviebrock/wordlists` or similar
- Filter to words of length 2-10 to reduce size
- File gzips well (~400-500KB), acceptable for a web game
- Alternative: pre-generate puzzle data using a build script - much smaller but limits puzzle variety

## Trivial Extension Filtering
**Rule:** Answer word is "trivial" if the root word appears as a contiguous substring within it.
- "rinds" contains "rind" -> trivial (rejected)
- "grind" does NOT contain "rind" -> valid (accepted)
- "rinding" contains "rind" -> trivial (rejected)
- "diner" does NOT contain "rind" -> valid (accepted)
This simple substring check covers: adding `s`/`es`/`ed`/`ing`/`er` to end, and common prefixes like `un`/`re`/`de`.

## Date-Seeded PRNG
- **cyrb128** hash: converts date string -> 4 x 32-bit seed values
- **sfc32** PRNG: takes 4 seeds, passes PractRand statistical tests
- Pattern: `cyrb128("2026-04-05")` -> `sfc32(seed[0], seed[1], seed[2], seed[3])`
- Use `YYYY-MM-DD` format for consistent cross-locale date strings
- ~25 lines of code, zero dependencies

## Validation Gap: Offered Letters Not Enforced
- `isValidAnswer()` checks if answer is in ANY expansion, not just expansions for the 3 offered letters
- The spec says "Player must create a new word by adding exactly ONE of the offered letters"
- This means a player could type a valid anagram using a non-offered letter and it would be accepted
- Fix: `isValidAnswer()` should also take `offeredLetters` and only check expansions for those letters

## Web-Sourced Build Pipeline Research
- **wordunscrambler.me HTML structure**: Words in `<a href="/dictionary/{word}">{word}</a>` tags, grouped under `<h3>` headings by word length
- URL format: `https://wordunscrambler.me/unscramble/{root}*` (one blank), `{root}**` (two blanks), max 2 wildcards
- No anti-bot measures observed (no Cloudflare, CAPTCHA). Rate-limit with ~500ms delay between requests
- CORS blocks browser calls but Node.js `fetch` works fine
- **Approach**: Regex parsing of HTML in Node.js (`/<a href="\\/dictionary\\/([^"]+)">/g`), no cheerio needed
- **Expansion key derivation**: Compare sorted letter signatures of root vs answer word to determine which letters were added
- **Limitation**: Max 2 wildcards means website can only source +1 and +2 letter expansions; +3 still needs TWL06
- **Caching**: Store scraped results in `games/reword/data/web-cache.json` keyed by query string to avoid re-scraping

## Vue 3 + Vite Migration
- **Approach**: Add Vue 3 + Vite to existing project (not `create-vue` scaffold). The project already uses ES modules and Vitest.
- **Packages**: `vue` (runtime), `vite` + `@vitejs/plugin-vue` (dev), `@vue/test-utils` + `happy-dom` (dev, for component testing)
- **Entry point**: `reword/index.html` provides `<div id="app">` and loads `games/reword/src/main.js`
- **main.js**: `createApp(App).mount('#app')` - simple, no router or Pinia needed for this small app
- **Static assets**: Puzzle data lives at `games/reword/data/puzzles.json` and is loaded relative to the module path at runtime
- **vite.config.js**: `defineConfig({ plugins: [vue()], test: { environment: 'happy-dom' } })`
- **Pure logic modules unchanged**: `game.js`, `prng.js`, `words.js`, `sound.js` have no DOM dependency - import directly into Vue components
- **CSS strategy**: Keep `games/reword/style.css` as the shared stylesheet for the published Reword entry

## App Naming Options
- **Top candidates**: `Jumbl`, `Reword`, `Tangle`, `Morph`, `Mixle`
- Follows Wordle pattern: short, catchy, one-word, evokes letter manipulation
- "Reword" is a real English word and directly describes the game mechanic
