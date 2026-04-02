/**
 * Classification prompt template
 */
export function buildClassificationPrompt(userMessage, conversationHistory = []) {
  const historyContext = conversationHistory.length > 0
    ? `\nCONTEXTO DA CONVERSA ANTERIOR:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}`
    : '';

  return `Analise a mensagem do usuário e classifique a intenção.

MENSAGEM ATUAL: "${userMessage}"${historyContext}

CATÁLOGO DE AÇÕES DISPONÍVEIS:
- CREATE_LEAD: Criar novo lead (prospecto)
- UPDATE_LEAD: Atualizar lead existente
- QUERY_LEADS: Buscar ou listar leads
- ADD_TAG: Adicionar tag a lead
- CREATE_TASK: Criar nova tarefa
- UPDATE_TASK: Atualizar tarefa existente
- MARK_TASK_DONE: Marcar tarefa como concluída
- QUERY_TASKS: Listar tarefas pendentes
- CREATE_DEAL: Criar nova oportunidade/negócio
- CREATE_CLIENT: Criar empresa ou contato
- HELP: Pedir ajuda ou listar comandos
- GREETING: Saudação (oi, olá, bom dia, etc.)
- SMALLTALK: Conversa informal
- CONFIRMATION: Resposta de confirmação (sim, ok, confirma)
- CANCELLATION: Resposta de cancelamento (não, cancela)
- UNKNOWN: Não identificado ou ambiguo

 Responda APENAS com JSON válido (sem markdown):
{
  "intentions": ["INTENT1", "INTENT2"],
  "entities": {
    "name": "nome completo extraído ou null",
    "email": "email válido extraído ou null",
    "phone": "telefone extraído ou null",
    "description": "descrição da tarefa ou observação",
    "date": "data ISO 8601 (YYYY-MM-DDTHH:mm:ss) ou null",
    "dateText": "texto original da data mentioned ou null",
    "leadId": "ID numérico do lead ou null",
    "taskId": "ID numérico da tarefa ou null",
    "tags": ["tag1", "tag2"] ou [],
    "value": "valor monetário como número ou null",
    "searchTerm": "termo de busca ou null"
  },
  "missingData": ["campo1", "campo2"],
  "confidence": 0.0-1.0,
  "requiresConfirmation": true|false,
  "response": "Resposta imediata se for saudação/ajuda/smalltalk"
}`;
}
