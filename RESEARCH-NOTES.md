# Research Notes

## TRIVIAL_SUFFIXES Runtime Filter Contradicts Spec

### Problem
`isValidAnswer()` in `src/game.js:3-11` has a `TRIVIAL_SUFFIXES = ['s', 'ed', 'er']` check that rejects answers matching `root + suffix`. This contradicts the APPLICATION-SPEC.md (line 23-24) which states: "All valid words from the TWL06 Scrabble dictionary are accepted, including words that contain the root as a substring."

### Git History
- Commit `b1111f5` removed the broad `isTrivialExtension` filter from both build and runtime
- Commit `36e7780` re-added a narrower suffix-only filter to runtime only
- The APPLICATION-SPEC was updated in `b1111f5` to say "no filter" but was NOT updated when `36e7780` re-added one

### Impact
- 1,501 trivial suffix words exist in `data/puzzles.json` (build pipeline includes them) but are rejected at runtime
- Players can see these words listed as "possible answers" on the score screen but cannot submit them during gameplay
- Example: root "set" + letter "s" → "sets" is in the data but rejected at runtime

### Fix
Remove the `TRIVIAL_SUFFIXES` constant and the suffix check from `isValidAnswer()`. Update the 3 tests that enforce this filter to instead verify these words ARE accepted. This aligns runtime behavior with the spec and the build pipeline.
