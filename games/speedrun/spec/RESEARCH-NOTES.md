# Research Notes — Speedrun

## Game Loop Architecture
- **Fixed timestep accumulator pattern** is the standard for consistent physics: physics runs at fixed 60Hz while rendering runs at display refresh rate via `requestAnimationFrame`.
- For a simple single-screen platformer, a straightforward approach (update + render at rAF rate with delta time clamping) works fine.
- When tab is unfocused, rAF pauses — treat the gap as a pause (skip elapsed time).

## Canvas vs DOM Rendering
- **Canvas is the clear choice** for a game with moving elements. DOM repositioning triggers layout recalculation.
- Canvas 2D API is sufficient (`fillRect()`, `arc()`). WebGL is overkill.
- Hybrid: Canvas for gameplay, DOM for UI overlays (timers, menus).
- Use integer coordinates (`Math.round()`) to prevent sub-pixel blur.

## Platformer Physics and Game Feel
- **Gravity formula**: `gravity = (-2 * jumpHeight) / (timeToApex²)`, `jumpSpeed = sqrt(2 * |gravity| * jumpHeight)` — lets you tune height and apex time independently.
- **Coyote time** (~0.1-0.15s): Track time since leaving ground, allow jump within window.
- **Variable jump height**: When rising and jump button released, multiply gravity by `jumpCutoff` (2-3x) to cut the jump short.
- **Input buffering** (~0.1-0.15s): On jump press, start a buffer timer. If still active when landing, execute the jump.
- **Momentum/acceleration**: `velocity.x = moveTowards(velocity.x, target, accel * dt)`. Separate rates for acceleration, deceleration, and turning. Different values for ground vs air.
- **Fall gravity multiplier** (1.5-2x): Snappier descents feel better.
- **Wall sliding**: When touching wall and falling, clamp downward velocity to reduced max (e.g., `maxFallSpeed * 0.3`).
- **Wall jumping**: Apply velocity upward and away from wall. Briefly reduce horizontal control to prevent immediate return.

## Collision Detection
- **Tile-based AABB** is strongly preferred for simplicity.
- **Axis-separated resolution**: Move X first, resolve. Then move Y, resolve. Gives natural wall-sliding for free.
- Convert player bounding box to tile coordinates, only check overlapping tiles.

## Procedural Level Generation (Single Screen)
- Define grid (e.g., 20x15 tiles).
- Place floor with optional gaps.
- Place platforms: column scan with random chance, constrain max gap to player jump reach.
- **Ensure reachability**: BFS/flood fill from start to end to verify path exists.
- Place collectibles on platform surfaces.
- Start on ground level, end on high platform.

## Multi-Route Level Generation (Lane-Based)
- **Lane partitioning**: Divide vertical space into high lane (rows 3-7), mid lane (rows 8-12), low lane (rows 13-16), ground (rows 17-18).
- **Route chains**: Place platforms left-to-right within each lane, ensuring each platform is reachable from the previous (horizontal gap <= jumpD=5, vertical gap <= jumpH=4).
- **Connector platforms**: Place 2-3 platforms in the mid lane where jump envelopes of high and low routes overlap, enabling route-switching.
- **Route-biased coin clustering**: Red coins placed predominantly on high-route platforms, blue coins on low-route platforms. Creates meaningful route decisions aligned with the any%/100%-red/100%-blue scoring categories.
- **Constrained placement over post-hoc patching**: Instead of random scatter + BFS + bridge patching, generate reachable chains by construction. Eliminates the need for addBridgePlatforms() fallback in most cases.
- **Gap sizing for difficulty**: High route uses larger gaps (4-5 tiles) rewarding precision; low route uses smaller gaps with more pits, rewarding speed.
- **Single-screen constraint**: Since the entire level is visible, route decisions are about execution choice, not exploration. Both paths should be visually obvious.

## Existing PRNG — Reusable
- `games/reword/src/prng.js` exports `getDailyRng(dateStr)`, `seededShuffle()`, `seededPick()`.
- Uses cyrb128 hash + sfc32 PRNG. Fully deterministic.
- Can be copied to `games/speedrun/src/prng.js` for use with weekly seed strings.

## Monorepo Patterns
- MPA setup: root `index.html` is game launcher, each game gets `{game}/index.html` entry point.
- Source lives in `games/{game}/src/`, entry HTML at `{game}/index.html` (root level).
- Vite config lists each game as separate rollup input.
- Tests go in `tests/` at project root.

## Weekly Seed Strategy
- Use ISO week number + year as seed: `"2026-W15"`.
- `getISOWeek(date)` computes week number from UTC date.
- Same week = same map for all players.

## Speedrun QoL — Instant Restart & HUD Improvements
- **Instant restart**: Speedrunning games universally support a single-key restart (typically R). The current implementation only supports restart via a button click after completing a run. There is no mid-run restart at all.
- **Restart approach**: Handle R key as a separate `keydown` listener in `main.js`, outside the movement input system. The input system is tightly scoped to movement actions and should stay that way. The existing `startGame` one-shot listener is the established pattern for non-movement keys.
- **Keyboard results dismissal**: The results overlay currently has no keyboard support. Adding Enter/R to dismiss matches standard game patterns.
- **HUD additions**: The current HUD shows timer + coin counts. Adding PB any% time and attempt count during gameplay lets players gauge their pace in real-time — critical for the "shave off time" loop the spec targets.
- **State transitions**: Game has READY→PLAYING→COMPLETE. Restart from PLAYING needs to reset player, coins, timer without showing results. Restart from COMPLETE needs to hide overlay first.
