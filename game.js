// ════════════════════════════════════════════════════════════════
// game.js — Core constants, gameState, game loop, input handlers
// Depends on: shared.js, shop.js, room.js, furniture.js, player.js
// Must be loaded AFTER all the above scripts.
// ════════════════════════════════════════════════════════════════

// ── Constants ─────────────────────────────────────────────────

const TILE         = 40;
const ROOM_W       = 18;
const ROOM_H       = 13;
const PLAYER_SPEED = 3;

// ── State ─────────────────────────────────────────────────────

const gameState = {
  coins:          0,
  inventory:      {},
  placed:         [],
  player:         { x: 5 * TILE, y: 5 * TILE, dir: 0 },
  keys:           {},
  mode:           'move',
  activeItem:     null,
  selectedPlaced: null,
  tab:            'shop',
  showGrid:       true,
  placingPreview: { tx: 0, ty: 0 },
  animFrame:      0,
  walkAnim:       0,
};

// ── Canvas globals (set on boot) ──────────────────────────────

let canvas, ctx, gameDiv;
let offX = 0, offY = 0;

function computeOffset() {
  offX = Math.floor((canvas.width  - ROOM_W * TILE) / 2);
  offY = Math.floor((canvas.height - ROOM_H * TILE) / 2);
}

function resize() {
  canvas.width  = gameDiv.clientWidth;
  canvas.height = gameDiv.clientHeight;
  computeOffset();
}

// ── Main render loop ──────────────────────────────────────────

function render() {
  gameState.animFrame++;
  update();
  drawRoom();
  drawFurniture();
  drawPlayer();
  requestAnimationFrame(render);
}

// ── Boot ──────────────────────────────────────────────────────

window.addEventListener('load', () => {
  canvas  = document.getElementById('gameCanvas');
  ctx     = canvas.getContext('2d');
  gameDiv = document.getElementById('gameArea');

  resize();
  window.addEventListener('resize', resize);

  gameState.coins = SharedBells.get();
  renderGameUI();
  render();
  try { loadRoom(); } catch (e) {}
});

// ── Keyboard input ────────────────────────────────────────────

window.addEventListener('keydown', e => {
  gameState.keys[e.key] = true;

  if ((e.key === 'Delete' || e.key === 'Backspace') && gameState.selectedPlaced !== null) {
    e.preventDefault();
    removePlaced(gameState.selectedPlaced);
  }
  if (e.key === 'Escape') {
    gameState.mode = 'move'; gameState.activeItem = null; gameState.selectedPlaced = null;
    renderGameUI();
  }
});

window.addEventListener('keyup', e => { gameState.keys[e.key] = false; });

// ── Mouse input ───────────────────────────────────────────────

document.addEventListener('mousemove', e => {
  if (!gameDiv) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  gameState.placingPreview = tileFromMouse(mx, my);
});

document.addEventListener('click', e => {
  if (!gameDiv || !document.getElementById('screen-game').classList.contains('visible')) return;
  const rect = canvas.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const { tx, ty } = tileFromMouse(mx, my);

  // Place mode
  if (gameState.mode === 'place' && gameState.activeItem) {
    const itm = getItem(gameState.activeItem);
    if (canPlace(tx, ty, itm, -1)) {
      gameState.placed.push({ id: gameState.activeItem, tx, ty });
      gameState.inventory[gameState.activeItem]--;
      if (!gameState.inventory[gameState.activeItem]) {
        gameState.mode = 'move'; gameState.activeItem = null;
      }
      setGameStatus(`Placed ${itm.name}! Click it to select & remove.`);
      renderGameUI();
    } else {
      setGameStatus('Cannot place there — space is occupied or out of bounds.');
    }
    return;
  }

  // Select mode — find clicked furniture
  let found = -1;
  for (let i = gameState.placed.length - 1; i >= 0; i--) {
    const p   = gameState.placed[i];
    const itm = getItem(p.id);
    const fx  = offX + p.tx * TILE, fy = offY + p.ty * TILE;
    if (mx >= fx && mx <= fx + itm.w * TILE && my >= fy && my <= fy + itm.h * TILE) {
      found = i; break;
    }
  }

  gameState.selectedPlaced = (found >= 0 && gameState.selectedPlaced !== found) ? found : null;
  if (found >= 0 && gameState.selectedPlaced === found) {
    setGameStatus(`Selected ${getItem(gameState.placed[found].id).name}. Press Delete/Backspace to remove.`);
  }
  renderGameUI();
});
