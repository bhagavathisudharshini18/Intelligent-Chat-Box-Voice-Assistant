const request = require('supertest');
const app = require('../src/server');
const { connectDB } = require('../src/config/db');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB();
});

describe('Intelligent Chat Box & Voice Assistant API Test Suite', () => {
  let authToken = '';
  let registeredUserId = '';
  let testConversationId = '';

  describe('1. Health Check Endpoint', () => {
    it('GET /api/health should return system status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBeDefined();
    });
  });

  describe('2. Authentication Endpoints', () => {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'SecurePassword123!';

    it('POST /api/auth/register - should successfully register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      authToken = res.body.token;
      registeredUserId = res.body.user.id;
    });

    it('POST /api/auth/register - should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Jane',
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - should authenticate and return token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('POST /api/auth/login - should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/auth/me - should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe(testEmail);
    });

    it('POST /api/auth/logout - should return success', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Chat API & Context Processing', () => {
    it('POST /api/chat/message - should reject empty messages (FR5, AC3)', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .send({ message: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/chat/message - should process text request and create conversation', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Hello, what is your name?',
          conversationId: 'new',
          inputType: 'text'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.conversationId).toBeDefined();
      expect(res.body.assistantMessage.content).toBeDefined();
      testConversationId = res.body.conversationId;
    });

    it('POST /api/chat/message - should maintain multi-turn context for follow-up query (FR7, AC7)', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What did I just ask you?',
          conversationId: testConversationId,
          inputType: 'text'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assistantMessage.content.toLowerCase()).toContain('what is your name');
    });

    it('POST /api/chat/message - should correctly recall first question in multi-turn chat', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What was the first thing I asked you?',
          conversationId: testConversationId,
          inputType: 'text'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assistantMessage.content.toLowerCase()).toContain('what is your name');
    });

    it('POST /api/chat/message - should recall previous message with exact text request', async () => {
      const res = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is my previous message? Please answer with the exact text.',
          conversationId: testConversationId,
          inputType: 'text'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assistantMessage.content.toLowerCase()).toContain('first thing i asked you');
    });

    it('POST /api/chat/message - should say name has not been provided when asked before introduction', async () => {
      // Create new conversation without giving a name
      const res = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is my name?',
          conversationId: 'new',
          inputType: 'text'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.assistantMessage.content.toLowerCase()).toContain("haven't told me your name");
    });

    it('POST /api/chat/message - should remember user name and answer "What is my name?" and "Who am I?"', async () => {
      // Step 1: Tell assistant the name
      const introRes = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'My name is Alex.',
          conversationId: 'new',
          inputType: 'text'
        });

      expect(introRes.statusCode).toBe(200);
      expect(introRes.body.success).toBe(true);
      const nameConvId = introRes.body.conversationId;
      expect(introRes.body.assistantMessage.content).toContain('Alex');

      // Step 2: Ask "What is my name?"
      const recallRes1 = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is my name?',
          conversationId: nameConvId,
          inputType: 'text'
        });

      expect(recallRes1.statusCode).toBe(200);
      expect(recallRes1.body.success).toBe(true);
      expect(recallRes1.body.assistantMessage.content).toContain('Alex');

      // Step 3: Ask "Who am I?"
      const recallRes2 = await request(app)
        .post('/api/chat/message')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Who am I?',
          conversationId: nameConvId,
          inputType: 'text'
        });

      expect(recallRes2.statusCode).toBe(200);
      expect(recallRes2.body.success).toBe(true);
      expect(recallRes2.body.assistantMessage.content).toContain('Alex');
    });

    it('GET /api/chat/personas - should return available personas', async () => {
      const res = await request(app).get('/api/chat/personas');
      expect(res.statusCode).toBe(200);
      expect(res.body.personas.length).toBeGreaterThan(0);
    });
  });

  describe('4. Voice Endpoints (STT & TTS)', () => {
    it('POST /api/voice/transcribe - should record voice transcription telemetry', async () => {
      const res = await request(app)
        .post('/api/voice/transcribe')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          transcript: 'What is the weather today?',
          durationMs: 3000,
          confidence: 0.95
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.transcript).toBe('What is the weather today?');
    });

    it('POST /api/voice/speak - should validate and prepare TTS speech parameters', async () => {
      const res = await request(app)
        .post('/api/voice/speak')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Here is your **bold** answer with `inline code`.',
          rate: 1.1,
          pitch: 1.0
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.speechConfig.text).not.toContain('**');
      expect(res.body.speechConfig.text).not.toContain('`');
    });
  });

  describe('5. Conversation Management', () => {
    it('GET /api/conversations - should list conversations for user', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.conversations)).toBe(true);
      expect(res.body.conversations.length).toBeGreaterThan(0);
    });

    it('GET /api/conversations/:id - should return messages for specific conversation', async () => {
      const res = await request(app)
        .get(`/api/conversations/${testConversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.messages.length).toBeGreaterThanOrEqual(2);
    });

    it('DELETE /api/conversations/:id - should delete conversation', async () => {
      const res = await request(app)
        .delete(`/api/conversations/${testConversationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Preferences Endpoints', () => {
    it('GET /api/preferences - should retrieve preferences', async () => {
      const res = await request(app)
        .get('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences).toBeDefined();
    });

    it('PUT /api/preferences - should update preference settings', async () => {
      const res = await request(app)
        .put('/api/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          autoSpeak: true,
          speechRate: 1.2,
          aiPersona: 'code_helper',
          theme: 'light'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences.autoSpeak).toBe(true);
      expect(res.body.preferences.aiPersona).toBe('code_helper');
    });
  });

  describe('7. Feedback Endpoint', () => {
    it('POST /api/feedback - should record user feedback', async () => {
      const res = await request(app)
        .post('/api/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'general',
          message: 'The assistant works smoothly!',
          rating: 5
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
