/* ============================================================
   FitLife PWA - Profile
   ============================================================ */

async function loadProfile() {
  const user = FitLife.user;
  if (!user) return;

  setEl('profile-name', user.name);
  setEl('profile-email', user.email);
  setEl('profile-level-txt', `Level ${user.level}`);
  setEl('profile-fitness-level', user.fitness_level || 'beginner');
  setEl('profile-avatar-display', user.avatar || '🏃');

  document.getElementById('edit-name').value = user.name || '';
  document.getElementById('edit-fitness-level').value = user.fitness_level || 'beginner';
  document.getElementById('edit-avatar').value = user.avatar || '🏃';
}

document.addEventListener('DOMContentLoaded', () => {
  const saveProfileBtn = document.getElementById('btn-save-profile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
      const name = document.getElementById('edit-name').value.trim();
      const fitness_level = document.getElementById('edit-fitness-level').value;
      const avatar = document.getElementById('edit-avatar').value.trim() || '🏃';
      try {
        const updated = await api('PUT', '/api/auth/me', { name, fitness_level, avatar });
        FitLife.user = updated;
        localStorage.setItem('fitlife_user', JSON.stringify(updated));
        updateNavXP();
        loadProfile();
        toast('Profile updated! ✅', 'success');
      } catch (e) { toast(e.message, 'error'); }
    });
  }

  // Avatar emoji picker
  document.querySelectorAll('.avatar-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('edit-avatar');
      if (input) {
        input.value = btn.textContent;
        document.getElementById('profile-avatar-display').textContent = btn.textContent;
      }
    });
  });
});
