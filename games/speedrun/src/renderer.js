import { TILE } from './level.js'
import { PLAYER_WIDTH, PLAYER_HEIGHT } from './player.js'
import { formatTime } from './timing.js'

const COLORS = {
  bg: '#121213',
  solid: '#3a3a3c',
  player: '#d7dadc',
  redCoin: '#e74c3c',
  blueCoin: '#3498db',
  goal: '#538d4e',
  goalGlow: 'rgba(83, 141, 78, 0.3)',
  text: '#d7dadc',
  textDim: '#818384',
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d')

  function render(level, player, timer, state) {
    const w = canvas.width
    const h = canvas.height
    const ts = level.tileSize

    // Clear
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, w, h)

    // Draw tiles
    ctx.fillStyle = COLORS.solid
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        if (level.grid[y][x] === TILE.SOLID) {
          ctx.fillRect(x * ts, y * ts, ts, ts)
        }
      }
    }

    // Draw goal
    ctx.fillStyle = COLORS.goalGlow
    ctx.fillRect(level.goal.x - 4, level.goal.y - 4, ts + 8, ts + 8)
    ctx.fillStyle = COLORS.goal
    ctx.fillRect(level.goal.x, level.goal.y, ts, ts)

    // Draw coins
    for (const coin of level.redCoins) {
      if (coin.collected) continue
      ctx.fillStyle = COLORS.redCoin
      ctx.beginPath()
      ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const coin of level.blueCoins) {
      if (coin.collected) continue
      ctx.fillStyle = COLORS.blueCoin
      ctx.beginPath()
      ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw player
    ctx.fillStyle = COLORS.player
    ctx.fillRect(
      Math.round(player.x),
      Math.round(player.y),
      PLAYER_WIDTH,
      PLAYER_HEIGHT,
    )

    // Draw HUD
    drawHUD(ctx, w, timer, player, level, state)
  }

  return { render }
}

function drawHUD(ctx, canvasWidth, timer, player, level, state) {
  ctx.font = '16px monospace'
  ctx.textBaseline = 'top'

  if (state === 'READY') {
    ctx.fillStyle = COLORS.text
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Press any key to start', canvasWidth / 2, 16)
    ctx.textAlign = 'left'
    ctx.font = '16px monospace'
    return
  }

  // Timer
  ctx.fillStyle = COLORS.text
  ctx.textAlign = 'left'
  ctx.fillText(formatTime(timer.elapsed), 8, 8)

  // Coin counts
  const redTotal = level.redCoins.length
  const blueTotal = level.blueCoins.length
  ctx.fillStyle = COLORS.redCoin
  ctx.fillText(`●${player.redCoins}/${redTotal}`, 8, 28)
  ctx.fillStyle = COLORS.blueCoin
  ctx.fillText(`●${player.blueCoins}/${blueTotal}`, 90, 28)
}
