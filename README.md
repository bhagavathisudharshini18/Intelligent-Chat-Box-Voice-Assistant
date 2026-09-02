# Intelligent Chat Box / Voice Assistant

A full-stack, AI-powered conversational web application with real-time Speech-to-Text (STT), Text-to-Speech (TTS), multi-turn conversation memory context, customizable assistant personas, user authentication, and persistent conversation history.

Built in strict compliance with the **Product Requirements Document (PRD)** and **Technical Requirements Document (TRD)** specifications.

---

## 🌟 Key Features

- **🎙️ Voice Interaction (STT & TTS)**:
  - Speech-to-Text via Web Speech API with real-time interim transcription and audio waveform visualizer.
  - Text-to-Speech synthesis with voice selector, customizable speech rate, pitch, and auto-speak toggle.
  - Microphone status indicators with pulse animations and error recovery.
- **🧠 Pluggable AI / NLP Engine**:
  - Contextual multi-turn conversation memory (`MAX_CONTEXT_TURNS`).
  - Supports Google Gemini API, OpenAI GPT, and a built-in intelligent contextual NLP engine for zero-setup execution.
  - 5 customizable AI personas: *Intelligent Assistant*, *Code Expert*, *Academic Tutor*, *Creative Writer*, and *Concise & Direct*.
- **💬 Chat Interface**:
  - Modern, responsive SPA layout built with Bootstrap 5 and custom CSS.
  - User and Assistant message bubbles with syntax-highlighted code blocks, copy-to-clipboard buttons, and audio speaker controls.
  - Quick-prompt suggestions for instant onboarding.
  - Retry mechanism for network or service interruptions.
- **🔒 Authentication & History Management**:
  - User registration & login with bcrypt password hashing and JWT authorization.
  - Guest mode for instant anonymous interaction.
  - Searchable conversation drawer with session switching and deletion controls.
- **⚙️ Preferences & Theme**:
  - Dark Mode and Light Mode with persistence in `localStorage` and backend database.
  - Voice parameters, language preferences, and feedback reporting module.

---

## 🏗️ System Architecture

```
User Browser (HTML5 / Bootstrap 5 / Web Speech API)
                     │
                     ▼
       Express.js REST API Server (Node.js)
   ┌─────────────────┬──────────────────┐
   │                 │                  │
Auth & Security    AI / NLP Layer     Database / Storage
(JWT / bcrypt)  (Gemini / OpenAI /  (MongoDB / Resilient
                 Context Engine)      Memory Store)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v24+ recommended)
- npm (v9+)

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd c:\Users\SUDHARSHINI\Desktop\MyProject
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Copy `.env.example` to `.env` (a pre-configured `.env` is already provided):
   ```bash
   cp .env.example .env
   ```

4. **Start the Application:**
   ```bash
   npm start
   ```

5. **Open in Browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🧪 Running Automated Tests

Run the full automated test suite (Jest + Supertest):
```bash
npm test
```

---

## 📖 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check & status |
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT token |
| `POST` | `/api/auth/logout` | End active session |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/chat/message` | Send message and receive AI response |
| `GET` | `/api/chat/personas` | List available AI assistant personas |
| `POST` | `/api/voice/transcribe` | Record voice session telemetry |
| `POST` | `/api/voice/speak` | Validate and prepare speech synthesis parameters |
| `GET` | `/api/conversations` | List user conversation sessions |
| `GET` | `/api/conversations/:id` | Get full message history of a conversation |
| `DELETE` | `/api/conversations/:id` | Delete conversation and messages |
| `GET` | `/api/preferences` | Get user preferences |
| `PUT` | `/api/preferences` | Update user preferences |
| `POST` | `/api/feedback` | Submit feedback or bug report |

---

## 📁 Project Structure

```
MyProject/
├── public/                     # Frontend client assets
│   ├── css/
│   │   └── style.css           # Styling, themes & animations
│   ├── js/
│   │   ├── api.js              # API fetch wrapper
│   │   ├── auth.js             # User authentication module
│   │   ├── preferences.js      # User settings & theme manager
│   │   ├── voice.js            # STT, TTS & Audio visualizer
│   │   └── app.js              # Main UI controller
│   └── index.html              # Responsive SPA layout
├── src/                        # Backend Node.js / Express application
│   ├── config/
│   │   └── db.js               # Database connection & fallback
│   ├── middleware/
│   │   ├── auth.js             # JWT & Guest auth middleware
│   │   ├── errorHandler.js     # Centralized error handler
│   │   └── rateLimiter.js      # Express rate limiting
│   ├── models/
│   │   ├── store.js            # Resilient in-memory store adapter
│   │   ├── User.js             # User model
│   │   ├── Conversation.js     # Conversation model
│   │   ├── Message.js          # Message model
│   │   ├── Preference.js       # Preferences model
│   │   ├── VoiceSession.js     # Voice session model
│   │   └── AuditLog.js         # Audit log model
│   ├── routes/
│   │   ├── auth.js             # Auth routes
│   │   ├── chat.js             # Chat routes
│   │   ├── voice.js            # Voice routes
│   │   ├── conversations.js    # Conversations routes
│   │   ├── preferences.js      # Preferences routes
│   │   └── feedback.js         # Feedback routes
│   ├── services/
│   │   ├── aiService.js        # Multi-provider AI & NLP service
│   │   ├── contextService.js   # Conversation context manager
│   │   └── logger.js           # Safe operational logger
│   └── server.js               # Express application entrypoint
├── tests/
│   └── api.test.js             # Automated API test suite
├── .env.example                # Configuration template
├── package.json                # Project manifest & scripts
├── postman_collection.json     # Postman API Collection
└── README.md                   # Documentation
```

---

## 👤 Author
**Bhagavathi Sudharshini**
Intelligent Chat Box / Voice Assistant Project Submission
