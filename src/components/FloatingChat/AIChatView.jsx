import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { aiService } from '../../services/aiService';

const PRESET_BUTTONS = [
  {
    label: 'Sofrência',
    text:
      'Crie uma letra de sofrência sertaneja com verso, pré-refrão, refrão e ponte. Tema: coração partido após término; tom emotivo e melódico; andamento moderado.',
  },
  {
    label: 'Modão romântico',
    text:
      'Escreva um modão romântico sertanejo com verso, pré-refrão, refrão e ponte. Tema: declaração apaixonada; tom caloroso; andamento médio.',
  },
  {
    label: 'Pagode leve',
    text:
      'Componha um pagode leve com verso, refrão e ponte. Tema: encontro descontraído com amigos; tom alegre; andamento cadenciado.',
  },
  {
    label: 'MPB lírica',
    text:
      'Crie uma canção MPB lírica com imagens poéticas: verso, refrão e ponte. Tema: saudade e cidade à noite; tom intimista; andamento lento.',
  },
];

const createWelcomeMessage = () => ({
  id: 'welcome',
  role: 'assistant',
  content:
    'Sou o Assistente de IA da BeatWap. Especialista em composições nos estilos Sertanejo, Pagode e MPB. Organizo respostas com títulos e seções para facilitar leitura. No Sertanejo me inspiro em Marília Mendonça, Henrique & Juliano, Zé Neto & Cristiano, Gusttavo Lima, Luan Pereira e Ana Castela, sem copiar. Qual tema quer trabalhar?',
  timestamp: new Date(),
});

export const AIChatView = () => {
  const [messages, setMessages] = useState([createWelcomeMessage()]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await aiService.getHistory();
      if (history && history.length > 0) {
        const formattedHistory = history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        setMessages(formattedHistory);
      }
    };
    loadHistory();
  }, []);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // Save user message to DB
    aiService.saveMessage('user', userMessage.content);

    try {
      // Prepare history for API (exclude IDs and timestamps)
      const systemMsg = {
        role: 'system',
        content: [
          'Você é um assistente de IA especialista em composição musical brasileira (Sertanejo, Pagode e MPB).',
          'Responda sempre em Português do Brasil.',
          '',
          'FORMATO OBRIGATÓRIO DA RESPOSTA:',
          'Título:',
          'Tom e andamento:',
          'Estilo / Referências:',
          '',
          'Estrutura da música:',
          '- Intro (opcional)',
          '- Verso 1',
          '- Pré-refrão',
          '- Refrão',
          '- Verso 2',
          '- Ponte',
          '',
          'Letra completa:',
          'Verso 1:',
          'Pré-refrão:',
          'Refrão:',
          'Verso 2:',
          'Ponte:',
          '',
          'Use linhas separadas, sem parágrafos gigantes, para ficar fácil de ler no celular.'
        ].join('\n')
      };
      const apiHistory = [systemMsg, ...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const reply = await aiService.sendMessage(apiHistory);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Save assistant message to DB
      aiService.saveMessage('assistant', reply);

    } catch (error) {
      console.error(error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, tive um problema ao processar sua mensagem. Por favor, tente novamente em alguns instantes.',
        isError: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (isLoading) return;
    const confirmed = window.confirm('Tem certeza que deseja apagar todas as mensagens do Assistente de IA?');
    if (!confirmed) return;
    setIsLoading(true);
    try {
      await aiService.clearHistory();
      setMessages([createWelcomeMessage()]);
      setInputText('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' 
                  ? 'bg-white/10 text-white' 
                  : 'bg-gradient-to-br from-beatwap-gold to-yellow-600 text-black shadow-[0_0_10px_rgba(255,215,0,0.3)]'
              }`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
              </div>

              {/* Bubble */}
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white rounded-tr-none'
                  : msg.isError 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-200 rounded-tl-none'
                    : 'bg-[#1E1E1E] border border-white/5 text-gray-200 rounded-tl-none shadow-md'
              }`}>
                <MessageContent content={msg.content} />
                <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/40 text-right' : 'text-gray-600'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-beatwap-gold to-yellow-600 text-black flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div className="bg-[#1E1E1E] border border-white/5 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 h-10">
                <div className="w-1.5 h-1.5 bg-beatwap-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-beatwap-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-beatwap-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-black/20 border-t border-white/10">
        <div className="mb-2 -mx-1 px-1 overflow-x-auto flex gap-2">
          {PRESET_BUTTONS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setInputText(p.text);
                inputRef.current?.focus();
              }}
              className="whitespace-nowrap text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-beatwap-gold/40 hover:bg-beatwap-gold/10 transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-beatwap-gold" />
                {p.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="text-[11px] text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            Resetar chat
          </button>
        </div>
        <form onSubmit={handleSend} className="relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Descreva seu tema ou use um preset abaixo..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors placeholder:text-gray-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-beatwap-gold text-black rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_15px_rgba(255,215,0,0.1)] hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="text-[10px] text-center text-gray-600 mt-2 flex items-center justify-center gap-1">
          <Sparkles size={8} />
          <span>IA da BeatWap (Powered by ChatGPT)</span>
        </div>
      </div>
    </div>
  );
};

const MessageContent = ({ content }) => {
  const lines = String(content || '').split('\n');
  const blocks = [];
  let list = null;
  for (let raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (list && list.length) {
        blocks.push({ type: 'ul', items: [...list] });
        list = null;
      } else {
        blocks.push({ type: 'br' });
      }
      continue;
    }
    if (/^#{1,6}\s+/.test(line) || /^t[ií]tulo\s*:?/i.test(line)) {
      if (list && list.length) {
        blocks.push({ type: 'ul', items: [...list] });
        list = null;
      }
      const text = line.replace(/^#{1,6}\s+/, '').replace(/^t[ií]tulo\s*:?/i, '').trim();
      blocks.push({ type: 'h', text });
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      if (!list) list = [];
      list.push(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
      continue;
    }
    if (list && list.length) {
      blocks.push({ type: 'ul', items: [...list] });
      list = null;
    }
    blocks.push({ type: 'p', text: line });
  }
  if (list && list.length) {
    blocks.push({ type: 'ul', items: [...list] });
  }
  let firstTextIndex = blocks.findIndex(b => b.type === 'h' || b.type === 'p');
  return (
    <div className="space-y-2">
      {blocks.map((b, idx) => {
        if (b.type === 'h') {
          return <div key={idx} className="text-white font-bold text-base">{b.text}</div>;
        }
        if (b.type === 'p') {
          const isTitle = idx === firstTextIndex;
          return <div key={idx} className={isTitle ? 'text-white font-bold' : 'text-gray-300'}>{b.text}</div>;
        }
        if (b.type === 'ul') {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 text-gray-300">
              {b.items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          );
        }
        if (b.type === 'br') {
          return <div key={idx} className="h-2" />;
        }
        return null;
      })}
    </div>
  );
};
