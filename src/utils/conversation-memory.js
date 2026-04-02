/**
 * Conversation Memory - In-memory session management per phone
 */
export class ConversationMemory {
  constructor(ttlMinutes = 30) {
    this.sessions = new Map();
    this.ttlMs = ttlMinutes * 60 * 1000;
    this.confirmationTimeoutMs = 5 * 60 * 1000; // 5 minutes

    // Cleanup expired sessions every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Get or create session for phone
   */
  getSession(phone) {
    const existing = this.sessions.get(phone);

    if (existing && Date.now() < existing.expiresAt) {
      existing.lastActivity = Date.now();
      return existing;
    }

    // Create new session
    const session = {
      phone,
      context: {
        lastIntent: null,
        collectedData: {},
        pendingAction: null,
        conversationHistory: [],
        createdEntities: {}
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.ttlMs
    };

    this.sessions.set(phone, session);
    return session;
  }

  /**
   * Update session with new data
   */
  updateSession(phone, updates) {
    const session = this.getSession(phone);
    Object.assign(session.context, updates.context || {});
    Object.assign(session, updates);
    session.lastActivity = Date.now();
    session.expiresAt = Date.now() + this.ttlMs;
    return session;
  }

  /**
   * Add message to conversation history
   */
  addMessage(phone, role, content) {
    const session = this.getSession(phone);
    session.context.conversationHistory.push({
      role,
      content,
      timestamp: Date.now()
    });
    session.lastActivity = Date.now();
    return session;
  }

  /**
   * Set pending action for confirmation
   */
  setPendingAction(phone, action) {
    const session = this.getSession(phone);
    session.context.pendingAction = {
      ...action,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.confirmationTimeoutMs
    };
    return session;
  }

  /**
   * Get pending action
   */
  getPendingAction(phone) {
    const session = this.sessions.get(phone);
    if (!session?.context?.pendingAction) return null;

    const action = session.context.pendingAction;
    if (Date.now() > action.expiresAt) {
      // Expired
      session.context.pendingAction = null;
      return null;
    }

    return action;
  }

  /**
   * Clear pending action
   */
  clearPendingAction(phone) {
    const session = this.sessions.get(phone);
    if (session) {
      session.context.pendingAction = null;
    }
  }

  /**
   * Check if message is confirmation
   */
  isConfirmation(phone, message) {
    const normalized = message.toLowerCase().trim();
    const confirmations = ['sim', 'sim!', 'confirma', 'confirmo', 'ok', 'confirmar', 'yes', 'y'];
    const cancellations = ['não', 'nao', 'cancela', 'cancelar', 'no', 'n', 'cancelo'];

    if (confirmations.includes(normalized)) return 'confirm';
    if (cancellations.includes(normalized)) return 'cancel';

    return null;
  }

  /**
   * Reset session
   */
  resetSession(phone) {
    this.sessions.delete(phone);
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = Date.now();
    for (const [phone, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(phone);
      }
    }
  }

  /**
   * Get session info (without sensitive data)
   */
  getSessionInfo(phone) {
    const session = this.sessions.get(phone);
    if (!session) return null;

    return {
      phone,
      lastActivity: session.lastActivity,
      hasPendingAction: !!session.context.pendingAction,
      intentCount: session.context.conversationHistory.length
    };
  }
}

// Singleton instance
export const memory = new ConversationMemory(
  parseInt(process.env.SESSION_TTL_MINUTES) || 30
);
