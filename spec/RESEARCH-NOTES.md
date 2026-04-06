# Research Notes

## scrabblewordfinder.org API
- **No REST API available.** The `/solver` endpoint uses form-based POST, returns server-rendered HTML. `/solver/rind?` returns 404.
- **Sister site wordunscrambler.me** has URL-based access: `https://wordunscrambler.me/unscramble/rind*` returns results as HTML
- Wildcard: append `*` for each blank tile (max 2)
- Returns words grouped by length in descending order
- **CORS blocks client-side fetch** - cannot call from browser JS directly
- Verified: "rind*" returns 5-letter words: dinar, diner, drain, drink, grind, indri, nadir, ranid, rinds, rindy

## Architecture Decision: Bundled Word List
Since the API can't be called client-side (CORS), and we need a static HTML/JS game:
- **Approach:** Bundle TWL06 Scrabble dictionary (~178K words) and compute everything client-side
- Source: github.com/cviebrock/wordlists or similar
- Filter to words of length 2-10 to reduce size
- File gzips well (~400-500KB), acceptable for a web game
- Alternative: pre-generate puzzle data using a build script — much smaller but limits puzzle variety

## Trivial Extension Filtering
**Rule:** Answer word is "trivial" if the root word appears as a contiguous substring within it.
- "rinds" contains "rind" → trivial (rejected)
- "grind" does NOT contain "rind" → valid (accepted)
- "rinding" contains "rind" → trivial (rejected)
- "diner" does NOT contain "rind" → valid (accepted)
This simple substring check covers: adding s/es/ed/ing/er to end, and common prefixes like un/re/de.

## Date-Seeded PRNG
- **cyrb128** hash: converts date string → 4 × 32-bit seed values
- **sfc32** PRNG: takes 4 seeds, passes PractRand statistical tests
- Pattern: `cyrb128("2026-04-05")` → `sfc32(seed[0], seed[1], seed[2], seed[3])`
- Use `YYYY-MM-DD` format for consistent cross-locale date strings
- ~25 lines of code, zero dependencies

## Validation Gap: Offered Letters Not Enforced
- `isValidAnswer()` checks if answer is in ANY expansion, not just expansions for the 3 offered letters
- The spec says "Player must create a new word by adding exactly ONE of the offered letters"
- This means a player could type a valid anagram using a non-offered letter and it would be accepted
- Fix: `isValidAnswer` should also take `offeredLetters` and only check expansions for those letters

## Score Screen & Answer Reveal Patterns
- Wordle shows statistics + emoji share grid; reveals answer on failure
- Spelling Bee shows all valid answers after day ends, differentiating found vs missed
- Standard pattern for daily word games: per-round results + answer reveal for missed words
- Current implementation shows only aggregate stats (words solved, letters, time)
- Should add: per-round breakdown showing root, player answer, and possible answers for skipped/missed rounds

## Replay Prevention
- Standard approach: localStorage keyed by date string
- Store completion state + results; on page load, if today's puzzle is completed, show score screen
- Current implementation has no replay prevention

## Scrabble Tile Styling
- Cream/beige tile (#F5DEB3 or similar), raised border with box-shadow
- Letter centered, point value in bottom-right corner
- Standard Scrabble point values per letter
- Multiple CodePen examples available for reference
- Key CSS: border-radius, box-shadow, gradient background for 3D effect

## Multi-Letter Expansion Algorithm
- The existing signature-based approach extends naturally to multi-letter additions
- For +1 letter: 26 lookups. For +2: 351 (combinations with repetition). For +3: 3,276. Total: 3,653 lookups per root — trivially fast
- Key insight: adding N letters = merging two sorted strings (root signature + sorted added letters)
- Data format: key expansions by sorted added letters string, e.g., `"eg"` for adding e+g, `"egr"` for adding e+g+r
- Size estimate: with capping, ~2-3x increase over current single-letter data. ~300-450KB gzipped — acceptable

## Share Results (Wordle-Style Emoji Grid)
- Standard pattern: title line + emoji row + score summary, no answer spoilers
- Wordle uses `🟩` (correct), `🟨` (present), `⬜` (absent) — for our binary solved/skipped, use `🟩`/`⬜`
- Format: `Anagram Trainer YYYY-MM-DD\n🟩🟩⬜🟩...\n9/11 | 2:34`
- Clipboard: `navigator.clipboard.writeText()` (modern, async, needs user gesture + HTTPS)
- Fallback: temporary `<textarea>` + `document.execCommand('copy')` (deprecated but still works everywhere)
- Button goes in `showScore()` in `src/ui.js` after the stats row
- Results data already available: `r.answer.length > 0` determines solved vs skipped

## Keyboard Visual Feedback (Real-Time Tile Highlighting)
- **Goal:** As player types, root and offered tiles highlight to show which are "consumed"
- **Algorithm:** Frequency-count greedy matcher — build a pool of {letter, source, index, used} from root + offered tiles. For each typed character, greedily match root tiles first, then offered tiles. O(n*m) but n,m < 15 so trivial.
- **Root-first priority:** Since all root letters must be used, matching root first gives more intuitive feedback
- **Invalid letters:** When typed letter has no matching available tile, mark as `invalid` for red feedback on input tile
- **CSS approach:** `.tile.used` class with green tint + slight scale-down + transition. Existing `.tile.offered.selected` class already has green gradient (unused in JS) — can repurpose or model after it.
- **Integration point:** `hiddenInput` `input` event listener in ui.js — after updating `state.inputLetters`, run matcher and toggle `.used` classes on rack tiles
- **Pure function for testability:** Extract `matchTypedToTiles(typedLetters, rootLetters, offeredLetters)` as a pure, exportable function in game.js for unit testing

## Bug: 3-Word-Per-Letter Cap Drops Valid Words
- `build-words.js` line 72-75 caps at 3 words per expansion letter
- For "ski" + "r", the dictionary has: irks, kirs, kris, risk — but "risk" is 4th and gets truncated
- Fix: remove the cap entirely, or increase it significantly
- This is the root cause of "ski → risk doesn't work"

## Web-Sourced Build Pipeline Research
- **wordunscrambler.me HTML structure**: Words in `<a href="/dictionary/{word}">{word}</a>` tags, grouped under `<h3>` headings by word length
- URL format: `https://wordunscrambler.me/unscramble/{root}*` (one blank), `{root}**` (two blanks), max 2 wildcards
- No anti-bot measures observed (no Cloudflare, CAPTCHA). Rate-limit with ~500ms delay between requests
- CORS blocks browser calls but Node.js fetch works fine
- **Datamuse API (api.datamuse.com)**: NOT suitable — only does positional spelling patterns, not anagram solving
- **Approach**: Regex parsing of HTML in Node.js (`/<a href="\/dictionary\/([^"]+)">/g`), no cheerio needed
- **Expansion key derivation**: Compare sorted letter signatures of root vs answer word to determine which letters were added
- **Limitation**: Max 2 wildcards means website can only source +1 and +2 letter expansions; +3 still needs TWL06
- **Caching**: Store scraped results in `data/web-cache.json` keyed by query string to avoid re-scraping
