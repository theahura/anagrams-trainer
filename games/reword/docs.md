# Noridoc: games/reword

Path: @/games/reword

### Overview

- **Reword** is a daily anagram word game where players add one or more letters to a root word and rearrange to form a new word
- Vue 3 SFC frontend with Vite build tooling; no backend -- puzzle data is pre-computed at build time and served as a JSON file
- Date-seeded PRNG ensures all players worldwide see the same puzzle on a given UTC day
- Dark Wordle-style visual theme (#121213 background, #d7dadc text, green accents for correct states)

### How it fits into the larger codebase

- `@/index.html` is the games index page for the published site, linking to both Reword and Speedrun
- `@/reword/index.html` is the standalone entry page for the Reword game
- Both HTML entry points include Open Graph and Twitter Card meta tags for social media share previews. `@/reword/index.html` uses `summary_large_image` card type with an absolute image URL; `@/index.html` uses `summary` card type with no image. All `og:image` and `twitter:image` URLs are absolute (`https://amolkapoor.com/...`) as required by the OG spec
- `@/games/reword/og-image.png` is a 1200x630 PNG share image used by the OG/Twitter meta tags. It was designed via `@/games/reword/og-card.html` (a standalone HTML mockup) and can also be regenerated programmatically via `@/scripts/generate-og-images.js`
- `@/games/reword/style.css` defines the Reword game theme, tile styles, animations (including a spinning favicon loading indicator and per-tile staggered fly-up on correct answers), virtual keyboard layout for touch devices, score screen styling including countdown timer, and a `@media (pointer: fine)` block that increases vertical margins on desktop to prevent crowding without affecting mobile layout. Label-style elements (`#round-indicator`, `.possible-answers`, `.section-label`) share a consistent subdued treatment: small uppercase, letter-spacing, color `#818384`. The `#message` area uses Vue's `<Transition>` component for fade-in/fade-out effects (`.message-fade-*` CSS classes). All animations and transitions respect `prefers-reduced-motion`
- `@/scripts/` contains two alternative build pipelines (`npm run build:words` for TWL06-based, `npm run build:words:web` for web-sourced via wordunscrambler.me) that both produce `@/games/reword/data/puzzles.json` in the same format
- `@/games/reword/src/` contains the Reword runtime logic: Vue components plus pure-logic modules (`game.js`, `prng.js`, `words.js`, `sound.js`)
- `@/tests/` contains Vitest test suites covering the pure-logic modules and Vue components

### Core Implementation

- **Data flow at runtime:**
  ```
  @/reword/index.html
    -> @/games/reword/src/main.js: createApp(App).mount('#app')
    -> App.vue onMounted:
       -> fetch bundled puzzles asset
       -> selectDailyPuzzle(data, dateStr)  [@/games/reword/src/game.js]
       -> checks localStorage for saved game (reword-{date}, falls back to anagram-trainer-{date})
       -> if saved: renders ScoreScreen with previous results
       -> if not: renders GameBoard with VirtualKeyboard, handles input, validates, plays sounds, saves on completion
  ```
  ```
  Component hierarchy:
    App.vue
      -> LoadingScreen.vue (shown during puzzle fetch)
      -> HowToPlay.vue (modal, auto-shows on first visit)
      -> GameBoard.vue
      -> ScoreScreen.vue (with countdown to next puzzle)
  ```
- **Data flow at build time (two alternatives, same output):**
  ```
  Option A: @/scripts/build-words.js (npm run build:words)
    -> downloads TWL06 word list from GitHub
    -> builds letter-signature index     [@/games/reword/src/words.js]
    -> finds expansions for each root word (+1, +2, +3 letters via combinations-with-repetition)
    -> applies size caps
    -> writes @/games/reword/data/puzzles.json

  Option B: @/scripts/build-words-web.js (npm run build:words:web)
    -> downloads TWL06 for candidate root identification
    -> fetches expansions from wordunscrambler.me  [@/scripts/web-scraper.js]
    -> caches results in @/games/reword/data/web-cache.json
    -> applies same size caps
    -> writes @/games/reword/data/puzzles.json (identical format)
  ```
- **Difficulty progression:** 11 rounds per game: 3x3-letter roots, 3x4-letter, 3x5-letter, 1x6-letter, 1x7+-letter root
- **Multi-letter expansions:** Expansion keys are variable-length strings (for example, `"r"`, `"el"`, `"egr"`). Players can use 1, 2, or 3 of the offered letters. `maxExtraLetters` varies by root length: +3 for roots of length 3-5, +2 for length 6, +1 for length 7+
- **Word acceptance rule:** Valid dictionary words are accepted unless they are trivial suffix appends (`s`, `ed`, `er`). Validation checks dictionary lookup, offered-letter availability (the expansion key's letters must be a subset of the offered letters), and rejects trivial suffixes via `TRIVIAL_SUFFIXES` in `@/games/reword/src/game.js`

### Things to Know

- The PRNG uses cyrb128 for hashing the date string into a seed, then sfc32 as the generator -- both are well-known algorithms chosen for JS portability and determinism
- `@/games/reword/data/puzzles.json` is the only data dependency at runtime; the game works entirely offline once loaded
- **State management:** All game state lives in `App.vue` as Vue reactive state (`reactive()` for round/input state, `ref()` for UI flags). Pure logic modules (`game.js`, `prng.js`, `words.js`, `sound.js`) have no state of their own
- **localStorage migration:** Keys migrated from `anagram-trainer-*` to `reword-*`. All reads include backwards-compatible fallback to the old key names (for example, `localStorage.getItem('reword-' + date) || localStorage.getItem('anagram-trainer-' + date)`)
- **localStorage keys:** `reword-{YYYY-MM-DD}` for per-date game results (includes `timerDisabled` boolean), `reword-stats` for streak statistics, `reword-lifetime-stats` for cumulative cross-game statistics (includes `perfectGamesPlayed` and `perfectGamesTotalTimeMs` for perfect-game-only time tracking), `reword-sound-muted` for mute state, `reword-seen-how-to-play` for first-visit flag, `reword-timer-disabled` for timer toggle preference (`'1'`/`'0'`)
- Real-time tile feedback: as the player types, `matchTypedToTiles` in `@/games/reword/src/game.js` greedily maps each character to root tiles first, then offered tiles. `GameBoard.vue` uses computed properties to derive tile classes (invalid when no matching tile available)
- Mobile touch input: `VirtualKeyboard.vue` renders an on-screen QWERTY keyboard shown only on touch devices via `@/games/reword/style.css`. Both physical keyboard (document keydown listener in `App.vue`) and virtual keyboard paths converge through `handleKeyInput` in `App.vue`
- The score screen shows a "Next puzzle in: HH:MM:SS" countdown to UTC midnight, using `formatCountdown()` and `getTimeUntilMidnightUTC()` pure functions from `@/games/reword/src/game.js`, ticked every second in `ScoreScreen.vue`
- On correct answer, `App.vue` sets `flyUp=true` which triggers a CSS fly-up animation on the input tiles (translateY -40px + fade, staggered per tile via `--tile-index`). The "Correct!" text message was replaced by this animation. The `flyUp` ref is reset to false in `advanceRound()`
- Each round has a per-round countdown timer (60s desktop, 70s touch devices). When the timer expires, the round is auto-skipped. The timer display shows a red pulsing warning when under 10 seconds remain, respecting `prefers-reduced-motion`. Users can disable the timer entirely via a toggle in the HowToPlay modal; when disabled, the timer interval/deadline/auto-skip are skipped (though `startTime`/`roundStartTime` are still tracked for elapsed time). The toggle is locked once a game is in progress
- **Perfect game concept:** A game is "perfect" when all 11 rounds are solved with 0 skips. `fastestTimeMs` and average time in lifetime stats are computed exclusively from perfect games; `ScoreScreen.vue` displays "N/A" when no perfect games exist. This prevents meaningless fast times from games where rounds were skipped. Games played with the timer disabled are also excluded from perfect game tracking
- Sound effects use Web Audio API synthesis with zero external dependencies. `playKeyClick` uses a filtered white noise burst (bandpass filter at 1200Hz). AudioContext is lazily created on first user interaction. iOS Safari compatibility via `webkitAudioContext` fallback
- `@/games/reword/src/ui.js` still exists in the codebase but is unused -- all UI logic was migrated to Vue components
- Vite is the build tool; Vue 3 and Vitest are the primary dev dependencies
- The site deploys to GitHub Pages but is served from `amolkapoor.com/games/`, which is the canonical base URL used in OG meta tags and `og:url`

Created and maintained by Nori.
