// ════════════════════════════════════════════════════════════════
// shared.js — SharedBells bridge (cleaner ↔ game) + screen switcher
// Must be loaded first: every other script depends on SharedBells.
// ════════════════════════════════════════════════════════════════

const SharedBells = {
  _bells: 0,
  _listeners: [],

  get() { return this._bells; },

  add(n) {
    this._bells += n;
    this._listeners.forEach(fn => fn(this._bells));
    document.getElementById('coinDisplay').textContent = this._bells;
    if (typeof gameState !== 'undefined') {
      gameState.coins = this._bells;
      if (typeof renderGameUI === 'function') renderGameUI();
    }
    showBellsToast('+' + n + ' 🪙 bells earned!');
  },

  set(n) {
    this._bells = n;
    this._listeners.forEach(fn => fn(this._bells));
    document.getElementById('coinDisplay').textContent = this._bells;
  },

  syncFromGame() {
    if (typeof gameState !== 'undefined') {
      this._bells = gameState.coins;
      document.getElementById('coinDisplay').textContent = this._bells;
    }
  },

  onUpdate(fn) { this._listeners.push(fn); }
};

function showBellsToast(msg) {
  const el = document.createElement('div');
  el.className = 'bells-earned-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ════════════════════════════════════════════════════════════════
// Screen switcher — toggles between Clean and Decorate views
// ════════════════════════════════════════════════════════════════

function switchScreen(name) {
  document.getElementById('screen-cleaner').classList.toggle('visible', name === 'cleaner');
  document.getElementById('screen-game').classList.toggle('visible', name === 'game');
  document.getElementById('tab-cleaner').classList.toggle('active', name === 'cleaner');
  document.getElementById('tab-game').classList.toggle('active', name === 'game');

  const globalBells = document.getElementById('globalBells');
  if (globalBells) {
    globalBells.style.display = name === 'game' ? 'flex' : 'none';
  }

  if (name === 'game') {
    if (typeof gameState !== 'undefined') {
      gameState.coins = SharedBells.get();
      if (typeof renderGameUI === 'function') renderGameUI();
    }
    setTimeout(() => { if (typeof resize === 'function') resize(); }, 50);
  }
}
