/* ============================================================
   FitLife PWA - Goals
   ============================================================ */

async function loadGoals() {
  try {
    const goals = await api('GET', '/api/goals');
    renderGoals(goals);
  } catch (e) {
    toast('Failed to load goals: ' + e.message, 'error');
  }
}

function renderGoals(goals) {
  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');

  renderGoalList('active-goals', active, false);
  renderGoalList('completed-goals', completed, true);

  setEl('goals-active-count', active.length);
  setEl('goals-completed-count', completed.length);
}

function renderGoalList(containerId, goals, isCompleted) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!goals.length) {
    container.innerHTML = isCompleted
      ? '<p class="text-sm text-muted text-center">No completed goals yet</p>'
      : '<div class="empty-state"><div class="empty-icon">🎯</div><p>No goals set. Set your first goal!</p></div>';
    return;
  }

  const categoryIcon = (c) => ({ running: '🏃', weight: '⚖️', nutrition: '🥗', steps: '🚶', sleep: '😴', strength: '💪', general: '🎯' }[c] || '🎯');

  container.innerHTML = goals.map(g => {
    const current = parseFloat(g.current_value) || 0;
    const target = parseFloat(g.target_value) || 1;
    const pct = Math.min(100, Math.round(current / target * 100));
    const deadline = g.deadline ? `Due: ${formatDate(g.deadline)}` : '';
    const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;

    return `
      <div class="goal-item">
        <div class="goal-header">
          <span style="font-size:1.4rem">${categoryIcon(g.category)}</span>
          <div class="goal-title">${g.title}</div>
          ${daysLeft !== null ? `<span class="badge ${daysLeft < 7 ? 'badge-danger' : 'badge-primary'}">${daysLeft}d left</span>` : ''}
        </div>
        ${g.description ? `<p class="text-sm text-muted mb-1">${g.description}</p>` : ''}
        <div class="flex items-center gap-1">
          <div class="progress-bar" style="flex:1">
            <div class="progress-fill ${pct >= 100 ? 'success' : ''}" style="width:${pct}%"></div>
          </div>
          <span class="goal-percent">${pct}%</span>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="text-sm text-muted">${current} / ${target} ${g.unit}</span>
          <div class="flex gap-1">
            ${!isCompleted ? `
              <button onclick="updateGoalProgress('${g.id}', ${current}, ${target}, '${g.unit}')" class="btn-icon text-sm">+</button>
              <button onclick="markGoalDone('${g.id}')" class="btn-success" style="padding:0.3rem 0.6rem;font-size:0.75rem">✓ Done</button>
            ` : '<span class="badge badge-success">✅ Completed</span>'}
            <button onclick="deleteGoalItem('${g.id}')" class="btn-danger" style="padding:0.3rem 0.6rem;font-size:0.75rem">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateGoalProgress(goalId, current, target, unit) {
  const increment = parseFloat(prompt(`Add progress (current: ${current} ${unit}):`) || '0');
  if (isNaN(increment) || increment <= 0) return;
  const newValue = current + increment;
  try {
    await api('PUT', `/api/goals/${goalId}`, { current_value: newValue });
    toast(`Progress updated! ${newValue}/${target} ${unit}`, 'success');
    if (newValue >= target) {
      if (confirm('Goal target reached! Mark as completed?')) {
        await markGoalDone(goalId);
        return;
      }
    }
    loadGoals();
  } catch (e) { toast(e.message, 'error'); }
}

async function markGoalDone(goalId) {
  try {
    await api('PUT', `/api/goals/${goalId}`, { status: 'completed' });
    toast('Goal completed! 🎉 Great work!', 'success');
    loadGoals();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteGoalItem(goalId) {
  if (!confirm('Delete this goal?')) return;
  try {
    await api('DELETE', `/api/goals/${goalId}`);
    toast('Goal deleted', 'info');
    loadGoals();
  } catch (e) { toast(e.message, 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const addGoalBtn = document.getElementById('btn-add-goal');
  if (addGoalBtn) addGoalBtn.addEventListener('click', () => openModal('modal-add-goal'));

  const form = document.getElementById('form-add-goal');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const goal = {
        title: document.getElementById('goal-title').value.trim(),
        description: document.getElementById('goal-description').value.trim(),
        category: document.getElementById('goal-category').value,
        target_value: parseFloat(document.getElementById('goal-target').value) || 0,
        unit: document.getElementById('goal-unit').value.trim(),
        deadline: document.getElementById('goal-deadline').value,
      };
      if (!goal.title) return toast('Please enter a goal title', 'warning');
      try {
        await api('POST', '/api/goals', goal);
        toast('Goal created! 🎯', 'success');
        closeModal('modal-add-goal');
        form.reset();
        loadGoals();
      } catch (e) { toast(e.message, 'error'); }
    });
  }
});
