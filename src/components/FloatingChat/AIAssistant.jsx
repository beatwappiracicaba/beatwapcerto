import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AnimatedInput } from '../ui/AnimatedInput';

export const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá, eu sou o Assistente BeatWap. Estou aqui para ajudar você a crescer como artista. O que vamos planejar hoje?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistente-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}` // Send token for backend validation if needed
        },
        body: JSON.stringify({ message: userMessage.content, userId: user?.id })
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com a IA');
      }

      const data = await response.json();
      
      const aiMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erro ao enviar mensagem para IA:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, estou enfrentando dificuldades técnicas no momento. Por favor, tente novamente em instantes.',
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-white/10' : 'bg-beatwap-gold/20'
              }`}>
                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-beatwap-gold" />}
              </div>

              {/* Message Bubble */}
              <div className={`p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-white/10 text-white rounded-tr-none' 
                  : msg.isError 
                    ? 'bg-red-500/10 text-red-200 border border-red-500/20 rounded-tl-none'
                    : 'bg-beatwap-gold/10 text-gray-200 border border-beatwap-gold/10 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <span className="text-[10px] opacity-50 block mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex flex-row gap-2 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-beatwap-gold/20 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-beatwap-gold" />
              </div>
              <div className="bg-beatwap-gold/10 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-beatwap-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-beatwap-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-beatwap-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-black/40 border-t border-white/5 flex gap-2 items-center">
        <div className="flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre marketing, estratégia..."
            className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors placeholder:text-gray-600"
            disabled={isLoading}
          />
        </div>
        <button 
          type="submit" 
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-beatwap-gold text-black rounded-full hover:bg-beatwap-gold/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-lg shadow-beatwap-gold/20"
        >
          {isLoading ? <Sparkles size={18} className="animate-pulse" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};
