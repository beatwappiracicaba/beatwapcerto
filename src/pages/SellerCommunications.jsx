import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { MessageCircle, Bell, User, Clock } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const SellerCommunications = () => {
  const { chats, setActiveChatId, setIsOpen, loading } = useChat();

  const handleOpenChat = (chat) => {
    setActiveChatId(chat.id);
    setIsOpen(true);
  };

  // Filter chats if necessary, or just show all available
  // Since ChatContext now returns all chats for Vendedor/Produtor, we show them here.
  // We might want to filter only those assigned to the vendor in the future.
  const displayChats = chats || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Comunicação</h1>
          <p className="text-gray-400">Fale com os artistas e receba avisos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Chats List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="text-beatwap-gold" />
              Conversas Diretas
            </h3>
            
            {loading ? (
              <div className="text-center py-10 text-gray-500">Carregando conversas...</div>
            ) : displayChats.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-white/5 rounded-2xl">
                <MessageCircle size={40} className="mx-auto mb-2 opacity-20" />
                <p>Nenhuma conversa iniciada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayChats.map(chat => (
                  <Card 
                    key={chat.id} 
                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group" 
                    onClick={() => handleOpenChat(chat)}
                  >
                    <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0 relative">
                      {chat.artistAvatar ? (
                        <img src={chat.artistAvatar} alt={chat.artistName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <User size={20} />
                        </div>
                      )}
                      {chat.unreadCount > 0 && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-beatwap-gold rounded-full border border-[#121212]" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-white truncate">{chat.artistName || 'Artista'}</h4>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={10} />
                          {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                        {chat.lastMessage || 'Iniciar conversa...'}
                      </p>
                    </div>
                    
                    <AnimatedButton size="sm" variant="secondary" icon={MessageCircle} />
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Right: Notifications/System Notices (Mock for now) */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="text-red-400" />
              Avisos do Sistema
            </h3>
            <Card className="p-4 bg-red-500/5 border-red-500/20">
              <h4 className="font-bold text-white mb-1">Aprovação Pendente</h4>
              <p className="text-sm text-gray-400">Você tem propostas aguardando aprovação.</p>
            </Card>
            <Card className="p-4">
              <h4 className="font-bold text-white mb-1">Atualização de Agenda</h4>
              <p className="text-sm text-gray-400">Verifique as novas datas disponíveis.</p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerCommunications;
