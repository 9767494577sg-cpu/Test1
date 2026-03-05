/* ============================================================
   FitLife PWA - Smart Reminders
   ============================================================ */

async function loadReminders() {
  try {
    const reminders = await api('GET', '/api/reminders');
    renderReminders(reminders);
    checkNotificationPermission();
  } catch (e) {
    toast('Failed to load reminders: ' + e.message, 'error');
  }
}

function renderReminders(reminders) {
  const container = document.getElementById('reminders-list');
  if (!container) return;
  if (!reminders.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><p>No reminders set. Add one to stay on track!</p></div>';
    return;
  }

  const typeIcons = {
    workout: '🏋️', water: '💧', sleep: '😴', nutrition: '🥗', habit: '✅', custom: '📝'
  };

  container.innerHTML = reminders.map(r => `
    <div class="reminder-item">
      <span class="reminder-icon">${typeIcons[r.type] || '🔔'}</span>
      <div class="reminder-info">
        <div class="reminder-title">${r.title}</div>
        <div class="reminder-time">⏰ ${r.time} · ${formatDays(r.days)}</div>
      </div>
      <div class="toggle-switch ${r.enabled === 'True' ? 'on' : ''}" onclick="toggleReminder('${r.id}', ${r.enabled !== 'True'})"></div>
      <button onclick="deleteReminderItem('${r.id}')" class="btn-icon text-sm">🗑️</button>
    </div>
  `).join('');
}

function formatDays(daysJson) {
  try {
    const days = typeof daysJson === 'string' ? JSON.parse(daysJson) : daysJson;
    if (Array.isArray(days) && days.length === 7) return 'Every day';
    if (Array.isArray(days) && days.length === 5) return 'Weekdays';
    return Array.isArray(days) ? days.join(', ') : 'Custom';
  } catch { return 'Custom'; }
}

async function toggleReminder(id, enabled) {
  try {
    await api('PUT', `/api/reminders/${id}`, { enabled: enabled ? 'True' : 'False' });
    loadReminders();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteReminderItem(id) {
  try {
    await api('DELETE', `/api/reminders/${id}`);
    toast('Reminder deleted', 'info');
    loadReminders();
  } catch (e) { toast(e.message, 'error'); }
}

function checkNotificationPermission() {
  const statusEl = document.getElementById('notification-status');
  if (!statusEl) return;
  if (!('Notification' in window)) {
    statusEl.textContent = '⚠️ Notifications not supported on this browser';
    return;
  }
  if (Notification.permission === 'granted') {
    statusEl.textContent = '✅ Notifications enabled';
    statusEl.style.color = 'var(--success)';
  } else if (Notification.permission === 'denied') {
    statusEl.textContent = '❌ Notifications blocked. Please enable in browser settings.';
    statusEl.style.color = 'var(--danger)';
  } else {
    statusEl.textContent = '🔔 Enable notifications to receive reminders';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('btn-add-reminder');
  if (addBtn) addBtn.addEventListener('click', () => openModal('modal-add-reminder'));

  const enableNotifBtn = document.getElementById('btn-enable-notifications');
  if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', async () => {
      const perm = await Notification.requestPermission();
      checkNotificationPermission();
      if (perm === 'granted') toast('Notifications enabled! 🔔', 'success');
      else toast('Notification permission denied', 'warning');
    });
  }

  const form = document.getElementById('form-add-reminder');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = document.getElementById('reminder-type').value;
      const title = document.getElementById('reminder-title').value.trim();
      const time = document.getElementById('reminder-time').value;
      const daysCheckboxes = document.querySelectorAll('.reminder-day:checked');
      const days = Array.from(daysCheckboxes).map(c => c.value);

      if (!title || !time) return toast('Please fill all fields', 'warning');
      if (!days.length) return toast('Please select at least one day', 'warning');

      // Schedule local notification
      if (Notification.permission === 'granted') {
        scheduleLocalNotification(title, time, days);
      }

      try {
        await api('POST', '/api/reminders', { type, title, time, days });
        toast('Reminder added! 🔔', 'success');
        closeModal('modal-add-reminder');
        form.reset();
        loadReminders();
      } catch (e) { toast(e.message, 'error'); }
    });
  }
});

function scheduleLocalNotification(title, time, days) {
  // Simple client-side notification scheduler
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const nextTrigger = new Date();
  nextTrigger.setHours(hours, minutes, 0, 0);
  if (nextTrigger <= now) nextTrigger.setDate(nextTrigger.getDate() + 1);

  const ms = nextTrigger - now;
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('FitLife Reminder', {
        body: title,
        icon: '/icons/icon-192.png',
      });
    }
  }, ms);
}
