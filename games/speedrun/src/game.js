import { resetPlayer } from './player.js'

export function startRun(timer) {
  timer.running = true
}

export function restartRun(player, level, timer) {
  resetPlayer(player, level.start.x, level.start.y)
  for (const coin of level.redCoins) coin.collected = false
  for (const coin of level.blueCoins) coin.collected = false
  timer.elapsed = 0
  timer.running = false
}
