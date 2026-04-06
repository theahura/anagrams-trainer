# Current Progress

## Status: Vue 3 Migration + Modern Redesign + All APPLICATION-SPEC Items Complete

The game has been renamed to **Reword** and fully migrated to Vue 3 + Vite with a modern dark theme, tile click sounds, how-to-play modal, and countdown timer.

## Completed
- All previous work (see git history for full detail)
- **Vue 3 Migration**: Entire UI rewritten as Vue 3 SFCs (`App.vue`, `GameBoard.vue`, `ScoreScreen.vue`, `ScrabbleTile.vue`, `TileRack.vue`, `VirtualKeyboard.vue`, `HowToPlay.vue`)
- **Renamed to "Reword"**: Title, share text, localStorage keys all updated. Backwards-compatible fallback reads from old `anagram-trainer-*` keys
- **Removed Scrabble Points**: `SCRABBLE_POINTS` map and `.points` spans removed from tiles
- **Modern Dark Theme**: Wordle-style design (`#121213` bg, `#d7dadc` text, sharp square tiles, `#538d4e` green accents)
- **Tile Click Sounds**: `playKeyClick` uses filtered white noise burst (bandpass at 1200Hz) instead of square wave oscillator
- **How-to-Play Modal**: Auto-shows on first visit (`localStorage` key `reword-seen-how-to-play`), re-openable via `?` icon in header
- **Countdown Timer**: Score screen shows "Next puzzle in: HH:MM:SS" countdown to UTC midnight. Pure functions `formatCountdown()` and `getTimeUntilMidnightUTC()` in `games/reword/src/game.js`
- 127 tests passing (96 pure logic + 26 Vue component + 5 new countdown/HowToPlay tests)

## Architecture
- **Vue 3 + Vite**: Entry point `games/reword/src/main.js` -> `App.vue` mounts to `<div id="app">`
- **Component hierarchy**: `App.vue` -> `GameBoard.vue` / `ScoreScreen.vue` / `HowToPlay.vue` -> `TileRack.vue` -> `ScrabbleTile.vue`
- **State management**: Reactive state in `App.vue` (no Pinia - single-page game)
- **Pure logic modules**: `game.js`, `prng.js`, `words.js`, `sound.js` remain framework-agnostic
- `games/reword/data/puzzles.json` is loaded as the runtime puzzle data source
- `scripts/build-words.js` and `scripts/build-words-web.js` generate puzzle data
- `games/reword/src/sound.js` provides the Web Audio API synthesis module (pure factory, no DOM dependency)
- UTC date for daily puzzle consistency
- `localStorage` is keyed by `reword-YYYY-MM-DD` (with fallback to `anagram-trainer-*`)
- `games/reword/src/ui.js` is legacy and unused - kept in codebase but no longer imported

## Remaining from APPLICATION-SPEC
- Make it play nice on mobile (partially done: virtual keyboard, touch buttons, responsive CSS already exist)
