import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, Info, AlertTriangle, CheckCircle, XCircle, Heart, MessageCircle, UserPlus, AtSign, Send } from 'lucide-react';
import { clsx } from 'clsx';
import { useNotification, CONTEXT_FEED } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

// `context` separa as caixas: o Feed pede 'feed' e os dashboards usam
// 'admin'. Cada uma so enxerga o proprio bucket e o proprio contador.
export const NotificationBell = ({ userId, context }) => {
  const navigate = useNavigate();
  const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = useNotification();
  const ctx = context === CONTEXT_FEED ? CONTEXT_FEED : 'admin';
  const isFeed = ctx === CONTEXT_FEED;
  const notifications = getNotifications(ctx);
  const unreadCount = getUnreadCount(ctx);

  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
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

  // No Feed o icone segue a natureza da interacao social; no Admin segue a
  // tonalidade classica (sucesso/erro/aviso).
  const iconFor = (notif) => {
    if (isFeed) {
      switch (notif?.type) {
        case 'like': return <Heart size={18} className="text-red-400" />;
        case 'comment': return <MessageCircle size={18} className="text-beatwap-gold" />;
        case 'follow': return <UserPlus size={18} className="text-beatwap-gold" />;
        case 'mention': return <AtSign size={18} className="text-beatwap-gold" />;
        case 'message': return <Send size={18} className="text-beatwap-gold" />;
        default: return <Info size={18} className="text-blue-500" />;
      }
    }
    switch (notif?.type) {
      case 'success': return <CheckCircle className="text-green-500" size={18} />;
      case 'error': return <XCircle className="text-red-500" size={18} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={18} />;
      default: return <Info className="text-blue-500" size={18} />;
    }
  };

  const handleNotificationClick = async (notif) => {
    // Marca como lida apenas no bucket desta caixa.
    await markAsRead(notif.id, ctx);
    setOpen(false);
    const link = String(notif.link || '').trim();
    if (link) {
      navigate(link);
      return;
    }
    navigate(`/notifications/${notif.id}?context=${ctx}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
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
        {hovering && notifications[0] && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute right-0 bottom-10 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 w-[86vw] sm:w-[300px] max-w-[86vw]"
          >
            <div className="p-3 border-b border-white/10 flex items-center gap-2">
              <Bell size={16} className="text-beatwap-gold" />
              <span className="font-bold text-sm">Prévia</span>
            </div>
            <div className="p-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 p-1.5 bg-white/5 rounded-lg">
                  {iconFor(notifications[0])}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm">{notifications[0].title}</div>
                  <div className="text-xs text-gray-400 mt-1">{notifications[0].message}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 w-auto sm:w-[360px]"
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-beatwap-gold" />
                <span className="font-bold">
                  {isFeed ? 'Notificações do Feed' : 'Notificações'}
                </span>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead(ctx)}
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
                  <div className="text-sm font-bold text-gray-400">
                    {isFeed ? 'Nenhuma notificação no Feed' : 'Sem notificações'}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {isFeed
                      ? 'Curtidas, comentários e menções aparecem aqui.'
                      : 'Avisos da plataforma aparecem aqui.'}
                  </div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-white/5 cursor-pointer transition-colors ${!notif.read ? 'bg-white/[0.02]' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 p-1.5 bg-white/5 rounded-lg">
                        {iconFor(notif)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className={clsx("font-bold pr-2 break-words", !notif.read ? "text-white" : "text-gray-300")}>
                            {notif.title}
                          </div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 shrink-0">
                            <Clock size={10} />
                            {new Date(notif.created_at || notif.date).toLocaleDateString()} • {new Date(notif.created_at || notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 break-words whitespace-normal">{notif.message}</div>
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
