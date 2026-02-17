import { supabase } from './supabaseClient';

export const aiService = {
  async saveMessage(role, content) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .insert([{
          user_id: session.user.id,
          role,
          content
        }])
        .select()
        .single();

      if (error) {
        console.warn('Failed to save message to DB (history may not be persisted):', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('Error saving message:', error);
      return null;
    }
  },

  async getHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) {
        // Ignore "relation does not exist" error gracefully
        if (error.code === '42P01') {
          console.warn('AI Chat History table missing. Run create_ai_chat_history.sql to enable persistence.');
          return [];
        }
        throw error;
      }
      const rows = data || [];
      try {
        const clearedAtStr = window?.localStorage?.getItem('ai_history_cleared_at');
        const clearedAt = clearedAtStr ? Number(clearedAtStr) : 0;
        if (clearedAt > 0) {
          return rows.filter(r => {
            const t = new Date(r.created_at).getTime();
            return isNaN(t) ? true : t > clearedAt;
          });
        }
      } catch (_) { void 0; }
      return rows;
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
    }
  },

  async clearHistory() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { error } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('user_id', session.user.id);

      if (error) {
        if (error.code === '42P01') {
          console.warn('AI Chat History table missing. Nothing to clear.');
          try { window?.localStorage?.setItem('ai_history_cleared_at', String(Date.now())); } catch (_) { void 0; }
          return true;
        }
        throw error;
      }
      try { window?.localStorage?.setItem('ai_history_cleared_at', String(Date.now())); } catch (_) { void 0; }
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      try { window?.localStorage?.setItem('ai_history_cleared_at', String(Date.now())); } catch (_) { void 0; }
      return false;
    }
  },

  async sendMessage(messages) {
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('assistente-ia', {
        body: { messages },
      });

      if (error) {
        console.error('Supabase Function Error:', error);
        throw error;
      }

      if (data && data.error) {
        console.error('Backend Error:', data.error);
        throw new Error(data.error);
      }

      return data.reply;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
};
