import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const ChatButton = ({ isAdmin = false, currentUserId = 1 }) => {
  const { toggleChat, isOpen, chats, supportQueue, userRole } = useChat();
  const prevUnreadRef = useRef(0);
  const audioRef = useRef(null);

  // Calculate unread count
  const unreadCount = chats.reduce((acc, chat) => acc + (chat.unreadCount || 0), 0);
  
  // Calculate pending requests count (only for providers)
  const isProvider = ['Produtor', 'produtor', 'Vendedor', 'Compositor'].includes(userRole);
  const pendingRequests = isProvider ? supportQueue.filter(req => {
      if (['Produtor', 'produtor'].includes(userRole)) return true;
      return req.role_needed === (userRole || '').toLowerCase();
  }).length : 0;
  
  const totalCount = unreadCount + pendingRequests;

  useEffect(() => {
    if (!isOpen && totalCount > prevUnreadRef.current) {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQA=');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    prevUnreadRef.current = totalCount;
  }, [totalCount, isOpen]);

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
      {totalCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#121212]">
          {totalCount}
        </span>
      )}
    </motion.button>
  );
};
