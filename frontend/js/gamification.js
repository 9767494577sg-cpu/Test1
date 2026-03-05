/* ============================================================
   FitLife PWA - Gamification & Rewards
   ============================================================ */

async function loadRewards() {
  try {
    const data = await api('GET', '/api/rewards');
    renderRewards(data);
  } catch (e) {
    toast('Failed to load rewards: ' + e.message, 'error');
  }
}

function renderRewards(data) {
  const { xp, level, badges, rewards } = data;

  // XP/Level display
  const xpInLevel = xp % 100;
  setEl('rewards-level', `Level ${level}`);
  setEl('rewards-xp-total', `${xp} XP Total`);
  const xpBar = document.getElementById('rewards-xp-bar');
  if (xpBar) xpBar.style.width = `${xpInLevel}%`;
  setEl('rewards-xp-label', `${xpInLevel} / 100 XP to next level`);

  // All possible badges
  const allBadges = [
    { name: 'First Run', emoji: '🏃', desc: 'Complete your first run' },
    { name: 'Streak 7', emoji: '🔥', desc: '7-day streak' },
    { name: 'Streak 30', emoji: '⚡', desc: '30-day streak' },
    { name: 'Plank Master', emoji: '💪', desc: 'Complete 7-day plank challenge' },
    { name: 'Transformation Hero', emoji: '🦸', desc: 'Complete 30-day weight loss challenge' },
    { name: 'Road Warrior', emoji: '🏅', desc: 'Complete monthly running competition' },
    { name: 'Step Champion', emoji: '👟', desc: 'Complete 10k steps challenge' },
    { name: 'Zen Master', emoji: '🧘', desc: 'Complete 21-day meditation challenge' },
    { name: 'Nutrition Pro', emoji: '🥗', desc: 'Log 30 days of nutrition' },
    { name: 'Sleep Champion', emoji: '😴', desc: 'Log 7 nights of quality sleep' },
    { name: 'Goal Crusher', emoji: '🎯', desc: 'Complete 3 goals' },
    { name: 'Social Butterfly', emoji: '🤝', desc: 'Add 5 friends' },
  ];

  const earnedNames = new Set(badges.map(b => b.badge_name));

  const badgesContainer = document.getElementById('badges-container');
  if (badgesContainer) {
    badgesContainer.innerHTML = allBadges.map(b => `
      <div class="badge-item ${earnedNames.has(b.name) ? 'earned' : ''}" title="${b.desc}">
        <span class="badge-emoji" style="${earnedNames.has(b.name) ? '' : 'filter:grayscale(1);opacity:0.3'}">${b.emoji}</span>
        <span>${b.name}</span>
        ${earnedNames.has(b.name) ? '<span style="font-size:0.65rem;color:var(--success)">Earned!</span>' : ''}
      </div>
    `).join('');
  }

  // Recent rewards
  const recentContainer = document.getElementById('recent-rewards');
  if (recentContainer) {
    const recent = rewards.slice(0, 10);
    if (!recent.length) {
      recentContainer.innerHTML = '<p class="text-sm text-muted text-center">No rewards yet. Start working out!</p>';
    } else {
      recentContainer.innerHTML = recent.map(r => `
        <div class="flex items-center gap-1 mb-1 p-1" style="background:var(--bg-card2);border-radius:var(--radius-sm)">
          <span style="font-size:1.1rem">⚡</span>
          <div style="flex:1">
            <div class="text-sm font-bold">+${r.points} XP</div>
            <div class="text-sm text-muted">${r.title}</div>
          </div>
          <span class="text-sm text-muted">${formatDate(r.earned_at)}</span>
        </div>
      `).join('');
    }
  }

  // Level perks
  const perksContainer = document.getElementById('level-perks');
  if (perksContainer) {
    const perks = getLevelPerks(level);
    perksContainer.innerHTML = perks.map(p => `
      <div class="flex gap-1 items-center mb-1">
        <span style="color:var(--accent)">${p.icon}</span>
        <span class="text-sm">${p.name}</span>
        ${p.unlocked ? '<span class="badge badge-success">Unlocked</span>' : `<span class="badge badge-secondary">Level ${p.level}</span>`}
      </div>
    `).join('');
  }
}

function getLevelPerks(currentLevel) {
  return [
    { icon: '🎨', name: 'Custom Avatars', level: 1, unlocked: currentLevel >= 1 },
    { icon: '📊', name: 'Advanced Analytics', level: 3, unlocked: currentLevel >= 3 },
    { icon: '🤖', name: 'AI Coach Access', level: 5, unlocked: currentLevel >= 5 },
    { icon: '🏆', name: 'Custom Challenges', level: 8, unlocked: currentLevel >= 8 },
    { icon: '👑', name: 'Elite Status', level: 10, unlocked: currentLevel >= 10 },
  ];
}
