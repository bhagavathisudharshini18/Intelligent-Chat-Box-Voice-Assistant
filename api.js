/**
 * API Client wrapper for Intelligent Chat Box & Voice Assistant
 */
const API = {
  getGuestId() {
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('guest_id', guestId);
    }
    return guestId;
  },

  getToken() {
    return localStorage.getItem('auth_token');
  },

  async request(endpoint, options = {}, retries = 2) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'x-guest-id': this.getGuestId(),
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(endpoint, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (error) {
      if (retries > 0 && (!options.method || options.method === 'GET' || options.method === 'POST')) {
        console.warn(`[API] Retrying request to ${endpoint} (${retries} attempts left)...`);
        await new Promise(r => setTimeout(r, 600));
        return this.request(endpoint, options, retries - 1);
      }
      throw error;
    }
  },

  // Auth endpoints
  register(userData) {
    return this.request('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }, 0);
  },

  login(credentials) {
    return this.request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }, 0);
  },

  logout() {
    return this.request('/api/auth/logout', { method: 'POST' }, 0);
  },

  getProfile() {
    return this.request('/api/auth/me');
  },

  // Chat endpoints
  sendMessage(payload) {
    return this.request('/api/chat/message', { method: 'POST', body: JSON.stringify(payload) });
  },

  getPersonas() {
    return this.request('/api/chat/personas');
  },

  // Voice endpoints
  logVoiceTranscription(payload) {
    return this.request('/api/voice/transcribe', { method: 'POST', body: JSON.stringify(payload) });
  },

  getSpeechConfig(payload) {
    return this.request('/api/voice/speak', { method: 'POST', body: JSON.stringify(payload) });
  },

  // Conversations endpoints
  getConversations() {
    return this.request('/api/conversations');
  },

  getConversation(id) {
    return this.request(`/api/conversations/${id}`);
  },

  createConversation(title) {
    return this.request('/api/conversations', { method: 'POST', body: JSON.stringify({ title }) });
  },

  deleteConversation(id) {
    return this.request(`/api/conversations/${id}`, { method: 'DELETE' });
  },

  // Preferences endpoints
  getPreferences() {
    return this.request('/api/preferences');
  },

  updatePreferences(prefData) {
    return this.request('/api/preferences', { method: 'PUT', body: JSON.stringify(prefData) });
  },

  // Feedback endpoint
  sendFeedback(payload) {
    return this.request('/api/feedback', { method: 'POST', body: JSON.stringify(payload) });
  }
};
