import { Orchestrator } from '../agent/orchestrator.js';

/**
 * Webhook router - handles incoming messages
 */
export const webhookRouter = async (req, res) => {
  try {
    const { message, sender, messageId, timestamp } = req.body;

    if (!message || !sender?.id) {
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'Missing message or sender'
      });
    }

    console.log(`[Webhook] Received from ${sender.id}: ${message}`);

    const orchestrator = new Orchestrator();
    const response = await orchestrator.process({
      message,
      phone: sender.id,
      messageId,
      timestamp: timestamp || Date.now()
    });

    res.json({
      success: true,
      response,
      messageId
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
