/* ============================================================
   FitLife PWA - Main App Controller
   ============================================================ */

// Firebase configuration - replace with your own
const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// API base URL
const API_BASE = window.location.origin;

// ---- Global State ----
window.FitLife = {
  token: localStorage.getItem('fitlife_token'),
  user: JSON.parse(localStorage.getItem('fitlife_user') || 'null'),
  currentSection: 'dashboard',
  charts: {},
  map: null,
  watchId: null,
  runRoute: [],
  runStartTime: null,
  runTimer: null,
  deferredInstallPrompt: null,
};

// ---- API Helper ----
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(FitLife.token ? { 'Authorization': `Bearer ${FitLife.token}` } : {})
    }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch') throw new Error('Connection failed. Check your network.');
    throw e;
  }
}

// ---- Toast Notifications ----
function toast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  t.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, duration);
}

// ---- Navigation ----
function navigateTo(sectionId) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.side-nav-item, .bottom-nav-item').forEach(i => i.classList.remove('active'));

  const section = document.getElementById(`section-${sectionId}`);
  if (section) {
    section.classList.add('active');
    section.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  document.querySelectorAll(`[data-nav="${sectionId}"]`).forEach(el => el.classList.add('active'));
  FitLife.currentSection = sectionId;
  window.location.hash = sectionId;

  // Lazy load section data
  const loaders = {
    dashboard: loadDashboard,
    running: loadRunHistory,
    habits: loadHabits,
    nutrition: loadNutrition,
    sleep: loadSleep,
    goals: loadGoals,
    challenges: loadChallenges,
    social: loadSocial,
    workouts: loadWorkouts,
    analytics: loadAnalytics,
    mental: loadMentalHealth,
    rewards: loadRewards,
    'ai-coach': loadAICoach,
    reminders: loadReminders,
    profile: loadProfile,
  };
  if (loaders[sectionId]) loaders[sectionId]();
}

// ---- Modal helpers ----
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

// ---- Format helpers ----
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function pad(n) { return n.toString().padStart(2, '0'); }
function formatPace(paceMinPerKm) {
  if (!paceMinPerKm || paceMinPerKm === 0 || paceMinPerKm === Infinity) return '--:--';
  const m = Math.floor(paceMinPerKm);
  const s = Math.round((paceMinPerKm - m) * 60);
  return `${m}:${pad(s)}`;
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateFull(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function today() {
  return new Date().toISOString().split('T')[0];
}

// ---- XP Level Display ----
function updateNavXP() {
  const user = FitLife.user;
  if (!user) return;
  const xp = parseInt(user.xp) || 0;
  const level = parseInt(user.level) || 1;
  const xpInLevel = xp % 100;
  document.getElementById('nav-xp').textContent = `⚡ ${xp} XP`;
  document.getElementById('nav-avatar').textContent = user.avatar || '🏃';
}

// ---- App Init ----
async function initApp() {
  // Show app, hide auth
  document.getElementById('loading-screen').classList.add('hidden');

  if (!FitLife.token || !FitLife.user) {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    return;
  }

  try {
    // Verify token is valid
    const me = await api('GET', '/api/auth/me');
    FitLife.user = me;
    localStorage.setItem('fitlife_user', JSON.stringify(me));
  } catch (e) {
    // Token expired or invalid
    logout();
    return;
  }

  document.getElementById('auth-modal').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  updateNavXP();

  // Navigate to hash or dashboard
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);

  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission(), 3000);
  }
}

function logout() {
  FitLife.token = null;
  FitLife.user = null;
  localStorage.removeItem('fitlife_token');
  localStorage.removeItem('fitlife_user');
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-modal').style.display = 'flex';
  toast('Logged out successfully', 'info');
}

// ---- PWA Install ----
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  FitLife.deferredInstallPrompt = e;
  document.getElementById('install-banner').classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner').classList.add('hidden');
  FitLife.deferredInstallPrompt = null;
  toast('FitLife installed successfully! 🎉', 'success');
});

// ---- Service Worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.warn('SW registration failed:', err));
  });
}

// ---- DOM Ready ----
document.addEventListener('DOMContentLoaded', () => {
  // Nav click handlers - bottom nav
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.nav));
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Install banner
  document.getElementById('btn-install').addEventListener('click', async () => {
    if (FitLife.deferredInstallPrompt) {
      FitLife.deferredInstallPrompt.prompt();
      const { outcome } = await FitLife.deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') toast('Installing FitLife...', 'info');
      FitLife.deferredInstallPrompt = null;
    }
    document.getElementById('install-banner').classList.add('hidden');
  });

  document.getElementById('btn-install-dismiss').addEventListener('click', () => {
    document.getElementById('install-banner').classList.add('hidden');
  });

  // Nav avatar opens profile
  document.getElementById('nav-avatar').addEventListener('click', () => navigateTo('profile'));

  // Initialize
  initApp();
});
