import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const ChatButton = ({ isAdmin = false, currentUserId = 1 }) => {
  const { toggleChat, isOpen, chats } = useChat();

  // Calculate unread count
  const unreadCount = chats.reduce((acc, chat) => {
    // If Admin, count all unread messages from artists
    if (isAdmin) {
      const unreadInChat = chat.messages.filter(m => !m.read && m.sender === 'artist').length;
      return acc + unreadInChat;
    }
    // If Artist, count unread messages from admin in their chat
    if (chat.artistId === currentUserId) {
      const unreadInChat = chat.messages.filter(m => !m.read && m.sender === 'admin').length;
      return acc + unreadInChat;
    }
    return acc;
  }, 0);

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleChat}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 transition-colors ${
        isOpen ? 'bg-white text-black' : 'bg-beatwap-gold text-black'
      }`}
    >
      <MessageCircle size={28} />
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#121212]">
          {unreadCount}
        </span>
      )}
    </motion.button>
  );
};
