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

## Timer Urgency Feedback (Low Time Warning)
- **Problem**: The 60-second countdown timer has no visual urgency indicator. When time drops below 10 seconds, it looks the same as at 60 seconds. Players get auto-skipped without warning.
- **Pattern**: Chess clocks turn red under time pressure. Boggle timers flash. Wordle doesn't have per-round timing, but timed games universally use color/animation to signal urgency.
- **Current state**: `.timer-display` in style.css has no color set — inherits `#d7dadc` from `.game-info`. Timer updates every 100ms in App.vue `startTimer()`.
- **Approach**: Add a `timerUrgent` boolean ref in App.vue. Set to `true` when remaining time <= 10s (in the setInterval callback). Pass as prop to GameBoard, which binds a `.urgent` class on `.timer-display`. CSS `.timer-display.urgent` sets `color: #e74c3c` (existing error red) with a pulse animation. `prefers-reduced-motion` disables the pulse but keeps the red color.
- **Pure function**: Add `isTimerUrgent(remainingMs)` to game.js with `TIMER_URGENT_THRESHOLD_MS = 10000` constant for testability.

## Escape Key to Close HowToPlay Modal
- **Problem**: The HowToPlay modal can be closed by clicking the X button or clicking outside, but not by pressing Escape. This is a standard accessibility pattern (WAI-ARIA dialog pattern).
- **Current keydown handler** (App.vue line 328): Returns early when `showHowToPlay.value` is true — Escape check needs to come before that early return, or be added as a separate condition.
- **Approach**: Add `e.key === 'Escape'` check in the keydown handler. If `showHowToPlay.value` is true and Escape is pressed, call `handleCloseHowToPlay()` and return.

## Bug: Timer Continues During HowToPlay Modal Mid-Game

### Problem
When a player opens the HowToPlay modal via the "?" button during gameplay, the 60-second countdown timer keeps running. If the timer expires while the modal is open, `handleSkip()` fires and the player loses their round without playing it.

### Root Cause
In App.vue, clicking "?" sets `showHowToPlay = true` but nothing calls `stopTimer()`. The `handleCloseHowToPlay()` function only starts a fresh timer if `!timerInterval` (i.e., no timer is running), so when closed mid-game, it does nothing — the timer just keeps ticking as if the modal was never opened.

The keyboard handler correctly blocks input when the modal is open (`if (showHowToPlay.value) return`), but the timer is not similarly guarded.

### Fix
1. When "?" is clicked mid-game: call `stopTimer()` and save `pausedElapsedMs = Date.now() - state.roundStartTime`
2. When modal closes mid-game: call `startTimer(pausedElapsedMs)` to resume with accumulated time
3. First-visit case (timer not yet started) already works correctly — `handleCloseHowToPlay` starts fresh timer when `!timerInterval`
4. Add a `let pausedElapsedMs = 0` variable alongside `timerInterval` to hold the paused elapsed time

## Web Share API for Mobile Share Flow
- **Problem**: The "Share Results" button only copies text to clipboard (`navigator.clipboard.writeText()`). On mobile devices, the native share sheet (Web Share API) is the expected UX — Wordle and all major daily word games use it.
- **Web Share API**: `navigator.share({ text })` opens the native OS share dialog. Supported on 94%+ of browsers globally. Excellent mobile support (iOS Safari 12.2+, Chrome Android, Samsung Internet 8.2+). Firefox Desktop does NOT support it — clipboard fallback essential.
- **Requirements**: HTTPS (localhost counts for dev), user gesture (satisfied — triggered by button click), at least one of `text`/`url`/`title`.
- **AbortError handling**: When user dismisses the share sheet, the Promise rejects with `AbortError`. This is normal user behavior — must NOT show an error message. Just return silently.
- **Button text**: With Web Share, native UI gives feedback → show "Shared!". With clipboard fallback → show "Copied!" (current). These should differ.
- **Three-tier approach**: (1) `navigator.share({ text })` if available, (2) `navigator.clipboard.writeText()`, (3) `document.execCommand('copy')` legacy fallback.
- **Current code**: `handleShare()` in App.vue lines 307-327. Already correctly structured for async with try/catch.
