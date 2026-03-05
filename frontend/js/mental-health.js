/* ============================================================
   FitLife PWA - Mental Health Section
   ============================================================ */

let meditationState = {
  active: false,
  totalSeconds: 600,
  elapsed: 0,
  interval: null,
};

let breathingState = {
  active: false,
  phase: 'ready',
  cycle: 0,
  timeout: null,
  exercise: null,
};

async function loadMentalHealth() {
  try {
    const [moods, breathing] = await Promise.all([
      api('GET', '/api/mood'),
      api('GET', '/api/mental/breathing'),
    ]);
    renderMoodHistory(moods);
    renderBreathingExercises(breathing);
    renderMoodLogger();
  } catch (e) {
    toast('Failed to load mental health: ' + e.message, 'error');
  }
}

function renderMoodLogger() {
  const container = document.getElementById('mood-logger');
  if (!container) return;
  const moods = [
    { score: 1, emoji: '😢', label: 'Terrible' },
    { score: 2, emoji: '😞', label: 'Bad' },
    { score: 3, emoji: '😐', label: 'Neutral' },
    { score: 4, emoji: '😊', label: 'Good' },
    { score: 5, emoji: '😄', label: 'Excellent' },
  ];
  container.innerHTML = `
    <div class="mood-selector">
      ${moods.map(m => `
        <button class="mood-btn" onclick="selectMood(${m.score}, this)" data-score="${m.score}">
          <span class="mood-emoji">${m.emoji}</span>
          <span class="mood-label-txt">${m.label}</span>
        </button>
      `).join('')}
    </div>
    <div id="mood-note-area" class="hidden mt-2">
      <textarea id="mood-notes" placeholder="How are you feeling? (optional)" rows="2" style="resize:none"></textarea>
      <button onclick="logMood()" class="btn-primary mt-1">Save Mood</button>
    </div>
  `;
}

let selectedMoodScore = null;
function selectMood(score, btn) {
  selectedMoodScore = score;
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('mood-note-area').classList.remove('hidden');
}

async function logMood() {
  if (!selectedMoodScore) return toast('Please select a mood', 'warning');
  const notes = document.getElementById('mood-notes')?.value || '';
  try {
    await api('POST', '/api/mood', { mood_score: selectedMoodScore, notes });
    toast('Mood logged! 💙', 'success');
    selectedMoodScore = null;
    loadMentalHealth();
  } catch (e) { toast(e.message, 'error'); }
}

function renderMoodHistory(moods) {
  const container = document.getElementById('mood-history');
  if (!container || !moods.length) return;
  const last7 = moods.slice(0, 7);
  const canvas = document.getElementById('mood-chart');
  if (canvas && FitLife.charts) {
    if (FitLife.charts.mood) FitLife.charts.mood.destroy();
    FitLife.charts.mood = new Chart(canvas, {
      type: 'line',
      data: {
        labels: last7.reverse().map(m => formatDate(m.date)),
        datasets: [{
          label: 'Mood',
          data: last7.map(m => parseInt(m.mood_score)),
          borderColor: '#a78bfa',
          backgroundColor: 'rgba(167,139,250,0.1)',
          fill: true, tension: 0.4,
          pointBackgroundColor: '#a78bfa', pointRadius: 5,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { min: 1, max: 5, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }
}

function renderBreathingExercises(exercises) {
  const container = document.getElementById('breathing-list');
  if (!container) return;
  container.innerHTML = exercises.map((ex, i) => `
    <div class="card mb-1" style="cursor:pointer" onclick="startBreathing(${i})">
      <div class="card-header">
        <span class="card-title">🫁 ${ex.name}</span>
        <span class="badge badge-primary">${ex.cycles} cycles</span>
      </div>
      <p class="text-sm text-secondary">${ex.description}</p>
      <p class="text-sm mt-1" style="color:var(--success)">✨ ${ex.benefit}</p>
    </div>
  `).join('');
}

// ---- Breathing Exercise ----
let breathingExercises = [];
function startBreathing(index) {
  // Store ref
  api('GET', '/api/mental/breathing').then(exercises => {
    breathingExercises = exercises;
    const ex = exercises[index];
    breathingState.exercise = ex;
    breathingState.cycle = 0;
    breathingState.active = true;
    openModal('modal-breathing');
    document.getElementById('breathing-name').textContent = ex.name;
    runBreathingCycle(ex);
  });
}

function runBreathingCycle(ex) {
  const circle = document.getElementById('breathing-circle');
  const phaseText = document.getElementById('breathing-phase');
  const cycleText = document.getElementById('breathing-cycles');
  const [inhale, hold, exhale] = ex.description.split('→').map(s => s.trim());

  function setPhase(text, cls, duration, next) {
    if (circle) {
      circle.className = `breathing-circle ${cls}`;
      circle.textContent = text;
    }
    if (phaseText) phaseText.textContent = text;
    breathingState.timeout = setTimeout(next, duration * 1000);
  }

  function runCycle() {
    if (!breathingState.active) return;
    breathingState.cycle++;
    if (cycleText) cycleText.textContent = `Cycle ${breathingState.cycle} / ${ex.cycles}`;

    if (breathingState.cycle > ex.cycles) {
      if (circle) { circle.textContent = '✅ Done!'; circle.className = 'breathing-circle'; }
      if (phaseText) phaseText.textContent = 'Exercise complete!';
      breathingState.active = false;
      toast('Breathing exercise complete! 🌟', 'success');
      return;
    }

    // Parse durations from description
    const durations = ex.description.match(/(\d+)s/g)?.map(d => parseInt(d)) || [4, 4, 4];
    setPhase('Inhale', 'inhale', durations[0], () => {
      if (durations[1]) setPhase('Hold', 'hold', durations[1], () => {
        setPhase('Exhale', 'exhale', durations[2] || durations[0], () => {
          setTimeout(runCycle, 500);
        });
      });
      else setPhase('Exhale', 'exhale', durations[1] || 4, () => setTimeout(runCycle, 500));
    });
  }

  runCycle();
}

function stopBreathing() {
  breathingState.active = false;
  if (breathingState.timeout) clearTimeout(breathingState.timeout);
  closeModal('modal-breathing');
}

// ---- Meditation Timer ----
document.addEventListener('DOMContentLoaded', () => {
  const meditateBtn = document.getElementById('btn-meditate');
  if (meditateBtn) meditateBtn.addEventListener('click', () => openModal('modal-meditation'));

  const startMeditateBtn = document.getElementById('btn-start-meditate');
  if (startMeditateBtn) startMeditateBtn.addEventListener('click', startMeditation);

  const stopMeditateBtn = document.getElementById('btn-stop-meditate');
  if (stopMeditateBtn) stopMeditateBtn.addEventListener('click', stopMeditation);

  // Duration presets
  document.querySelectorAll('.med-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      meditationState.totalSeconds = parseInt(btn.dataset.seconds);
      document.getElementById('meditate-duration').textContent = `${btn.dataset.seconds / 60} min`;
      document.querySelectorAll('.med-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateMeditationDisplay();
    });
  });

  document.getElementById('btn-stop-breathing')?.addEventListener('click', stopBreathing);
});

function startMeditation() {
  meditationState.active = true;
  meditationState.elapsed = 0;
  document.getElementById('btn-start-meditate').classList.add('hidden');
  document.getElementById('btn-stop-meditate').classList.remove('hidden');
  meditationState.interval = setInterval(() => {
    meditationState.elapsed++;
    updateMeditationDisplay();
    if (meditationState.elapsed >= meditationState.totalSeconds) {
      stopMeditation(true);
    }
  }, 1000);
}

function stopMeditation(completed = false) {
  clearInterval(meditationState.interval);
  meditationState.active = false;
  document.getElementById('btn-start-meditate').classList.remove('hidden');
  document.getElementById('btn-stop-meditate').classList.add('hidden');
  if (completed) {
    toast('Meditation complete! Great job! 🧘 +10 XP', 'success');
    api('POST', '/api/habits', { name: 'Meditation', icon: '🧘', category: 'mental' }).catch(() => {});
  }
  meditationState.elapsed = 0;
  updateMeditationDisplay();
}

function updateMeditationDisplay() {
  const remaining = meditationState.totalSeconds - meditationState.elapsed;
  const display = document.getElementById('meditation-timer');
  if (display) display.textContent = formatTime(remaining);
  const bar = document.getElementById('meditation-bar');
  if (bar) bar.style.width = `${meditationState.elapsed / meditationState.totalSeconds * 100}%`;
}
