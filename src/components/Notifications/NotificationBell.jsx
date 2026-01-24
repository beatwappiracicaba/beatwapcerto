import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = ({ userId = 1 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = useNotification();
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const notifications = getNotifications(userId);
  const unreadCount = getUnreadCount(userId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="relative p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-beatwap-black"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#181818] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-white">Notificações</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllAsRead(userId)}
                  className="text-xs text-beatwap-gold hover:underline flex items-center gap-1"
                >
                  <Check size={12} /> Marcar tudo como lido
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>Nenhuma notificação.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-beatwap-gold' : 'bg-transparent'}`} />
                        <div className="flex-1 space-y-1">
                          <p className={`text-sm ${!notif.read ? 'text-white font-medium' : 'text-gray-400'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-gray-600">
                            {new Date(notif.date).toLocaleDateString()} • {new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
