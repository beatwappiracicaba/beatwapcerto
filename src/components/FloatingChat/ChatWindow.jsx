import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ArrowLeft, Search, User, UserCheck, Lock, Trash2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { AnimatedInput } from '../ui/AnimatedInput';

export const ChatWindow = ({ isAdmin = false, currentUserId }) => {
  const { 
    chats, 
    isOpen, 
    setIsOpen, 
    activeChatId, 
    setActiveChatId, 
    sendMessage, 
    getChatByArtist,
    createChat,
    admins,
    assignChat,
    deleteChat,
    loading,
    markChatRead
  } = useChat();
  
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showNewMessageToast, setShowNewMessageToast] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeChatId, isOpen]);

  useEffect(() => {
    const handlerOnline = () => setIsOnline(true);
    const handlerOffline = () => setIsOnline(false);
    window.addEventListener('online', handlerOnline);
    window.addEventListener('offline', handlerOffline);
    return () => {
      window.removeEventListener('online', handlerOnline);
      window.removeEventListener('offline', handlerOffline);
    };
  }, []);

  // Determine which chat is active
  const activeChat = isAdmin 
    ? chats.find(c => c.id === activeChatId)
    : getChatByArtist(currentUserId);

  // If artist has no chat, create one placeholder or real one
  useEffect(() => {
    if (!loading && !isAdmin && !activeChat && isOpen && currentUserId) {
       createChat(currentUserId);
    }
  }, [loading, isAdmin, activeChat, isOpen, currentUserId, createChat]);

  useEffect(() => {
    const id = isAdmin ? activeChatId : activeChat?.id;
    if (isOpen && id) {
      markChatRead(id);
    }
  }, [isOpen, activeChatId, activeChat?.id, markChatRead, isAdmin]);

  useEffect(() => {
    const key = `chatDraft:${isAdmin ? activeChatId || 'admin' : activeChat?.id || currentUserId || 'artist'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setInputText(stored);
    } else {
      setInputText('');
    }
  }, [activeChatId, activeChat?.id, isAdmin, currentUserId]);

  useEffect(() => {
    const key = `chatDraft:${isAdmin ? activeChatId || 'admin' : activeChat?.id || currentUserId || 'artist'}`;
    localStorage.setItem(key, inputText);
  }, [inputText, isAdmin, activeChatId, activeChat?.id, currentUserId]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (nearBottom) {
        setShowNewMessageToast(false);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef.current]);
 
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    const msgs = activeChat?.messages?.length || 0;
    const prev = (ChatWindow.__prevMsgCount || 0);
    if (msgs > prev && !nearBottom) {
      setShowNewMessageToast(true);
    }
    ChatWindow.__prevMsgCount = msgs;
  }, [chats, activeChatId, activeChat?.messages?.length, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    let chatId = isAdmin ? activeChatId : activeChat?.id;
    const sender = isAdmin ? 'admin' : 'artist';
    
    if (!chatId && !isAdmin && currentUserId) {
      const newId = await createChat(currentUserId);
      chatId = newId || chatId;
    }
    if (!chatId && isAdmin) return;
    if (!chatId) return;
    await sendMessage(chatId, inputText, sender);
    setInputText('');
  };

  const handleAssign = async () => {
    if (activeChatId) {
      try {
        await assignChat(activeChatId);
      } catch (error) {
        console.error("Failed to assign chat", error);
      }
    }
  };

  // Filter chats for Admin list
  const filteredChats = isAdmin 
    ? chats
        .filter(c => !c.assignedTo || c.assignedTo === currentUserId)
        .filter(c => 
          c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.artistName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.artistId.toString().includes(searchTerm)
        )
    : [];

  const getAssignedAdminName = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    return admin ? admin.name : 'Produtor';
  };

  if (!isOpen) return null;

  const isAssignedToMe = activeChat?.assignedTo === currentUserId;
  const isAssignedToOther = activeChat?.assignedTo && activeChat?.assignedTo !== currentUserId;
  const isUnassigned = !activeChat?.assignedTo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-20 right-2 sm:right-6 w-[94vw] sm:w-96 h-[70vh] sm:h-[500px] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-beatwap-gold/10 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {isAdmin && activeChatId ? (
             <button onClick={() => setActiveChatId(null)} className="hover:bg-white/10 p-1 rounded-full">
               <ArrowLeft size={18} />
             </button>
          ) : null}
          <div>
            <div className="flex -space-x-2 mb-1">
              {admins.slice(0, 4).map((admin) => (
                <div key={admin.id} className="w-6 h-6 rounded-full border-2 border-[#121212] overflow-hidden bg-gray-700 relative" title={admin.name}>
                  {admin.avatar_url ? (
                    <img src={admin.avatar_url} alt={admin.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                      {admin.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#121212]" />
                </div>
              ))}
            </div>
            <h3 className="font-bold text-white flex items-center gap-2">
              {isAdmin 
                ? (activeChatId ? (activeChat?.artistName || 'Artista') : 'Atendimento') 
                : 'Suporte BeatWap'}
            </h3>
            
            {/* Subtitle / Status */}
            {!isAdmin && activeChat?.assignedTo ? (
              <p className="text-xs text-beatwap-gold flex items-center gap-1">
                <UserCheck size={12} />
                Atendido por {getAssignedAdminName(activeChat.assignedTo)}
              </p>
            ) : (
              <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                 <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span> {isOnline ? 'Online' : 'Offline'}
              </p>
            )}

          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && activeChatId && (
            <>
              <button 
                onClick={async () => {
                  // Build transcript
                  const chat = chats.find(c => c.id === activeChatId);
                  const transcript = (chat?.messages || [])
                    .map(m => `${new Date(m.created_at || m.timestamp).toLocaleString()} - ${m.sender === 'admin' ? 'Produtor' : 'Artista'}: ${m.content ?? m.message ?? ''}`)
                    .join('\n');
                  const subject = encodeURIComponent(`Atendimento BeatWap - Conversa finalizada`);
                  const body = encodeURIComponent(`Olá,\n\nSegue o histórico da conversa:\n\n${transcript}\n\nObrigado!`);
                  // Open mail client (fill recipient manualmente se não houver e-mail disponível)
                  window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                }}
                className="text-white hover:bg-white/10 p-1 rounded-full"
                title="Enviar resumo por e-mail"
              >
                <Send size={18} />
              </button>
              <button 
                onClick={async () => {
                  if (window.confirm('Finalizar e apagar esta conversa?')) {
                    try {
                      await deleteChat(activeChatId);
                      setActiveChatId(null);
                    } catch (e) {
                      console.error('Falha ao apagar conversa', e);
                    }
                  }
                }} 
                className="text-red-400 hover:bg-red-500/10 p-1 rounded-full"
                title="Finalizar e Apagar"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-black/20 relative">
        {isAdmin && !activeChatId ? (
          // Admin Chat List
          <div className="p-2 space-y-2">
            <div className="px-2 pb-2">
               <AnimatedInput 
                  placeholder="Buscar conversa..." 
                  icon={Search} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/40 border-white/5"
               />
            </div>
            {filteredChats.map(chat => (
              <div 
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex gap-3 items-center"
              >
                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative flex items-center justify-center">
                  {chat.artistAvatarUrl ? (
                    <img src={chat.artistAvatarUrl} alt={chat.artistName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-beatwap-gold">
                      <User size={20} />
                    </div>
                  )}
                  {chat.assignedTo && (
                     <div className="absolute -bottom-1 -right-1 bg-gray-800 rounded-full border border-black" title="Atendido">
                        <UserCheck size={12} className="text-green-500" />
                     </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="flex justify-between items-center">
                     <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        {chat.artistName || `Artista #${chat.artistId.slice(0, 4)}...`}
                        {chat.assignedTo === currentUserId && <span className="text-[10px] bg-beatwap-gold text-black px-1 rounded">Seu</span>}
                     </h4>
                     <span className="text-[10px] text-gray-500">{new Date(chat.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                   <p className="text-xs text-gray-400 truncate">
                      {chat.assignedTo && chat.assignedTo !== currentUserId ? `(Em atendimento por ${getAssignedAdminName(chat.assignedTo)})` : chat.lastMessage}
                   </p>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-beatwap-gold text-black text-xs font-bold rounded-full flex items-center justify-center">
                    {chat.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Chat Messages (Artist View OR Admin Active Chat)
          <div className="p-4">
             {!activeChat?.messages?.length ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-20 text-center">
                 <MessageCircle size={40} className="mb-2 opacity-20" />
                 <p className="text-sm">Escreva o que precisa e espere um produtor pegar sua conversa.</p>
               </div>
             ) : (
               activeChat.messages.map(msg => (
                 <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isOwn={msg.sender === (isAdmin ? 'admin' : 'artist')} 
                 />
               ))
             )}
             <div ref={messagesEndRef} />
             {showNewMessageToast && (
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-beatwap-gold text-black text-xs font-bold px-3 py-2 rounded-full shadow">
                 Novas mensagens
                 <button className="ml-2 underline" onClick={scrollToBottom}>Ver</button>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Input Area / Action Area */}
      {(isAdmin && !activeChatId) ? null : (
        <div className="p-3 border-t border-white/10 bg-[#181818]">
          {isAdmin && isUnassigned ? (
            <button 
              onClick={handleAssign}
              className="w-full py-3 bg-beatwap-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck size={20} />
              Pegar Conversa
            </button>
          ) : isAdmin && isAssignedToOther ? (
            <div className="w-full py-3 bg-white/5 text-gray-400 font-medium rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
              <Lock size={16} />
              Em atendimento por {getAssignedAdminName(activeChat.assignedTo)}
            </div>
          ) : (
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) {
                      handleSend(e);
                    }
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="p-3 bg-beatwap-gold text-black rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          )}
        </div>
      )}
    </motion.div>
  );
};
