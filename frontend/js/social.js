/* ============================================================
   FitLife PWA - Social Features (Friends, Leaderboard)
   ============================================================ */

async function loadSocial() {
  try {
    const [friends, requests, leaderboard] = await Promise.all([
      api('GET', '/api/friends'),
      api('GET', '/api/friends/requests'),
      api('GET', '/api/leaderboard'),
    ]);
    renderFriends(friends);
    renderFriendRequests(requests);
    renderLeaderboard(leaderboard);
  } catch (e) {
    toast('Failed to load social: ' + e.message, 'error');
  }
}

function renderFriends(friends) {
  const container = document.getElementById('friends-list');
  if (!container) return;
  if (!friends.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No friends yet. Add friends to compare progress!</p></div>';
    return;
  }
  container.innerHTML = friends.map(f => `
    <div class="friend-item">
      <div class="friend-avatar">${f.user.avatar || '🏃'}</div>
      <div class="friend-info">
        <div class="friend-name">${f.user.name}</div>
        <div class="friend-stats">🔥 ${f.streak} day streak · Level ${f.user.level}</div>
      </div>
      <div class="friend-actions">
        <button onclick="removeFriend('${f.id}')" class="btn-danger">Remove</button>
      </div>
    </div>
  `).join('');
}

function renderFriendRequests(requests) {
  const container = document.getElementById('friend-requests');
  if (!container) return;
  const badge = document.getElementById('requests-badge');
  if (badge) badge.textContent = requests.length || '';

  if (!requests.length) {
    container.innerHTML = '<p class="text-sm text-muted text-center">No pending requests</p>';
    return;
  }
  container.innerHTML = requests.map(r => `
    <div class="friend-item">
      <div class="friend-avatar">${r.user.avatar || '🏃'}</div>
      <div class="friend-info">
        <div class="friend-name">${r.user.name}</div>
        <div class="text-sm text-muted">${r.user.email}</div>
      </div>
      <div class="friend-actions">
        <button onclick="acceptFriend('${r.id}')" class="btn-success">Accept</button>
        <button onclick="declineFriend('${r.id}')" class="btn-danger">Decline</button>
      </div>
    </div>
  `).join('');
}

function renderLeaderboard(users) {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  const rankIcons = ['🥇', '🥈', '🥉'];
  const rankClass = ['gold', 'silver', 'bronze'];
  container.innerHTML = users.map((u, i) => {
    const isMe = FitLife.user && u.id === FitLife.user.id;
    return `
      <div class="leaderboard-item ${isMe ? 'animate-glow' : ''}" style="${isMe ? 'border:1px solid var(--primary)' : ''}">
        <div class="leaderboard-rank ${rankClass[i] || ''}">${rankIcons[i] || (i + 1)}</div>
        <div class="friend-avatar" style="width:36px;height:36px;font-size:1.1rem">${u.avatar || '🏃'}</div>
        <div class="lb-info">
          <div class="lb-name">${u.name}${isMe ? ' (You)' : ''}</div>
          <div class="lb-stats">🏃 ${u.total_distance} km · 🔥 ${u.streak}d streak</div>
        </div>
        <div class="lb-xp">⚡ ${u.xp} XP</div>
      </div>
    `;
  }).join('');
}

async function acceptFriend(friendshipId) {
  try {
    await api('POST', `/api/friends/${friendshipId}/accept`);
    toast('Friend accepted! 🤝', 'success');
    loadSocial();
  } catch (e) { toast(e.message, 'error'); }
}

async function declineFriend(friendshipId) {
  try {
    await api('DELETE', `/api/friends/${friendshipId}`);
    toast('Request declined', 'info');
    loadSocial();
  } catch (e) { toast(e.message, 'error'); }
}

async function removeFriend(friendshipId) {
  if (!confirm('Remove this friend?')) return;
  try {
    await api('DELETE', `/api/friends/${friendshipId}`);
    toast('Friend removed', 'info');
    loadSocial();
  } catch (e) { toast(e.message, 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const addFriendBtn = document.getElementById('btn-add-friend');
  if (addFriendBtn) addFriendBtn.addEventListener('click', () => openModal('modal-add-friend'));

  const form = document.getElementById('form-add-friend');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('friend-email').value.trim();
      if (!email) return toast('Please enter an email', 'warning');
      try {
        await api('POST', '/api/friends/add', { email });
        toast('Friend request sent! 📨', 'success');
        closeModal('modal-add-friend');
        form.reset();
        loadSocial();
      } catch (e) { toast(e.message, 'error'); }
    });
  }
});
