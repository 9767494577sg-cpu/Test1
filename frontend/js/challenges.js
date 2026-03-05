/* ============================================================
   FitLife PWA - Fitness Challenges
   ============================================================ */

async function loadChallenges() {
  try {
    const challenges = await api('GET', '/api/challenges');
    renderChallenges(challenges);
  } catch (e) {
    toast('Failed to load challenges: ' + e.message, 'error');
  }
}

function renderChallenges(challenges) {
  const activeContainer = document.getElementById('active-challenges');
  const availableContainer = document.getElementById('available-challenges');
  if (!activeContainer || !availableContainer) return;

  const active = challenges.filter(c => c.user_status === 'in_progress');
  const available = challenges.filter(c => c.user_status === 'not_started');
  const completed = challenges.filter(c => c.user_status === 'completed');

  if (!active.length) {
    activeContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>No active challenges. Join one below!</p></div>';
  } else {
    activeContainer.innerHTML = active.map(c => challengeCard(c, 'active')).join('');
  }

  availableContainer.innerHTML = [...available, ...completed].map(c => challengeCard(c, c.user_status)).join('');

  if (!available.length && !completed.length) {
    availableContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>You\'ve joined all challenges!</p></div>';
  }
}

function challengeCard(ch, status) {
  const icons = {
    strength: '💪', cardio: '🏃', running: '🏅', walking: '🚶', mental: '🧘', hiit: '🔥'
  };
  const icon = icons[ch.category] || '🏆';
  const progress = parseInt(ch.user_progress) || 0;
  const total = parseInt(ch.duration_days) || 1;
  const pct = Math.min(100, Math.round(progress / total * 100));

  let actionBtn = '';
  if (status === 'not_started') {
    actionBtn = `<button onclick="joinChallenge('${ch.id}')" class="btn-primary" style="width:auto;padding:0.5rem 1rem;font-size:0.85rem">Join Challenge</button>`;
  } else if (status === 'in_progress') {
    actionBtn = `<button onclick="updateProgress('${ch.id}', ${progress})" class="btn-success" style="padding:0.5rem 1rem;font-size:0.85rem">Log Day +1</button>`;
  } else {
    actionBtn = `<span class="badge badge-success">✅ Completed</span>`;
  }

  return `
    <div class="challenge-card">
      <div class="challenge-header">
        <span class="challenge-icon">${icon}</span>
        <div class="challenge-info">
          <div class="challenge-title">${ch.title}</div>
          <div class="challenge-meta">${ch.duration_days} days · 🏅 ${ch.badge} · ⚡ ${ch.xp_reward} XP</div>
        </div>
      </div>
      <p class="text-sm text-secondary mb-1">${ch.description}</p>
      ${status !== 'not_started' ? `
        <div class="flex items-center gap-1 mb-1" style="margin-top:0.5rem">
          <div class="progress-bar" style="flex:1"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span class="text-sm text-muted">${progress}/${ch.duration_days}d</span>
        </div>
      ` : ''}
      <div style="margin-top:0.75rem">${actionBtn}</div>
    </div>
  `;
}

async function joinChallenge(challengeId) {
  try {
    await api('POST', `/api/challenges/${challengeId}/join`);
    toast('Challenge joined! Let\'s go! 🚀', 'success');
    loadChallenges();
  } catch (e) { toast(e.message, 'error'); }
}

async function updateProgress(challengeId, currentProgress) {
  const newProgress = currentProgress + 1;
  try {
    const result = await api('PUT', `/api/challenges/${challengeId}/progress`, { progress: newProgress });
    if (result.status === 'completed') {
      toast('Challenge completed! 🏆 Badge earned!', 'success');
      refreshUserXP();
    } else {
      toast(`Day ${newProgress} logged! Keep it up! 💪`, 'success');
    }
    loadChallenges();
  } catch (e) { toast(e.message, 'error'); }
}
