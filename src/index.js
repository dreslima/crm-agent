import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { webhookRouter } from './routes/webhook.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
app.use(rateLimitMiddleware);

// Health check (sem auth)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'crm-agent',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint (com auth)
app.post('/webhook', authMiddleware, webhookRouter);

// Help endpoint
app.get('/help', (req, res) => {
  res.json({
    service: 'CRM Agent',
    version: '1.0.0',
    endpoints: {
      'POST /webhook': 'Recebe mensagens para processamento',
      'GET /health': 'Health check',
      'GET /help': 'Esta ajuda'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`CRM Agent running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

export default app;
