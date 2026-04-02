import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware - 10 requests per minute per phone
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  message: {
    error: 'Too many requests',
    message: 'Please wait a moment before sending another message'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use phone as key if available, otherwise IP
    return req.body?.sender?.id || req.ip;
  }
});
