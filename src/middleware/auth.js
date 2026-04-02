/**
 * Authentication middleware for webhook requests
 */
export function authMiddleware(req, res, next) {
  const secret = req.headers['x-agent-secret'];

  if (!secret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing x-agent-secret header'
    });
  }

  if (secret !== process.env.AGENT_SECRET) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid secret'
    });
  }

  next();
}
