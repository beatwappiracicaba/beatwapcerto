import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ArrowLeft, Search, User } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { MessageBubble } from './MessageBubble';
import { AnimatedInput } from '../ui/AnimatedInput';

export const ChatWindow = ({ isAdmin = false, currentUserId = 1 }) => {
  const { 
    chats, 
    isOpen, 
    setIsOpen, 
    activeChatId, 
    setActiveChatId, 
    sendMessage, 
    getChatByArtist,
    createChat 
  } = useChat();
  
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeChatId, isOpen]);

  // Determine which chat is active
  // If Artist: There is only one chat (Artist <-> Admin). If it doesn't exist, we might need to create it.
  // If Admin: activeChatId determines the chat.
  
  const activeChat = isAdmin 
    ? chats.find(c => c.id === activeChatId)
    : getChatByArtist(currentUserId);

  // If artist has no chat, create one placeholder or real one
  useEffect(() => {
    if (!isAdmin && !activeChat && isOpen) {
       // Auto-create chat for artist if opened
       createChat(currentUserId);
    }
  }, [isAdmin, activeChat, isOpen, currentUserId, createChat]);


  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const chatId = isAdmin ? activeChatId : activeChat?.id;
    const sender = isAdmin ? 'admin' : 'artist';
    
    if (chatId) {
      sendMessage(chatId, inputText, sender);
      setInputText('');
    }
  };

  // Filter chats for Admin list
  const filteredChats = isAdmin 
    ? chats.filter(c => 
        // In a real app we'd filter by artist name from a separate user list, 
        // here we just have IDs in mockChats. 
        // Let's assume we can search by ID or last message for now.
        c.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.artistId.toString().includes(searchTerm)
      ) 
    : [];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
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
            <h3 className="font-bold text-white">
              {isAdmin 
                ? (activeChatId ? `Artista #${activeChat?.artistId}` : 'Atendimento') 
                : 'Suporte BeatWap'}
            </h3>
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Online
            </p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-black/20 relative">
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
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-beatwap-gold">
                  <User size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                   <div className="flex justify-between items-center">
                     <h4 className="font-bold text-sm text-white">Artista #{chat.artistId}</h4>
                     <span className="text-[10px] text-gray-500">{new Date(chat.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                   </div>
                   <p className="text-xs text-gray-400 truncate">{chat.lastMessage}</p>
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
                 <p className="text-sm">Inicie a conversa!</p>
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
          </div>
        )}
      </div>

      {/* Input Area */}
      {(isAdmin && !activeChatId) ? null : (
        <form onSubmit={handleSend} className="p-3 border-t border-white/10 bg-[#181818] flex gap-2">
          <input
            type="text"
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
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
    </motion.div>
  );
};
