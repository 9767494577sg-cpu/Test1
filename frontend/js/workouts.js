/* ============================================================
   FitLife PWA - Workout Library
   ============================================================ */

async function loadWorkouts() {
  try {
    const workouts = await api('GET', '/api/workouts?level=all');
    renderWorkouts(workouts, 'all');
  } catch (e) {
    toast('Failed to load workouts: ' + e.message, 'error');
  }
}

function renderWorkouts(workouts, filter) {
  const container = document.getElementById('workouts-list');
  if (!container) return;
  const filtered = filter === 'all' ? workouts : workouts.filter(w => w.level === filter);

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><p>No workouts found</p></div>';
    return;
  }

  const catIcons = { strength: '🏋️', cardio: '🏃', yoga: '🧘', hiit: '🔥' };
  const levelColors = { beginner: 'badge-success', intermediate: 'badge-warning', advanced: 'badge-danger' };

  container.innerHTML = filtered.map(w => `
    <div class="workout-card" onclick="startWorkout('${w.id}', '${encodeURIComponent(JSON.stringify(w))}')">
      <div class="workout-header">
        <span class="workout-icon">${catIcons[w.category] || '💪'}</span>
        <div>
          <div class="workout-title">${w.name}</div>
          <div class="workout-meta">⏱ ${w.duration} min · 🔥 ${w.calories} kcal</div>
        </div>
        <span class="badge ${levelColors[w.level] || 'badge-primary'}">${w.level}</span>
      </div>
      <p class="text-sm text-secondary">${w.description}</p>
      <div class="workout-exercises">
        ${w.exercises.map(ex => `<div class="workout-exercise">${ex}</div>`).join('')}
      </div>
    </div>
  `).join('');
}

function startWorkout(workoutId, encodedWorkout) {
  const w = JSON.parse(decodeURIComponent(encodedWorkout));
  document.getElementById('workout-modal-name').textContent = w.name;
  document.getElementById('workout-modal-desc').textContent = w.description;
  document.getElementById('workout-modal-duration').textContent = `${w.duration} min`;
  document.getElementById('workout-modal-calories').textContent = `${w.calories} kcal`;
  document.getElementById('workout-modal-exercises').innerHTML = w.exercises
    .map(ex => `<li class="text-sm text-secondary" style="margin-bottom:0.4rem">• ${ex}</li>`)
    .join('');

  document.getElementById('btn-confirm-workout').onclick = async () => {
    try {
      await api('POST', '/api/workouts/log', {
        workout_id: workoutId,
        duration_min: w.duration,
        calories: w.calories,
      });
      toast(`${w.name} completed! +15 XP 💪`, 'success');
      closeModal('modal-start-workout');
      refreshUserXP();
    } catch (e) { toast(e.message, 'error'); }
  };

  openModal('modal-start-workout');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const level = btn.dataset.level;
      try {
        const workouts = await api('GET', `/api/workouts?level=${level}`);
        renderWorkouts(workouts.map ? workouts : Object.values(workouts).flat(), level === 'all' ? 'all' : level);
      } catch (e) { toast(e.message, 'error'); }
    });
  });
});
