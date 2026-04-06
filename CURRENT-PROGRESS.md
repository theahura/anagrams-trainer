# Current Progress

## Removed TRIVIAL_SUFFIXES Runtime Filter

**Problem:** `isValidAnswer()` in `src/game.js` had a `TRIVIAL_SUFFIXES` filter that rejected answers matching `root + "s"`, `root + "ed"`, or `root + "er"`. This contradicted the APPLICATION-SPEC which states all valid dictionary words should be accepted. The build pipeline already included these words (1,501 of them) in puzzles.json, so they showed as "possible answers" on the score screen but couldn't actually be submitted.

**Fix:** Removed the `TRIVIAL_SUFFIXES` constant and the suffix check loop from `isValidAnswer()`. The function now only validates against the expansion dictionary and offered letters.

**Files changed:**
- `src/game.js` — Removed suffix filter (7 lines)
- `tests/game.test.js` — Updated 3 tests to verify suffix words are accepted
- `docs.md`, `src/docs.md`, `tests/docs.md` — Updated to reflect removal

**Tests:** 146 passing (unchanged count)
