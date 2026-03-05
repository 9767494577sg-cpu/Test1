/* ============================================================
   FitLife PWA - Habit Tracker
   ============================================================ */

async function loadHabits() {
  try {
    const [habits, suggestions] = await Promise.all([
      api('GET', '/api/habits'),
      api('GET', '/api/suggestions'),
    ]);
    renderHabits(habits);
    renderSuggestions(suggestions);
  } catch (e) {
    toast('Failed to load habits: ' + e.message, 'error');
  }
}

function renderHabits(habits) {
  const container = document.getElementById('habits-list');
  if (!container) return;
  if (!habits.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>No habits yet. Add your first habit!</p></div>';
    return;
  }
  container.innerHTML = habits.map(h => `
    <div class="habit-item ${h.completed_today ? 'completed' : ''}" id="habit-${h.id}">
      <div class="habit-checkbox ${h.completed_today ? 'checked' : ''}" onclick="toggleHabit('${h.id}', ${!h.completed_today})"></div>
      <span class="habit-icon">${h.icon}</span>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-streak">🔥 ${h.streak || 0} day streak</div>
      </div>
      <button onclick="deleteHabit('${h.id}')" class="btn-icon text-sm" title="Remove">🗑️</button>
    </div>
  `).join('');
}

function renderSuggestions(data) {
  const container = document.getElementById('suggestions-list');
  if (!container) return;
  const suggs = data.suggestions || [];
  if (!suggs.length) {
    container.innerHTML = '<p class="text-sm text-muted text-center">Great job! You\'ve completed all suggestions for today 🎉</p>';
    return;
  }
  container.innerHTML = suggs.map(s => `
    <div class="habit-item" style="cursor:pointer" onclick="addSuggestionAsHabit('${encodeURIComponent(JSON.stringify(s))}')">
      <span class="habit-icon">${s.icon}</span>
      <div class="habit-info">
        <div class="habit-name">${s.title}</div>
        <div class="text-sm text-muted">${s.description}</div>
      </div>
      <button class="btn-secondary text-sm">+ Add</button>
    </div>
  `).join('');
}

async function toggleHabit(habitId, completed) {
  try {
    await api('POST', `/api/habits/${habitId}/log`, { completed });
    const item = document.getElementById(`habit-${habitId}`);
    const checkbox = item?.querySelector('.habit-checkbox');
    if (checkbox) {
      if (completed) {
        checkbox.classList.add('checked');
        item.classList.add('completed');
        toast('+10 XP for completing a habit! 🎉', 'success');
        refreshUserXP();
      } else {
        checkbox.classList.remove('checked');
        item.classList.remove('completed');
      }
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteHabit(habitId) {
  if (!confirm('Remove this habit?')) return;
  try {
    await api('DELETE', `/api/habits/${habitId}`);
    toast('Habit removed', 'info');
    loadHabits();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function addSuggestionAsHabit(encodedSugg) {
  const s = JSON.parse(decodeURIComponent(encodedSugg));
  try {
    await api('POST', '/api/habits', { name: s.title, icon: s.icon, category: s.category });
    toast('Habit added! ✅', 'success');
    loadHabits();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---- Add Habit Modal ----
document.addEventListener('DOMContentLoaded', () => {
  const addHabitBtn = document.getElementById('btn-add-habit');
  if (addHabitBtn) addHabitBtn.addEventListener('click', () => openModal('modal-add-habit'));

  const form = document.getElementById('form-add-habit');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('habit-name').value.trim();
      const icon = document.getElementById('habit-icon').value.trim() || '✅';
      const category = document.getElementById('habit-category').value;
      if (!name) return toast('Please enter a habit name', 'warning');
      try {
        await api('POST', '/api/habits', { name, icon, category });
        toast('Habit created! ✅', 'success');
        closeModal('modal-add-habit');
        form.reset();
        loadHabits();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  }

  // Emoji picker shortcuts
  document.querySelectorAll('.emoji-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('habit-icon');
      if (input) input.value = btn.textContent;
    });
  });
});
