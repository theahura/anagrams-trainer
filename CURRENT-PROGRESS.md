# Current Progress

## Status: MVP Complete + Quality Improvements

The full Anagram Trainer game is implemented and tested.

## Completed
- Researched scrabblewordfinder.org API (no usable REST API; wordunscrambler.me has URL-based access but CORS blocks browser calls)
- Built word processing pipeline using TWL06 Scrabble dictionary (~178K words)
- Pre-computed puzzle data: 500 curated root words per length (3-8 letters), each with 3+ valid non-trivial expansions
- Implemented date-seeded PRNG (cyrb128 + sfc32) for daily puzzle consistency
- Game logic: word selection with difficulty progression, answer validation, trivial extension filtering (substring check), scoring
- Scrabble-tile UI with CSS styling (cream tiles, point values, green board background)
- Keyboard input rendered as live Scrabble tiles
- Timer, round tracking, skip functionality, score screen
- 35 unit tests passing (PRNG, game logic, word processing)
- E2E testing with Playwright verified full game flow
- Documentation (docs.md files for all directories)
- Fixed validation bug: `isValidAnswer` now restricts answers to only those using offered letters (previously accepted any valid expansion letter)
- Added `getAnswersForRound` helper for retrieving valid answers filtered by offered letters
- Enhanced score screen: per-round breakdown showing root word, player answer, and possible answers for skipped rounds
- localStorage persistence: completed puzzle results saved by date, prevents replay of same day's puzzle

## Architecture
- Pure static HTML/JS, no backend or framework
- `data/puzzles.json` (~155KB gzipped) contains pre-computed puzzle data
- `scripts/build-words.js` regenerates puzzle data from TWL06 dictionary
- UTC date ensures all players worldwide get the same daily puzzle
- localStorage keyed by `anagram-trainer-YYYY-MM-DD` for game state persistence

## Potential Future Improvements
- Share results (Wordle-style emoji grid)
- Keyboard visual feedback (highlight valid/invalid letters)
- Streak tracking with localStorage
- Sound effects
- Mobile-optimized touch input
