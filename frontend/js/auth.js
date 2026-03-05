/* ============================================================
   FitLife PWA - Authentication
   ============================================================ */

// ---- Tab switching ----
document.addEventListener('DOMContentLoaded', () => {
  const loginTab = document.getElementById('tab-login');
  const registerTab = document.getElementById('tab-register');
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');

  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  });

  // Login form
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Logging in...';
    btn.disabled = true;
    try {
      const data = await api('POST', '/api/auth/login', { email, password });
      onAuthSuccess(data);
    } catch (err) {
      showAuthError(err.message);
    } finally {
      btn.textContent = 'Login';
      btn.disabled = false;
    }
  });

  // Register form
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthError();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const fitness_level = document.getElementById('reg-level').value;

    if (password.length < 6) {
      showAuthError('Password must be at least 6 characters');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    try {
      const data = await api('POST', '/api/auth/register', { name, email, password, fitness_level });
      onAuthSuccess(data);
      toast('Welcome to FitLife! 🎉', 'success');
    } catch (err) {
      showAuthError(err.message);
    } finally {
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  });

  // Firebase Google login (both login and register forms)
  async function handleGoogleLogin() {
    try {
      if (typeof firebase === 'undefined') {
        toast('Firebase not configured. Please use email/password login.', 'warning');
        return;
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      const user = result.user;
      const data = await api('POST', '/api/auth/firebase', {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email
      });
      onAuthSuccess(data);
      toast('Signed in with Google! 🎉', 'success');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;
      toast('Google sign-in failed: ' + err.message, 'error');
    }
  }

  document.getElementById('btn-google').addEventListener('click', handleGoogleLogin);
  const googleRegister = document.getElementById('btn-google-register');
  if (googleRegister) googleRegister.addEventListener('click', handleGoogleLogin);

  // Logout button
  document.getElementById('btn-logout').addEventListener('click', logout);
});

function onAuthSuccess(data) {
  FitLife.token = data.token;
  FitLife.user = data.user;
  localStorage.setItem('fitlife_token', data.token);
  localStorage.setItem('fitlife_user', JSON.stringify(data.user));
  document.getElementById('auth-modal').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  updateNavXP();
  navigateTo('dashboard');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearAuthError() {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.classList.add('hidden');
}
