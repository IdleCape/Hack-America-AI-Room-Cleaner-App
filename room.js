// ════════════════════════════════════════════════════════════════
// room.js — Room rendering, grid toggle, save / load, status bar
// Depends on: game.js (canvas, ctx, gameState, TILE, ROOM_W/H)
// ════════════════════════════════════════════════════════════════

// ── Room drawing ──────────────────────────────────────────────

function drawRoom() {
  const W = canvas.width, H = canvas.height;
  const rw = ROOM_W * TILE, rh = ROOM_H * TILE;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#eef7f1';
  ctx.fillRect(0, 0, W, H);

  // Wall (top strip)
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(offX, offY, rw, 60);

  // Floor tiles
  for (let x = 0; x < ROOM_W; x++) {
    for (let y = 2; y < ROOM_H; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#d4b87a' : '#c8a860';
      ctx.fillRect(offX + x * TILE + 1, offY + y * TILE + 1, TILE - 1, TILE - 1);
    }
  }

  // Wall / floor divider
  ctx.fillStyle = '#b89650';
  ctx.fillRect(offX, offY + TILE * 2 - 4, rw, 5);

  // Grid overlay
  if (gameState.showGrid) {
    ctx.strokeStyle = 'rgba(0,0,0,0.09)'; ctx.lineWidth = 0.5;
    for (let x = 0; x <= ROOM_W; x++) {
      ctx.beginPath(); ctx.moveTo(offX + x * TILE, offY); ctx.lineTo(offX + x * TILE, offY + rh); ctx.stroke();
    }
    for (let y = 0; y <= ROOM_H; y++) {
      ctx.beginPath(); ctx.moveTo(offX, offY + y * TILE); ctx.lineTo(offX + rw, offY + y * TILE); ctx.stroke();
    }
  }

  // Room border
  ctx.strokeStyle = '#8B6B3A'; ctx.lineWidth = 3;
  ctx.strokeRect(offX, offY, rw, rh);

  // Window
  ctx.fillStyle = '#a8d4f0';
  ctx.fillRect(offX + 5 * TILE, offY + 6, TILE * 2, TILE - 10);
  ctx.strokeStyle = '#6B8B5A'; ctx.lineWidth = 2;
  ctx.strokeRect(offX + 5 * TILE, offY + 6, TILE * 2, TILE - 10);
  ctx.beginPath(); ctx.moveTo(offX + 6 * TILE, offY + 6); ctx.lineTo(offX + 6 * TILE, offY + TILE - 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(offX + 5 * TILE, offY + TILE / 2); ctx.lineTo(offX + 7 * TILE, offY + TILE / 2); ctx.stroke();

  // Curtains
  ctx.fillStyle = 'rgba(200,100,120,0.5)';
  ctx.fillRect(offX + 5 * TILE - 8, offY + 2, 10, TILE);
  ctx.fillRect(offX + 7 * TILE - 2, offY + 2, 10, TILE);

  // Door
  ctx.fillStyle = '#8B5A3A';
  ctx.fillRect(offX + 13 * TILE, offY + rh - TILE - 2, TILE * 1.5, TILE + 2);
  ctx.strokeStyle = '#5A3A1A'; ctx.lineWidth = 2;
  ctx.strokeRect(offX + 13 * TILE, offY + rh - TILE - 2, TILE * 1.5, TILE + 2);

  // Doorknob
  ctx.fillStyle = '#d4a060';
  ctx.beginPath(); ctx.arc(offX + 14.2 * TILE, offY + rh - TILE / 2, 4, 0, Math.PI * 2); ctx.fill();
}

// ── Grid toggle ───────────────────────────────────────────────

function toggleGrid() {
  gameState.showGrid = !gameState.showGrid;
  document.getElementById('gridBtn').classList.toggle('active', gameState.showGrid);
}

// ── Save / Load ───────────────────────────────────────────────

function saveRoom() {
  localStorage.setItem('cozyRoom', JSON.stringify({
    placed:    gameState.placed,
    inventory: gameState.inventory,
    coins:     gameState.coins
  }));
  setGameStatus('Room saved! 💾');
}

function loadRoom() {
  const raw = localStorage.getItem('cozyRoom');
  if (!raw) { setGameStatus('No saved room found.'); return; }
  const data = JSON.parse(raw);
  gameState.placed    = data.placed    || [];
  gameState.inventory = data.inventory || {};
  gameState.coins     = Math.max(data.coins || 0, SharedBells.get());
  SharedBells.set(gameState.coins);
  setGameStatus('Room loaded! 📂');
  renderGameUI();
}

// ── Status bar ────────────────────────────────────────────────

let statusTimer;
function setGameStatus(msg) {
  document.getElementById('statusBar').textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    document.getElementById('statusBar').textContent = 'Move with WASD • Buy in Shop • Place from Bag';
  }, 3000);
}
