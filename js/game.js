// ═══════════════════════════════════════════════
// GAME — constants, state, shop, room, furniture, player
// ═══════════════════════════════════════════════
const TILE=40, ROOM_W=18, ROOM_H=15, PLAYER_SPEED=3;

const SHOP_ITEMS = [
  { id:'tv',       name:'TV',            cost:25,  w:1, h:1, color:'#8B6B9E' },
  { id:'toilet',   name:'toilet',        cost:30,  w:1,   h:2, color:'#8B6B9E' },
  { id:'sofa',     name:'Sofa',          cost:25,  w:3,   h:1.5, color:'#6B8B6B' },
  { id:'sink',     name:'Sink',          cost:15,  w:1.5, h:1.5, color:'#C4A44A' },
  { id:'shelf',    name:'Shelf',         cost:25,  w:2,   h:3, color:'#5A8B5A' },
  { id:'plant',    name:'Plant',         cost:10,  w:0.5,   h:1, color:'#9E5A5A' },
  { id:'piano',    name:'Piano',         cost:40,  w:2.5, h:2, color:'#9E8B6B' },
  { id:'lamp',     name:'Lamp',          cost:15,  w:1, h:1, color:'#8B7A5A' },
  { id:'fridge',   name:'Fridge',        cost:40,  w:1,   h:2, color:'#8BAABB' },
  { id:'dresser',  name:'Dresser',       cost:25,  w:1,   h:2, color:'#8BAABB' },
  { id:'dining',   name:'Dining',        cost:35,  w:2,   h:4, color:'#8BAABB' },
  { id:'coffee',   name:'Coffee',        cost:20,  w:1,   h:1, color:'#8BAABB' },
  { id:'chair',    name:'Chair',         cost:15,  w:1,   h:1, color:'#8BAABB' },
  { id:'bed',      name:'Bed',           cost:15,  w:1.5, h:2, color:'#8BAABB' },
  { id:'bathtub',  name:'Bathtub',       cost:35,  w:3,   h:2, color:'#8BAABB' },
  { id:'wall',     name:'Walls',         cost:1,  w:1,   h:1, color:'#363a3c' },
  
];

function getItem(id) { return SHOP_ITEMS.find(i=>i.id===id); }

const gameState = {
  coins:0, inventory:{}, placed:[],
  player:{x:5*TILE,y:5*TILE,dir:2},
  keys:{}, mode:'move', activeItem:null,
  selectedPlaced:null, tab:'shop',
  showGrid:true, placingPreview:{tx:0,ty:0},
  animFrame:0, walkAnim:0,
};

let canvas, ctx, gameDiv, offX=0, offY=0;

function computeOffset() {
  offX = Math.floor((canvas.width  - ROOM_W*TILE)/2);
  offY = Math.floor((canvas.height - ROOM_H*TILE)/2);
}
function resize() {
  canvas.width  = gameDiv.clientWidth;
  canvas.height = gameDiv.clientHeight;
  computeOffset();
}

// ── Shop UI ──
function switchTab(t) {
  gameState.tab=t;
  document.getElementById('shopTab').classList.toggle('active',t==='shop');
  document.getElementById('invTab').classList.toggle('active',t==='inv');
  renderGameUI();
}

function renderGameUI() {
  document.getElementById('coinDisplay').textContent = gameState.coins;
  const list = document.getElementById('itemList');
  list.innerHTML='';
  if (gameState.tab==='shop') {
    SHOP_ITEMS.forEach(itm=>{
      const canAfford = gameState.coins>=itm.cost;
      const card=document.createElement('div');
      card.className='item-card'+(canAfford?'':' disabled');
      // sprite thumb
      const thumb=document.createElement('div'); thumb.className='item-thumb';
      const spr=SPRITES[itm.id];
      if (spr&&spr.complete&&spr.naturalWidth>0) {
        const si=document.createElement('img'); si.src=spr.src; thumb.appendChild(si);
      } else {
        thumb.textContent=itm.emoji||'📦'; thumb.style.fontSize='22px';
      }
      const info=document.createElement('div'); info.className='item-info';
      info.innerHTML=`<div class="item-name">${itm.name}</div><div class="item-cost">🪙 ${itm.cost}</div>`;
      card.appendChild(thumb); card.appendChild(info);
      if (canAfford) {
        const btn=document.createElement('button'); btn.className='btn btn-buy'; btn.textContent='Buy';
        btn.onclick=e=>{e.stopPropagation();buyItem(itm.id);};
        card.appendChild(btn);
      }
      list.appendChild(card);
    });
  } else {
    const entries=Object.entries(gameState.inventory).filter(([,v])=>v>0);
    if (!entries.length) {
      list.innerHTML='<div style="color:#648f74;font-size:12px;text-align:center;padding:20px;">Your bag is empty!<br>Buy items from the shop.</div>';
    } else {
      entries.forEach(([id,count])=>{
        const itm=getItem(id);
        const isActive=gameState.activeItem===id&&gameState.mode==='place';
        const card=document.createElement('div');
        card.className='item-card'+(isActive?' selected':'');
        const thumb=document.createElement('div'); thumb.className='item-thumb';
        const spr=SPRITES[id];
        if (spr&&spr.complete&&spr.naturalWidth>0) {
          const si=document.createElement('img'); si.src=spr.src; thumb.appendChild(si);
        } else { thumb.textContent='📦'; thumb.style.fontSize='22px'; }
        const info=document.createElement('div'); info.className='item-info';
        info.innerHTML=`<div class="item-name">${itm.name}</div><div class="item-count">x${count}</div>`;
        const btn=document.createElement('button'); btn.className='btn btn-place';
        btn.textContent=isActive?'✓ Placing…':'Place';
        btn.onclick=e=>{e.stopPropagation();startPlace(id);};
        card.appendChild(thumb); card.appendChild(info); card.appendChild(btn);
        list.appendChild(card);
      });
    }
  }
}

function buyItem(id) {
  const itm=getItem(id);
  if (gameState.coins<itm.cost) return;
  gameState.coins-=itm.cost;
  gameState.inventory[id]=(gameState.inventory[id]||0)+1;
  SharedBells.set(gameState.coins);
  setStatus(`Bought ${itm.name}! Go to your bag to place it.`);
  renderGameUI();
}
function startPlace(id) {
  if (gameState.activeItem===id&&gameState.mode==='place') {
    gameState.mode='move'; gameState.activeItem=null;
  } else {
    gameState.mode='place'; gameState.activeItem=id; gameState.selectedPlaced=null;
    setStatus(`Click the room to place ${getItem(id).name}. Click again to cancel.`);
  }
  renderGameUI();
}
function removePlaced(idx) {
  const p=gameState.placed[idx];
  gameState.inventory[p.id]=(gameState.inventory[p.id]||0)+1;
  gameState.placed.splice(idx,1);
  gameState.selectedPlaced=null;
  setStatus(`Returned ${getItem(p.id).name} to bag.`);
  renderGameUI();
}

// ── Room ──
function drawRoom() {
  const W=canvas.width, H=canvas.height, rw=ROOM_W*TILE, rh=ROOM_H*TILE;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#eef7f1'; ctx.fillRect(0,0,W,H);
  for (let x=0;x<ROOM_W;x++) for (let y=0;y<ROOM_H;y++) {
    ctx.fillStyle=(x+y)%2===0?'#d4b87a':'#c8a860';
    ctx.fillRect(offX+x*TILE+1,offY+y*TILE+1,TILE-1,TILE-1);
  }
  if (gameState.showGrid) {
    ctx.strokeStyle='rgba(0,0,0,0.09)'; ctx.lineWidth=0.5;
    for (let x=0;x<=ROOM_W;x++) { ctx.beginPath();ctx.moveTo(offX+x*TILE,offY);ctx.lineTo(offX+x*TILE,offY+rh);ctx.stroke(); }
    for (let y=0;y<=ROOM_H;y++) { ctx.beginPath();ctx.moveTo(offX,offY+y*TILE);ctx.lineTo(offX+rw,offY+y*TILE);ctx.stroke(); }
  }
  ctx.strokeStyle='#8B6B3A'; ctx.lineWidth=3; ctx.strokeRect(offX,offY,rw,rh);
  ctx.fillStyle='#8B5A3A'; ctx.fillRect(offX+13*TILE,offY+rh-TILE-2,TILE*1.5,TILE+2);
  ctx.strokeStyle='#5A3A1A'; ctx.lineWidth=2; ctx.strokeRect(offX+13*TILE,offY+rh-TILE-2,TILE*1.5,TILE+2);
  ctx.fillStyle='#d4a060'; ctx.beginPath(); ctx.arc(offX+14.2*TILE,offY+rh-TILE/2,4,0,Math.PI*2); ctx.fill();
}

// ── Furniture ──
function roundRect(x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function drawSprite(id,fx,fy,fw,fh,alpha) {
  const img=SPRITES[id];
  ctx.globalAlpha=alpha??1;
  if (img&&img.complete&&img.naturalWidth>0) {
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,fx,fy,fw,fh);
  } else {
    const itm=getItem(id);
    ctx.fillStyle=itm.color; roundRect(fx,fy,fw,fh,6); ctx.fill();
    ctx.font=`${Math.min(itm.w,itm.h)*20}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle='white'; ctx.fillText(itm.name[0],fx+fw/2,fy+fh/2);
  }
  ctx.globalAlpha=1;
}

function isBlocked(px,py) {
  const s=22;
  for (const p of gameState.placed) {
    const itm=getItem(p.id), fx=p.tx*TILE, fy=p.ty*TILE;
    if (px+s>fx+2&&px-s<fx+itm.w*TILE-2&&py+s>fy+2&&py-s<fy+itm.h*TILE-2) return true;
  }
  return false;
}
function canPlace(tx,ty,itm,skipIdx) {
  if (tx<0||ty<0||tx+itm.w>ROOM_W||ty+itm.h>ROOM_H) return false;
  for (let i=0;i<gameState.placed.length;i++) {
    if (i===skipIdx) continue;
    const p=gameState.placed[i],pi=getItem(p.id);
    if (tx<p.tx+pi.w&&tx+itm.w>p.tx&&ty<p.ty+pi.h&&ty+itm.h>p.ty) return false;
  }
  return true;
}
function tileFromMouse(mx,my) {
  return {tx:Math.floor((mx-offX)/TILE),ty:Math.floor((my-offY)/TILE)};
}

function drawFurniture() {
  const previewItem=(gameState.mode==='place'&&gameState.activeItem)?getItem(gameState.activeItem):null;
  const {tx:ptx,ty:pty}=gameState.placingPreview;
  for (let i=0;i<gameState.placed.length;i++) {
    const p=gameState.placed[i], itm=getItem(p.id);
    const fx=offX+p.tx*TILE, fy=offY+p.ty*TILE, fw=itm.w*TILE, fh=itm.h*TILE;
    ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(fx+3,fy+4,fw,fh);
    drawSprite(p.id,fx,fy,fw,fh,1);
    if (gameState.selectedPlaced===i) {
      ctx.strokeStyle='#c28b00'; ctx.lineWidth=2.5;
      roundRect(fx-1,fy-1,fw+2,fh+2,7); ctx.stroke();
    }
  }
  if (previewItem) {
    const ok=canPlace(ptx,pty,previewItem,-1);
    const fx=offX+ptx*TILE, fy=offY+pty*TILE, fw=previewItem.w*TILE, fh=previewItem.h*TILE;
    drawSprite(previewItem.id,fx,fy,fw,fh,0.6);
    ctx.strokeStyle=ok?'#50c878':'#c85050'; ctx.lineWidth=2;
    roundRect(fx,fy,fw,fh,6); ctx.stroke();
  }
}

// ── Player ──
function update() {
  if (gameState.mode!=='move') return;
  let dx=0,dy=0;
  if (gameState.keys['ArrowLeft'] ||gameState.keys['a']||gameState.keys['A']){dx=-PLAYER_SPEED;gameState.player.dir=3;}
  if (gameState.keys['ArrowRight']||gameState.keys['d']||gameState.keys['D']){dx= PLAYER_SPEED;gameState.player.dir=1;}
  if (gameState.keys['ArrowUp']   ||gameState.keys['w']||gameState.keys['W']){dy=-PLAYER_SPEED;gameState.player.dir=0;}
  if (gameState.keys['ArrowDown'] ||gameState.keys['s']||gameState.keys['S']){dy= PLAYER_SPEED;gameState.player.dir=2;}
  if (dx||dy) gameState.walkAnim++;
  const nx=Math.max(12,Math.min(ROOM_W*TILE-12,gameState.player.x+dx));
  const ny=Math.max(12,Math.min(ROOM_H*TILE-12,gameState.player.y+dy));
  if (dx&&!isBlocked(nx,gameState.player.y)) gameState.player.x=nx;
  if (dy&&!isBlocked(gameState.player.x,ny)) gameState.player.y=ny;
}

function drawPlayer() {
  const px=offX+gameState.player.x, py=offY+gameState.player.y;
  const walk=Math.sin(gameState.walkAnim*0.3)*2;
  ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(px,py+14,10,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff9eb5'; roundRect(px-10,py-18+walk,20,24,8); ctx.fill();
  ctx.fillStyle='#ffd0a0'; ctx.beginPath(); ctx.arc(px,py-22+walk,12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#6a3a1a'; ctx.beginPath(); ctx.ellipse(px,py-31+walk,11,7,0,Math.PI,Math.PI*2); ctx.fill();
  if (gameState.player.dir!==0) {
    const eo=gameState.player.dir===3?-3:gameState.player.dir===1?3:0;
    ctx.fillStyle='#4a2a1a';
    ctx.beginPath(); ctx.arc(px+eo-3,py-23+walk,2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+eo+3,py-23+walk,2,0,Math.PI*2); ctx.fill();
  }
  const ls=Math.sin(gameState.walkAnim*0.3)*5;
  ctx.fillStyle='#6a5a9a';
  ctx.fillRect(px-8,py+5+walk,7,10+ls);
  ctx.fillRect(px+1,py+5+walk,7,10-ls);
}

// ── Save/Load/Grid/Status ──
function toggleGrid() {
  gameState.showGrid=!gameState.showGrid;
  document.getElementById('gridBtn').classList.toggle('active',gameState.showGrid);
}
function saveRoom() {
  localStorage.setItem('cozyRoom',JSON.stringify({placed:gameState.placed,inventory:gameState.inventory,coins:gameState.coins}));
  setStatus('Room saved! 💾');
}
function loadRoom() {
  const raw=localStorage.getItem('cozyRoom');
  if (!raw) { setStatus('No saved room found.'); return; }
  const data=JSON.parse(raw);
  gameState.placed=data.placed||[]; gameState.inventory=data.inventory||{};
  gameState.coins=Math.max(data.coins||0,SharedBells.get());
  SharedBells.set(gameState.coins); setStatus('Room loaded! 📂'); renderGameUI();
}
let statusTimer;
function setStatus(msg) {
  document.getElementById('statusBar').textContent=msg;
  clearTimeout(statusTimer);
  statusTimer=setTimeout(()=>document.getElementById('statusBar').textContent='Move with WASD • Buy in Shop • Place from Bag',3000);
}

// ── Render loop ──
function render() {
  gameState.animFrame++;
  update(); drawRoom(); drawFurniture(); drawPlayer();
  requestAnimationFrame(render);
}

// ── Boot ──
window.addEventListener('load',()=>{
  canvas=document.getElementById('gameCanvas');
  ctx=canvas.getContext('2d');
  gameDiv=document.getElementById('gameArea');

  // Measure real size even while hidden
  const sg=document.getElementById('screen-game');
  sg.style.display='flex'; sg.style.visibility='hidden';
  resize();
  sg.style.display=''; sg.style.visibility='';

  window.addEventListener('resize',()=>{
    if (document.getElementById('screen-game').classList.contains('visible')) resize();
  });

  gameState.coins=SharedBells.get();
  renderGameUI();
  render();
});

// ── Input ──
window.addEventListener('keydown',e=>{
  gameState.keys[e.key]=true;
  if ((e.key==='Delete'||e.key==='Backspace')&&gameState.selectedPlaced!==null) {
    e.preventDefault(); removePlaced(gameState.selectedPlaced);
  }
  if (e.key==='Escape') {
    gameState.mode='move'; gameState.activeItem=null; gameState.selectedPlaced=null; renderGameUI();
  }
});
window.addEventListener('keyup',e=>{ gameState.keys[e.key]=false; });

document.addEventListener('mousemove',e=>{
  if (!gameDiv||!document.getElementById('screen-game').classList.contains('visible')) return;
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  gameState.placingPreview=tileFromMouse(mx,my);
});

document.addEventListener('click',e=>{
  if (!gameDiv||!document.getElementById('screen-game').classList.contains('visible')) return;
  const rect=canvas.getBoundingClientRect();
  if (e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom) return;
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const {tx,ty}=tileFromMouse(mx,my);

  if (gameState.mode==='place'&&gameState.activeItem) {
    const itm=getItem(gameState.activeItem);
    if (canPlace(tx,ty,itm,-1)) {
      gameState.placed.push({id:gameState.activeItem,tx,ty});
      gameState.inventory[gameState.activeItem]--;
      if (!gameState.inventory[gameState.activeItem]) { gameState.mode='move'; gameState.activeItem=null; }
      setStatus(`Placed ${itm.name}! Click it to select.`);
      renderGameUI();
    } else { setStatus('Cannot place there — occupied or out of bounds.'); }
    return;
  }

  let found=-1;
  for (let i=gameState.placed.length-1;i>=0;i--) {
    const p=gameState.placed[i], itm=getItem(p.id);
    const fx=offX+p.tx*TILE, fy=offY+p.ty*TILE;
    if (mx>=fx&&mx<=fx+itm.w*TILE&&my>=fy&&my<=fy+itm.h*TILE) { found=i; break; }
  }
  gameState.selectedPlaced=(found>=0&&gameState.selectedPlaced!==found)?found:null;
  if (found>=0&&gameState.selectedPlaced===found)
    setStatus(`Selected ${getItem(gameState.placed[found].id).name}. Press Delete to remove.`);
  renderGameUI();
});