import { createOpenRouterClient } from '../services/openrouter-client.js';
import { createHefflClient } from '../crm/heffl-client.js';
import { memory } from '../utils/conversation-memory.js';
import { dateParser } from './date-parser.js';
import { responseBuilder } from './response-builder.js';
import { SYSTEM_PROMPT } from './prompts/system.js';
import { buildClassificationPrompt } from './prompts/classification.js';

/**
 * Main Orchestrator - handles the conversation flow
 */
export class Orchestrator {
  constructor() {
    this.llm = createOpenRouterClient();
    this.crm = createHefflClient();
    this.memory = memory;  // Use singleton instance
  }

  /**
   * Process incoming message
   */
  async process({ message, phone, messageId, timestamp }) {
    console.log(`[Orchestrator] Processing from ${phone}: ${message}`);

    // Add user message to history
    this.memory.addMessage(phone, 'user', message);

    // Get session
    const session = this.memory.getSession(phone);

    // Check for pending confirmation
    const pendingAction = this.memory.getPendingAction(phone);
    if (pendingAction) {
      return await this.handleConfirmation(phone, message, pendingAction);
    }

    // Check if it's a confirmation/cancellation
    const confirmationType = this.memory.isConfirmation(phone, message);
    if (confirmationType) {
      return responseBuilder.waitingConfirmation();
    }

    // Classify intent
    try {
      const classification = await this.classifyIntent(message, session.context.conversationHistory);
      console.log(`[Orchestrator] Classification:`, classification);

      // Handle specific intents
      if (classification.intentions.includes('CONFIRMATION')) {
        return responseBuilder.waitingConfirmation();
      }

      if (classification.intentions.includes('CANCELLATION')) {
        return responseBuilder.cancelled();
      }

      if (classification.intentions.includes('GREETING')) {
        const response = responseBuilder.greeting();
        this.memory.addMessage(phone, 'agent', response);
        return response;
      }

      if (classification.intentions.includes('HELP')) {
        const response = responseBuilder.help();
        this.memory.addMessage(phone, 'agent', response);
        return response;
      }

      if (classification.intentions.includes('UNKNOWN')) {
        const response = 'Não entendi. Digite "ajuda" para ver os comandos disponíveis.';
        this.memory.addMessage(phone, 'agent', response);
        return response;
      }

      // Handle CRUD operations
      return await this.handleCRUD(phone, classification);

    } catch (error) {
      console.error('[Orchestrator] Error:', error);
      return responseBuilder.error('Erro ao processar mensagem. Tente novamente.');
    }
  }

  /**
   * Classify intent using LLM
   */
  async classifyIntent(message, history = []) {
    const prompt = buildClassificationPrompt(message, history);

    try {
      const response = await this.llm.chat([
        { role: 'system', content: 'Você é um classificador JSON. Responda APENAS com JSON válido.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.1 });

      return this.llm.parseJsonResponse(response);
    } catch (error) {
      console.error('[Orchestrator] Classification error:', error);
      return {
        intentions: ['UNKNOWN'],
        entities: {},
        confidence: 0,
        missingData: []
      };
    }
  }

  /**
   * Handle CRUD operations
   */
  async handleCRUD(phone, classification) {
    const { intentions, entities, missingData } = classification;
    const session = this.memory.getSession(phone);

    // Merge new entities with collected data
    const collectedData = {
      ...session.context.collectedData,
      ...entities
    };

    // Parse date if present
    if (entities.dateText && !entities.date) {
      const parsed = dateParser.parse(entities.dateText);
      if (parsed) {
        collectedData.dueDate = parsed.iso;
      }
    }

    // Check for missing required data
    const requiredFields = this.getRequiredFields(intentions);
    const missing = requiredFields.filter(field => !collectedData[field]);

    if (missing.length > 0) {
      // Ask for first missing field
      const field = missing[0];
      const response = responseBuilder.missingData(field, collectedData);
      this.memory.updateSession(phone, {
        context: {
          ...session.context,
          collectedData,
          lastIntent: intentions
        }
      });
      this.memory.addMessage(phone, 'agent', response);
      return response;
    }

    // Build actions to execute
    const actions = this.buildActions(intentions, collectedData);

    // Check if it's a query (no confirmation needed)
    const isQuery = intentions.some(i => ['QUERY_LEADS', 'QUERY_TASKS'].includes(i));

    if (isQuery) {
      // Execute query directly
      try {
        const result = await this.executeActions(actions, collectedData);
        this.memory.addMessage(phone, 'agent', result);
        return result;
      } catch (error) {
        return responseBuilder.error(`Erro ao executar: ${error.message}`);
      }
    }

    // Set pending action for confirmation
    this.memory.setPendingAction(phone, {
      intentions,
      actions,
      collectedData
    });

    // Build summary and ask confirmation
    const response = responseBuilder.buildSummary(actions, collectedData);
    this.memory.addMessage(phone, 'agent', response);
    return response;
  }

  /**
   * Handle confirmation
   */
  async handleConfirmation(phone, message, pendingAction) {
    const confirmationType = this.memory.isConfirmation(phone, message);

    if (confirmationType === 'cancel') {
      this.memory.clearPendingAction(phone);
      return responseBuilder.cancelled();
    }

    if (confirmationType !== 'confirm') {
      return responseBuilder.waitingConfirmation();
    }

    // Execute actions
    try {
      const results = await this.executeActions(pendingAction.actions, pendingAction.collectedData);

      // Clear pending action
      this.memory.clearPendingAction(phone);

      // Update session with created entities
      const session = this.memory.getSession(phone);
      for (const result of results) {
        if (result.type === 'lead') session.context.createdEntities.leadId = result.id;
        if (result.type === 'task') session.context.createdEntities.taskId = result.id;
      }

      // Build success response
      const response = responseBuilder.buildResult(results);
      this.memory.addMessage(phone, 'agent', response);
      return response;

    } catch (error) {
      console.error('[Orchestrator] Execution error:', error);
      return responseBuilder.error(`Erro ao executar: ${error.message}`);
    }
  }

  /**
   * Get required fields for intent
   */
  getRequiredFields(intentions) {
    const fieldMap = {
      CREATE_LEAD: ['name'],
      CREATE_TASK: ['title'],
      CREATE_DEAL: ['title'],
      CREATE_CLIENT: ['name'],
      UPDATE_LEAD: [],
      UPDATE_TASK: [],
      MARK_TASK_DONE: [],
      QUERY_LEADS: [],
      QUERY_TASKS: [],
      ADD_TAG: ['leadId', 'tags']
    };

    const fields = [];
    for (const intent of intentions) {
      if (fieldMap[intent]) {
        fields.push(...fieldMap[intent]);
      }
    }

    return [...new Set(fields)];
  }

  /**
   * Build actions from intentions
   */
  buildActions(intentions, data) {
    const actions = [];

    for (const intent of intentions) {
      switch (intent) {
        case 'CREATE_LEAD':
          actions.push({
            type: 'lead',
            label: 'Criar Lead',
            method: 'createLead',
            data: {
              name: data.name,
              email: data.email,
              phone: data.phone,
              value: data.value,
              tags: data.tags
            }
          });
          break;

        case 'CREATE_TASK':
          actions.push({
            type: 'task',
            label: 'Criar Tarefa',
            method: 'createTask',
            data: {
              title: data.title || data.description || 'Tarefa',
              description: data.description,
              dueDate: data.dueDate,
              entity: data.leadId ? 'leads' : null,
              entityId: data.leadId
            }
          });
          break;

        case 'CREATE_DEAL':
          actions.push({
            type: 'deal',
            label: 'Criar Negócio',
            method: 'createDeal',
            data: {
              title: data.title,
              price: data.value
            }
          });
          break;

        case 'CREATE_CLIENT':
          actions.push({
            type: 'client',
            label: 'Criar Cliente',
            method: 'createClient',
            data: {
              name: data.name,
              email: data.email,
              phone: data.phone
            }
          });
          break;

        case 'QUERY_LEADS':
          actions.push({
            type: 'query',
            label: 'Listar Leads',
            method: 'listLeads'
          });
          break;

        case 'QUERY_TASKS':
          actions.push({
            type: 'query',
            label: 'Listar Tarefas',
            method: 'listTasks'
          });
          break;

        case 'MARK_TASK_DONE':
          if (data.taskId) {
            actions.push({
              type: 'task',
              label: 'Marcar Tarefa como Concluída',
              method: 'markTaskDone',
              data: { id: data.taskId }
            });
          }
          break;

        case 'ADD_TAG':
          if (data.leadId && data.tags) {
            actions.push({
              type: 'lead',
              label: 'Adicionar Tag',
              method: 'addTagToLead',
              data: { id: data.leadId, tags: data.tags }
            });
          }
          break;
      }
    }

    return actions;
  }

  /**
   * Execute actions
   */
  async executeActions(actions, data) {
    const results = [];

    for (const action of actions) {
      try {
        let result;

        switch (action.method) {
          case 'createLead':
            result = await this.crm.createLead(action.data);
            results.push({ type: 'lead', id: result.id, name: result.name });
            break;

          case 'createTask':
            result = await this.crm.createTask(action.data);
            results.push({ type: 'task', id: result.id, title: result.title });
            break;

          case 'createDeal':
            result = await this.crm.createDeal(action.data);
            results.push({ type: 'deal', id: result.id, title: result.title });
            break;

          case 'createClient':
            result = await this.crm.createClient(action.data);
            results.push({ type: 'client', id: result.id, name: result.name });
            break;

          case 'listLeads':
            result = await this.crm.listLeads(data.searchTerm ? { search: data.searchTerm } : {});
            return responseBuilder.buildList(result, 'leads');

          case 'listTasks':
            result = await this.crm.listTasks();
            return responseBuilder.buildList(result, 'tasks');

          case 'markTaskDone':
            result = await this.crm.markTaskDone(action.data.id);
            results.push({ type: 'task', id: action.data.id, title: 'Concluída' });
            break;

          case 'addTagToLead':
            result = await this.crm.addTagToLead(action.data.id, action.data.tags);
            results.push({ type: 'lead', id: action.data.id, name: result.name });
            break;
        }

        console.log(`[Orchestrator] Action ${action.method} completed:`, result);
      } catch (error) {
        console.error(`[Orchestrator] Action ${action.method} failed:`, error);
        throw error;
      }
    }

    return results;
  }
}
