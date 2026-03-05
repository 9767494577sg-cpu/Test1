/* ============================================================
   FitLife PWA - Dashboard
   ============================================================ */

async function loadDashboard() {
  try {
    const data = await api('GET', '/api/dashboard');
    renderDashboard(data);
  } catch (e) {
    toast('Failed to load dashboard: ' + e.message, 'error');
  }
}

function renderDashboard(data) {
  const { today, streak, xp, level, weekly_runs, quote } = data;

  // Stats
  setEl('dash-distance', `${today.distance_km} km`);
  setEl('dash-calories', `${today.calories_burned} kcal`);
  setEl('dash-water', `${Math.round(today.water_ml / 250)} glasses`);
  setEl('dash-mood', today.mood ? today.mood.mood_label : '—');
  setEl('dash-streak', `${streak} days`);
  setEl('dash-habits', `${today.habits_completed}/${today.habits_total}`);

  // Quote
  if (quote) {
    setEl('quote-text', `"${quote.quote}"`);
    setEl('quote-author', `— ${quote.author}`);
  }

  // Habits progress bar
  const habitPct = today.habits_total > 0 ? Math.round(today.habits_completed / today.habits_total * 100) : 0;
  const habitBar = document.getElementById('dash-habits-bar');
  if (habitBar) { habitBar.style.width = `${habitPct}%`; }
  setEl('dash-habits-pct', `${habitPct}%`);

  // XP bar
  const xpInLevel = xp % 100;
  const xpBar = document.getElementById('dash-xp-bar');
  if (xpBar) xpBar.style.width = `${xpInLevel}%`;
  setEl('dash-level', `Level ${level}`);
  setEl('dash-xp', `${xpInLevel}/100 XP`);

  // Weekly chart
  renderWeeklyChart(weekly_runs);
}

function renderWeeklyChart(weeklyRuns) {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas) return;
  if (FitLife.charts.weekly) FitLife.charts.weekly.destroy();

  const labels = weeklyRuns.map(r => {
    const d = new Date(r.date);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  });
  const distances = weeklyRuns.map(r => r.distance_km);

  FitLife.charts.weekly = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Distance (km)',
        data: distances,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: '#6366f1',
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
