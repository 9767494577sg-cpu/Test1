/* ============================================================
   FitLife PWA - Running Tracker
   ============================================================ */

let runState = {
  active: false,
  startTime: null,
  timerInterval: null,
  distanceKm: 0,
  route: [],
  lastPos: null,
  map: null,
  polyline: null,
  marker: null,
};

// Load run history
async function loadRunHistory() {
  try {
    const runs = await api('GET', '/api/runs');
    renderRunHistory(runs);
    const bests = await api('GET', '/api/runs/personal-bests');
    renderPersonalBests(bests);
  } catch (e) {
    toast('Failed to load runs: ' + e.message, 'error');
  }
}

function renderRunHistory(runs) {
  const container = document.getElementById('run-history');
  if (!container) return;
  if (!runs.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏃</div><p>No runs yet. Start your first run!</p></div>';
    return;
  }
  container.innerHTML = runs.slice(0, 10).map(r => `
    <div class="card mb-1">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span style="font-size:1.3rem">🏃</span>
          <div>
            <div class="font-bold">${parseFloat(r.distance_km).toFixed(2)} km</div>
            <div class="text-sm text-muted">${formatDateFull(r.date)}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-sm" style="color:var(--primary-light)">${formatTime(parseInt(r.duration_sec))}</div>
          <div class="text-sm text-muted">${formatPace(parseFloat(r.pace))} /km</div>
        </div>
        <div class="text-right">
          <div class="text-sm text-warning">${r.calories} kcal</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderPersonalBests(bests) {
  const container = document.getElementById('personal-bests');
  if (!container) return;
  container.innerHTML = `
    <div class="grid-3 text-center">
      <div>
        <div class="stat-value" style="font-size:1.2rem;color:var(--accent)">${bests.total_runs || 0}</div>
        <div class="text-sm text-muted">Total Runs</div>
      </div>
      <div>
        <div class="stat-value" style="font-size:1.2rem;color:var(--success)">${bests.total_distance || 0} km</div>
        <div class="text-sm text-muted">Total Distance</div>
      </div>
      <div>
        <div class="stat-value" style="font-size:1.2rem;color:var(--primary-light)">${bests.best_distance ? parseFloat(bests.best_distance.distance_km).toFixed(1) + ' km' : '—'}</div>
        <div class="text-sm text-muted">Best Run</div>
      </div>
    </div>
  `;
}

// Init map (called when Google Maps loads)
function initRunMap() {
  const mapEl = document.getElementById('map-container');
  if (!mapEl || runState.map) return;
  try {
    runState.map = new google.maps.Map(mapEl, {
      center: { lat: 0, lng: 0 },
      zoom: 15,
      styles: darkMapStyle(),
      disableDefaultUI: true,
      zoomControl: true,
    });
  } catch (e) {
    mapEl.innerHTML = '<div class="empty-state"><p>Map requires Google Maps API key</p></div>';
  }
}

// Start run
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('btn-run-start');
  const stopBtn = document.getElementById('btn-run-stop');
  const pauseBtn = document.getElementById('btn-run-pause');

  if (startBtn) startBtn.addEventListener('click', startRun);
  if (stopBtn) stopBtn.addEventListener('click', stopRun);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseRun);

  // Manual log run
  const logRunForm = document.getElementById('form-log-run');
  if (logRunForm) {
    logRunForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const distance = parseFloat(document.getElementById('log-distance').value);
      const minutes = parseFloat(document.getElementById('log-duration').value);
      const date = document.getElementById('log-run-date').value || today();
      try {
        await api('POST', '/api/runs', { distance_km: distance, duration_sec: minutes * 60, date });
        toast('Run logged! +20 XP 🏃', 'success');
        closeModal('modal-log-run');
        loadRunHistory();
        await refreshUserXP();
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  }
});

function startRun() {
  if (!navigator.geolocation) {
    toast('Geolocation not supported on this device', 'error');
    return;
  }

  runState.active = true;
  runState.startTime = Date.now();
  runState.distanceKm = 0;
  runState.route = [];
  runState.lastPos = null;

  document.getElementById('btn-run-start').classList.add('hidden');
  document.getElementById('run-active-controls').classList.remove('hidden');
  document.getElementById('run-status').textContent = '● Running';
  document.getElementById('run-status').style.color = 'var(--success)';

  // Start timer
  runState.timerInterval = setInterval(updateRunTimer, 1000);

  // Start GPS tracking
  runState.watchId = navigator.geolocation.watchPosition(
    handleGPSUpdate,
    (err) => toast('GPS error: ' + err.message, 'warning'),
    { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
  );

  toast('Run started! GPS tracking active 🗺️', 'success');
}

function stopRun() {
  if (!runState.active) return;
  runState.active = false;
  clearInterval(runState.timerInterval);
  if (runState.watchId) navigator.geolocation.clearWatch(runState.watchId);

  document.getElementById('btn-run-start').classList.remove('hidden');
  document.getElementById('run-active-controls').classList.add('hidden');
  document.getElementById('run-status').textContent = 'Ready';
  document.getElementById('run-status').style.color = 'var(--text-muted)';

  const elapsed = runState.startTime ? (Date.now() - runState.startTime) / 1000 : 0;

  if (runState.distanceKm < 0.01) {
    toast('Run too short to save. Try again!', 'warning');
    resetRunDisplay();
    return;
  }

  // Save run
  api('POST', '/api/runs', {
    distance_km: runState.distanceKm,
    duration_sec: elapsed,
    route: runState.route,
  }).then(() => {
    toast(`Run saved! ${runState.distanceKm.toFixed(2)} km ✅ +20 XP`, 'success');
    resetRunDisplay();
    loadRunHistory();
    refreshUserXP();
  }).catch(e => toast(e.message, 'error'));
}

function pauseRun() {
  if (runState.active) {
    runState.active = false;
    clearInterval(runState.timerInterval);
    if (runState.watchId) navigator.geolocation.clearWatch(runState.watchId);
    document.getElementById('btn-run-pause').textContent = '▶ Resume';
    document.getElementById('run-status').textContent = '⏸ Paused';
    document.getElementById('run-status').style.color = 'var(--warning)';
  } else {
    runState.active = true;
    runState.timerInterval = setInterval(updateRunTimer, 1000);
    runState.watchId = navigator.geolocation.watchPosition(handleGPSUpdate, null, { enableHighAccuracy: true });
    document.getElementById('btn-run-pause').textContent = '⏸ Pause';
    document.getElementById('run-status').textContent = '● Running';
    document.getElementById('run-status').style.color = 'var(--success)';
  }
}

function updateRunTimer() {
  const elapsed = (Date.now() - runState.startTime) / 1000;
  document.getElementById('run-clock').textContent = formatTime(elapsed);

  const pace = runState.distanceKm > 0 ? (elapsed / 60) / runState.distanceKm : 0;
  document.getElementById('run-pace').textContent = formatPace(pace);
  document.getElementById('run-distance').textContent = runState.distanceKm.toFixed(2);
  document.getElementById('run-calories').textContent = Math.round(runState.distanceKm * 70);
}

function handleGPSUpdate(position) {
  const { latitude: lat, longitude: lng } = position.coords;
  const newPos = { lat, lng };

  if (runState.lastPos) {
    const d = haversineKm(runState.lastPos, newPos);
    if (d < 0.5) { // max 500m between updates (filter GPS noise)
      runState.distanceKm += d;
    }
  }
  runState.lastPos = newPos;
  runState.route.push(newPos);

  // Update map
  if (runState.map) {
    runState.map.setCenter(newPos);
    if (runState.polyline) runState.polyline.setPath(runState.route);
    else {
      runState.polyline = new google.maps.Polyline({
        path: runState.route,
        geodesic: true,
        strokeColor: '#6366f1',
        strokeOpacity: 1,
        strokeWeight: 4,
        map: runState.map,
      });
    }
    if (runState.marker) runState.marker.setPosition(newPos);
    else {
      runState.marker = new google.maps.Marker({ position: newPos, map: runState.map, title: 'You' });
    }
  }
}

function haversineKm(p1, p2) {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(p1.lat * Math.PI/180) * Math.cos(p2.lat * Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function resetRunDisplay() {
  document.getElementById('run-clock').textContent = '00:00';
  document.getElementById('run-distance').textContent = '0.00';
  document.getElementById('run-pace').textContent = '--:--';
  document.getElementById('run-calories').textContent = '0';
}

async function refreshUserXP() {
  try {
    const me = await api('GET', '/api/auth/me');
    FitLife.user = me;
    localStorage.setItem('fitlife_user', JSON.stringify(me));
    updateNavXP();
  } catch (e) {}
}

function darkMapStyle() {
  return [
    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#475569' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  ];
}
