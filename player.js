// ════════════════════════════════════════════════════════════════
// player.js — Player movement (update) and rendering (drawPlayer)
// Depends on: game.js (canvas, ctx, gameState, TILE, PLAYER_SPEED,
//             ROOM_W, ROOM_H, offX, offY)
//             furniture.js (isBlocked)
// ════════════════════════════════════════════════════════════════

function update() {
  if (gameState.mode !== 'move') return;

  let dx = 0, dy = 0;
  if (gameState.keys['ArrowLeft']  || gameState.keys['a'] || gameState.keys['A']) { dx = -PLAYER_SPEED; gameState.player.dir = 3; }
  if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) { dx =  PLAYER_SPEED; gameState.player.dir = 1; }
  if (gameState.keys['ArrowUp']    || gameState.keys['w'] || gameState.keys['W']) { dy = -PLAYER_SPEED; gameState.player.dir = 0; }
  if (gameState.keys['ArrowDown']  || gameState.keys['s'] || gameState.keys['S']) { dy =  PLAYER_SPEED; gameState.player.dir = 2; }

  if (dx || dy) gameState.walkAnim++;

  const nx = Math.max(12, Math.min(ROOM_W * TILE - 12, gameState.player.x + dx));
  const ny = Math.max(12, Math.min(ROOM_H * TILE - 12, gameState.player.y + dy));

  if (dx && !isBlocked(nx, gameState.player.y)) gameState.player.x = nx;
  if (dy && !isBlocked(gameState.player.x, ny)) gameState.player.y = ny;
}

function drawPlayer() {
  const px   = offX + gameState.player.x;
  const py   = offY + gameState.player.y;
  const walk = Math.sin(gameState.walkAnim * 0.3) * 2;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(px, py + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.fillStyle = '#ff9eb5';
  roundRect(px - 10, py - 18 + walk, 20, 24, 8); ctx.fill();

  // Head
  ctx.fillStyle = '#ffd0a0';
  ctx.beginPath(); ctx.arc(px, py - 22 + walk, 12, 0, Math.PI * 2); ctx.fill();

  // Hair
  ctx.fillStyle = '#6a3a1a';
  ctx.beginPath(); ctx.ellipse(px, py - 31 + walk, 11, 7, 0, Math.PI, Math.PI * 2); ctx.fill();

  // Eyes (not when facing away)
  if (gameState.player.dir !== 0) {
    const eo = gameState.player.dir === 3 ? -3 : gameState.player.dir === 1 ? 3 : 0;
    ctx.fillStyle = '#4a2a1a';
    ctx.beginPath(); ctx.arc(px + eo - 3, py - 23 + walk, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + eo + 3, py - 23 + walk, 2, 0, Math.PI * 2); ctx.fill();
  }

  // Legs
  const ls = Math.sin(gameState.walkAnim * 0.3) * 5;
  ctx.fillStyle = '#6a5a9a';
  ctx.fillRect(px - 8, py + 5 + walk, 7, 10 + ls);
  ctx.fillRect(px + 1, py + 5 + walk, 7, 10 - ls);
}
