# CRM Agent

Agente Orquestrador para gestão de leads e tarefas via WhatsApp.

## Funcionalidades

- **Geração de Leads**: Criação e gerenciamento de prospects
- **Gestão de Tarefas**: Criação, agendamento e acompanhamento de tarefas
- **Conversação Natural**: Interface conversacional via WhatsApp
- **Confirmação de Ações**: Execução condicionada à confirmação do usuário

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Express
- **LLM**: OpenRouter (Claude/Haiku)
- **CRM**: Heffl API

## Quick Start

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais
# HEFFL_API_KEY=your_key
# OPENROUTOR_API_KEY=your_key

# Iniciar em desenvolvimento
npm run dev

# Iniciar em produção
npm start
```

## Estrutura

```
src/
├── index.js              # Entry point
├── agent/                # Orquestrador
│   ├── orchestrator.js   # Pipeline principal
│   ├── intent-classifier.js
│   ├── conversation-memory.js
│   └── response-builder.js
├── crm/                 # Cliente CRM
│   └── heffl-client.js
└── services/
    └── openrouter-client.js
```

## Uso

O agente recebe mensagens via webhook e processa:

1. Classifica a intenção do usuário
2. Extrai entidades (nome, email, data, etc.)
3. Pergunta dados faltantes
4. Confirma ação
5. Executa no Heffl

## Deploy

Ver [DEPLOY.md](./DEPLOY.md)

## Licença

MIT
