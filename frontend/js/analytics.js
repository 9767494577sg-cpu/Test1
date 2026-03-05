/* ============================================================
   FitLife PWA - Progress Analytics
   ============================================================ */

async function loadAnalytics() {
  try {
    const data = await api('GET', '/api/analytics');
    renderAnalytics(data);
  } catch (e) {
    toast('Failed to load analytics: ' + e.message, 'error');
  }
}

function renderAnalytics(data) {
  // Goal completion rate
  setEl('analytics-goal-rate', `${data.goals.completion_rate}%`);
  setEl('analytics-goals-done', data.goals.completed);
  setEl('analytics-goals-total', data.goals.total);

  // Default: show running chart
  showAnalyticsChart('runs', data);

  // Tab listeners
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      showAnalyticsChart(tab.dataset.chart, data);
    });
  });
}

function showAnalyticsChart(type, data) {
  const canvas = document.getElementById('analytics-chart');
  if (!canvas) return;
  if (FitLife.charts.analytics) FitLife.charts.analytics.destroy();

  const configs = {
    runs: {
      label: 'Distance (km)',
      data: data.runs.map(r => r.distance_km),
      labels: data.runs.map(r => formatDate(r.date)),
      color: '#6366f1',
      type: 'bar',
    },
    nutrition: {
      label: 'Calories',
      data: data.nutrition.map(n => n.calories),
      labels: data.nutrition.map(n => formatDate(n.date)),
      color: '#f59e0b',
      type: 'line',
    },
    mood: {
      label: 'Mood Score',
      data: data.mood.map(m => m.score),
      labels: data.mood.map(m => formatDate(m.date)),
      color: '#a78bfa',
      type: 'line',
      yMax: 5, yMin: 1,
    },
    sleep: {
      label: 'Sleep (hours)',
      data: data.sleep.map(s => s.hours),
      labels: data.sleep.map(s => formatDate(s.date)),
      color: '#06b6d4',
      type: 'bar',
    },
  };

  const cfg = configs[type];
  if (!cfg) return;

  // Show only last 14 data points for clarity
  const slice = (arr) => arr.slice(-14);

  FitLife.charts.analytics = new Chart(canvas, {
    type: cfg.type,
    data: {
      labels: slice(cfg.labels),
      datasets: [{
        label: cfg.label,
        data: slice(cfg.data),
        backgroundColor: cfg.type === 'bar'
          ? cfg.color + '99'
          : cfg.color + '20',
        borderColor: cfg.color,
        borderWidth: 2,
        borderRadius: cfg.type === 'bar' ? 6 : 0,
        fill: cfg.type === 'line',
        tension: 0.4,
        pointBackgroundColor: cfg.color,
        pointRadius: 4,
        spanGaps: true,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: type !== 'mood',
          min: cfg.yMin,
          max: cfg.yMax,
          ticks: { color: '#94a3b8', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        x: {
          ticks: { color: '#94a3b8', font: { size: 10 }, maxRotation: 45 },
          grid: { display: false },
        }
      }
    }
  });
}
