// ─── game.js ─────────────────────────────────────────────────────────────────
// Main orchestrator: game loop, screen management, sound, UI

// ─── State ───────────────────────────────────────────────────────────────────
let gameState = {
  running: false,
  paused:  false,
  level:   1,
  stars:   0,
  frame:   0,
  animId:  null,
  soundOn: true,
  musicOn: true,
};

// ─── Canvas ──────────────────────────────────────────────────────────────────
let canvas, ctx;
let camX = 0, camY = 0;

// ─── Screen helpers ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ─── Main Menu ───────────────────────────────────────────────────────────────
function startGame() {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');

  gameState.level  = 1;
  gameState.stars  = 0;
  gameState.frame  = 0;
  gameState.paused = false;
  gameState.running = true;

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

// ─── Game Loop ───────────────────────────────────────────────────────────────
function loop() {
  if (!gameState.running) return;

  if (!gameState.paused) {
    gameState.frame++;
    update();
    render();
  }

  gameState.animId = requestAnimationFrame(loop);
}

function update() {
  updatePlayer();

  // Camera: centre on player, clamped to world bounds
  const ws  = getWorldSize();
  const cw  = canvas.width;
  const ch  = canvas.height;
  camX = Math.max(0, Math.min(player.x - cw / 2, ws.width  - cw));
  camY = Math.max(0, Math.min(player.y - ch / 2, ws.height - ch));

  // Collect items
  const collected = checkCollect(player.x, player.y);
  if (collected.star) {
    gameState.stars++;
    updateStarsUI();
    triggerBounce();
    playSound('star');
    spawnStarParticle();
    const unlocked = onStarCollected();
    unlocked.forEach(showAchievementToast);
    if (allStarsCollected()) {
      const extra = onAllStarsCollected();
      extra.forEach(showAchievementToast);
      setTimeout(() => levelComplete(), 500);
    } else {
      setMessage(starsRemainingMessage());
    }
  }

  if (collected.fruit) {
    gameState.stars += 2;       // fruit worth 2 stars bonus
    updateStarsUI();
    triggerBounce();
    playSound('fruit');
    spawnFruitParticle(collected.fruit);
    const unlocked = onFruitCollected(collected.fruit);
    unlocked.forEach(showAchievementToast);
    setMessage(`Yummy ${collected.fruit}! Bonus stars!`);
  }

  // NPC proximity hint
  const nearNPC = checkNPCInteraction(player.x, player.y);
  if (nearNPC && !consumeSpacePress._held) {
    setMessage(`Press SPACE to talk to ${nearNPC.name}! 👋`);
  }

  // Space: interact with NPC or dismiss dialogue
  if (consumeSpacePress()) {
    if (worldState.activeNPC) {
      interactNPC(worldState.activeNPC);
    } else if (nearNPC) {
      const line = interactNPC(nearNPC);
      setMessage(`${nearNPC.name}: "${line}"`);
      playSound('chat');
      const unlocked = onNPCTalked(nearNPC.name);
      unlocked.forEach(showAchievementToast);
    } else {
      dismissDialogue();
      setMessage(starsRemainingMessage());
    }
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky gradient background
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#87ceeb');
  sky.addColorStop(1, '#c8e6c9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawWorld(ctx, camX, camY, gameState.frame);
  drawPlayer(ctx, camX, camY);

  // HUD: mini level badge
  ctx.font = 'bold 14px Fredoka One, sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(canvas.width - 100, 8, 88, 28);
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px Nunito, sans-serif';
  ctx.fillText(`Level ${gameState.level}`, canvas.width - 12, 22);

  // Mobile D-Pad hint (always-visible joystick shadow)
  drawMobileHint();
}

function drawMobileHint() {
  // Subtle D-pad hint in bottom-left for touch devices
  if (!('ontouchstart' in window)) return;
  const cx = 70, cy = canvas.height - 70;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, 40, 0, Math.PI * 2); ctx.fill();
  ctx.font = '20px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.4;
  ctx.fillText('🕹️', cx, cy);
  ctx.restore();
}

// ─── Level management ────────────────────────────────────────────────────────
function levelComplete() {
  gameState.paused = true;
  const lv = gameState.level;
  const unlocked = onLevelComplete(lv);
  unlocked.forEach(showAchievementToast);

  document.getElementById('gameOverTitle').textContent = `Level ${lv} Complete! 🎉`;
  document.getElementById('finalStars').textContent = gameState.stars;
  document.getElementById('unlockedAchievements').textContent = countUnlocked();
  playSound('levelup');
  setTimeout(() => showScreen('gameOverScreen'), 700);
}

function nextLevel() {
  gameState.level++;
  gameState.paused = false;
  gameState.frame  = 0;
  initWorld(gameState.level);
  resetPlayerPosition();
  resetAchievementProgress();
  gameState.stars = 0;
  updateStarsUI();
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

// ─── Pause / Resume ──────────────────────────────────────────────────────────
function openPauseMenu() {
  gameState.paused = true;
  showScreen('pauseMenu');
}

function resumeGame() {
  gameState.paused = false;
  showScreen('gameScreen');
}

function goToMainMenu() {
  gameState.running = false;
  gameState.paused  = false;
  if (gameState.animId) cancelAnimationFrame(gameState.animId);
  stopBGMusic();
  showScreen('mainMenu');
}

// ─── Settings ────────────────────────────────────────────────────────────────
function toggleSettings() {
  const isMain = document.getElementById('mainMenu').classList.contains('active');
  showScreen(isMain ? 'settingsScreen' : 'mainMenu');
}

function toggleSound()  { gameState.soundOn = document.getElementById('soundToggle').checked; }
function toggleMusic()  {
  gameState.musicOn = document.getElementById('musicToggle').checked;
  if (gameState.musicOn) playBGMusic(); else stopBGMusic();
}

// ─── UI helpers ──────────────────────────────────────────────────────────────
function updateStarsUI() {
  const el = document.getElementById('starsCount');
  if (!el) return;
  el.textContent = gameState.stars;
  el.classList.remove('pop');
  void el.offsetWidth; // reflow
  el.classList.add('pop');
  setTimeout(() => el.classList.remove('pop'), 300);
}

function setMessage(msg) {
  const el = document.getElementById('gameMessage');
  if (el) el.textContent = msg;
}

// ─── Toast notifications ─────────────────────────────────────────────────────
let toastQueue = [];
let toastBusy = false;

function showAchievementToast(ach) {
  if (!ach) return;
  toastQueue.push(ach);
  if (!toastBusy) processToastQueue();
}

function processToastQueue() {
  if (toastQueue.length === 0) { toastBusy = false; return; }
  toastBusy = true;
  const ach = toastQueue.shift();
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = `${ach.icon} ${ach.name} unlocked!`;
  toast.classList.add('show');
  playSound('achieve');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(processToastQueue, 400);
  }, 2200);
}

// ─── Star / Fruit particle ────────────────────────────────────────────────────
function spawnStarParticle() {
  const wrap = document.querySelector('.game-world');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'star-particle';
  el.textContent = '⭐';
  const rect = wrap.getBoundingClientRect();
  el.style.left = `${50 + Math.random() * 20 - 10}%`;
  el.style.top  = `${45 + Math.random() * 10 - 5}%`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function spawnFruitParticle(emoji) {
  const wrap = document.querySelector('.game-world');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'star-particle';
  el.textContent = emoji;
  el.style.left = `${50 + Math.random() * 20 - 10}%`;
  el.style.top  = `${45 + Math.random() * 10 - 5}%`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ─── Audio ───────────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudio() {
  if (!audioCtx) {
    try { audioCtx = new AudioCtx(); } catch(e) {}
  }
  return audioCtx;
}

function playTone(freq, type, duration, vol, delay = 0) {
  if (!gameState.soundOn) return;
  const ac = getAudio();
  if (!ac) return;
  const osc  = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
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
    case 'star':
      playTone(523, 'sine', 0.12, 0.25);
      playTone(659, 'sine', 0.12, 0.25, 0.10);
      playTone(784, 'sine', 0.18, 0.3,  0.20);
      break;
    case 'fruit':
      playTone(440, 'sine', 0.10, 0.2);
      playTone(554, 'sine', 0.10, 0.2, 0.08);
      playTone(659, 'sine', 0.14, 0.25, 0.16);
      break;
    case 'chat':
      playTone(330, 'triangle', 0.07, 0.15);
      playTone(392, 'triangle', 0.07, 0.15, 0.08);
      break;
    case 'achieve':
      [523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.15,0.22, i*0.1));
      break;
    case 'levelup':
      [523,659,784,523,659,784,1047].forEach((f,i) => playTone(f,'sine',0.2,0.28, i*0.12));
      break;
  }
}

// Simple looping synth music
let bgMusicTimeout = null;
let bgMusicPlaying = false;

function playBGMusic() {
  if (!gameState.musicOn || bgMusicPlaying) return;
  bgMusicPlaying = true;
  const ac = getAudio();
  if (!ac) return;
  // Resume on user gesture
  if (ac.state === 'suspended') ac.resume();
  playBGMusicPhrase();
}

function stopBGMusic() {
  bgMusicPlaying = false;
  if (bgMusicTimeout) { clearTimeout(bgMusicTimeout); bgMusicTimeout = null; }
}

function playBGMusicPhrase() {
  if (!bgMusicPlaying || !gameState.musicOn) return;
  const ac = getAudio();
  if (!ac) return;

  const notes = [
    {f:262,d:0.3},{f:294,d:0.3},{f:330,d:0.3},{f:349,d:0.3},
    {f:392,d:0.3},{f:349,d:0.3},{f:330,d:0.3},{f:294,d:0.6},
    {f:262,d:0.3},{f:330,d:0.3},{f:392,d:0.3},{f:440,d:0.3},
    {f:392,d:0.3},{f:349,d:0.3},{f:330,d:0.6},{f:262,d:0.6},
  ];

  let time = 0;
  notes.forEach(n => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.value = n.f;
    gain.gain.setValueAtTime(0.07, ac.currentTime + time);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + time + n.d - 0.02);
    osc.start(ac.currentTime + time);
    osc.stop(ac.currentTime + time + n.d);
    time += n.d;
  });

  bgMusicTimeout = setTimeout(playBGMusicPhrase, time * 1000 + 200);
}

// Resume audio context on first interaction (browser policy)
['click','keydown','touchstart'].forEach(evt =>
  document.addEventListener(evt, () => {
    const ac = getAudio();
    if (ac && ac.state === 'suspended') ac.resume();
  }, { once: true })
);

// ─── Keyboard shortcut for pause ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (gameState.running) {
      if (gameState.paused) resumeGame();
      else openPauseMenu();
    }
  }
});

// ─── Responsive canvas ───────────────────────────────────────────────────────
function resizeCanvas() {
  const el = document.getElementById('gameCanvas');
  if (!el) return;
  const maxW = Math.min(window.innerWidth,  820);
  const maxH = Math.min(window.innerHeight - 130, 600);
  const ratio = 800 / 600;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  el.style.width  = `${Math.floor(w)}px`;
  el.style.height = `${Math.floor(h)}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
