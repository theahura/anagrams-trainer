# Current Progress

## Removed TRIVIAL_SUFFIXES Runtime Filter

**Problem:** `isValidAnswer()` in `src/game.js` had a `TRIVIAL_SUFFIXES` filter that rejected answers matching `root + "s"`, `root + "ed"`, or `root + "er"`. This contradicted the APPLICATION-SPEC which states all valid dictionary words should be accepted. The build pipeline already included these words (1,501 of them) in puzzles.json, so they showed as "possible answers" on the score screen but couldn't actually be submitted.

**Fix:** Removed the `TRIVIAL_SUFFIXES` constant and the suffix check loop from `isValidAnswer()`. The function now only validates against the expansion dictionary and offered letters.

**Files changed:**
- `src/game.js` — Removed suffix filter (7 lines)
- `tests/game.test.js` — Updated 3 tests to verify suffix words are accepted
- `docs.md`, `src/docs.md`, `tests/docs.md` — Updated to reflect removal

**Tests:** 146 passing (unchanged count)

## Fixed Timer Running During HowToPlay Modal

**Problem:** When a player opened the HowToPlay modal via the "?" button during gameplay, the 60-second countdown timer kept running. If the timer expired while the modal was open, `handleSkip()` fired and the player lost their round without playing it. The keyboard handler correctly blocked input during the modal, but the timer was not similarly paused.

**Fix:** Added `openHowToPlay()` function that saves elapsed time and stops the timer when the modal opens. Updated `handleCloseHowToPlay()` to resume the timer from the saved position. Added `pausedElapsedMs` variable to track elapsed time during pause. This leverages the existing `startTimer(alreadyElapsedMs)` pattern used by mid-game persistence.

**Files changed:**
- `src/components/App.vue` — Added `openHowToPlay()`, `pausedElapsedMs`, updated `handleCloseHowToPlay()` and template
- `tests/components.test.js` — Added 2 App.vue integration tests (timer pause + timer resume)
- `RESEARCH-NOTES.md` — Documented bug analysis and fix approach
- `docs.md`, `src/docs.md`, `tests/docs.md` — Updated to reflect timer pause behavior

**Tests:** 148 passing (2 new)
