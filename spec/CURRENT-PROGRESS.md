# Current Progress

## Status: Vue 3 Migration + Modern Redesign + Per-Round Countdown Timer + Mobile Optimization + Answer Animations

The game has been renamed to **Reword** and fully migrated to Vue 3 + Vite with a modern dark theme, tile click sounds, how-to-play modal, countdown timer, and mobile-optimized layout.

## Completed
- All previous work (see git history for full detail)
- **Vue 3 Migration**: Entire UI rewritten as Vue 3 SFCs (App.vue, GameBoard.vue, ScoreScreen.vue, ScrabbleTile.vue, TileRack.vue, VirtualKeyboard.vue, HowToPlay.vue)
- **Renamed to "Reword"**: Title, share text, localStorage keys all updated. Backwards-compatible fallback reads from old `anagram-trainer-*` keys
- **Removed Scrabble Points**: SCRABBLE_POINTS map and `.points` spans removed from tiles
- **Modern Dark Theme**: Wordle-style design (#121213 bg, #d7dadc text, sharp square tiles, #538d4e green accents)
- **Tile Click Sounds**: `playKeyClick` uses filtered white noise burst (bandpass at 1200Hz) instead of square wave oscillator
- **How-to-Play Modal**: Auto-shows on first visit (localStorage `reword-seen-how-to-play`), re-openable via `?` icon in header
- **Countdown Timer**: Score screen shows "Next puzzle in: HH:MM:SS" countdown to UTC midnight. Pure functions `formatCountdown()` and `getTimeUntilMidnightUTC()` in game.js
- **Favicon**: Green (#538d4e) square tile with white "R" SVG favicon at `public/favicon.svg`, linked in `index.html`
- **Per-Round Countdown Timer**: 60-second countdown per round. Auto-skips when timer expires. Timer resets each round. Cumulative time shown only on score screen. `ROUND_TIME_LIMIT_MS` constant and `formatRoundTimer()` pure function in game.js
- **Mobile Layout Optimization**: Flex column layout filling `100svh` viewport height. `overscroll-behavior: none` prevents pull-to-refresh. `touch-action: manipulation` eliminates 300ms tap delay. Safe area insets via `env()` for notched devices. Responsive breakpoints at 420px and 340px for small screens.
- **Answer Feedback Animations**: Shake animation on wrong/invalid answers, bounce animation on correct answers with staggered tile timing via `--tile-index` CSS custom property. Triggered by `animationClass` prop on GameBoard, managed by App.vue.
- **Round Transition Animations**: Vue `<Transition name="round" mode="out-in">` wraps GameBoard with fade-out/fade-in between rounds. Timer starts via `@after-enter` hook instead of `setTimeout`.
- **Removed dead `src/ui.js`**: Legacy pre-Vue DOM manipulation file deleted — nothing imported it after Vue 3 migration.
- 133 tests passing (101 pure logic + 28 Vue component + 5 countdown/HowToPlay tests)

## Architecture
- **Vue 3 + Vite**: Entry point `src/main.js` → `App.vue` mounts to `<div id="app">`
- **Component hierarchy**: App.vue → GameBoard.vue / ScoreScreen.vue / HowToPlay.vue → TileRack.vue → ScrabbleTile.vue
- **State management**: Reactive state in App.vue (no Pinia — single-page game)
- **Pure logic modules**: game.js, prng.js, words.js, sound.js remain framework-agnostic
- `data/puzzles.json` served from `public/data/puzzles.json` via Vite
- `scripts/build-words.js` and `scripts/build-words-web.js` for puzzle data generation
- `src/sound.js` Web Audio API synthesis module (pure factory, no DOM dependency)
- UTC date for daily puzzle consistency
- localStorage keyed by `reword-YYYY-MM-DD` (with fallback to `anagram-trainer-*`)
- `src/ui.js` has been removed (was legacy/unused after Vue 3 migration)

## Remaining from APPLICATION-SPEC
- All items completed
