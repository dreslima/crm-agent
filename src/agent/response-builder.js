import { dateParser } from './date-parser.js';

/**
 * Response Builder - formats responses for WhatsApp
 */
export class ResponseBuilder {
  /**
   * Build greeting response
   */
  greeting() {
    const greetings = [
      'Olá! 👋 Sou seu assistente CRM.',
      'Oi! 😊 Estou aqui para ajudar com leads e tarefas.',
      'Bom dia! ☀️ Como posso ajudar hoje?'
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  /**
   * Build help response
   */
  help() {
    return `📚 *Comandos disponíveis:*

📋 *Leads*
• "registre lead [nome]" - Criar lead
• "liste leads" - Ver todos
• "busque lead [termo]" - Procurar

📅 *Tarefas*
• "crie tarefa [desc]" - Nova tarefa
• "agende [desc] para [dia]" - Agendar
• "marque [id] como feito" - Finalizar

💰 *Negócios*
• "crie negócio [nome]" - Criar deal

❓ *Ajuda*
• "ajuda" - Mostrar comandos

Como posso ajudar?`;
  }

  /**
   * Build missing data request
   */
  missingData(field, context = {}) {
    const messages = {
      name: 'Qual o nome do lead?',
      email: 'Qual o email?',
      phone: 'Qual o telefone?',
      description: 'Qual a descrição da tarefa?',
      date: 'Para quando quer agendar?',
      title: 'Qual o título?'
    };

    let msg = messages[field] || `Qual ${field}?`;

    // Add context if available
    if (context.leadName && field !== 'name') {
      msg = `${msg} (Lead: ${context.leadName})`;
    }

    return msg;
  }

  /**
   * Build action summary for confirmation (V2 - detailed format)
   */
  buildSummaryV2(intentions, actions, collectedData) {
    // Format intentions for display
    const intentionLabels = {
      'CREATE_LEAD': 'Criar Lead',
      'CREATE_TASK': 'Criar Tarefa',
      'CREATE_DEAL': 'Criar Negócio',
      'CREATE_CLIENT': 'Criar Cliente',
      'UPDATE_LEAD': 'Atualizar Lead',
      'UPDATE_TASK': 'Atualizar Tarefa',
      'MARK_TASK_DONE': 'Finalizar Tarefa',
      'ADD_TAG': 'Adicionar Tag'
    };

    const formattedIntentions = intentions
      .filter(i => intentionLabels[i])
      .map(i => intentionLabels[i])
      .join(' + ');

    let response = '📋 *Ações Planejadas*\n';
    response += '━━━━━━━━━━━━━━━━━━━━\n\n';

    // Intentions
    if (formattedIntentions) {
      response += `🎯 *Intenção:* ${formattedIntentions}\n\n`;
    }

    // Action details
    for (const action of actions) {
      if (action.type === 'task') {
        response += `📝 *Tarefa:* ${action.label}\n`;
        const title = action.data?.title || action.data?.description || 'Sem título';
        response += `   • Descrição: ${title}\n`;
        if (action.data?.dueDate) {
          response += `   • Data: ${dateParser.formatForDisplay(action.data.dueDate)}\n`;
        }
        if (action.data?.entityId) {
          response += `   • Vinculada a: Lead ID ${action.data.entityId}\n`;
        }
        response += '\n';
      }

      if (action.type === 'lead' && action.method !== 'useExistingLead') {
        response += `👤 *Lead:* ${action.label}\n`;
        const data = action.data || {};
        if (data.name) response += `   • Nome: ${data.name}\n`;
        if (data.email) response += `   • Email: ${data.email}\n`;
        if (data.phone) response += `   • Telefone: ${data.phone}\n`;
        response += '\n';
      }
    }

    response += '━━━━━━━━━━━━━━━━━━━━\n';
    response += 'Confirma? (sim/não)';

    return response;
  }

  /**
   * Found duplicates - ask user to choose
   */
  foundDuplicates(duplicates, collectedData) {
    const lead = duplicates[0];
    const matchIcon = {
      'name': '👤',
      'email': '📧',
      'phone': '📱'
    }[lead.matchType] || '🔗';

    let response = `⚠️ *Lead já existente!*\n`;
    response += '━━━━━━━━━━━━━━━━━━━━\n\n';

    response += `${matchIcon} *Encontrado:* ${lead.name}\n`;
    response += `   📋 ID: ${lead.id}\n`;
    if (lead.email) response += `   📧 Email: ${lead.email}\n`;
    if (lead.mobile) response += `   📱 Tel: ${lead.mobile}\n`;
    response += `\n🔍 *Correspondência:* ${lead.matchType} = "${lead.matchValue}"\n`;

    response += '\n━━━━━━━━━━━━━━━━━━━━\n\n';
    response += `*O que deseja fazer?*\n\n`;
    response += `1️⃣ Usar este lead existente\n`;
    response += `2️⃣ Criar novo lead mesmo assim\n\n`;
    response += `Responda "1" ou "2"`;

    return response;
  }

  /**
   * User chose to use existing lead
   */
  existingLeadChosen(lead, actions, collectedData) {
    const taskAction = actions.find(a => a.type === 'task');

    let response = `👤 *Usando lead existente*\n`;
    response += '━━━━━━━━━━━━━━━━━━━━\n\n';

    response += `✅ Lead: ${lead.name}\n`;
    response += `   📋 ID: ${lead.id}\n\n`;

    if (taskAction) {
      response += `📅 *Tarefa:* ${taskAction.label}\n`;
      const title = taskAction.data?.title || taskAction.data?.description || 'Sem título';
      response += `   • Descrição: ${title}\n`;
      if (taskAction.data?.dueDate) {
        response += `   • Data: ${dateParser.formatForDisplay(taskAction.data.dueDate)}\n`;
      }
      response += '\n';
    }

    response += '━━━━━━━━━━━━━━━━━━━━\n';
    response += 'Confirma? (sim/não)';

    return response;
  }

  /**
   * Invalid response to duplicate question
   */
  invalidDuplicateResponse() {
    return '❓ Responda apenas:\n\n1️⃣ - Usar lead existente\n2️⃣ - Criar novo lead';
  }

  /**
   * Build execution result
   */
  buildResult(results) {
    let response = '✅ *Executado com sucesso!*\n\n';

    for (const result of results) {
      if (result.type === 'lead' && result.existing) {
        response += `👤 *Lead:* ${result.name}\n`;
        response += `   📋 ID: ${result.id} (existente)\n\n`;
      } else if (result.type === 'lead') {
        response += `👤 *Lead criado:* ${result.name}\n`;
        response += `   📋 ID: ${result.id}\n\n`;
      } else if (result.type === 'task') {
        response += `📅 *Tarefa:* ${result.title}\n`;
        response += `   📋 ID: ${result.id}\n\n`;
      } else {
        response += `📋 *${result.type}*: ${result.name || result.title}\n`;
        response += `   ID: ${result.id}\n\n`;
      }
    }

    response += 'Posso ajudar com mais alguma coisa? 😊';

    return response;
  }

  /**
   * Build error response
   */
  error(message) {
    return `❌ Ops! Ocorreu um erro:\n\n${message}\n\nTente novamente ou digite "ajuda".`;
  }

  /**
   * Build list response
   */
  buildList(items, type) {
    // Handle different response formats
    if (!items) items = [];
    if (Array.isArray(items)) {
      // Already an array
    } else if (items.data) {
      items = items.data;
    } else if (items.payload) {
      items = items.payload;
    } else if (typeof items === 'object') {
      items = [items];
    } else {
      items = [];
    }

    if (!items || items.length === 0) {
      return `📭 Nenhum ${type} encontrado.`;
    }

    const icons = {
      leads: '👤',
      tasks: '📅',
      deals: '💰',
      clients: '🏢'
    };

    const icon = icons[type] || '📋';
    let response = `${icon} *${type.charAt(0).toUpperCase() + type.slice(1)}:*\n\n`;

    for (const item of items.slice(0, 10)) { // Limit to 10
      const name = item.name || item.title || item.email || 'Sem nome';
      const id = item.id;
      response += `• ${name} (ID: ${id})\n`;

      // Add relevant info
      if (item.email) response += `  📧 ${item.email}\n`;
      if (item.status) response += `  📊 ${item.status}\n`;
      if (item.dueDate) response += `  📅 ${dateParser.formatShort(item.dueDate)}\n`;
    }

    if (items.length > 10) {
      response += `\n... e mais ${items.length - 10} itens`;
    }

    return response;
  }

  /**
   * Build waiting confirmation message
   */
  waitingConfirmation() {
    return 'Aguardando confirmação... (sim/não para confirmar, não para cancelar)';
  }

  /**
   * Build cancelled message
   */
  cancelled() {
    return '❌ Ação cancelada.\n\nPosso ajudar com mais alguma coisa?';
  }

  /**
   * Build timeout message
   */
  timeout() {
    return '⏰ Tempo esgotado. A ação pendiente foi cancelada.\n\nDigite novamente se precisar.';
  }

  /**
   * Format key for display
   */
  formatKey(key) {
    const keyMap = {
      name: 'Nome',
      email: 'Email',
      phone: 'Telefone',
      mobile: 'Telefone',
      title: 'Título',
      description: 'Descrição',
      dueDate: 'Data',
      date: 'Data',
      value: 'Valor',
      status: 'Status',
      tags: 'Tags'
    };

    return keyMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}

export const responseBuilder = new ResponseBuilder();
