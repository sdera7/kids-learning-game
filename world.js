// ─── world.js ───────────────────────────────────────────────────────────────
// Draws the jungle world: terrain, collectibles (stars/fruit), friendly animals

const TILE = 64; // pixels per tile

// Tile type constants
const T = { GRASS:0, WATER:1, PATH:2, FLOWER:3, BUSH:4 };

// Colours for each tile
const TILE_COLORS = {
  [T.GRASS]:  ['#4caf50','#43a047','#66bb6a'],
  [T.WATER]:  ['#29b6f6','#0288d1','#4fc3f7'],
  [T.PATH]:   ['#d4a574','#c8955a','#ddb882'],
  [T.FLOWER]: ['#4caf50','#43a047','#66bb6a'],
  [T.BUSH]:   ['#2e7d32','#1b5e20','#388e3c'],
};

// ─── Map layout (13 × 10 tiles) ─────────────────────────────────────────────
// 0=grass 1=water 2=path 3=flower 4=bush
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

// Decorative emoji overlays per tile (drawn after base colour)
const TILE_DECO = {
  [T.FLOWER]: ['🌸','🌼','🌺','🌻'],
  [T.BUSH]:   ['🌿','🍃','🌱'],
  [T.WATER]:  ['💧','🐸','🦆'],
};

// ─── Collectibles ─────────────────────────────────────────────────────────
// Each entry: { x, y } in tile coordinates, collected: false
function buildCollectibles(level) {
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
    stars: stars.map(s => ({ ...s, collected: false, bobOffset: Math.random()*Math.PI*2 })),
    fruits: fruits.map((f,i) => ({
      ...f, collected: false, emoji: ['🍎','🍌','🍓','🍊'][i % 4],
      bobOffset: Math.random()*Math.PI*2
    })),
  };
}

// ─── Friendly animals (NPCs) ─────────────────────────────────────────────
const NPC_DEFS = [
  { x:3, y:5, emoji:'🐘', name:'Ellie',  greeting:'Trumpets hello! 🎺',   dialogue:['Hello friend!','I love eating leaves!','Let\'s be friends! 🌿'] },
  { x:9, y:2, emoji:'🦜', name:'Polly',  greeting:'Squawk! Welcome!',     dialogue:['Polly wants a cracker!','Colors are beautiful!','Can you see rainbows? 🌈'] },
  { x:7, y:7, emoji:'🐒', name:'Coco',   greeting:'Ooh ooh! Hi there!',   dialogue:['I love bananas! 🍌','Can you climb trees?','Wheee! Life is fun!'] },
  { x:2, y:4, emoji:'🦋', name:'Flutter',greeting:'Flutters her wings! 🦋',dialogue:['I used to be a caterpillar!','Flying feels like magic!','I love flowers! 🌸'] },
  { x:11, y:6,emoji:'🐢', name:'Sheldon',greeting:'Slow and steady wins!', dialogue:['Patience is a superpower!','My shell keeps me safe!','Nice and slow is okay! 🐢'] },
];

// ─── World State ────────────────────────────────────────────────────────────
let worldState = {
  collectibles: null,
  npcs: [],
  animFrame: 0,
  level: 1,
  activeNPC: null,
  dialogueLine: 0,
  dialogueCooldown: 0,
};

function initWorld(level) {
  worldState.level = level;
  worldState.collectibles = buildCollectibles(level);
  worldState.animFrame = 0;
  worldState.npcs = NPC_DEFS.map(n => ({ ...n, faceRight: true, wobble: 0, talked: false }));
  worldState.activeNPC = null;
  worldState.dialogueLine = 0;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function tileAt(col, row) {
  if (row < 0 || row >= MAP_ROWS.length || col < 0 || col >= MAP_ROWS[0].length) return T.BUSH;
  return MAP_ROWS[row][col];
}

function isWalkable(col, row) {
  const t = tileAt(col, row);
  return t !== T.WATER && t !== T.BUSH;
}

function isWalkablePx(px, py) {
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  return isWalkable(col, row);
}

// Seeded "random" for stable decorations
function tileRng(col, row, seed) {
  let h = (col * 374761393 + row * 668265263 + seed * 2246822519) >>> 0;
  h ^= h >> 13; h = Math.imul(h, 1540483477) >>> 0; h ^= h >> 15;
  return (h >>> 0) / 0xffffffff;
}

// ─── Drawing ────────────────────────────────────────────────────────────────
function drawWorld(ctx, camX, camY, t) {
  worldState.animFrame = t;

  const cols = MAP_ROWS[0].length;
  const rows = MAP_ROWS.length;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = tileAt(col, row);
      const px = col * TILE - camX;
      const py = row * TILE - camY;

      // Base colour (slight variation)
      const idx = Math.floor(tileRng(col, row, 1) * TILE_COLORS[tile].length);
      ctx.fillStyle = TILE_COLORS[tile][idx];
      ctx.fillRect(px, py, TILE, TILE);

      // Grid shimmer for path
      if (tile === T.PATH) {
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE, TILE);
      }

      // Water animated shimmer
      if (tile === T.WATER) {
        const wave = Math.sin(t * 0.04 + col * 0.8 + row) * 0.12 + 0.12;
        ctx.fillStyle = `rgba(255,255,255,${wave})`;
        ctx.fillRect(px + 4, py + TILE * 0.4, TILE - 8, 6);
        ctx.fillStyle = `rgba(255,255,255,${wave * 0.7})`;
        ctx.fillRect(px + 12, py + TILE * 0.65, TILE - 24, 4);
      }

      // Emoji decorations
      const decos = TILE_DECO[tile];
      if (decos && tileRng(col, row, 7) > 0.45) {
        const di = Math.floor(tileRng(col, row, 3) * decos.length);
        const scale = 0.65 + tileRng(col, row, 5) * 0.3;
        ctx.font = `${Math.round(TILE * scale * 0.55)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ex = px + TILE * (0.25 + tileRng(col, row, 9) * 0.5);
        const ey = py + TILE * (0.25 + tileRng(col, row, 11) * 0.5);
        ctx.fillText(decos[di], ex, ey);
      }
    }
  }

  // ─── Collectibles ─────────────────────────────────────────────────────
  const { stars, fruits } = worldState.collectibles;

  stars.forEach(s => {
    if (s.collected) return;
    const bob = Math.sin(t * 0.07 + s.bobOffset) * 5;
    const sx = s.x * TILE - camX + TILE / 2;
    const sy = s.y * TILE - camY + TILE / 2 + bob;
    // Glow
    const grd = ctx.createRadialGradient(sx, sy, 2, sx, sy, 22);
    grd.addColorStop(0, 'rgba(255,230,0,0.6)');
    grd.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, 22, 0, Math.PI * 2);
    ctx.fill();
    // Star emoji
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', sx, sy);
  });

  fruits.forEach(f => {
    if (f.collected) return;
    const bob = Math.sin(t * 0.05 + f.bobOffset) * 4;
    const fx = f.x * TILE - camX + TILE / 2;
    const fy = f.y * TILE - camY + TILE / 2 + bob;
    // Glow
    const grd = ctx.createRadialGradient(fx, fy, 2, fx, fy, 20);
    grd.addColorStop(0, 'rgba(255,140,0,0.5)');
    grd.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji, fx, fy);
  });

  // ─── NPCs ──────────────────────────────────────────────────────────────
  worldState.npcs.forEach(npc => {
    const nx = npc.x * TILE - camX + TILE / 2;
    const ny = npc.y * TILE - camY + TILE / 2;
    const wobble = Math.sin(t * 0.06 + npc.x) * 3;
    ctx.save();
    ctx.translate(nx, ny + wobble);
    if (!npc.faceRight) ctx.scale(-1, 1);
    ctx.font = `${TILE * 0.7}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.emoji, 0, 0);
    ctx.restore();

    // "!" above untalked NPCs
    if (!npc.talked) {
      const pulse = 1 + Math.sin(t * 0.12) * 0.18;
      ctx.save();
      ctx.translate(nx, ny - TILE * 0.65);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 18px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('!', 0, 0);
      ctx.restore();
    }
  });

  // ─── Dialogue bubble ───────────────────────────────────────────────────
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

  // Bubble
  ctx.fillStyle = 'rgba(255,255,240,0.97)';
  ctx.strokeStyle = '#5aad2c';
  ctx.lineWidth = 3;
  roundRect(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.fillStyle = 'rgba(255,255,240,0.97)';
  ctx.beginPath();
  ctx.moveTo(x - 8, by + bh);
  ctx.lineTo(x + 8, by + bh);
  ctx.lineTo(x, by + bh + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Text (wrap if needed)
  ctx.fillStyle = '#1a3a08';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px Nunito, sans-serif';
  const maxW = bw - padding * 2;
  wrapText(ctx, text, bx + bw / 2, by + bh / 2, maxW, 18);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, cx, cy, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  words.forEach(w => {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = w;
    } else { line = test; }
  });
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
}

// ─── Collectible check ────────────────────────────────────────────────────
function checkCollect(playerX, playerY) {
  const { stars, fruits } = worldState.collectibles;
  const radius = TILE * 0.7;
  let collected = { star: false, fruit: null };

  stars.forEach(s => {
    if (s.collected) return;
    const cx = s.x * TILE + TILE / 2;
    const cy = s.y * TILE + TILE / 2;
    const dist = Math.hypot(playerX - cx, playerY - cy);
    if (dist < radius) { s.collected = true; collected.star = true; }
  });

  fruits.forEach(f => {
    if (f.collected) return;
    const cx = f.x * TILE + TILE / 2;
    const cy = f.y * TILE + TILE / 2;
    const dist = Math.hypot(playerX - cx, playerY - cy);
    if (dist < radius) { f.collected = true; collected.fruit = f.emoji; }
  });

  return collected;
}

// ─── NPC interaction ──────────────────────────────────────────────────────
function checkNPCInteraction(playerX, playerY) {
  const radius = TILE * 1.1;
  for (const npc of worldState.npcs) {
    const cx = npc.x * TILE + TILE / 2;
    const cy = npc.y * TILE + TILE / 2;
    if (Math.hypot(playerX - cx, playerY - cy) < radius) return npc;
  }
  return null;
}

function interactNPC(npc) {
  if (worldState.activeNPC === npc) {
    worldState.dialogueLine = (worldState.dialogueLine + 1) % npc.dialogue.length;
    if (worldState.dialogueLine === 0) {
      worldState.activeNPC = null;
      npc.talked = true;
    }
  } else {
    worldState.activeNPC = npc;
    worldState.dialogueLine = 0;
    npc.talked = true;
  }
  return npc.dialogue[worldState.dialogueLine % npc.dialogue.length];
}

function dismissDialogue() {
  worldState.activeNPC = null;
}

function allStarsCollected() {
  return worldState.collectibles.stars.every(s => s.collected);
}

function starsRemaining() {
  return worldState.collectibles.stars.filter(s => !s.collected).length;
}

function countCollectedStars() {
  return worldState.collectibles.stars.filter(s => s.collected).length;
}

function getWorldSize() {
  return {
    width:  MAP_ROWS[0].length * TILE,
    height: MAP_ROWS.length    * TILE,
  };
}
