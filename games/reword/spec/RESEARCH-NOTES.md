# Research Notes

## scrabblewordfinder.org API
- **No REST API available.** The `/solver` endpoint uses form-based POST, returns server-rendered HTML. `/solver/rind?` returns 404.
- **Sister site wordunscrambler.me** has URL-based access: `https://wordunscrambler.me/unscramble/rind*` returns results as HTML
- Wildcard: append `*` for each blank tile (max 2)
- Returns words grouped by length in descending order
- **CORS blocks client-side fetch** - cannot call from browser JS directly
- Verified: "rind*" returns 5-letter words: dinar, diner, drain, drink, grind, indri, nadir, ranid, rinds, rindy

## Architecture Decision: Bundled Word List
Since the API can't be called client-side (CORS), and we need a static HTML/JS game:
- **Approach:** Bundle TWL06 Scrabble dictionary (~178K words) and compute everything client-side
- Source: github.com/cviebrock/wordlists or similar
- Filter to words of length 2-10 to reduce size
- File gzips well (~400-500KB), acceptable for a web game
- Alternative: pre-generate puzzle data using a build script — much smaller but limits puzzle variety

## Trivial Extension Filtering
**Rule:** Answer word is "trivial" if the root word appears as a contiguous substring within it.
- "rinds" contains "rind" → trivial (rejected)
- "grind" does NOT contain "rind" → valid (accepted)
- "rinding" contains "rind" → trivial (rejected)
- "diner" does NOT contain "rind" → valid (accepted)
This simple substring check covers: adding s/es/ed/ing/er to end, and common prefixes like un/re/de.

## Date-Seeded PRNG
- **cyrb128** hash: converts date string → 4 × 32-bit seed values
- **sfc32** PRNG: takes 4 seeds, passes PractRand statistical tests
- Pattern: `cyrb128("2026-04-05")` → `sfc32(seed[0], seed[1], seed[2], seed[3])`
- Use `YYYY-MM-DD` format for consistent cross-locale date strings
- ~25 lines of code, zero dependencies

## Validation Gap: Offered Letters Not Enforced
- `isValidAnswer()` checks if answer is in ANY expansion, not just expansions for the 3 offered letters
- The spec says "Player must create a new word by adding exactly ONE of the offered letters"
- This means a player could type a valid anagram using a non-offered letter and it would be accepted
- Fix: `isValidAnswer` should also take `offeredLetters` and only check expansions for those letters

## Score Screen & Answer Reveal Patterns
- Wordle shows statistics + emoji share grid; reveals answer on failure
- Spelling Bee shows all valid answers after day ends, differentiating found vs missed
- Standard pattern for daily word games: per-round results + answer reveal for missed words
- Current implementation shows only aggregate stats (words solved, letters, time)
- Should add: per-round breakdown showing root, player answer, and possible answers for skipped/missed rounds

## Replay Prevention
- Standard approach: localStorage keyed by date string
- Store completion state + results; on page load, if today's puzzle is completed, show score screen
- Current implementation has no replay prevention

## Scrabble Tile Styling
- Cream/beige tile (#F5DEB3 or similar), raised border with box-shadow
- Letter centered, point value in bottom-right corner
- Standard Scrabble point values per letter
- Multiple CodePen examples available for reference
- Key CSS: border-radius, box-shadow, gradient background for 3D effect

## Multi-Letter Expansion Algorithm
- The existing signature-based approach extends naturally to multi-letter additions
- For +1 letter: 26 lookups. For +2: 351 (combinations with repetition). For +3: 3,276. Total: 3,653 lookups per root — trivially fast
- Key insight: adding N letters = merging two sorted strings (root signature + sorted added letters)
- Data format: key expansions by sorted added letters string, e.g., `"eg"` for adding e+g, `"egr"` for adding e+g+r
- Size estimate: with capping, ~2-3x increase over current single-letter data. ~300-450KB gzipped — acceptable

## Share Results (Wordle-Style Emoji Grid)
- Standard pattern: title line + emoji row + score summary, no answer spoilers
- Wordle uses `🟩` (correct), `🟨` (present), `⬜` (absent) — for our binary solved/skipped, use `🟩`/`⬜`
- Format: `Anagram Trainer YYYY-MM-DD\n🟩🟩⬜🟩...\n9/11 | 2:34`
- Clipboard: `navigator.clipboard.writeText()` (modern, async, needs user gesture + HTTPS)
- Fallback: temporary `<textarea>` + `document.execCommand('copy')` (deprecated but still works everywhere)
- Button goes in `showScore()` in `src/ui.js` after the stats row
- Results data already available: `r.answer.length > 0` determines solved vs skipped

## Keyboard Visual Feedback (Real-Time Tile Highlighting)
- **Goal:** As player types, root and offered tiles highlight to show which are "consumed"
- **Algorithm:** Frequency-count greedy matcher — build a pool of {letter, source, index, used} from root + offered tiles. For each typed character, greedily match root tiles first, then offered tiles. O(n*m) but n,m < 15 so trivial.
- **Root-first priority:** Since all root letters must be used, matching root first gives more intuitive feedback
- **Invalid letters:** When typed letter has no matching available tile, mark as `invalid` for red feedback on input tile
- **CSS approach:** `.tile.used` class with green tint + slight scale-down + transition. Existing `.tile.offered.selected` class already has green gradient (unused in JS) — can repurpose or model after it.
- **Integration point:** `hiddenInput` `input` event listener in ui.js — after updating `state.inputLetters`, run matcher and toggle `.used` classes on rack tiles
- **Pure function for testability:** Extract `matchTypedToTiles(typedLetters, rootLetters, offeredLetters)` as a pure, exportable function in game.js for unit testing

## Answer Feedback Animations & Round Transitions
- **Wordle shake pattern**: horizontal `translateX` shake on the input row for wrong answers, ~0.4s, CSS-only with JS class toggle
- **Wordle bounce pattern**: staggered `translateY` bounce on individual tiles for correct answers, ~0.6s per tile with 100ms stagger
- **Round transitions**: fade-out (150ms) → fade-in (200ms) using opacity + transform for GPU acceleration
- **Performance**: Only animate `transform` and `opacity` for 60fps on mobile. Max 2 concurrent animations.
- **Accessibility**: Always include `@media (prefers-reduced-motion: reduce)` to disable animations
- **JS role**: Add/remove CSS classes + listen for `animationend` events to chain sequences. No JS-driven animation.
- **Existing codebase**: Already has `pop-in` keyframe on input tiles (0.15s), `.used` transitions (0.2s). Gap: no shake, no bounce, no round transition animation.

## Bug: Keys-Per-Root Cap Drops Valid Words (FIXED)
- `build-words.js` previously capped at `MAX_KEYS_PER_ROOT = 30` expansion keys per root, sorted alphabetically with single-letter keys first
- 66.7% of roots (2000/3000) hit this cap, causing valid multi-letter expansion keys to be silently dropped from `puzzles.json`
- Example: root "dares" with letters "l","g","n" -- user tried "gardens" but the "gn" expansion key was dropped by the cap
- The per-key words cap (`MAX_WORDS_PER_KEY`) was also raised from 3 to 5 in an earlier fix (the "ski + r = risk" issue)
- Fix: removed the `MAX_KEYS_PER_ROOT` cap entirely. All expansion keys are now preserved. Trimming logic extracted into exported `trimPuzzleData()` function

## Web-Sourced Build Pipeline Research
- **wordunscrambler.me HTML structure**: Words in `<a href="/dictionary/{word}">{word}</a>` tags, grouped under `<h3>` headings by word length
- URL format: `https://wordunscrambler.me/unscramble/{root}*` (one blank), `{root}**` (two blanks), max 2 wildcards
- No anti-bot measures observed (no Cloudflare, CAPTCHA). Rate-limit with ~500ms delay between requests
- CORS blocks browser calls but Node.js fetch works fine
- **Datamuse API (api.datamuse.com)**: NOT suitable — only does positional spelling patterns, not anagram solving
- **Approach**: Regex parsing of HTML in Node.js (`/<a href="\/dictionary\/([^"]+)">/g`), no cheerio needed
- **Expansion key derivation**: Compare sorted letter signatures of root vs answer word to determine which letters were added
- **Limitation**: Max 2 wildcards means website can only source +1 and +2 letter expansions; +3 still needs TWL06
- **Caching**: Store scraped results in `data/web-cache.json` keyed by query string to avoid re-scraping

## Streak Tracking
- **Wordle model**: Stores `currentStreak`, `maxStreak`, `lastPlayedTs`, `gamesPlayed`, `gamesWon` in a single `nyt-wordle-statistics` localStorage key
- **Our approach**: Store in `anagram-trainer-stats` key with `{ currentStreak, maxStreak, lastPlayedDate, gamesPlayed }`
- **Date format**: Must use UTC date strings (YYYY-MM-DD) to match existing puzzle date handling
- **Streak algorithm**: Compare `lastPlayedDate` to today's UTC date. If yesterday → increment streak. If today → no change. If 2+ days ago or null → reset to 1. Then `maxStreak = Math.max(currentStreak, maxStreak)`
- **"Yesterday" check**: Compare Date objects constructed from UTC date strings; difference of exactly 86400000ms = consecutive days. DST-immune since both are UTC
- **Completion definition**: Any puzzle completion maintains the streak (not just "winning"). Matches Wordle behavior where completing the game counts regardless of guesses
- **Integration points**: Update stats in `showScore()` after saving per-date results; load stats on game init for score screen display
- **Display**: Horizontal stat boxes on score screen showing Games Played, Current Streak, Max Streak (matching Wordle layout)

## Mobile Touch Input Optimization
- **Current hidden input issues**: `opacity: 0; pointer-events: none` is unreliable on iOS Safari. After async operations (setTimeout in round transitions), `hiddenInput.focus()` won't open keyboard because iOS requires focus synchronously within user gesture
- **Better hidden input CSS**: Use `opacity: 0.01` (not 0) and remove `pointer-events: none`. Position off-screen or behind game tiles. `font-size: 16px` minimum prevents iOS auto-zoom on focus
- **Wordle dual-input pattern**: Desktop uses `keydown` on document (no hidden input needed). Mobile renders on-screen QWERTY keyboard with letter buttons. Avoids all iOS focus/keyboard issues
- **Mobile detection**: `(pointer: coarse)` CSS media query is best single heuristic — identifies devices where primary input is finger. JS: `window.matchMedia('(pointer: coarse)').matches`
- **Touch targets**: Apple HIG minimum 44x44pt, Google Material 48x48dp. Virtual keyboard keys should be at least 44px with 8px spacing
- **Current gaps**: No touch event handlers, buttons not adjusted in mobile breakpoint, skip button too small for touch (6px padding, 12px font), no `inputmode` attribute on hidden input
- **Approach**: Add on-screen QWERTY keyboard shown when `(pointer: coarse)` matches. Keep hidden input for desktop. Extract `processKeyPress(currentLetters, key, maxLen)` as pure function shared by both input paths. Improve button sizing in mobile breakpoint

## Trivial Extension Filter Bug — "master" from "aster" Rejected
- Root cause: `filterTrivialExpansions` uses `word.includes(root)` substring check
- "master".includes("aster") = true → "master" filtered out at both build time AND runtime
- "master" IS in TWL06 dictionary (confirmed via direct lookup)
- "tasers" is NOT in TWL06 (trademark word) — separate issue, dictionary limitation
- The original spec's "Anti-Trivial-Word Rule" intended to block morphological suffixes (rinds, asters) but the substring check is too aggressive, catching legitimate words where the root happens to appear as a substring
- Fix: Remove the trivial extension filter entirely. The user's repeated feedback ("all words should work") supersedes the original anti-trivial spec
- Impact: `filterTrivialExpansions` in words.js, `isTrivialExtension` in game.js, plus tests and puzzles.json rebuild
- Words like "rinds", "asters", "cats" will now be accepted — these are valid dictionary words and the user wants all valid words to work

## Sound Effects via Web Audio API
- **Approach**: Use Web Audio API `OscillatorNode` + `GainNode` to synthesize sounds — no external audio files needed
- **AudioContext**: Lazy singleton pattern. Must be created/resumed during a user gesture (click/touchend) due to browser autoplay policy
- **Safari limit**: Max 4 AudioContext instances per page — always reuse one global instance
- **iOS gotchas**: Physical mute switch silences Web Audio completely (no workaround). Must use `touchend` + `click` listeners to unlock. Use `webkitAudioContext` fallback for older iOS
- **Sound recipes**:
  - Key click: Square wave ~800Hz, 30-50ms, exponential decay
  - Correct chime: Sine wave, two notes (C5→E5, ~523Hz→659Hz), 100-200ms each
  - Wrong/invalid buzz: Sawtooth wave ~150Hz, 200ms
  - Skip: Short descending tone, triangle wave
  - Game complete: Multi-note ascending arpeggio
- **Master gain for mute**: Route all sounds through a master GainNode. Toggle gain to 0/1 for mute. Persist mute state in localStorage
- **Mute toggle UI**: Button with `role="switch"` ARIA attribute for accessibility. Persist in localStorage key `anagram-trainer-sound-muted`
- **Non-blocking**: Web Audio runs on a separate audio thread. OscillatorNode is single-use (create per sound, GC'd after stop)
- **Pure function for testability**: Extract `createSoundEffects(audioContext)` factory that returns play functions. UI calls play functions at event trigger points.
- **Integration points in ui.js**: correct answer (line ~285), wrong answer (line ~276), invalid length (line ~270), key press (line ~469/482), skip (line ~300), game complete (line ~337)

## Vue 3 + Vite Migration
- **Approach**: Add Vue 3 + Vite to existing project (not create-vue scaffold). The project already uses ES modules and vitest.
- **Packages**: `vue` (runtime), `vite` + `@vitejs/plugin-vue` (dev), `@vue/test-utils` + `happy-dom` (dev, for component testing)
- **Entry point**: `index.html` stays at root, gets `<div id="app">` mount point + `<script type="module" src="/src/main.js">` entry
- **main.js**: `createApp(App).mount('#app')` — simple, no router or Pinia needed for this small app
- **Static assets**: Move `data/puzzles.json` to `public/data/puzzles.json` so Vite serves it as-is; fetch at runtime via `fetch('/data/puzzles.json')`
- **vite.config.js**: `defineConfig({ plugins: [vue()], test: { environment: 'happy-dom' } })`
- **Pure logic modules unchanged**: `game.js`, `prng.js`, `words.js`, `sound.js` have no DOM dependency — import directly into Vue composables/components
- **CSS strategy**: Keep `style.css` as global import in `main.js`. Component-specific styles can go in SFC `<style scoped>` blocks
- **Component structure**: App.vue (root), GameBoard.vue (main game area), TileRack.vue, ScrabbleTile.vue, VirtualKeyboard.vue, ScoreScreen.vue, GameHeader.vue, GameInfo.vue
- **State management**: Vue 3 composables (useGameState, useTimer, useSound) — no need for Pinia in a single-page game
- **Existing tests**: All 96 pure logic tests continue to work unchanged since they import from game.js/prng.js/words.js/sound.js directly
- **Web Audio in Vue**: Lazy-init AudioContext on first user interaction (same pattern as current). Clean up in onUnmounted.

## Wordle-Style Visual Redesign
- **Background**: `#121213` (near-black)
- **Tile background**: `#121213` with border `#3a3a3c`
- **Tile text**: `#d7dadc` or `#ffffff`, bold, uppercase
- **Tile dimensions**: 62px original, sharp corners (no border-radius)
- **Filled tile border**: `#565758`
- **Font**: Arial/Helvetica sans-serif (NYT uses proprietary `nyt-karnnak`)
- **Correct feedback**: `#538d4e` green
- **Key colors**: tone scale from `#d7dadc` (text) to `#121213` (bg), `#818384` (keyboard keys)
- **No scrabble points**: Remove the `.points` span and SCRABBLE_POINTS map entirely

## Tile Click Sound (Web Audio)
- **Best approach**: Filtered noise burst for realistic click feel
- Create short AudioBuffer with white noise (~40 samples at 44100Hz = ~1ms)
- Apply bandpass filter at 800-2000Hz, Q of 1-3
- Gain envelope: peak 0.3-0.5, exponential decay over 15-30ms
- Alternative: short sine/triangle at 1000-1500Hz, 15-25ms, exponential decay
- Slight frequency randomization (+/- 50Hz) for naturalness

## App Naming Options
- **Top candidates**: Jumbl, Reword, Tangle, Morph, Mixle
- Follows Wordle pattern: short, catchy, one-word, evokes letter manipulation
- "Reword" is a real English word and directly describes the game mechanic

## How-to-Play Modal Pattern
- **Trigger**: Auto-show on first visit (localStorage flag `hasSeenHowToPlay`), re-openable via `?` icon in header
- **Content**: Title, tagline, rules list, visual example with tiles, close button
- **Implementation**: Overlay with semi-transparent background, centered modal, close via X/click outside/Escape
- **Adapted content**: "Create new words by adding one of the offered letters and rearranging all letters"

## Countdown Timer to Next Puzzle
- **Placement**: Score screen, below share button
- **Format**: `HH:MM:SS` zero-padded, updated every second via setInterval
- **Calculation**: `new Date().setHours(24,0,0,0) - Date.now()` for time until midnight UTC
- **Label**: "Next puzzle in:" or "NEXT PUZZLE"
- **Font**: monospace or `font-variant-numeric: tabular-nums` to prevent layout shift

## Vue 3 Migration Notes
- Vue/Vite already installed with `@vue/test-utils` and `happy-dom`
- Component tests already written in `tests/components.test.js` for: ScrabbleTile, TileRack, VirtualKeyboard, ScoreScreen, GameBoard
- Pure logic modules (game.js, prng.js, words.js, sound.js) have no DOM dependency — import directly
- Entry: `index.html` → `<div id="app">` + `<script type="module" src="/src/main.js">`
- State management via composables (useGameState, useTimer, useSound) — no Pinia needed
- CSS: keep global style.css, add scoped styles in SFCs where needed

## Bounds Check Bug in handleSubmit/handleSkip
- `handleSubmit()` at `src/ui.js:253` accesses `puzzle[state.currentRound]` without checking bounds
- After the last round (round 11, index 10), `advanceRound()` increments `state.currentRound` to 11
- The `state.transitioning` flag prevents input during transitions, but a rapid double-click or Enter keypress could bypass this
- If `state.currentRound >= 11`, `puzzle[state.currentRound]` is `undefined`, causing a runtime error
- `handleKeyInput()` and the `input` event handler also access `puzzle[state.currentRound]` without bounds checking
- **Fix**: Add early return guard `if (state.currentRound >= 11) return;` at the top of `handleSubmit`, `handleSkip`, `handleKeyInput`, and the `input` event handler

## Running Letter Score During Gameplay
- The spec says "Score tracks total letters used across all words"
- Currently, total letters only displayed on the score screen post-game (`src/ui.js:383`)
- No running letter count visible during gameplay — only the timer is shown in the game-info bar
- **Approach**: Add a `<span id="letter-score">` next to timer in game-info bar. Update it after each round completion (in `handleSubmit` after pushing to `completedRounds`, and in `handleSkip`). Show format like "Letters: 0" to match the game aesthetic
- `calculateScore` already computes `totalLetters` from `completedRounds`, can reuse that
