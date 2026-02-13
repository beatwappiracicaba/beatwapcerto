import { supabase } from './supabaseClient';

export const aiService = {
  // Save message to Supabase
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

  // Get chat history
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
      return data || [];
    } catch (error) {
      console.error('Error fetching history:', error);
      return [];
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
