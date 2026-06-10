// ═══════════════════════════════════════════════════════════════════════════
//  JUNGLE ADVENTURE – single bundle
//  world.js → player.js → achievements.js → game.js (merged)
// ═══════════════════════════════════════════════════════════════════════════

// ─── WORLD ──────────────────────────────────────────────────────────────────

const TILE = 64;
const T = { GRASS:0, WATER:1, PATH:2, FLOWER:3, BUSH:4 };

const TILE_COLORS = {
  [T.GRASS]:  ['#4caf50','#43a047','#66bb6a'],
  [T.WATER]:  ['#29b6f6','#0288d1','#4fc3f7'],
  [T.PATH]:   ['#d4a574','#c8955a','#ddb882'],
  [T.FLOWER]: ['#4caf50','#43a047','#66bb6a'],
  [T.BUSH]:   ['#2e7d32','#1b5e20','#388e3c'],
};

const MAP_ROWS = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,2,0,0,0,0,0,0,0,4],
  [4,0,3,0,2,0,0,3,0,0,3,0,4],
  [4,0,0,0,2,2,2,2,2,0,0,0,4],
  [4,0,0,0,0,0,0,0,2,0,3,0,4],
  [4,0,3,1,1,1,0,0,2,0,0,0,4],
  [4,0,0,1,0,1,0,0,2,2,2,0,4],
  [4,0,0,0,0,0,0,0,0,0,2,0,4],
  [4,0,3,0,0,0,3,0,0,0,2,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4],
];

const TILE_DECO = {
  [T.FLOWER]: ['🌸','🌼','🌺','🌻'],
  [T.BUSH]:   ['🌿','🍃','🌱'],
  [T.WATER]:  ['💧','🐸','🦆'],
};

const NPC_DEFS = [
  { x:3, y:5, emoji:'🐘', name:'Ellie',   greeting:'Trumpets hello! 🎺',    dialogue:['Hello friend!','I love eating leaves!','Let\'s be friends! 🌿'] },
  { x:9, y:2, emoji:'🦜', name:'Polly',   greeting:'Squawk! Welcome!',      dialogue:['Polly wants a cracker!','Colors are beautiful!','Can you see rainbows? 🌈'] },
  { x:7, y:7, emoji:'🐒', name:'Coco',    greeting:'Ooh ooh! Hi there!',    dialogue:['I love bananas! 🍌','Can you climb trees?','Wheee! Life is fun!'] },
  { x:2, y:4, emoji:'🦋', name:'Flutter', greeting:'Flutters her wings! 🦋', dialogue:['I used to be a caterpillar!','Flying feels like magic!','I love flowers! 🌸'] },
  { x:11,y:6, emoji:'🐢', name:'Sheldon', greeting:'Slow and steady wins!',  dialogue:['Patience is a superpower!','My shell keeps me safe!','Nice and slow is okay! 🐢'] },
];

function buildCollectibles() {
  const stars = [
    {x:2,y:2},{x:6,y:2},{x:10,y:2},
    {x:5,y:3},{x:8,y:4},{x:10,y:4},
    {x:6,y:5},{x:8,y:6},{x:9,y:6},
    {x:2,y:7},{x:6,y:8},{x:10,y:7},
  ];
  const fruits = [
    {x:1,y:1},{x:11,y:1},{x:1,y:8},{x:11,y:8},
  ];
  return {
    stars:  stars.map(s  => ({ ...s,  collected: false, bobOffset: Math.random()*Math.PI*2 })),
    fruits: fruits.map((f,i) => ({ ...f, collected: false, emoji: ['🍎','🍌','🍓','🍊'][i%4], bobOffset: Math.random()*Math.PI*2 })),
  };
}

let worldState = {
  collectibles: null,
  npcs: [],
  animFrame: 0,
  level: 1,
  activeNPC: null,
  dialogueLine: 0,
};

function initWorld(level) {
  worldState.level = level;
  worldState.collectibles = buildCollectibles();
  worldState.animFrame = 0;
  worldState.npcs = NPC_DEFS.map(n => ({ ...n, faceRight: true, wobble: 0, talked: false }));
  worldState.activeNPC = null;
  worldState.dialogueLine = 0;
}

function tileAt(col, row) {
  if (row < 0 || row >= MAP_ROWS.length || col < 0 || col >= MAP_ROWS[0].length) return T.BUSH;
  return MAP_ROWS[row][col];
}

function isWalkable(col, row) {
  const t = tileAt(col, row);
  return t !== T.WATER && t !== T.BUSH;
}

function isWalkablePx(px, py) {
  return isWalkable(Math.floor(px / TILE), Math.floor(py / TILE));
}

function tileRng(col, row, seed) {
  let h = (col * 374761393 + row * 668265263 + seed * 2246822519) >>> 0;
  h ^= h >> 13; h = Math.imul(h, 1540483477) >>> 0; h ^= h >> 15;
  return (h >>> 0) / 0xffffffff;
}

function drawWorld(ctx, camX, camY, t) {
  worldState.animFrame = t;
  const cols = MAP_ROWS[0].length;
  const rows = MAP_ROWS.length;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = tileAt(col, row);
      const px = col * TILE - camX;
      const py = row * TILE - camY;

      const idx = Math.floor(tileRng(col, row, 1) * TILE_COLORS[tile].length);
      ctx.fillStyle = TILE_COLORS[tile][idx];
      ctx.fillRect(px, py, TILE, TILE);

      if (tile === T.PATH) {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE, TILE);
      }

      if (tile === T.WATER) {
        const wave = Math.sin(t * 0.04 + col * 0.8 + row) * 0.12 + 0.12;
        ctx.fillStyle = `rgba(255,255,255,${wave})`;
        ctx.fillRect(px + 4, py + TILE * 0.4, TILE - 8, 6);
        ctx.fillStyle = `rgba(255,255,255,${wave * 0.7})`;
        ctx.fillRect(px + 12, py + TILE * 0.65, TILE - 24, 4);
      }

      const decos = TILE_DECO[tile];
      if (decos && tileRng(col, row, 7) > 0.45) {
        const di = Math.floor(tileRng(col, row, 3) * decos.length);
        const scale = 0.65 + tileRng(col, row, 5) * 0.3;
        ctx.font = `${Math.round(TILE * scale * 0.55)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(decos[di],
          px + TILE * (0.25 + tileRng(col, row, 9) * 0.5),
          py + TILE * (0.25 + tileRng(col, row, 11) * 0.5));
      }
    }
  }

  // Stars
  worldState.collectibles.stars.forEach(s => {
    if (s.collected) return;
    const bob = Math.sin(t * 0.07 + s.bobOffset) * 5;
    const sx = s.x * TILE - camX + TILE / 2;
    const sy = s.y * TILE - camY + TILE / 2 + bob;
    const grd = ctx.createRadialGradient(sx, sy, 2, sx, sy, 22);
    grd.addColorStop(0, 'rgba(255,230,0,0.6)');
    grd.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.font = '28px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⭐', sx, sy);
  });

  // Fruits
  worldState.collectibles.fruits.forEach(f => {
    if (f.collected) return;
    const bob = Math.sin(t * 0.05 + f.bobOffset) * 4;
    const fx = f.x * TILE - camX + TILE / 2;
    const fy = f.y * TILE - camY + TILE / 2 + bob;
    const grd = ctx.createRadialGradient(fx, fy, 2, fx, fy, 20);
    grd.addColorStop(0, 'rgba(255,140,0,0.5)');
    grd.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(fx, fy, 20, 0, Math.PI * 2); ctx.fill();
    ctx.font = '28px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji, fx, fy);
  });

  // NPCs
  worldState.npcs.forEach(npc => {
    const nx = npc.x * TILE - camX + TILE / 2;
    const ny = npc.y * TILE - camY + TILE / 2;
    const wobble = Math.sin(t * 0.06 + npc.x) * 3;
    ctx.save();
    ctx.translate(nx, ny + wobble);
    if (!npc.faceRight) ctx.scale(-1, 1);
    ctx.font = `${TILE * 0.7}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(npc.emoji, 0, 0);
    ctx.restore();

    if (!npc.talked) {
      const pulse = 1 + Math.sin(t * 0.12) * 0.18;
      ctx.save();
      ctx.translate(nx, ny - TILE * 0.65);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 18px Nunito, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('!', 0, 0);
      ctx.restore();
    }
  });

  if (worldState.activeNPC) {
    const npc = worldState.activeNPC;
    const nx = npc.x * TILE - camX + TILE / 2;
    const ny = npc.y * TILE - camY;
    const line = npc.dialogue[worldState.dialogueLine % npc.dialogue.length];
    drawDialogueBubble(ctx, nx, ny - 10, `${npc.name}: ${line}`);
  }
}

function drawDialogueBubble(ctx, x, y, text) {
  const padding = 14;
  ctx.font = 'bold 15px Nunito, sans-serif';
  const tw = ctx.measureText(text).width;
  const bw = Math.min(tw + padding * 2, 280);
  const bh = 46;
  const bx = Math.max(8, Math.min(x - bw / 2, ctx.canvas.width - bw - 8));
  const by = y - bh - 14;

  ctx.fillStyle = 'rgba(255,255,240,0.97)';
  ctx.strokeStyle = '#5aad2c';
  ctx.lineWidth = 3;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,240,0.97)';
  ctx.beginPath();
  ctx.moveTo(x - 8, by + bh);
  ctx.lineTo(x + 8, by + bh);
  ctx.lineTo(x, by + bh + 12);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#1a3a08';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px Nunito, sans-serif';
  wrapText(ctx, text, bx + bw / 2, by + bh / 2, bw - padding * 2, 18);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, cx, cy, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  words.forEach(w => {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else { line = test; }
  });
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
}

function checkCollect(playerX, playerY) {
  const radius = TILE * 0.7;
  const result = { star: false, fruit: null };
  worldState.collectibles.stars.forEach(s => {
    if (s.collected) return;
    if (Math.hypot(playerX - (s.x * TILE + TILE/2), playerY - (s.y * TILE + TILE/2)) < radius) {
      s.collected = true; result.star = true;
    }
  });
  worldState.collectibles.fruits.forEach(f => {
    if (f.collected) return;
    if (Math.hypot(playerX - (f.x * TILE + TILE/2), playerY - (f.y * TILE + TILE/2)) < radius) {
      f.collected = true; result.fruit = f.emoji;
    }
  });
  return result;
}

function checkNPCInteraction(playerX, playerY) {
  const radius = TILE * 1.1;
  for (const npc of worldState.npcs) {
    if (Math.hypot(playerX - (npc.x*TILE+TILE/2), playerY - (npc.y*TILE+TILE/2)) < radius) return npc;
  }
  return null;
}

function interactNPC(npc) {
  if (worldState.activeNPC === npc) {
    worldState.dialogueLine = (worldState.dialogueLine + 1) % npc.dialogue.length;
    if (worldState.dialogueLine === 0) { worldState.activeNPC = null; npc.talked = true; }
  } else {
    worldState.activeNPC = npc;
    worldState.dialogueLine = 0;
    npc.talked = true;
  }
  return npc.dialogue[worldState.dialogueLine % npc.dialogue.length];
}

function dismissDialogue()      { worldState.activeNPC = null; }
function allStarsCollected()    { return worldState.collectibles.stars.every(s => s.collected); }
function starsRemaining()       { return worldState.collectibles.stars.filter(s => !s.collected).length; }
function countCollectedStars()  { return worldState.collectibles.stars.filter(s => s.collected).length; }
function getWorldSize()         { return { width: MAP_ROWS[0].length * TILE, height: MAP_ROWS.length * TILE }; }


// ─── PLAYER ─────────────────────────────────────────────────────────────────

const PLAYER_SPEED  = 3.2;
const PLAYER_RADIUS = 20;
const PLAYER_SKINS  = ['🧒','👧','🤖','👾'];

// FIX: use plain numbers, not TILE (which is defined above but safer to be explicit)
const player = {
  x: 4 * 64 + 32,
  y: 4 * 64 + 32,
  vx: 0, vy: 0,
  faceRight: true,
  animStep: 0, animTimer: 0,
  moving: false,
  bouncing: false, bounceTimer: 0,
  emoji: '🧒', skin: 0,
};

const keys = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  w: false, a: false, s: false, d: false,
  W: false, A: false, S: false, D: false,
  ' ': false,
  touchDx: 0, touchDy: 0,
};

let spaceJustPressed = false;
let inputSetup = false;

function setupPlayerInput() {
  if (inputSetup) return;
  inputSetup = true;

  document.addEventListener('keydown', e => {
    if (e.key in keys) keys[e.key] = true;
    if (e.key === ' ') spaceJustPressed = true;
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  });
  document.addEventListener('keyup', e => {
    if (e.key in keys) keys[e.key] = false;
  });
  setupVirtualDPad();
}

function setupVirtualDPad() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  let touchId = null, touchStartX = 0, touchStartY = 0;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    touchStartX = touch.clientX; touchStartY = touch.clientY;
    keys.touchDx = 0; keys.touchDy = 0;
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier !== touchId) continue;
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const mag = Math.hypot(dx, dy);
      if (mag > 12) { keys.touchDx = dx/mag; keys.touchDy = dy/mag; }
      else          { keys.touchDx = 0;       keys.touchDy = 0; }
      if (mag < 8) spaceJustPressed = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchId) { keys.touchDx = 0; keys.touchDy = 0; touchId = null; }
    }
  }, { passive: false });
}

function updatePlayer() {
  const up    = keys.ArrowUp    || keys.w || keys.W || keys.touchDy < -0.4;
  const down  = keys.ArrowDown  || keys.s || keys.S || keys.touchDy >  0.4;
  const left  = keys.ArrowLeft  || keys.a || keys.A || keys.touchDx < -0.4;
  const right = keys.ArrowRight || keys.d || keys.D || keys.touchDx >  0.4;

  let dx = 0, dy = 0;
  if (up)    dy -= 1;
  if (down)  dy += 1;
  if (left)  dx -= 1;
  if (right) dx += 1;
  if (keys.touchDx !== 0 || keys.touchDy !== 0) { dx = keys.touchDx; dy = keys.touchDy; }

  const mag = Math.hypot(dx, dy);
  if (mag > 0) { dx = (dx/mag)*PLAYER_SPEED; dy = (dy/mag)*PLAYER_SPEED; }

  player.moving = mag > 0;
  if (dx >  0.1) player.faceRight = true;
  if (dx < -0.1) player.faceRight = false;

  const nx = player.x + dx;
  if (isWalkablePx(nx - PLAYER_RADIUS + 2, player.y) &&
      isWalkablePx(nx + PLAYER_RADIUS - 2, player.y)) player.x = nx;

  const ny = player.y + dy;
  if (isWalkablePx(player.x, ny - PLAYER_RADIUS + 2) &&
      isWalkablePx(player.x, ny + PLAYER_RADIUS - 2)) player.y = ny;

  const ws = getWorldSize();
  player.x = Math.max(PLAYER_RADIUS, Math.min(ws.width  - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(ws.height - PLAYER_RADIUS, player.y));

  if (player.moving) {
    player.animTimer++;
    if (player.animTimer >= 8) { player.animTimer = 0; player.animStep = (player.animStep+1)%4; }
  } else {
    player.animStep = 0;
  }

  if (player.bouncing) { player.bounceTimer--; if (player.bounceTimer <= 0) player.bouncing = false; }
}

function triggerBounce() { player.bouncing = true; player.bounceTimer = 18; }

function drawPlayer(ctx, camX, camY) {
  const sx = player.x - camX;
  const sy = player.y - camY;

  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(sx, sy+18, 16, 7, 0, 0, Math.PI*2); ctx.fill();

  const bob  = player.moving   ? Math.sin(player.animStep/4*Math.PI*2)*4 : 0;
  const jump = player.bouncing ? -Math.sin((1-player.bounceTimer/18)*Math.PI)*22 : 0;
  const drawY = sy + bob + jump;

  ctx.save();
  ctx.translate(sx, drawY);
  if (!player.faceRight) ctx.scale(-1, 1);
  ctx.font = '42px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(player.emoji, 0, 0);
  if (player.moving) {
    const swing = Math.sin(player.animStep/4*Math.PI*2)*14;
    ctx.font = '20px serif';
    ctx.fillText('👋', 22, 6+swing);
  }
  ctx.restore();

  ctx.font = 'bold 12px Nunito, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('You', sx, drawY - 28);
}

function consumeSpacePress() { const v = spaceJustPressed; spaceJustPressed = false; return v; }
function setPlayerSkin(idx)  { player.skin = idx % PLAYER_SKINS.length; player.emoji = PLAYER_SKINS[player.skin]; }
function resetPlayerPosition() { player.x = 4*TILE+TILE/2; player.y = 4*TILE+TILE/2; player.vx = 0; player.vy = 0; }


// ─── ACHIEVEMENTS ────────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id:'first_star',  icon:'⭐', name:'First Star!',          desc:'Collect your very first star',        unlocked:false },
  { id:'star5',       icon:'🌟', name:'Star Collector',       desc:'Collect 5 stars',                     unlocked:false },
  { id:'all_stars',   icon:'✨', name:'Star Master!',         desc:'Collect ALL stars in the jungle',     unlocked:false },
  { id:'first_fruit', icon:'🍎', name:'Yummy!',               desc:'Pick up your first piece of fruit',   unlocked:false },
  { id:'all_fruits',  icon:'🍓', name:'Fruit Basket',         desc:'Collect all the fruit in the jungle', unlocked:false },
  { id:'meet_ellie',  icon:'🐘', name:'Hello Ellie!',         desc:'Talk to Ellie the elephant',          unlocked:false },
  { id:'all_friends', icon:'🌈', name:'Friend of the Jungle', desc:'Talk to all the jungle animals',      unlocked:false },
  { id:'level2',      icon:'🏆', name:'Explorer!',            desc:'Complete Level 1 and reach Level 2',  unlocked:false },
  { id:'level3',      icon:'🎖️', name:'Jungle Master',        desc:'Complete Level 2 and reach Level 3',  unlocked:false },
  { id:'speedy',      icon:'⚡', name:'Quick Explorer',       desc:'Collect 3 stars in under 30 seconds', unlocked:false },
];

// FIX: use a function instead of inline NPC_DEFS.length at object literal time
const achProgress = {
  starsCollected: 0,
  fruitsCollected: 0,
  npcsMet: new Set(),
  get totalNPCs() { return NPC_DEFS.length; },
  startTime: null,
  recentlyUnlocked: [],
};

function resetAchievementProgress() {
  achProgress.starsCollected = 0;
  achProgress.fruitsCollected = 0;
  achProgress.npcsMet = new Set();
  achProgress.startTime = Date.now();
  achProgress.recentlyUnlocked = [];
}

function tryUnlock(id) {
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if (ach && !ach.unlocked) { ach.unlocked = true; achProgress.recentlyUnlocked.push(ach); return ach; }
  return null;
}

function onStarCollected() {
  achProgress.starsCollected++;
  const u = [];
  if (achProgress.starsCollected >= 1) u.push(tryUnlock('first_star'));
  if (achProgress.starsCollected >= 5) u.push(tryUnlock('star5'));
  if (achProgress.starsCollected >= 3 && achProgress.startTime &&
      (Date.now() - achProgress.startTime) < 30000) u.push(tryUnlock('speedy'));
  return u.filter(Boolean);
}

function onAllStarsCollected()    { return [tryUnlock('all_stars')].filter(Boolean); }
function onFruitCollected() {
  achProgress.fruitsCollected++;
  const u = [];
  if (achProgress.fruitsCollected >= 1)                                       u.push(tryUnlock('first_fruit'));
  if (achProgress.fruitsCollected >= worldState.collectibles.fruits.length)   u.push(tryUnlock('all_fruits'));
  return u.filter(Boolean);
}

function onNPCTalked(npcName) {
  achProgress.npcsMet.add(npcName);
  const u = [];
  if (npcName === 'Ellie') u.push(tryUnlock('meet_ellie'));
  if (achProgress.npcsMet.size >= achProgress.totalNPCs) u.push(tryUnlock('all_friends'));
  return u.filter(Boolean);
}

function onLevelComplete(level) {
  const u = [];
  if (level >= 1) u.push(tryUnlock('level2'));
  if (level >= 2) u.push(tryUnlock('level3'));
  return u.filter(Boolean);
}

function countUnlocked() { return ACHIEVEMENTS.filter(a => a.unlocked).length; }

function renderAchievementsList() {
  const container = document.getElementById('achievementsList');
  if (!container) return;
  container.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const div = document.createElement('div');
    div.className = `achievement-item ${ach.unlocked ? 'unlocked' : 'locked'}`;
    div.innerHTML = `
      <div class="achievement-icon">${ach.icon}</div>
      <div class="achievement-info">
        <div class="achievement-name">${ach.name} ${ach.unlocked ? '✓' : '🔒'}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>`;
    container.appendChild(div);
  });
}

function closeAchievements() { showScreen('gameScreen'); }


// ─── GAME (orchestrator) ─────────────────────────────────────────────────────

let gameState = {
  running: false, paused: false,
  level: 1, stars: 0, frame: 0,
  animId: null, soundOn: true, musicOn: true,
};

let canvas, ctx;
let camX = 0, camY = 0;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function startGame() {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');
  gameState.level = 1; gameState.stars = 0;
  gameState.frame = 0; gameState.paused = false; gameState.running = true;
  updateStarsUI();
  initWorld(gameState.level);
  resetPlayerPosition();
  resetAchievementProgress();
  setupPlayerInput();
  setMessage(levelStartMessage());
  showScreen('gameScreen');
  playBGMusic();
  if (gameState.animId) cancelAnimationFrame(gameState.animId);
  gameState.animId = requestAnimationFrame(loop);
}

function loop() {
  if (!gameState.running) return;
  if (!gameState.paused) { gameState.frame++; update(); render(); }
  gameState.animId = requestAnimationFrame(loop);
}

function update() {
  updatePlayer();
  const ws = getWorldSize();
  camX = Math.max(0, Math.min(player.x - canvas.width/2,  ws.width  - canvas.width));
  camY = Math.max(0, Math.min(player.y - canvas.height/2, ws.height - canvas.height));

  const collected = checkCollect(player.x, player.y);
  if (collected.star) {
    gameState.stars++;
    updateStarsUI(); triggerBounce(); playSound('star'); spawnStarParticle();
    onStarCollected().forEach(showAchievementToast);
    if (allStarsCollected()) {
      onAllStarsCollected().forEach(showAchievementToast);
      setTimeout(() => levelComplete(), 500);
    } else {
      setMessage(starsRemainingMessage());
    }
  }

  if (collected.fruit) {
    gameState.stars += 2;
    updateStarsUI(); triggerBounce(); playSound('fruit'); spawnFruitParticle(collected.fruit);
    onFruitCollected().forEach(showAchievementToast);
    setMessage(`Yummy ${collected.fruit}! Bonus stars!`);
  }

  const nearNPC = checkNPCInteraction(player.x, player.y);
  if (nearNPC && !worldState.activeNPC) setMessage(`Press SPACE to talk to ${nearNPC.name}! 👋`);

  if (consumeSpacePress()) {
    if (worldState.activeNPC) {
      interactNPC(worldState.activeNPC);
    } else if (nearNPC) {
      interactNPC(nearNPC);
      playSound('chat');
      onNPCTalked(nearNPC.name).forEach(showAchievementToast);
    } else {
      dismissDialogue();
      setMessage(starsRemainingMessage());
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#87ceeb'); sky.addColorStop(1, '#c8e6c9');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawWorld(ctx, camX, camY, gameState.frame);
  drawPlayer(ctx, camX, camY);

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(canvas.width - 100, 8, 88, 28);
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px Nunito, sans-serif';
  ctx.fillText(`Level ${gameState.level}`, canvas.width - 12, 22);

  if ('ontouchstart' in window) {
    const cx = 70, cy = canvas.height - 70;
    ctx.save();
    ctx.globalAlpha = 0.22; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI*2); ctx.fill();
    ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.4; ctx.fillText('🕹️', cx, cy);
    ctx.restore();
  }
}

function levelComplete() {
  gameState.paused = true;
  const lv = gameState.level;
  onLevelComplete(lv).forEach(showAchievementToast);
  document.getElementById('gameOverTitle').textContent = `Level ${lv} Complete! 🎉`;
  document.getElementById('finalStars').textContent = gameState.stars;
  document.getElementById('unlockedAchievements').textContent = countUnlocked();
  playSound('levelup');
  setTimeout(() => showScreen('gameOverScreen'), 700);
}

function nextLevel() {
  gameState.level++; gameState.paused = false; gameState.frame = 0;
  initWorld(gameState.level); resetPlayerPosition(); resetAchievementProgress();
  gameState.stars = 0; updateStarsUI();
  setMessage(levelStartMessage());
  showScreen('gameScreen');
}

function levelStartMessage() {
  const msgs = [
    `Level ${gameState.level} – Explore the jungle! ⭐`,
    `Level ${gameState.level} – Bigger jungle, more stars! 🌴`,
    `Level ${gameState.level} – You're a jungle master! 🏆`,
  ];
  return msgs[Math.min(gameState.level - 1, msgs.length - 1)];
}

function starsRemainingMessage() {
  const rem = starsRemaining();
  if (rem === 0) return '🎉 All stars collected! Amazing!';
  if (rem === 1) return '⭐ One more star to find!';
  return `⭐ Find ${rem} more stars to complete the level!`;
}

function openPauseMenu()  { gameState.paused = true;  showScreen('pauseMenu'); }
function resumeGame()     { gameState.paused = false; showScreen('gameScreen'); }
function goToMainMenu()   {
  gameState.running = false; gameState.paused = false;
  if (gameState.animId) cancelAnimationFrame(gameState.animId);
  stopBGMusic(); showScreen('mainMenu');
}

function toggleSettings() {
  const isMain = document.getElementById('mainMenu').classList.contains('active');
  showScreen(isMain ? 'settingsScreen' : 'mainMenu');
}
function toggleSound() { gameState.soundOn = document.getElementById('soundToggle').checked; }
function toggleMusic() {
  gameState.musicOn = document.getElementById('musicToggle').checked;
  if (gameState.musicOn) playBGMusic(); else stopBGMusic();
}

function updateStarsUI() {
  const el = document.getElementById('starsCount');
  if (!el) return;
  el.textContent = gameState.stars;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 300);
}

function setMessage(msg) { const el = document.getElementById('gameMessage'); if (el) el.textContent = msg; }

// ─── Toasts ──────────────────────────────────────────────────────────────────
let toastQueue = [], toastBusy = false;

function showAchievementToast(ach) {
  if (!ach) return;
  toastQueue.push(ach);
  if (!toastBusy) processToastQueue();
}

function processToastQueue() {
  if (!toastQueue.length) { toastBusy = false; return; }
  toastBusy = true;
  const ach = toastQueue.shift();
  let toast = document.querySelector('.toast');
  if (!toast) { toast = document.createElement('div'); toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = `${ach.icon} ${ach.name} unlocked!`;
  toast.classList.add('show');
  playSound('achieve');
  setTimeout(() => { toast.classList.remove('show'); setTimeout(processToastQueue, 400); }, 2200);
}

// ─── Particles ───────────────────────────────────────────────────────────────
function spawnParticle(emoji) {
  const wrap = document.querySelector('.game-world');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'star-particle'; el.textContent = emoji;
  el.style.left = `${50 + Math.random()*20 - 10}%`;
  el.style.top  = `${45 + Math.random()*10 - 5}%`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
function spawnStarParticle()       { spawnParticle('⭐'); }
function spawnFruitParticle(emoji) { spawnParticle(emoji); }

// ─── Audio ───────────────────────────────────────────────────────────────────
const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) { try { audioCtx = new AudioCtxClass(); } catch(e) {} }
  return audioCtx;
}

function playTone(freq, type, duration, vol, delay = 0) {
  if (!gameState.soundOn) return;
  const ac = getAudio(); if (!ac) return;
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gain.gain.setValueAtTime(vol, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + duration + 0.05);
}

function playSound(name) {
  if (!gameState.soundOn) return;
  switch(name) {
    case 'star':    playTone(523,'sine',0.12,0.25); playTone(659,'sine',0.12,0.25,0.10); playTone(784,'sine',0.18,0.3,0.20); break;
    case 'fruit':   playTone(440,'sine',0.10,0.2);  playTone(554,'sine',0.10,0.2,0.08);  playTone(659,'sine',0.14,0.25,0.16); break;
    case 'chat':    playTone(330,'triangle',0.07,0.15); playTone(392,'triangle',0.07,0.15,0.08); break;
    case 'achieve': [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.15,0.22,i*0.1)); break;
    case 'levelup': [523,659,784,523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.2,0.28,i*0.12)); break;
  }
}

let bgMusicTimeout = null, bgMusicPlaying = false;

function playBGMusic() {
  if (!gameState.musicOn || bgMusicPlaying) return;
  bgMusicPlaying = true;
  const ac = getAudio(); if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  playBGMusicPhrase();
}

function stopBGMusic() {
  bgMusicPlaying = false;
  if (bgMusicTimeout) { clearTimeout(bgMusicTimeout); bgMusicTimeout = null; }
}

function playBGMusicPhrase() {
  if (!bgMusicPlaying || !gameState.musicOn) return;
  const ac = getAudio(); if (!ac) return;
  const notes = [
    {f:262,d:0.3},{f:294,d:0.3},{f:330,d:0.3},{f:349,d:0.3},
    {f:392,d:0.3},{f:349,d:0.3},{f:330,d:0.3},{f:294,d:0.6},
    {f:262,d:0.3},{f:330,d:0.3},{f:392,d:0.3},{f:440,d:0.3},
    {f:392,d:0.3},{f:349,d:0.3},{f:330,d:0.6},{f:262,d:0.6},
  ];
  let time = 0;
  notes.forEach(n => {
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = 'sine'; osc.frequency.value = n.f;
    gain.gain.setValueAtTime(0.07, ac.currentTime + time);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + time + n.d - 0.02);
    osc.start(ac.currentTime + time); osc.stop(ac.currentTime + time + n.d);
    time += n.d;
  });
  bgMusicTimeout = setTimeout(playBGMusicPhrase, time * 1000 + 200);
}

['click','keydown','touchstart'].forEach(evt =>
  document.addEventListener(evt, () => {
    const ac = getAudio();
    if (ac && ac.state === 'suspended') ac.resume();
  }, { once: true })
);

document.addEventListener('keydown', e => {
  if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && gameState.running) {
    gameState.paused ? resumeGame() : openPauseMenu();
  }
});

function resizeCanvas() {
  const el = document.getElementById('gameCanvas');
  if (!el) return;
  const maxW = Math.min(window.innerWidth, 820);
  const maxH = Math.min(window.innerHeight - 130, 600);
  const ratio = 800 / 600;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  el.style.width  = `${Math.floor(w)}px`;
  el.style.height = `${Math.floor(h)}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
