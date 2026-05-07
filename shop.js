// ════════════════════════════════════════════════════════════════
// shop.js — Item catalogue and shop / inventory sidebar UI
// Depends on: shared.js, game.js (gameState)
// ════════════════════════════════════════════════════════════════

const SHOP_ITEMS = [
  { id:'bed',    name:'Bed',       emoji:'🛏️', cost:80,  w:2, h:2, color:'#8B6B9E' },
  { id:'desk',   name:'Desk',      emoji:'🖥️', cost:60,  w:2, h:1, color:'#6B8B6B' },
  { id:'sofa',   name:'Sofa',      emoji:'🛋️', cost:90,  w:3, h:1, color:'#9E8B6B' },
  { id:'plant',  name:'Plant',     emoji:'🪴', cost:30,  w:1, h:1, color:'#5A8B5A' },
  { id:'lamp',   name:'Lamp',      emoji:'🪔', cost:25,  w:1, h:1, color:'#C4A44A' },
  { id:'tv',     name:'TV',        emoji:'📺', cost:70,  w:2, h:1, color:'#4A6B8B' },
  { id:'shelf',  name:'Bookshelf', emoji:'📚', cost:45,  w:1, h:2, color:'#8B7A5A' },
  { id:'piano',  name:'Piano',     emoji:'🎹', cost:150, w:2, h:1, color:'#3A3A4A' },
  { id:'rug',    name:'Rug',       emoji:'🪆', cost:40,  w:3, h:2, color:'#9E5A5A' },
  { id:'mirror', name:'Mirror',    emoji:'🪞', cost:35,  w:1, h:2, color:'#8BAABB' },
  { id:'cat',    name:'Cat Bed',   emoji:'🐱', cost:50,  w:1, h:1, color:'#BB8A6A' },
  { id:'flower', name:'Flowers',   emoji:'💐', cost:20,  w:1, h:1, color:'#BB6A9A' },
];

function getItem(id) { return SHOP_ITEMS.find(i => i.id === id); }

// ── Tab switching ─────────────────────────────────────────────

function switchTab(t) {
  gameState.tab = t;
  document.getElementById('shopTab').classList.toggle('active', t === 'shop');
  document.getElementById('invTab').classList.toggle('active', t === 'inv');
  renderGameUI();
}

// ── UI rendering ──────────────────────────────────────────────

function renderGameUI() {
  document.getElementById('coinDisplay').textContent = gameState.coins;
  const list = document.getElementById('itemList');
  list.innerHTML = '';

  if (gameState.tab === 'shop') {
    SHOP_ITEMS.forEach(itm => {
      const canAfford = gameState.coins >= itm.cost;
      const card = document.createElement('div');
      card.className = 'item-card' + (canAfford ? '' : ' disabled');
      card.innerHTML = `
        <div class="item-emoji">${itm.emoji}</div>
        <div class="item-info">
          <div class="item-name">${itm.name}</div>
          <div class="item-cost">🪙 ${itm.cost}</div>
        </div>`;
      if (canAfford) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-buy';
        btn.textContent = 'Buy';
        btn.onclick = e => { e.stopPropagation(); buyItem(itm.id); };
        card.appendChild(btn);
      }
      list.appendChild(card);
    });

  } else {
    const entries = Object.entries(gameState.inventory).filter(([, v]) => v > 0);
    if (!entries.length) {
      list.innerHTML = '<div style="color:#648f74;font-size:12px;text-align:center;padding:20px;">Your bag is empty!<br>Buy items from the shop.</div>';
    } else {
      entries.forEach(([id, count]) => {
        const itm    = getItem(id);
        const isActive = gameState.activeItem === id && gameState.mode === 'place';
        const card   = document.createElement('div');
        card.className = 'item-card' + (isActive ? ' selected' : '');
        card.innerHTML = `
          <div class="item-emoji">${itm.emoji}</div>
          <div class="item-info">
            <div class="item-name">${itm.name}</div>
            <div class="item-count">x${count}</div>
          </div>`;
        const btn = document.createElement('button');
        btn.className = 'btn btn-place';
        btn.textContent = isActive ? '✓ Placing…' : 'Place';
        btn.onclick = e => { e.stopPropagation(); startPlace(id); };
        card.appendChild(btn);
        list.appendChild(card);
      });
    }
  }
}

// ── Buy / Place / Remove ──────────────────────────────────────

function buyItem(id) {
  const itm = getItem(id);
  if (gameState.coins < itm.cost) return;
  gameState.coins -= itm.cost;
  gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
  SharedBells.set(gameState.coins);
  setGameStatus(`Bought ${itm.name}! Go to your bag to place it.`);
  renderGameUI();
}

function startPlace(id) {
  if (gameState.activeItem === id && gameState.mode === 'place') {
    gameState.mode = 'move'; gameState.activeItem = null;
  } else {
    gameState.mode = 'place'; gameState.activeItem = id; gameState.selectedPlaced = null;
    setGameStatus(`Click the room to place ${getItem(id).name}. Click bag item again to cancel.`);
  }
  renderGameUI();
}

function removePlaced(idx) {
  const p = gameState.placed[idx];
  gameState.inventory[p.id] = (gameState.inventory[p.id] || 0) + 1;
  gameState.placed.splice(idx, 1);
  gameState.selectedPlaced = null;
  setGameStatus(`Returned ${getItem(p.id).name} to bag.`);
  renderGameUI();
}
