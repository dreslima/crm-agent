import axios from 'axios';

/**
 * Heffl CRM API client
 */
export class HefflClient {
  constructor(apiKey, baseUrl = 'https://api.heffl.com/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generic request method
   */
  async request(method, endpoint, data = null) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: this.headers,
        data,
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.error(`[Heffl] ${method} ${endpoint} error:`, error.message);
      if (error.response) {
        console.error('[Heffl] Response:', error.response.data);
      }
      throw new Error(`Heffl API error: ${error.message}`);
    }
  }

  // ==================== LEADS ====================

  /**
   * Create a new lead
   */
  async createLead(data) {
    const payload = {
      name: data.name,
      title: data.title || null,
      email: data.email || null,
      mobile: data.phone || data.mobile || null,
      value: data.value || null,
      sourceId: data.sourceId || null,
      tags: data.tags || []
    };

    // Remove null and empty values
    Object.keys(payload).forEach(key => {
      if (payload[key] === null || payload[key] === undefined || payload[key] === '') {
        delete payload[key];
      }
      if (Array.isArray(payload[key]) && payload[key].length === 0) {
        delete payload[key];
      }
    });

    return await this.request('POST', '/leads', payload);
  }

  /**
   * Get lead by ID
   */
  async getLead(id) {
    return await this.request('GET', `/leads/${id}`);
  }

  /**
   * List leads with optional filters
   */
  async listLeads(params = {}) {
    return await this.request('GET', '/leads', { params });
  }

  /**
   * Search leads
   */
  async searchLeads(term) {
    return await this.request('GET', '/leads', {
      params: { search: term }
    });
  }

  /**
   * Update lead
   */
  async updateLead(id, data) {
    return await this.request('PATCH', `/leads/${id}`, data);
  }

  /**
   * Add tags to lead
   */
  async addTagToLead(id, tags) {
    const lead = await this.getLead(id);
    const existingTags = lead.tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];

    return await this.request('PATCH', `/leads/${id}`, {
      tags: newTags
    });
  }

  // ==================== TASKS ====================

  /**
   * Create a new task
   */
  async createTask(data) {
    const payload = {
      title: data.title,
      description: data.description || null,
      dueDate: data.dueDate || null,
      type: data.type || 'general',
      priority: data.priority || 'medium',
      status: 'pending',
      entity: data.entity || null,  // 'leads' or 'deals'
      entityId: data.entityId || null
    };

    // Remove null values except title
    Object.keys(payload).forEach(key => {
      if (payload[key] === null && key !== 'title') delete payload[key];
    });

    return await this.request('POST', '/tasks', payload);
  }

  /**
   * Get task by ID
   */
  async getTask(id) {
    return await this.request('GET', `/tasks/${id}`);
  }

  /**
   * List tasks with optional filters
   */
  async listTasks(params = {}) {
    return await this.request('GET', '/tasks', { params });
  }

  /**
   * Update task
   */
  async updateTask(id, data) {
    return await this.request('PATCH', `/tasks/${id}`, data);
  }

  /**
   * Mark task as done
   */
  async markTaskDone(id) {
    return await this.request('PATCH', `/tasks/${id}`, {
      status: 'done'
    });
  }

  /**
   * Delete task
   */
  async deleteTask(id) {
    return await this.request('DELETE', `/tasks/${id}`);
  }

  // ==================== DEALS ====================

  /**
   * Create a new deal
   */
  async createDeal(data) {
    const payload = {
      title: data.title,
      pipelineId: data.pipelineId || null,
      stageId: data.stageId || null,
      clientId: data.clientId || null,
      price: data.price || data.value || null
    };

    Object.keys(payload).forEach(key => {
      if (payload[key] === null) delete payload[key];
    });

    return await this.request('POST', '/deals', payload);
  }

  /**
   * List deals
   */
  async listDeals(params = {}) {
    return await this.request('GET', '/deals', { params });
  }

  /**
   * Update deal
   */
  async updateDeal(id, data) {
    return await this.request('PATCH', `/deals/${id}`, data);
  }

  // ==================== CLIENTS ====================

  /**
   * Create a new client (company/contact)
   */
  async createClient(data) {
    const payload = {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      type: data.type || 'company'  // 'company' or 'person'
    };

    Object.keys(payload).forEach(key => {
      if (payload[key] === null) delete payload[key];
    });

    return await this.request('POST', '/clients', payload);
  }

  /**
   * List clients
   */
  async listClients(params = {}) {
    return await this.request('GET', '/clients', { params });
  }

  // ==================== LISTS ====================

  /**
   * Get available sources (for leads)
   */
  async getSources() {
    return await this.request('GET', '/sources');
  }

  /**
   * Get available pipelines (for deals)
   */
  async getPipelines() {
    return await this.request('GET', '/pipelines');
  }

  /**
   * Get available tags
   */
  async getTags() {
    return await this.request('GET', '/tags');
  }

  /**
   * Get available products
   */
  async getProducts() {
    return await this.request('GET', '/products');
  }
}

// Factory function
export function createHefflClient() {
  return new HefflClient(
    process.env.HEFFL_API_KEY,
    process.env.HEFFL_BASE_URL || 'https://api.heffl.com/api/v1'
  );
}
