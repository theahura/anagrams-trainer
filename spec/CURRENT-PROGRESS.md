# Current Progress

## Status: MVP Complete + Multi-Letter Expansion + Web-Sourced Build + Share Results

The full Anagram Trainer game is implemented and tested with multi-letter expansion support, a web-sourced build pipeline, and share results functionality.

## Completed
- Researched scrabblewordfinder.org API (no usable REST API; wordunscrambler.me has URL-based access but CORS blocks browser calls)
- Built word processing pipeline using TWL06 Scrabble dictionary (~178K words)
- Pre-computed puzzle data: 500 curated root words per length (3-8 letters), with multi-letter expansions
- Implemented date-seeded PRNG (cyrb128 + sfc32) for daily puzzle consistency
- Game logic: word selection with difficulty progression, answer validation, trivial extension filtering, scoring
- Scrabble-tile UI with CSS styling (cream tiles, point values, green board background)
- Keyboard input rendered as live Scrabble tiles
- Timer, round tracking, skip functionality, score screen
- 44 unit tests passing (PRNG, game logic, word processing, multi-letter expansions)
- E2E testing with Playwright verified full game flow
- Documentation (docs.md files for all directories)
- Fixed validation bug: `isValidAnswer` now restricts answers to only those using offered letters
- Added `getAnswersForRound` helper for retrieving valid answers filtered by offered letters
- Enhanced score screen: per-round breakdown showing root word, player answer, and possible answers for skipped rounds
- localStorage persistence: completed puzzle results saved by date, prevents replay of same day's puzzle
- Multi-letter expansion support: players can use 1, 2, or 3 offered letters to form longer words
- Fixed word truncation bug: removed 3-word-per-letter cap that dropped valid answers (e.g., "risk" for ski+r)
- Trivial extension filter is now key-length-aware: only applies to single-letter additions
- Build script uses tiered maxExtraLetters by root length (3 for short, 2 for medium, 1 for long)
- Web-sourced build pipeline: `npm run build:words:web` fetches word data from wordunscrambler.me
- Web scraper module with HTML parsing, expansion key derivation, and word grouping
- Scrape results cached in `data/web-cache.json` for performance
- Share results: Wordle-style emoji grid (🟩 solved, ⬜ skipped) with clipboard copy button
- `generateShareText` pure function in game.js for testable share text generation
- Clipboard copy uses navigator.clipboard API with textarea/execCommand fallback
- Share button on score screen with "Copied!" feedback, works for fresh and replayed games
- 63 unit tests passing (PRNG, game logic, word processing, multi-letter expansions, web scraper, share text)

## Architecture
- Pure static HTML/JS, no backend or framework
- `data/puzzles.json` (~1.7MB) contains pre-computed puzzle data with multi-letter expansion keys
- Expansion keys are variable-length sorted letter strings (e.g., "r", "el", "egr")
- `scripts/build-words.js` regenerates puzzle data from TWL06 dictionary using combinations-with-repetition
- `scripts/build-words-web.js` alternative build using wordunscrambler.me as word source (with caching)
- `scripts/web-scraper.js` module for HTML parsing and expansion key derivation
- UTC date ensures all players worldwide get the same daily puzzle
- localStorage keyed by `anagram-trainer-YYYY-MM-DD` for game state persistence

## Potential Future Improvements
- Keyboard visual feedback (highlight valid/invalid letters)
- Streak tracking with localStorage
- Sound effects
- Mobile-optimized touch input
