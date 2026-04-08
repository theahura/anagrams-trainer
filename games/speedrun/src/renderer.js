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
  ghost: 'rgba(100, 160, 255, 0.35)',
  pathLine: 'rgba(100, 160, 255, 0.5)',
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d')

  function render(level, player, timer, state, stats, weekSeed, ghostPos, currentPath) {
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

    // Draw path line (on completion)
    if (state === 'COMPLETE' && currentPath && currentPath.length > 1) {
      ctx.strokeStyle = COLORS.pathLine
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(currentPath[0][0], currentPath[0][1])
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i][0], currentPath[i][1])
      }
      ctx.stroke()
    }

    // Draw ghost
    if (ghostPos) {
      ctx.fillStyle = COLORS.ghost
      ctx.fillRect(
        Math.round(ghostPos.x),
        Math.round(ghostPos.y),
        PLAYER_WIDTH,
        PLAYER_HEIGHT,
      )
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
    drawHUD(ctx, w, timer, player, level, state, stats, weekSeed)
  }

  return { render }
}

function drawHUD(ctx, canvasWidth, timer, player, level, state, stats, weekSeed) {
  ctx.font = '16px monospace'
  ctx.textBaseline = 'top'

  if (state === 'READY') {
    ctx.fillStyle = COLORS.text
    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Press any key to start', canvasWidth / 2, 16)
    ctx.textAlign = 'left'
    ctx.font = '16px monospace'
    // Show week in top-right even on ready screen
    if (weekSeed) {
      ctx.fillStyle = COLORS.textDim
      ctx.textAlign = 'right'
      ctx.fillText(weekSeed, canvasWidth - 8, 8)
      ctx.textAlign = 'left'
    }
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

  // PB and attempt info on the right side
  ctx.textAlign = 'right'
  if (weekSeed) {
    ctx.fillStyle = COLORS.textDim
    ctx.fillText(weekSeed, canvasWidth - 8, 8)
  }
  if (stats) {
    ctx.fillStyle = COLORS.textDim
    const pbText = stats.bestAnyPercent !== null ? formatTime(stats.bestAnyPercent) : '—'
    ctx.fillText(`PB: ${pbText}`, canvasWidth - 8, 28)
    ctx.fillText(`#${stats.attempts + 1}`, canvasWidth - 8, 48)
  }
  ctx.textAlign = 'left'
}
