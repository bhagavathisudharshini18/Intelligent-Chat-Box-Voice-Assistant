/**
 * Authentication management for Intelligent Chat Box & Voice Assistant
 */
const Auth = {
  currentUser: null,

  async init() {
    this.bindEvents();
    const token = API.getToken();
    if (token) {
      try {
        const res = await API.getProfile();
        if (res.success) {
          this.setCurrentUser(res.user);
        }
      } catch (err) {
        console.warn('[Auth] Session token invalid/expired. Reverting to guest mode.');
        this.logout(false);
      }
    } else {
      this.updateUI();
    }
  },

  bindEvents() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginErrorAlert');
        const submitBtn = document.getElementById('loginSubmitBtn');

        try {
          errEl.classList.add('d-none');
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

          const res = await API.login({ email, password });
          if (res.success && res.token) {
            localStorage.setItem('auth_token', res.token);
            this.setCurrentUser(res.user);
            
            // Close modal
            const modalEl = document.getElementById('authModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Refresh app data for logged in user
            if (window.App) {
              window.App.loadConversations();
              window.App.loadPreferences();
            }
          }
        } catch (error) {
          errEl.textContent = error.message || 'Login failed.';
          errEl.classList.remove('d-none');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Sign In';
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const errEl = document.getElementById('regErrorAlert');
        const submitBtn = document.getElementById('regSubmitBtn');

        try {
          errEl.classList.add('d-none');
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

          const res = await API.register({ name, email, password });
          if (res.success && res.token) {
            localStorage.setItem('auth_token', res.token);
            this.setCurrentUser(res.user);

            // Close modal
            const modalEl = document.getElementById('authModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Refresh app data for logged in user
            if (window.App) {
              window.App.loadConversations();
              window.App.loadPreferences();
            }
          }
        } catch (error) {
          errEl.textContent = error.message || 'Registration failed.';
          errEl.classList.remove('d-none');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Create Account';
        }
      });
    }

    const authContainer = document.getElementById('authContainer');
    if (authContainer) {
      authContainer.addEventListener('click', (e) => {
        const logoutBtn = e.target.closest('#logoutBtn');
        if (logoutBtn) {
          e.preventDefault();
          this.logout();
        }
      });
    }
  },

  setCurrentUser(user) {
    this.currentUser = user;
    this.updateUI();
  },

  logout(callApi = true) {
    if (callApi && API.getToken()) {
      API.logout().catch(() => {});
    }
    localStorage.removeItem('auth_token');
    this.currentUser = null;
    this.updateUI();
    if (window.App) {
      window.App.startNewConversation();
      window.App.loadConversations();
    }
  },

  updateUI() {
    const authContainer = document.getElementById('authContainer');
    const userStatusLabel = document.getElementById('userStatusLabel');

    if (!authContainer) return;

    if (this.currentUser) {
      userStatusLabel.textContent = `User: ${this.currentUser.name}`;
      authContainer.innerHTML = `
        <div class="dropdown">
          <button class="btn btn-sm btn-outline-primary rounded-pill dropdown-toggle px-3" type="button" data-bs-toggle="dropdown">
            <i class="fa-solid fa-circle-user me-1"></i> ${this.currentUser.name.split(' ')[0]}
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li class="dropdown-header">${this.currentUser.email}</li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="fa-solid fa-right-from-bracket me-2"></i>Sign Out</a></li>
          </ul>
        </div>
      `;
    } else {
      userStatusLabel.textContent = 'Guest Session';
      authContainer.innerHTML = `
        <button class="btn btn-sm btn-primary rounded-pill px-3" data-bs-toggle="modal" data-bs-target="#authModal">
          <i class="fa-solid fa-user me-1"></i> Sign In
        </button>
      `;
    }
  }
};

window.Auth = Auth;
