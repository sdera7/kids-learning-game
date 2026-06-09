// ─── achievements.js ────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  { id:'first_star',  icon:'⭐', name:'First Star!',       desc:'Collect your very first star',          unlocked: false },
  { id:'star5',       icon:'🌟', name:'Star Collector',    desc:'Collect 5 stars',                       unlocked: false },
  { id:'all_stars',   icon:'✨', name:'Star Master!',      desc:'Collect ALL stars in the jungle',        unlocked: false },
  { id:'first_fruit', icon:'🍎', name:'Yummy!',            desc:'Pick up your first piece of fruit',      unlocked: false },
  { id:'all_fruits',  icon:'🍓', name:'Fruit Basket',      desc:'Collect all the fruit in the jungle',    unlocked: false },
  { id:'meet_ellie',  icon:'🐘', name:'Hello Ellie!',      desc:'Talk to Ellie the elephant',             unlocked: false },
  { id:'all_friends', icon:'🌈', name:'Friend of the Jungle', desc:'Talk to all the jungle animals',     unlocked: false },
  { id:'level2',      icon:'🏆', name:'Explorer!',         desc:'Complete Level 1 and reach Level 2',    unlocked: false },
  { id:'level3',      icon:'🎖️', name:'Jungle Master',     desc:'Complete Level 2 and reach Level 3',    unlocked: false },
  { id:'speedy',      icon:'⚡', name:'Quick Explorer',    desc:'Collect 3 stars in under 30 seconds',   unlocked: false },
];

// Track per-session progress
const achProgress = {
  starsCollected: 0,
  fruitsCollected: 0,
  npcsMet: new Set(),
  totalNPCs: NPC_DEFS.length,
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
  if (ach && !ach.unlocked) {
    ach.unlocked = true;
    achProgress.recentlyUnlocked.push(ach);
    return ach;
  }
  return null;
}

// Call after collecting a star
function onStarCollected() {
  achProgress.starsCollected++;
  const unlocked = [];
  if (achProgress.starsCollected >= 1) unlocked.push(tryUnlock('first_star'));
  if (achProgress.starsCollected >= 5) unlocked.push(tryUnlock('star5'));

  // Speedy: 3 stars in 30s
  if (achProgress.starsCollected >= 3 && achProgress.startTime) {
    if ((Date.now() - achProgress.startTime) < 30000) unlocked.push(tryUnlock('speedy'));
  }
  return unlocked.filter(Boolean);
}

function onAllStarsCollected() {
  return [tryUnlock('all_stars')].filter(Boolean);
}

function onFruitCollected(emoji) {
  achProgress.fruitsCollected++;
  const unlocked = [];
  if (achProgress.fruitsCollected >= 1)                         unlocked.push(tryUnlock('first_fruit'));
  if (achProgress.fruitsCollected >= achProgress.totalFruits)   unlocked.push(tryUnlock('all_fruits'));
  return unlocked.filter(Boolean);
}

function onAllFruitsCollected() {
  return [tryUnlock('all_fruits')].filter(Boolean);
}

function onNPCTalked(npcName) {
  achProgress.npcsMet.add(npcName);
  const unlocked = [];
  if (npcName === 'Ellie') unlocked.push(tryUnlock('meet_ellie'));
  if (achProgress.npcsMet.size >= achProgress.totalNPCs) unlocked.push(tryUnlock('all_friends'));
  return unlocked.filter(Boolean);
}

function onLevelComplete(level) {
  const unlocked = [];
  if (level >= 1) unlocked.push(tryUnlock('level2'));
  if (level >= 2) unlocked.push(tryUnlock('level3'));
  return unlocked.filter(Boolean);
}

function countUnlocked() {
  return ACHIEVEMENTS.filter(a => a.unlocked).length;
}

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

function closeAchievements() {
  showScreen('gameScreen');
}
