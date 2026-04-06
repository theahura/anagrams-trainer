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

## Timer Urgency Feedback & Escape Key for HowToPlay Modal

**Problem (Timer):** The 60-second countdown timer had no visual urgency indicator. Players got auto-skipped without warning when time ran out — the timer looked identical at 60s and 1s remaining.

**Problem (Escape):** The HowToPlay modal could only be closed by clicking the X button or clicking outside. Pressing Escape did nothing, missing a standard accessibility pattern.

**Fix (Timer):** Added `isTimerUrgent(remainingMs)` pure function and `TIMER_URGENT_THRESHOLD_MS = 10000` constant to game.js. App.vue tracks urgency via a `timerUrgent` ref, updated in the timer interval. When remaining time drops to 10s or below, `.timer-display` gets an `.urgent` CSS class that turns the text red (#e74c3c) with a pulse animation. Respects `prefers-reduced-motion` (animation disabled, red color preserved).

**Fix (Escape):** Added Escape key check in the keydown handler before the `showHowToPlay` early return guard. Pressing Escape when the modal is open calls `handleCloseHowToPlay()`, which also resumes the paused timer.

**Files changed:**
- `src/game.js` — Added `isTimerUrgent`, `TIMER_URGENT_THRESHOLD_MS`
- `src/components/App.vue` — Added `timerUrgent` ref, urgency tracking in timer, Escape key handler, `.urgent` class binding
- `style.css` — Added `.timer-display.urgent` styles, `@keyframes pulse`, updated `prefers-reduced-motion`
- `tests/game.test.js` — 3 new tests for `isTimerUrgent` boundary behavior
- `tests/components.test.js` — 4 new tests (2 Escape key, 2 timer urgency)
- `docs.md`, `src/docs.md`, `tests/docs.md` — Updated to reflect changes

**Tests:** 155 passing (7 new)

## Web Share API for Mobile Sharing

**Problem:** The "Share Results" button on the score screen only copies text to clipboard. On mobile devices, the native share sheet (Web Share API) provides a much better UX — Wordle and other daily word games use it to let players share directly to Messages, WhatsApp, Twitter, etc.

**Fix:** Added `shareResults(text, nav)` async pure function to game.js implementing a three-tier share approach: (1) Web Share API via `navigator.share()`, (2) Clipboard API via `navigator.clipboard.writeText()`, (3) returns `'fallback'` for legacy `execCommand` handling. Uses dependency injection (accepts `nav` parameter) for testability. Handles `AbortError` (user dismissed share sheet) gracefully by returning `'dismissed'`. Updated `handleShare()` in App.vue to use the new function, showing "Shared!" for native share, "Copied!" for clipboard, and silently returning on dismiss.

**Files changed:**
- `src/game.js` — Added `shareResults(text, nav)` async function
- `src/components/App.vue` — Updated `handleShare()` to use `shareResults()`, differentiated button text
- `tests/game.test.js` — 5 new tests for `shareResults` behavior
- `RESEARCH-NOTES.md` — Added Web Share API research section
- `docs.md`, `src/docs.md`, `tests/docs.md` — Updated to reflect changes

**Tests:** 160 passing (6 new)
