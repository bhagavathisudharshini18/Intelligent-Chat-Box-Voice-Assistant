/**
 * Voice Manager: Speech-to-Text (STT), Text-to-Speech (TTS), and Waveform Visualizer
 */
const Voice = {
  recognition: null,
  isListening: false,
  isSpeaking: false,
  visualizerInterval: null,
  activeSpeechUtterance: null,
  canvas: null,
  canvasCtx: null,

  init() {
    this.initVisualizer();
    this.initSTT();
    this.bindEvents();
  },

  initVisualizer() {
    this.canvas = document.getElementById('audioVisualizerCanvas');
    if (this.canvas) {
      this.canvasCtx = this.canvas.getContext('2d');
    }
  },

  initSTT() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Voice] Web Speech Recognition API not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = Preferences.data.language || 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateMicUI(true);
      this.showVisualizer('Listening to your voice...');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const interimBanner = document.getElementById('interimTranscriptBanner');
      const interimText = document.getElementById('interimTranscriptText');
      const messageInput = document.getElementById('messageInput');

      if (interimTranscript) {
        interimBanner.classList.remove('d-none');
        interimText.textContent = `"${interimTranscript}"`;
      }

      if (finalTranscript) {
        interimBanner.classList.add('d-none');
        messageInput.value = finalTranscript.trim();
        if (window.App) window.App.updateCharCount();

        // Send transcript to backend for telemetry/validation
        API.logVoiceTranscription({
          transcript: finalTranscript.trim(),
          durationMs: 2500
        }).catch(() => {});

        // Automatically submit voice query
        if (window.App) {
          window.App.sendMessage('voice');
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[Voice] STT Error:', event.error);
      this.stopListening();

      let msg = 'Voice recognition error.';
      if (event.error === 'not-allowed') {
        msg = 'Microphone permission denied. Please enable microphone access in your browser settings.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech detected. Please try speaking again.';
      } else if (event.error === 'network') {
        msg = 'Network issue during voice recognition.';
      }

      if (window.App && event.error !== 'no-speech') {
        window.App.showNotification(msg, 'warning');
      }
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  },

  startListening() {
    if (!this.recognition) {
      if (window.App) {
        window.App.showNotification('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.', 'warning');
      }
      return;
    }

    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    try {
      this.recognition.lang = Preferences.data.language || 'en-US';
      this.recognition.start();
    } catch (err) {
      console.warn('[Voice] Could not start recognition:', err.message);
      this.stopListening();
    }
  },

  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
    this.updateMicUI(false);
    this.hideVisualizer();
    const interimBanner = document.getElementById('interimTranscriptBanner');
    if (interimBanner) interimBanner.classList.add('d-none');
  },

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  },

  updateMicUI(active) {
    const micBtn = document.getElementById('micBtn');
    const voiceStatusBadge = document.getElementById('voiceStatusBadge');

    if (micBtn) {
      if (active) {
        micBtn.classList.add('listening');
      } else {
        micBtn.classList.remove('listening');
      }
    }

    if (voiceStatusBadge) {
      if (active) {
        voiceStatusBadge.classList.remove('d-none');
      } else {
        voiceStatusBadge.classList.add('d-none');
      }
    }
  },

  /**
   * Speak response using Text-to-Speech (TTS)
   */
  speak(text) {
    if (!window.speechSynthesis) return;

    this.stopSpeaking();

    // Clean text of code blocks and markdown symbols
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted for audio.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*#_~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const pref = Preferences.data;

    utterance.rate = pref.speechRate || 1.0;
    utterance.pitch = pref.speechPitch || 1.0;
    utterance.lang = pref.language || 'en-US';

    const voices = window.speechSynthesis.getVoices();
    if (pref.voiceName && pref.voiceName !== 'default') {
      const selectedVoice = voices.find(v => v.name === pref.voiceName);
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.showStopButton(true);
      this.showVisualizer('Speaking response...');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.showStopButton(false);
      this.hideVisualizer();
    };

    utterance.onerror = (e) => {
      console.warn('[Voice] TTS error:', e);
      this.isSpeaking = false;
      this.showStopButton(false);
      this.hideVisualizer();
    };

    this.activeSpeechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  },

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
    this.showStopButton(false);
    this.hideVisualizer();
  },

  showStopButton(visible) {
    const btn = document.getElementById('stopSpeechBtn');
    if (btn) {
      btn.style.display = visible ? 'inline-flex' : 'none';
    }
  },

  // Waveform Visualizer
  showVisualizer(labelText = 'Active') {
    const container = document.getElementById('visualizerContainer');
    const label = document.getElementById('visualizerLabel');
    if (container) container.classList.remove('d-none');
    if (label) label.textContent = labelText;

    if (this.visualizerInterval) clearInterval(this.visualizerInterval);

    let step = 0;
    this.visualizerInterval = setInterval(() => {
      if (!this.canvasCtx || !this.canvas) return;
      const ctx = this.canvasCtx;
      const width = (this.canvas.width = this.canvas.offsetWidth);
      const height = this.canvas.height;

      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.getAttribute('data-bs-theme') === 'light';
      ctx.fillStyle = isLight ? '#4f46e5' : '#818cf8';

      const barCount = 36;
      const barWidth = width / barCount - 3;

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + 3);
        const freq = Math.sin(step + i * 0.4) * 0.5 + 0.5;
        const barHeight = Math.max(4, freq * (height - 8));
        const y = (height - barHeight) / 2;

        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 2) : ctx.rect(x, y, barWidth, barHeight);
        ctx.fill();
      }

      step += 0.15;
    }, 40);
  },

  hideVisualizer() {
    if (this.isListening || this.isSpeaking) return;
    const container = document.getElementById('visualizerContainer');
    if (container) container.classList.add('d-none');
    if (this.visualizerInterval) {
      clearInterval(this.visualizerInterval);
      this.visualizerInterval = null;
    }
  },

  bindEvents() {
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleListening());
    }

    const stopSpeechBtn = document.getElementById('stopSpeechBtn');
    if (stopSpeechBtn) {
      stopSpeechBtn.addEventListener('click', () => this.stopSpeaking());
    }
  }
};
