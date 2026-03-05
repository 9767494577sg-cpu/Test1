/* ============================================================
   FitLife PWA - Sleep Tracker
   ============================================================ */

let selectedQuality = 3;

async function loadSleep() {
  try {
    const entries = await api('GET', '/api/sleep');
    renderSleepHistory(entries);
    renderSleepChart(entries);
  } catch (e) {
    toast('Failed to load sleep: ' + e.message, 'error');
  }
}

function renderSleepHistory(entries) {
  const container = document.getElementById('sleep-history');
  if (!container) return;
  if (!entries.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">😴</div><p>No sleep logged yet. Log your sleep to see insights!</p></div>';
    return;
  }

  const qualityEmoji = (q) => ['', '😣', '😴', '😐', '😊', '🌟'][parseInt(q)] || '😐';

  container.innerHTML = entries.slice(0, 7).map(e => `
    <div class="card mb-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span style="font-size:1.5rem">😴</span>
          <div>
            <div class="font-bold">${parseFloat(e.duration_h).toFixed(1)} hours</div>
            <div class="text-sm text-muted">${formatDateFull(e.date)}</div>
          </div>
        </div>
        <div class="text-center">
          <div style="font-size:1.3rem">${qualityEmoji(e.quality)}</div>
          <div class="text-sm text-muted">Quality ${e.quality}/5</div>
        </div>
        <div class="text-right">
          <div class="text-sm text-secondary">${e.sleep_time}</div>
          <div class="text-sm text-muted">→ ${e.wake_time}</div>
        </div>
      </div>
      ${e.notes ? `<p class="text-sm text-muted mt-1">${e.notes}</p>` : ''}
    </div>
  `).join('');
}

function renderSleepChart(entries) {
  const canvas = document.getElementById('sleep-chart');
  if (!canvas || !entries.length) return;
  if (FitLife.charts.sleep) FitLife.charts.sleep.destroy();

  const last7 = [...entries].slice(0, 7).reverse();
  FitLife.charts.sleep = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: last7.map(e => formatDate(e.date)),
      datasets: [{
        label: 'Hours',
        data: last7.map(e => parseFloat(e.duration_h)),
        backgroundColor: (ctx) => {
          const val = ctx.raw;
          if (val >= 7) return 'rgba(16,185,129,0.7)';
          if (val >= 5) return 'rgba(245,158,11,0.7)';
          return 'rgba(239,68,68,0.7)';
        },
        borderWidth: 0, borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        annotation: {
          annotations: {
            recommended: {
              type: 'line', yMin: 7, yMax: 7,
              borderColor: 'rgba(99,102,241,0.5)', borderWidth: 2, borderDash: [5, 5],
              label: { content: 'Recommended 7h', enabled: true, color: '#94a3b8', font: { size: 10 } }
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, max: 12, ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}

// ---- Sleep quality selector ----
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedQuality = parseInt(btn.dataset.quality);
      document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  const addSleepBtn = document.getElementById('btn-log-sleep');
  if (addSleepBtn) addSleepBtn.addEventListener('click', () => {
    document.getElementById('sleep-date').value = today();
    openModal('modal-log-sleep');
  });

  const form = document.getElementById('form-log-sleep');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const entry = {
        date: document.getElementById('sleep-date').value || today(),
        sleep_time: document.getElementById('sleep-time').value,
        wake_time: document.getElementById('wake-time').value,
        quality: selectedQuality,
        notes: document.getElementById('sleep-notes').value,
      };
      try {
        await api('POST', '/api/sleep', entry);
        toast('Sleep logged! 😴', 'success');
        closeModal('modal-log-sleep');
        form.reset();
        loadSleep();
      } catch (e) { toast(e.message, 'error'); }
    });
  }
});
