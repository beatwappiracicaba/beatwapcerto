import React from 'react';
import { Card } from '../../components/ui/Card';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Calendar, User, UserCheck, MessageCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

const SellerShows = () => {
  const { chats, setIsOpen, setActiveChatId } = useChat();

  const openChat = (chatId) => {
    setActiveChatId(chatId);
    setIsOpen(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Negociação de Shows</h1>
        <p className="text-gray-400">Acompanhe conversas e negociações com artistas.</p>
      </div>

      {(!chats || chats.length === 0) ? (
        <Card className="p-6 text-gray-400">Nenhuma negociação encontrada.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {chats.map(chat => (
            <Card key={chat.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-beatwap-gold">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Artista #{chat.artistId.slice(0, 6)}...</h3>
                  <p className="text-sm text-gray-400 truncate">{chat.lastMessage}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(chat.lastMessageTime).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {chat.assignedTo ? (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-500 flex items-center gap-1">
                    <UserCheck size={14} />
                    Em atendimento
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-500 flex items-center gap-1">
                    <Calendar size={14} />
                    Aguardando
                  </span>
                )}
                <AnimatedButton onClick={() => openChat(chat.id)}>
                  <MessageCircle size={18} />
                  Abrir Chat
                </AnimatedButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerShows;
