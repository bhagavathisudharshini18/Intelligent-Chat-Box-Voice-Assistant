const https = require('https');
const ContextService = require('./contextService');

class AIService {
  /**
   * Main entry point for generating AI response
   * @param {Object} params 
   * @param {string} params.prompt - User message
   * @param {string} [params.conversationId] - Active conversation ID
   * @param {string} [params.persona] - Selected AI Persona
   * @param {string} [params.provider] - 'gemini' | 'openai' | 'built-in'
   * @returns {Promise<{text: string, provider: string, tokensUsed?: number}>}
   */
  static async generateResponse({ prompt, conversationId, persona = 'helpful_assistant', provider }) {
    const selectedProvider = provider || process.env.DEFAULT_AI_PROVIDER || 'built-in';
    console.log('[AIService] Selected provider:', selectedProvider);
    console.log('[AIService] Gemini key exists:', !!process.env.GEMINI_API_KEY);
    const context = await ContextService.getContext(conversationId);
    const systemPrompt = ContextService.getPersonaInstructions(persona);

    // 1. If Gemini is requested or key exists
    if ((selectedProvider === 'gemini' || (!provider && process.env.GEMINI_API_KEY)) && process.env.GEMINI_API_KEY) {
      try {
        return await this.callGemini({ prompt, context, systemPrompt });
      } catch (err) {
        console.warn(`[AIService] Gemini API call failed (${err.message}). Falling back to built-in NLP engine.`);
      }
    }

    // 2. If OpenAI is requested or key exists
    if ((selectedProvider === 'openai' || (!provider && process.env.OPENAI_API_KEY)) && process.env.OPENAI_API_KEY) {
      try {
        return await this.callOpenAI({ prompt, context, systemPrompt });
      } catch (err) {
        console.warn(`[AIService] OpenAI API call failed (${err.message}). Falling back to built-in NLP engine.`);
      }
    }

    // 3. Built-in Intelligent Contextual NLP Engine
    return this.generateBuiltInNLP({ prompt, context, systemPrompt, persona });
  }

  /**
   * Call Google Gemini API (REST)
   */
  static async callGemini({ prompt, context, systemPrompt }) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const contents = [];
    // Append conversation history
    for (const msg of context) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }
    // Append current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const requestBody = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    });

    const response = await this._postRequest(url, requestBody, { 'Content-Type': 'application/json' });
    const data = JSON.parse(response);

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const text = data.candidates[0].content.parts.map(p => p.text).join('\n');
      return {
        text: text.trim(),
        provider: 'Google Gemini (1.5-flash)'
      };
    }

    throw new Error(data.error ? data.error.message : 'Invalid Gemini API response');
  }

  /**
   * Call OpenAI API (REST)
   */
  static async callOpenAI({ prompt, context, systemPrompt }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [{ role: 'system', content: systemPrompt }];
    for (const msg of context) {
      messages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = await this._postRequest(url, requestBody, {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });
    const data = JSON.parse(response);

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return {
        text: data.choices[0].message.content.trim(),
        provider: 'OpenAI (GPT)'
      };
    }

    throw new Error(data.error ? data.error.message : 'Invalid OpenAI API response');
  }

  /**
   * Built-in Context-Aware NLP Engine with pattern matching, context recall, and multi-turn intelligence
   */
  static generateBuiltInNLP({ prompt, context, persona, systemPrompt }) {
    const cleaned = prompt.trim();
    const lower = cleaned.toLowerCase();

    // 1. Check for context / memory recall questions (e.g. "what was the first thing", "previous message", "what did I say", "remember")
    const isFirstQuestionQuery = /\b(first|earliest|initial)\b.*\b(thing|question|message|ask|asked|prompt)\b/i.test(lower) ||
                                 /what (was|is) the first/i.test(lower);
    const isPreviousRecallQuery = /\b(previous|last|prior|before)\b.*\b(question|message|thing|prompt|text)\b/i.test(lower) ||
                                  /what (did|was) (i|my) (just )?(ask|say|said|question|message)/i.test(lower) ||
                                  /repeat what i (said|asked)/i.test(lower) ||
                                  /what (is|was) my (previous|last)/i.test(lower) ||
                                  (/\b(exact text|answer with)\b/i.test(lower) && /\b(previous|last|prior|message|question)\b/i.test(lower));
    const isConversationSummaryQuery = /\b(summarize|recap|summary of|history of)\b.*\b(conversation|chat|messages|discussion)\b/i.test(lower) ||
                                       /what did we (talk|discuss) about/i.test(lower);

    if (isFirstQuestionQuery || isPreviousRecallQuery || isConversationSummaryQuery) {
      if (context && context.length > 0) {
        // Exclude the current prompt to get prior context
        const priorUserMsgs = context.filter(m => m.role === 'user' && m.content.trim().toLowerCase() !== lower);

        if (isFirstQuestionQuery && priorUserMsgs.length > 0) {
          const firstMsg = priorUserMsgs[0];
          return {
            text: `The first thing you asked was: "${firstMsg.content}".`,
            provider: 'Intelligent Built-in NLP'
          };
        }

        if (isPreviousRecallQuery && priorUserMsgs.length > 0) {
          const lastMsg = priorUserMsgs[priorUserMsgs.length - 1];
          return {
            text: `Your previous message was: "${lastMsg.content}".`,
            provider: 'Intelligent Built-in NLP'
          };
        }

        if (isConversationSummaryQuery && priorUserMsgs.length > 0) {
          const summaryList = priorUserMsgs.map((m, idx) => `${idx + 1}. "${m.content}"`).join('\n');
          return {
            text: `Here is a summary of the questions you've asked in this conversation:\n\n${summaryList}`,
            provider: 'Intelligent Built-in NLP'
          };
        }
      }
      return {
        text: 'This is the start of our conversation session, so you haven\'t asked a previous question yet. What can I help you with?',
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 2. User Name Introduction (e.g. "My name is Alex", "Call me Alex")
    const nameIntroMatch = prompt.match(/\b(?:my name is|my name's|call me|i am|i'm)\s+([a-zA-Z]+)\b/i);
    const isNameIntroOnly = nameIntroMatch && !/\b(what|who|why|where|when|how)\b/i.test(lower) && 
      !/\b(happy|sad|fine|here|ready|tired|testing|writing|trying|asking|wondering|learning|coding|back)\b/i.test(nameIntroMatch[1]);

    if (isNameIntroOnly && nameIntroMatch[1]) {
      const extractedName = nameIntroMatch[1].charAt(0).toUpperCase() + nameIntroMatch[1].slice(1);
      return {
        text: `Nice to meet you, ${extractedName}! I have noted your name and will remember it during our conversation.`,
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 3. User Name & Identity Recall (e.g. "What is my name?", "Who am I?", "Do you remember my name?")
    const isUserNameQuery = /\b(what('s| is) my name|who am i|do you (know|remember) (who i am|my name)|tell me my name)\b/i.test(lower);
    if (isUserNameQuery) {
      if (context && context.length > 0) {
        const priorUserMsgs = context.filter(m => m.role === 'user' && m.content.trim().toLowerCase() !== lower);
        let foundName = null;

        for (const msg of priorUserMsgs) {
          const match = msg.content.match(/\b(?:my name is|my name's|call me|i am|i'm)\s+([a-zA-Z]+)\b/i);
          if (match && match[1] && !/\b(happy|sad|fine|here|ready|tired|testing|writing|trying|asking|wondering|learning|coding|back)\b/i.test(match[1])) {
            foundName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
          }
        }

        if (foundName) {
          return {
            text: `Your name is ${foundName}! You mentioned it earlier in our conversation.`,
            provider: 'Intelligent Built-in NLP'
          };
        }
      }
      return {
        text: 'You haven\'t told me your name yet in this conversation. What should I call you?',
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 4. Greetings
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i.test(lower)) {
      const greetings = [
        `Hello! I'm your Intelligent Voice and Chat Assistant. How can I help you today?`,
        `Hi there! Ready to assist you with questions, coding, information, or voice commands. What would you like to explore?`,
        `Greetings! I am active and listening. Feel free to type or use the voice microphone to speak with me.`
      ];
      return {
        text: greetings[Math.floor(Math.random() * greetings.length)],
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 5. Assistant Identity and Capabilities
    if (lower.includes('who are you') || lower.includes('what is your name') || lower.includes('what can you do') || lower.includes('introduce yourself')) {
      return {
        text: `I am your Intelligent Chat Box & Voice Assistant! Here is what I can do:\n\n` +
          `• 🎙️ **Voice Interaction**: Speak directly using the microphone button for speech-to-text, and listen to spoken responses with text-to-speech.\n` +
          `• 💬 **Conversational Context**: I remember previous messages in this session so we can have natural multi-turn conversations.\n` +
          `• 🧠 **AI & NLP Intelligence**: I answer questions, explain topics, write and debug code, and summarize concepts.\n` +
          `• ⚙️ **Customizable Preferences**: Change voice styles, speech rate, pitch, themes (Dark/Light), and assistant personas in Settings.\n` +
          `• 📂 **Conversation History**: Save, browse, and resume previous chat sessions anytime.`,
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 4. Time and Date
    if (lower.includes('what time is it') || lower.includes('current time') || lower.includes('today\'s date') || lower.includes('what day is it')) {
      consconst priorUserMsgst now = new Date();
      return {
        text: `The current date and time is **${now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}** at **${now.toLocaleTimeString()}**.`,
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 5. Math Calculations (e.g. "calculate 25 * 4", "what is 100 / 4 + 15")
    const mathMatch = lower.match(/(?:calculate|what is|compute|solve)?\s*([0-9\.\s\+\-\*\/\(\)\^\%]+)\s*$/i);
    if (mathMatch && mathMatch[1] && /[0-9]/.test(mathMatch[1]) && /[\+\-\*\/]/.test(mathMatch[1])) {
      try {
        const sanitizedMath = mathMatch[1].replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${sanitizedMath})`)();
        if (typeof result === 'number' && !isNaN(result)) {
          return {
            text: `The result of \`${sanitizedMath.trim()}\` is **${result}**.`,
            provider: 'Intelligent Built-in NLP'
          };
        }
      } catch (e) {}
    }

    // 6. Programming / Code questions
    if (lower.includes('javascript') || lower.includes('python') || lower.includes('node') || lower.includes('express') || lower.includes('html') || lower.includes('css') || lower.includes('function') || lower.includes('code') || lower.includes('algorithm')) {
      if (persona === 'code_helper' || lower.includes('write') || lower.includes('example')) {
        return {
          text: `Here is a clean implementation demonstrating that concept:\n\n` +
            `\`\`\`javascript\n` +
            `// Example: Modular asynchronous handler in Node.js\n` +
            `async function processUserRequest(payload) {\n` +
            `  try {\n` +
            `    const normalized = payload.trim();\n` +
            `    console.log('Processing request:', normalized);\n` +
            `    return { status: 'success', data: normalized, timestamp: new Date() };\n` +
            `  } catch (error) {\n` +
            `    console.error('Error processing request:', error.message);\n` +
            `    throw error;\n` +
            `  }\n` +
            `}\n` +
            `\`\`\`\n` +
            `This example follows clean coding standards, input normalization, and structured error handling. Let me know if you want to adapt this for a specific language or framework!`,
          provider: 'Intelligent Built-in NLP'
        };
      }
    }

    // 7. PRD / TRD / Project Architecture
    if (lower.includes('prd') || lower.includes('trd') || lower.includes('architecture') || lower.includes('project requirements')) {
      return {
        text: `**Project Architecture & Specifications Overview:**\n\n` +
          `• **Frontend**: Responsive Web UI with HTML5, CSS3, JavaScript, and Bootstrap 5.\n` +
          `• **Voice Services**: Speech-to-Text (STT) and Text-to-Speech (TTS) integration with audio waveform visualization.\n` +
          `• **Backend API**: Node.js & Express.js REST API with authentication, rate limiting, and structured logging.\n` +
          `• **AI & NLP Layer**: Pluggable AI engine supporting Google Gemini, OpenAI, and contextual NLP processing.\n` +
          `• **Database & Persistence**: MongoDB / Mongoose with resilient in-memory local fallback storage.\n` +
          `• **Security**: bcrypt password hashing, JWT token authorization, input validation, and audit logging.`,
        provider: 'Intelligent Built-in NLP'
      };
    }

    // 8. Default Rich Conversational Response
    const responses = [
      `I understand you are asking about: "${cleaned}". \n\nI have processed your query through the assistant pipeline. To give you the most accurate help: feel free to provide more details or ask a follow-up question, and I will maintain our conversational context!`,
      `Thank you for your message: "${cleaned}".\n\nAs your intelligent assistant, I'm ready to assist you further. You can continue typing, speak through your microphone, or adjust response preferences in the settings menu.`,
      `Regarding "${cleaned}":\n\nI have registered your input and updated our active session context. How would you like to proceed?`
    ];

    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      provider: 'Intelligent Built-in NLP'
    };
  }

  static _postRequest(targetUrl, postData, headers = {}) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(targetUrl);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }
}

module.exports = AIService;
