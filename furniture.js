// ════════════════════════════════════════════════════════════════
// furniture.js — Placed-item rendering and placement preview
// Depends on: game.js (canvas, ctx, gameState, TILE, offX, offY)
//             shop.js (getItem, SHOP_ITEMS)
// ════════════════════════════════════════════════════════════════

// ── Canvas helpers ────────────────────────────────────────────

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);      ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);      ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);          ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}

// ── Collision helpers ─────────────────────────────────────────

function isBlocked(px, py) {
  const s = 22;
  for (const p of gameState.placed) {
    const itm = getItem(p.id);
    const fx = p.tx * TILE, fy = p.ty * TILE;
    if (px + s > fx + 2 && px - s < fx + itm.w * TILE - 2 &&
        py + s > fy + 2 && py - s < fy + itm.h * TILE - 2) return true;
  }
  return false;
}

function canPlace(tx, ty, itm, skipIdx) {
  if (tx < 0 || ty < 0 || tx + itm.w > ROOM_W || ty + itm.h > ROOM_H) return false;
  for (let i = 0; i < gameState.placed.length; i++) {
    if (i === skipIdx) continue;
    const p = gameState.placed[i], pi = getItem(p.id);
    if (tx < p.tx + pi.w && tx + itm.w > p.tx && ty < p.ty + pi.h && ty + itm.h > p.ty) return false;
  }
  return true;
}

function tileFromMouse(mx, my) {
  return { tx: Math.floor((mx - offX) / TILE), ty: Math.floor((my - offY) / TILE) };
}

// ── Drawing ───────────────────────────────────────────────────

function drawFurniture() {
  const previewItem = (gameState.mode === 'place' && gameState.activeItem) ? getItem(gameState.activeItem) : null;
  const { tx: ptx, ty: pty } = gameState.placingPreview;

  // Draw all placed items
  for (let i = 0; i < gameState.placed.length; i++) {
    const p   = gameState.placed[i];
    const itm = getItem(p.id);
    const fx  = offX + p.tx * TILE, fy = offY + p.ty * TILE;
    const fw  = itm.w * TILE,       fh = itm.h * TILE;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(fx + 3, fy + 4, fw, fh);

    // Fill + emoji
    ctx.fillStyle = itm.color;
    roundRect(fx, fy, fw, fh, 6); ctx.fill();

    // Selection highlight
    if (gameState.selectedPlaced === i) {
      ctx.strokeStyle = '#c28b00'; ctx.lineWidth = 2.5;
      roundRect(fx - 1, fy - 1, fw + 2, fh + 2, 7); ctx.stroke();
    }

    ctx.font         = `${Math.min(itm.w, itm.h) * 20}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = 'white';
    ctx.fillText(itm.emoji, fx + fw / 2, fy + fh / 2);
  }

  // Placement preview ghost
  if (previewItem) {
    const ok = canPlace(ptx, pty, previewItem, -1);
    const fx = offX + ptx * TILE, fy = offY + pty * TILE;
    const fw = previewItem.w * TILE, fh = previewItem.h * TILE;

    ctx.fillStyle = ok ? 'rgba(80,200,120,0.35)' : 'rgba(200,80,80,0.35)';
    roundRect(fx, fy, fw, fh, 6); ctx.fill();

    ctx.strokeStyle = ok ? '#50c878' : '#c85050'; ctx.lineWidth = 2;
    roundRect(fx, fy, fw, fh, 6); ctx.stroke();

    ctx.font         = `${Math.min(previewItem.w, previewItem.h) * 20}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha  = 0.7;
    ctx.fillText(previewItem.emoji, fx + fw / 2, fy + fh / 2);
    ctx.globalAlpha = 1;
  }
}
