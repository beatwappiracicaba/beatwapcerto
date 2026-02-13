import { supabase } from './supabaseClient';

export const aiService = {
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

      return data.reply;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }
};
