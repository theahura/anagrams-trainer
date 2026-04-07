export function createTimer() {
  return { elapsed: 0, running: false }
}

export function updateTimer(timer, dt) {
  if (timer.running) {
    timer.elapsed += dt
  }
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export function createCompletionRecord(timer, player, level) {
  const time = timer.elapsed
  return {
    anyPercent: time,
    hundredRed: player.redCoins >= level.redCoins.length ? time : null,
    hundredBlue: player.blueCoins >= level.blueCoins.length ? time : null,
  }
}
