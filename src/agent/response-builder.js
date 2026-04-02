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
   * Build action summary for confirmation
   */
  buildSummary(actions, collectedData) {
    let response = '✅ *Pronto! Vou fazer:*\n\n';

    let actionNum = 1;
    for (const action of actions) {
      response += `${actionNum}️⃣ *${action.label}*\n`;

      for (const [key, value] of Object.entries(action.data || {})) {
        if (value !== null && value !== undefined) {
          const displayKey = this.formatKey(key);
          let displayValue = value;

          // Format date nicely
          if (key === 'dueDate' || key === 'date') {
            displayValue = dateParser.formatForDisplay(value);
          }

          response += `   • ${displayKey}: ${displayValue}\n`;
        }
      }

      response += '\n';
      actionNum++;
    }

    response += 'Confirma? (sim/não)';

    return response;
  }

  /**
   * Build execution result
   */
  buildResult(results) {
    let response = '✅ *Executado com sucesso!*\n\n';

    for (const result of results) {
      response += `📋 *${result.type}*: ${result.name || result.title}\n`;
      response += `   ID: ${result.id}\n\n`;
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
