import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useNotification } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = ({ userId }) => {
  const navigate = useNavigate();
  const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = useNotification();
  const notifications = getNotifications(userId);
  const unreadCount = getUnreadCount(userId);

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const iconFor = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={18} />;
      case 'error': return <XCircle className="text-red-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  const onClickNotif = async (notif) => {
    await markAsRead(notif.id);
    if (notif.link) navigate(notif.link);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "relative p-2 rounded-xl border transition-colors",
          open ? "border-beatwap-gold text-white" : "border-white/10 text-gray-400 hover:bg-white/10"
        )}
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-beatwap-gold text-black text-xs font-bold rounded-full px-1.5 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 w-[92vw] sm:w-[360px] max-w-[92vw]"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-beatwap-gold" />
                <span className="font-bold">Notificações</span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead(userId)}
                  className="text-xs px-3 py-1 rounded-lg bg-beatwap-gold text-black font-bold hover:bg-yellow-500 transition-colors flex items-center gap-1"
                >
                  <Check size={14} /> Marcar todas
                </button>
              )}
            </div>

            <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell size={40} className="mb-3 opacity-20 mx-auto" />
                  <div className="text-sm">Sem notificações</div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => onClickNotif(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-1.5 bg-white/5 rounded-lg">
                        {iconFor(notif.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className={clsx("font-bold", !notif.read ? "text-white" : "text-gray-300")}>
                            {notif.title}
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(notif.created_at || notif.date).toLocaleDateString()} • {new Date(notif.created_at || notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{notif.message}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
