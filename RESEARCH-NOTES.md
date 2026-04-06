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
