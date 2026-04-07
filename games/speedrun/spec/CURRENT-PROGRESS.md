# Current Progress

## Status: Core Game Complete

The 2D platformer "Speedrun" is functional with all core mechanics from the APPLICATION-SPEC implemented.

## Completed
- **Project scaffolding**: Follows monorepo pattern (`speedrun/index.html` entry, `games/speedrun/src/` source)
- **Physics engine**: Gravity, jumping, tile-based AABB collision with axis-separated resolution
- **Polished movement**: Variable jump height, coyote time (0.1s), input buffering (0.1s), wall sliding, wall jumping, acceleration-based horizontal movement
- **Procedural level generation**: Seeded via ISO week number, 25x19 tile grid, platforms, ground gaps, BFS reachability verification
- **Coins**: Red and blue coins placed on platform surfaces, collected on proximity
- **Timing**: Three categories — any%, 100% red, 100% blue
- **Stats**: localStorage persistence per week, personal best tracking, attempt counter
- **Canvas rendering**: Dark theme, basic shapes (rectangles for tiles/player, circles for coins, glow for goal)
- **Results overlay**: DOM-based results screen with times, PBs, restart button
- **Vite integration**: Added as MPA entry, game card on launcher index
- **39 tests**: Physics (10), level generation (9), timing (12), stats (5), integration (3)

## Architecture
- **Pure HTML5 Canvas**: No framework — game loop via requestAnimationFrame
- **Module structure**: `physics.js`, `level.js`, `player.js`, `input.js`, `renderer.js`, `timing.js`, `stats.js`, `prng.js`, `main.js`
- **State ownership**: `main.js` owns all state objects, passes them to pure functions
- **Rendering**: Canvas 2D for gameplay, DOM overlay for results
- **Weekly seed**: `getWeeklySeed(date)` returns ISO week string; same week = same level

## Remaining from APPLICATION-SPEC
- Mobile/touch controls (spec doesn't mention, skipped for now — platformers need precise keyboard input)
- Sound effects (not in spec)
- More sophisticated level generation (current algorithm is functional but could produce more interesting speedrun routes)
- Social sharing of times
