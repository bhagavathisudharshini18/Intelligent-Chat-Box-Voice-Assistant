/**
 * Preferences & Theme Manager
 */
const Preferences = {
  data: {
    language: 'en-US',
    voiceEnabled: true,
    ttsEnabled: true,
    autoSpeak: false,
    voiceName: 'default',
    speechRate: 1.0,
    speechPitch: 1.0,
    theme: 'dark',
    aiPersona: 'helpful_assistant'
  },

  async init() {
    this.initTheme();
    this.bindEvents();
    await this.loadFromServer();
    this.populateVoiceList();

    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.populateVoiceList();
      };
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    this.setTheme(savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(nextTheme);
        this.saveLocally();
      });
    }
  },

  setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    this.data.theme = theme;

    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
    }
  },

  async loadFromServer() {
    try {
      const res = await API.getPreferences();
      if (res.success && res.preferences) {
        this.data = { ...this.data, ...res.preferences };
        this.applyToForm();
        this.updatePersonaBadge();
      }
    } catch (err) {
      console.warn('[Preferences] Using local preferences:', err.message);
    }
  },

  populateVoiceList() {
    if (!window.speechSynthesis) return;
    const voiceSelect = document.getElementById('prefVoiceSelect');
    if (!voiceSelect) return;

    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = '<option value="default">System Default Voice</option>';

    voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Default' : ''}`;
      if (this.data.voiceName === voice.name) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
  },

  applyToForm() {
    const personaEl = document.getElementById('prefPersona');
    const autoSpeakEl = document.getElementById('prefAutoSpeak');
    const rateEl = document.getElementById('prefRate');
    const pitchEl = document.getElementById('prefPitch');
    const rateValEl = document.getElementById('rateVal');
    const pitchValEl = document.getElementById('pitchVal');

    if (personaEl) personaEl.value = this.data.aiPersona || 'helpful_assistant';
    if (autoSpeakEl) autoSpeakEl.checked = Boolean(this.data.autoSpeak);
    if (rateEl) {
      rateEl.value = this.data.speechRate || 1.0;
      if (rateValEl) rateValEl.textContent = `${rateEl.value}x`;
    }
    if (pitchEl) {
      pitchEl.value = this.data.speechPitch || 1.0;
      if (pitchValEl) pitchValEl.textContent = `${pitchEl.value}`;
    }
  },

  updatePersonaBadge() {
    const badgeEl = document.getElementById('personaBadge');
    if (!badgeEl) return;

    const personaNames = {
      helpful_assistant: 'Intelligent Assistant',
      code_helper: 'Code Expert',
      tutor: 'Academic Tutor',
      creative: 'Creative Writer',
      concise: 'Concise & Direct'
    };

    const name = personaNames[this.data.aiPersona] || 'Intelligent Assistant';
    badgeEl.innerHTML = `<i class="fa-solid fa-brain me-1"></i> ${name}`;
  },

  bindEvents() {
    const rateEl = document.getElementById('prefRate');
    const pitchEl = document.getElementById('prefPitch');
    const rateValEl = document.getElementById('rateVal');
    const pitchValEl = document.getElementById('pitchVal');

    if (rateEl && rateValEl) {
      rateEl.addEventListener('input', () => {
        rateValEl.textContent = `${rateEl.value}x`;
      });
    }

    if (pitchEl && pitchValEl) {
      pitchEl.addEventListener('input', () => {
        pitchValEl.textContent = `${pitchEl.value}`;
      });
    }

    const form = document.getElementById('preferencesForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const persona = document.getElementById('prefPersona').value;
        const autoSpeak = document.getElementById('prefAutoSpeak').checked;
        const voiceSelect = document.getElementById('prefVoiceSelect').value;
        const rate = parseFloat(document.getElementById('prefRate').value);
        const pitch = parseFloat(document.getElementById('prefPitch').value);

        this.data = {
          ...this.data,
          aiPersona: persona,
          autoSpeak,
          voiceName: voiceSelect,
          speechRate: rate,
          speechPitch: pitch
        };

        try {
          await API.updatePreferences(this.data);
        } catch (err) {
          console.warn('[Preferences] Server update failed:', err.message);
        }

        this.saveLocally();
        this.updatePersonaBadge();

        const modalEl = document.getElementById('settingsModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      });
    }

    const testVoiceBtn = document.getElementById('testVoiceBtn');
    if (testVoiceBtn) {
      testVoiceBtn.addEventListener('click', () => {
        if (window.Voice) {
          window.Voice.speak("Hello! This is a preview of my voice with your selected speed and pitch settings.");
        }
      });
    }
  },

  saveLocally() {
    localStorage.setItem('user_preferences', JSON.stringify(this.data));
  }
};
