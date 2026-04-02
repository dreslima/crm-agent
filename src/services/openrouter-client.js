import axios from 'axios';

/**
 * OpenRouter client for LLM inference
 */
export class OpenRouterClient {
  constructor(apiKey, model = 'anthropic/claude-3.5-haiku') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  /**
   * Send chat completion request
   */
  async chat(messages, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/dreslima/crm-agent',
            'X-Title': 'CRM Agent'
          },
          timeout: options.timeout || 30000
        }
      );

      return response.data.choices[0]?.message?.content;
    } catch (error) {
      console.error('[OpenRouter] Error:', error.message);
      if (error.response) {
        console.error('[OpenRouter] Response:', error.response.data);
      }
      throw new Error(`OpenRouter error: ${error.message}`);
    }
  }

  /**
   * Classify intent from user message
   */
  async classify(userMessage, conversationHistory = []) {
    const messages = [
      { role: 'system', content: 'Você é um classificador JSON. Responda APENAS com JSON válido.' },
      { role: 'user', content: userMessage }
    ];

    const prompt = this.buildClassificationPrompt(userMessage, conversationHistory);
    messages[1].content = prompt;

    const response = await this.chat(messages);
    return this.parseJsonResponse(response);
  }

  /**
   * Generate response using system prompt
   */
  async generate(userMessage, systemPrompt, conversationHistory = []) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user', content: userMessage }
    ];

    return await this.chat(messages, { temperature: 0.7 });
  }

  /**
   * Build classification prompt
   */
  buildClassificationPrompt(userMessage, history = []) {
    const historyContext = history.length > 0
      ? `\nCONTEXTO:\n${history.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}`
      : '';

    return `Analise e responda JSON:

MENSAGEM: "${userMessage}"${historyContext}

CATÁLOGO:
- CREATE_LEAD, UPDATE_LEAD, QUERY_LEADS, ADD_TAG
- CREATE_TASK, UPDATE_TASK, MARK_TASK_DONE, QUERY_TASKS
- CREATE_DEAL, CREATE_CLIENT
- HELP, GREETING, SMALLTALK
- CONFIRMATION, CANCELLATION, UNKNOWN

 Responda JSON:
{
  "intentions": ["INTENT"],
  "entities": {"name": null, "email": null, "phone": null, "description": null, "date": null, "leadId": null, "taskId": null, "tags": [], "value": null, "searchTerm": null},
  "missingData": [],
  "confidence": 0.0,
  "requiresConfirmation": false,
  "response": "string|null"
}`;
  }

  /**
   * Parse JSON from LLM response
   */
  parseJsonResponse(response) {
    if (!response) {
      throw new Error('Empty response from LLM');
    }

    // Try to extract JSON from response
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Try to find JSON object
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      jsonStr = objMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('[OpenRouter] JSON parse error:', error);
      console.log('[OpenRouter] Raw response:', response);
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}

// Factory function
export function createOpenRouterClient() {
  return new OpenRouterClient(
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku'
  );
}
