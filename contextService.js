const Message = require('../models/Message');

const MAX_TURNS = parseInt(process.env.MAX_CONTEXT_TURNS, 10) || 10;

class ContextService {
  /**
   * Retrieves active conversation context for the AI prompt
   * @param {string} conversationId 
   * @param {number} limit 
   * @returns {Promise<Array<{role: string, content: string}>>}
   */
  static async getContext(conversationId, limit = MAX_TURNS) {
    if (!conversationId) return [];

    try {
      const messages = await Message.find({ conversationId });
      // Sort oldest to newest
      const sorted = (messages || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const recent = sorted.slice(-limit);

      return recent.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.content
      }));
    } catch (error) {
      console.warn(`[ContextService] Failed to load context: ${error.message}`);
      return [];
    }
  }

  /**
   * Builds prompt system instructions according to persona
   */
  static getPersonaInstructions(personaKey = 'helpful_assistant') {
    const personas = {
      helpful_assistant: 'You are an intelligent, helpful, polite, and articulate AI voice and chat assistant. Provide clear, direct, and well-structured answers.',
      code_helper: 'You are an expert programming assistant. Provide concise, clean, working code snippets with clear explanations and best practices.',
      tutor: 'You are an encouraging and patient academic tutor. Explain complex concepts in simple terms with intuitive examples and step-by-step reasoning.',
      creative: 'You are an imaginative and engaging conversationalist, skilled in storytelling, creative writing, and brainstorming.',
      concise: 'You are a direct, hyper-concise assistant. Give brief, factual answers in 1-3 sentences without fluff.'
    };
    return personas[personaKey] || personas.helpful_assistant;
  }
}

module.exports = ContextService;
