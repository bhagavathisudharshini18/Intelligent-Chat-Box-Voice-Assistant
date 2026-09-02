/**
 * Intelligent Chat Box & Voice Assistant - Application Main Controller
 */
const App = {
  activeConversationId: null,
  conversations: [],
  isSending: false,

  async init() {
    console.log('[App] Initializing Intelligent Chat Box & Voice Assistant...');
    await Auth.init();
    await Preferences.init();
    Voice.init();

    this.bindEvents();
    await this.loadConversations();
  },

  bindEvents() {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    const convSearchInput = document.getElementById('convSearchInput');
    const feedbackForm = document.getElementById('feedbackForm');

    // Auto-resizing textarea & char counter
    if (messageInput) {
      messageInput.addEventListener('input', () => {
        this.updateCharCount();
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
      });

      // Submit on Enter, newline on Shift+Enter
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage('text');
        }
      });
    }

    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage('text');
      });
    }

    if (newChatBtn) {
      newChatBtn.addEventListener('click', () => {
        this.startNewConversation();
      });
    }

    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', () => {
        const sidebar = document.getElementById('appSidebar');
        sidebar.classList.toggle('open');
      });
    }

    if (clearAllHistoryBtn) {
      clearAllHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your conversation history?')) {
          this.clearAllConversations();
        }
      });
    }

    if (convSearchInput) {
      convSearchInput.addEventListener('input', (e) => {
        this.filterConversations(e.target.value.trim().toLowerCase());
      });
    }

    // Quick prompt cards
    document.querySelectorAll('.quick-prompt-card').forEach((card) => {
      card.addEventListener('click', () => {
        const prompt = card.getAttribute('data-prompt');
        if (prompt && messageInput) {
          messageInput.value = prompt;
          this.updateCharCount();
          this.sendMessage('text');
        }
      });
    });

    // Feedback submission
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('feedbackCategory').value;
        const message = document.getElementById('feedbackMessage').value.trim();
        const alertEl = document.getElementById('feedbackSuccessAlert');

        try {
          await API.sendFeedback({
            category,
            message,
            conversationId: this.activeConversationId
          });
          alertEl.textContent = 'Thank you! Your feedback has been received.';
          alertEl.classList.remove('d-none');
          feedbackForm.reset();
          setTimeout(() => {
            alertEl.classList.add('d-none');
            const modalEl = document.getElementById('feedbackModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
          }, 1500);
        } catch (err) {
          alert('Failed to submit feedback. Please try again.');
        }
      });
    }
  },

  updateCharCount() {
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    if (messageInput && charCount) {
      const len = messageInput.value.length;
      charCount.textContent = `${len}/4000`;
    }
  },

  async loadConversations() {
    try {
      const res = await API.getConversations();
      if (res.success) {
        this.conversations = res.conversations;
        this.renderConversationsList();
      }
    } catch (err) {
      console.warn('[App] Could not load conversations:', err.message);
    }
  },

  renderConversationsList() {
    const listEl = document.getElementById('conversationsList');
    const noConvEl = document.getElementById('noConversationsMsg');
    if (!listEl) return;

    listEl.querySelectorAll('.conversation-item').forEach(el => el.remove());

    if (!this.conversations || this.conversations.length === 0) {
      if (noConvEl) noConvEl.classList.remove('d-none');
      return;
    }

    if (noConvEl) noConvEl.classList.add('d-none');

    this.conversations.forEach((conv) => {
      const item = document.createElement('div');
      item.className = `conversation-item ${this.activeConversationId === conv.id ? 'active' : ''}`;
      item.setAttribute('data-id', conv.id);

      item.innerHTML = `
        <div class="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
          <i class="fa-regular fa-message text-muted small"></i>
          <span class="conversation-title">${this.escapeHTML(conv.title)}</span>
        </div>
        <button class="btn btn-sm btn-link text-danger p-0 delete-conv-btn" title="Delete conversation">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-conv-btn')) {
          e.stopPropagation();
          this.deleteConversation(conv.id);
          return;
        }
        this.switchConversation(conv.id);
      });

      listEl.appendChild(item);
    });
  },

  filterConversations(query) {
    const items = document.querySelectorAll('.conversation-item');
    items.forEach((item) => {
      const title = item.querySelector('.conversation-title').textContent.toLowerCase();
      if (title.includes(query)) {
        item.classList.remove('d-none');
      } else {
        item.classList.add('d-none');
      }
    });
  },

  async switchConversation(conversationId) {
    if (this.activeConversationId === conversationId) return;

    this.activeConversationId = conversationId;
    this.renderConversationsList();

    // Close mobile sidebar
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('open');

    try {
      const res = await API.getConversation(conversationId);
      if (res.success) {
        document.getElementById('activeConvTitle').textContent = res.conversation.title;
        this.renderMessages(res.messages);
      }
    } catch (err) {
      this.showNotification('Could not load conversation messages.', 'danger');
    }
  },

  startNewConversation() {
    this.activeConversationId = null;
    document.getElementById('activeConvTitle').textContent = 'Intelligent Assistant';
    this.renderConversationsList();

    const messagesList = document.getElementById('messagesList');
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (messagesList) messagesList.innerHTML = '';
    if (welcomeScreen) welcomeScreen.classList.remove('d-none');

    // Close mobile sidebar
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('open');

    const input = document.getElementById('messageInput');
    if (input) input.focus();
  },

  async deleteConversation(conversationId) {
    try {
      await API.deleteConversation(conversationId);
      this.conversations = this.conversations.filter(c => c.id !== conversationId);
      if (this.activeConversationId === conversationId) {
        this.startNewConversation();
      }
      this.renderConversationsList();
    } catch (err) {
      this.showNotification('Failed to delete conversation.', 'danger');
    }
  },

  async clearAllConversations() {
    for (const conv of this.conversations) {
      try { await API.deleteConversation(conv.id); } catch (e) {}
    }
    this.conversations = [];
    this.startNewConversation();
  },

  renderMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (!messagesList) return;

    messagesList.innerHTML = '';

    if (!messages || messages.length === 0) {
      if (welcomeScreen) welcomeScreen.classList.remove('d-none');
      return;
    }

    if (welcomeScreen) welcomeScreen.classList.add('d-none');

    messages.forEach((msg) => {
      this.appendMessageBubble(msg);
    });

    this.scrollToBottom();
  },

  appendMessageBubble(msg) {
    const messagesList = document.getElementById('messagesList');
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) welcomeScreen.classList.add('d-none');

    const isUser = msg.sender === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user-row' : 'assistant-row'}`;

    const formattedContent = this.formatMarkdown(msg.content);
    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    if (isUser) {
      row.innerHTML = `
        <div class="message-bubble user-bubble shadow-sm">
          <div class="message-content">${formattedContent}</div>
          <div class="d-flex justify-content-between align-items-center mt-1">
            <small class="extra-small opacity-75">${msg.inputType === 'voice' ? '<i class="fa-solid fa-microphone me-1"></i>' : ''}${timeStr}</small>
          </div>
        </div>
        <div class="avatar-sm avatar-user">
          <i class="fa-solid fa-user"></i>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="avatar-sm avatar-assistant">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="message-bubble assistant-bubble shadow-sm flex-grow-1">
          <div class="message-content">${formattedContent}</div>
          <div class="d-flex justify-content-between align-items-center message-actions">
            <small class="extra-small text-muted">${timeStr} • ${msg.provider || (msg.metadata && msg.metadata.provider) || 'AI Assistant'}</small>
            <div class="d-flex gap-1">
              <button class="msg-action-btn copy-btn" title="Copy response">
                <i class="fa-regular fa-copy"></i>
              </button>
              <button class="msg-action-btn speak-btn" title="Read response aloud (TTS)">
                <i class="fa-solid fa-volume-high"></i>
              </button>
            </div>
          </div>
        </div>
      `;

      // Event listeners for actions
      const copyBtn = row.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(msg.content);
          copyBtn.innerHTML = '<i class="fa-solid fa-check text-success"></i>';
          setTimeout(() => { copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>'; }, 2000);
        });
      }

      const speakBtn = row.querySelector('.speak-btn');
      if (speakBtn) {
        speakBtn.addEventListener('click', () => {
          Voice.speak(msg.content);
        });
      }
    }

    messagesList.appendChild(row);
    this.scrollToBottom();
  },

  async sendMessage(inputType = 'text') {
    const input = document.getElementById('messageInput');
    const text = input ? input.value.trim() : '';

    if (!text || this.isSending) return;

    this.isSending = true;
    this.setInputState(false);

    // Render optimistic user message
    const tempUserMsg = {
      sender: 'user',
      content: text,
      inputType,
      timestamp: new Date().toISOString()
    };
    this.appendMessageBubble(tempUserMsg);

    // Clear input
    if (input) {
      input.value = '';
      input.style.height = 'auto';
      this.updateCharCount();
    }

    this.showTypingIndicator(true);

    try {
      const payload = {
        message: text,
        conversationId: this.activeConversationId || 'new',
        inputType,
        persona: Preferences.data.aiPersona
      };

      const res = await API.sendMessage(payload);

      this.showTypingIndicator(false);

      if (res.success) {
        if (res.isNewConversation && res.conversationId) {
          this.activeConversationId = res.conversationId;
          await this.loadConversations();
          const activeConv = this.conversations.find(c => c.id === res.conversationId);
          if (activeConv) {
            document.getElementById('activeConvTitle').textContent = activeConv.title;
          }
        }

        this.appendMessageBubble(res.assistantMessage);

        // Auto TTS if preference enabled
        if (Preferences.data.autoSpeak || inputType === 'voice') {
          Voice.speak(res.assistantMessage.content);
        }
      }
    } catch (error) {
      this.showTypingIndicator(false);
      this.appendErrorMessage(error.message, () => {
        if (input) input.value = text;
        this.sendMessage(inputType);
      });
    } finally {
      this.isSending = false;
      this.setInputState(true);
      if (input) input.focus();
    }
  },

  appendErrorMessage(errorText, retryCallback) {
    const messagesList = document.getElementById('messagesList');
    const row = document.createElement('div');
    row.className = 'message-row assistant-row';

    row.innerHTML = `
      <div class="avatar-sm avatar-assistant bg-danger">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <div class="message-bubble assistant-bubble border-danger shadow-sm flex-grow-1">
        <div class="text-danger fw-semibold small mb-1">
          <i class="fa-solid fa-circle-exclamation me-1"></i> Request failed
        </div>
        <div class="small">${this.escapeHTML(errorText || 'A temporary service or network issue occurred.')}</div>
        <div class="mt-2">
          <button class="btn btn-sm btn-outline-danger retry-btn py-1 px-3">
            <i class="fa-solid fa-rotate-right me-1"></i> Retry
          </button>
        </div>
      </div>
    `;

    const retryBtn = row.querySelector('.retry-btn');
    if (retryBtn && retryCallback) {
      retryBtn.addEventListener('click', () => {
        row.remove();
        retryCallback();
      });
    }

    messagesList.appendChild(row);
    this.scrollToBottom();
  },

  setInputState(enabled) {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');

    if (input) input.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
    if (micBtn) micBtn.disabled = !enabled;
  },

  showTypingIndicator(show) {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      if (show) {
        indicator.classList.remove('d-none');
        this.scrollToBottom();
      } else {
        indicator.classList.add('d-none');
      }
    }
  },

  scrollToBottom() {
    const container = document.getElementById('messagesContainer');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  },

  showNotification(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3 shadow-lg z-3 small py-2 px-3 fade show`;
    toast.innerHTML = `<i class="fa-solid fa-info-circle me-2"></i>${this.escapeHTML(msg)}`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  formatMarkdown(text) {
    if (!text) return '';
    let escaped = this.escapeHTML(text);

    // Code blocks with syntax container
    escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code>${code}</code></pre>`;
    });

    // Inline code
    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Line breaks
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
  },

  escapeHTML(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.App = App;
  App.init();
});
