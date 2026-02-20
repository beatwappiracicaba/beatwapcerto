import { apiClient } from './apiClient';

export const aiService = {
  async saveMessage(role, content) {
    try {
      await apiClient.post('/ai/history', { role, content });
      return null;
    } catch (error) {
      console.warn('Error saving message:', error);
      return null;
    }
  },

  async getHistory() {
    try {
      const rows = await apiClient.get('/ai/history');
      return rows || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  },

  async clearHistory() {
    try {
      await apiClient.post('/ai/history/clear', {});
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      try { window?.localStorage?.setItem('ai_history_cleared_at', String(Date.now())); } catch (_) { void 0; }
      return false;
    }
  },

  async sendMessage(messages) {
    try {
      const data = await apiClient.post('/ai/chat', { messages });
      return data.reply;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
};
