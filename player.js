// ─── player.js ──────────────────────────────────────────────────────────────
// Handles the player character: movement, animation, rendering

const PLAYER_SPEED  = 3.2;   // px per frame
const PLAYER_RADIUS = 20;    // collision radius

const player = {
  x: 4 * TILE + TILE / 2,   // start near the path
  y: 4 * TILE + TILE / 2,
  vx: 0,
  vy: 0,
  faceRight: true,
  animStep: 0,             // 0-3 walking cycle
  animTimer: 0,
  moving: false,
  bouncing: false,
  bounceTimer: 0,
  emoji: '🧒',            // player character
  skin: 0,               // 0=kid,1=girl,2=robot,3=alien
};

const PLAYER_SKINS = ['🧒','👧','🤖','👾'];

// Input state
const keys = {
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  w: false, a: false, s: false, d: false,
  W: false, A: false, S: false, D: false,
  ' ': false,
  touchDx: 0, touchDy: 0,
};

let spaceJustPressed = false;

function setupPlayerInput() {
  document.addEventListener('keydown', e => {
    if (e.key in keys) { keys[e.key] = true; }
    if (e.key === ' ') { spaceJustPressed = true; }
    // Prevent arrow keys scrolling page during game
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.key in keys) keys[e.key] = false;
  });

  // ─── Virtual D-Pad (touch) ────────────────────────────────────────────
  setupVirtualDPad();
}

function setupVirtualDPad() {
  const canvas = document.getElementById('gameCanvas');
  let touchId = null;
  let touchStartX = 0, touchStartY = 0;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchId = touch.identifier;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    keys.touchDx = 0;
    keys.touchDy = 0;
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchId) {
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        const mag = Math.hypot(dx, dy);
        if (mag > 12) {
          keys.touchDx = dx / mag;
          keys.touchDy = dy / mag;
        } else {
          keys.touchDx = 0;
          keys.touchDy = 0;
        }
        // Treat a quick tap as space (interact)
        if (mag < 8) spaceJustPressed = true;
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === touchId) {
        // Short tap = interact
        keys.touchDx = 0;
        keys.touchDy = 0;
        touchId = null;
      }
    }
  }, { passive: false });
}

// ─── Update ───────────────────────────────────────────────────────────────
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

  // Prefer touch analog values if available
  if (keys.touchDx !== 0 || keys.touchDy !== 0) {
    dx = keys.touchDx;
    dy = keys.touchDy;
  }

  // Normalise diagonal
  const mag = Math.hypot(dx, dy);
  if (mag > 0) {
    dx = (dx / mag) * PLAYER_SPEED;
    dy = (dy / mag) * PLAYER_SPEED;
  }

  player.moving = mag > 0;
  if (dx > 0.1) player.faceRight = true;
  if (dx < -0.1) player.faceRight = false;

  // Try X move
  const nx = player.x + dx;
  if (isWalkablePx(nx - PLAYER_RADIUS + 2, player.y) &&
      isWalkablePx(nx + PLAYER_RADIUS - 2, player.y)) {
    player.x = nx;
  }

  // Try Y move
  const ny = player.y + dy;
  if (isWalkablePx(player.x, ny - PLAYER_RADIUS + 2) &&
      isWalkablePx(player.x, ny + PLAYER_RADIUS - 2)) {
    player.y = ny;
  }

  // Clamp to world
  const ws = getWorldSize();
  player.x = Math.max(PLAYER_RADIUS, Math.min(ws.width  - PLAYER_RADIUS, player.x));
  player.y = Math.max(PLAYER_RADIUS, Math.min(ws.height - PLAYER_RADIUS, player.y));

  // Walk animation
  if (player.moving) {
    player.animTimer++;
    if (player.animTimer >= 8) { player.animTimer = 0; player.animStep = (player.animStep + 1) % 4; }
  } else {
    player.animStep = 0;
  }

  // Bounce (after collecting)
  if (player.bouncing) {
    player.bounceTimer--;
    if (player.bounceTimer <= 0) player.bouncing = false;
  }
}

function triggerBounce() {
  player.bouncing = true;
  player.bounceTimer = 18;
}

// ─── Draw ─────────────────────────────────────────────────────────────────
function drawPlayer(ctx, camX, camY) {
  const sx = player.x - camX;
  const sy = player.y - camY;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(sx, sy + 18, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Walk bob
  const bob = player.moving ? Math.sin(player.animStep / 4 * Math.PI * 2) * 4 : 0;
  // Bounce jump
  const jump = player.bouncing ? -Math.sin((1 - player.bounceTimer / 18) * Math.PI) * 22 : 0;

  const drawY = sy + bob + jump;

  ctx.save();
  ctx.translate(sx, drawY);
  if (!player.faceRight) ctx.scale(-1, 1);

  // Player emoji
  ctx.font = '42px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(player.emoji, 0, 0);

  // Walk arm swing
  if (player.moving) {
    const swing = Math.sin(player.animStep / 4 * Math.PI * 2) * 14;
    ctx.font = '20px serif';
    ctx.fillText('👋', 22, 6 + swing);
  }

  ctx.restore();

  // Name tag above player
  ctx.font = 'bold 12px Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('You', sx, drawY - 28);
}

// ─── Interact button ──────────────────────────────────────────────────────
function consumeSpacePress() {
  const v = spaceJustPressed;
  spaceJustPressed = false;
  return v;
}

function setPlayerSkin(idx) {
  player.skin = idx % PLAYER_SKINS.length;
  player.emoji = PLAYER_SKINS[player.skin];
}

function resetPlayerPosition() {
  player.x = 4 * TILE + TILE / 2;
  player.y = 4 * TILE + TILE / 2;
  player.vx = 0; player.vy = 0;
}
