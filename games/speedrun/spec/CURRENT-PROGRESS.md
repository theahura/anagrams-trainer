# Current Progress

## Status: APPLICATION-SPEC Complete

All requirements from APPLICATION-SPEC.md are implemented and verified. The 2D platformer "Speedrun" is fully functional.

## Completed
- **Project scaffolding**: Follows monorepo pattern (`speedrun/index.html` entry, `games/speedrun/src/` source)
- **Physics engine**: Gravity, jumping, tile-based AABB collision with axis-separated resolution
- **Polished movement**: Variable jump height, coyote time (0.1s), input buffering (0.1s), wall sliding, wall jumping with control delay (0.15s), acceleration-based horizontal movement
- **Procedural level generation**: Seeded via ISO week number, 25x19 tile grid, lane-based platform placement (high/mid/low routes), ground gaps, BFS reachability verification
- **Coins**: Route-biased placement — red coins on high-route platforms, blue coins on low-route/ground platforms; collected on proximity
- **Timing**: Three categories — any%, 100% red, 100% blue
- **Stats**: localStorage persistence per week, personal best tracking, attempt counter
- **Canvas rendering**: Dark theme, basic shapes (rectangles for tiles/player, circles for coins, glow for goal)
- **Results overlay**: DOM-based results screen with times, PBs, restart button
- **Vite integration**: Added as MPA entry, game card on launcher index
- **49 tests**: Physics (12), level generation (11), timing (12), stats (5), integration (7 — includes 4 restartRun tests), repo structure (2 speedrun-related)

## Architecture
- **Pure HTML5 Canvas**: No framework — game loop via requestAnimationFrame
- **Module structure**: `physics.js`, `level.js` (lane-based generation), `player.js`, `input.js`, `renderer.js`, `timing.js`, `stats.js`, `prng.js`, `main.js`
- **State ownership**: `main.js` owns all state objects, passes them to pure functions
- **Rendering**: Canvas 2D for gameplay, DOM overlay for results
- **Weekly seed**: `getWeeklySeed(date)` returns ISO week string; same week = same level

## Recently Added
- **Wall jump control delay**: Celeste-style 0.15s control lockout after wall jumps — forces player away from wall, preventing trivial momentum cancellation. Uses `wallJumpControlTimer` and `wallJumpForceDir` player state fields. Timer clears on grounding.
- **2 new physics tests**: Wall jump control delay enforcement and input resumption after delay expiry

## Remaining (NOT in APPLICATION-SPEC — future enhancements)
- Mobile/touch controls (platformers need precise keyboard input)
- Sound effects
- Social sharing of times
