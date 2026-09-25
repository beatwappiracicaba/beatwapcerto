import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { API_BASE_URL } from '../config/apiConfig';
import { connectRealtime, subscribe, unsubscribe } from '../services/realtime';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const CONTEXT_FEED = 'feed';
export const CONTEXT_ADMIN = 'admin';

// Duas listas totalmente separadas. Uma interacao social nunca entra na
// lista administrativa e um aviso de plataforma nunca entra na do Feed.
// Cada lado so enxerga o proprio bucket, e a API ja filtra por contexto.
export const NotificationProvider = ({ children }) => {
  const [lists, setLists] = useState({ [CONTEXT_FEED]: [], [CONTEXT_ADMIN]: [] });
  const { user } = useAuth();
  const { addToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    // Uma requisicao por contexto: o contador de cada ambiente e o seu.
    const [feed, admin] = await Promise.allSettled([
      apiClient.get('/notifications?context=feed'),
      apiClient.get('/notifications?context=admin')
    ]);
    const next = {
      [CONTEXT_FEED]: feed.status === 'fulfilled' && Array.isArray(feed.value) ? feed.value : [],
      [CONTEXT_ADMIN]: admin.status === 'fulfilled' && Array.isArray(admin.value) ? admin.value : []
    };
    // 403 em admin significa que o usuario nao e administrativo: nesse caso a
    // lista administrativa fica vazia, o que e o comportamento esperado.
    setLists(next);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const id = setInterval(fetchNotifications, 30000);

      const base = API_BASE_URL || 'https://api.beatwap.com.br';
      const socket = connectRealtime(base);
      const rooms = [
        `profile:${user.id}:${CONTEXT_FEED}`,
        `profile:${user.id}:${CONTEXT_ADMIN}`
      ];
      rooms.forEach((room) => subscribe(room));

      const onCreated = () => fetchNotifications();
      const onUnreadUpdate = () => fetchNotifications();
      socket.on('notifications.created', onCreated);
      socket.on('notifications.unread.updated', onUnreadUpdate);

      return () => {
        clearInterval(id);
        socket.off('notifications.created', onCreated);
        socket.off('notifications.unread.updated', onUnreadUpdate);
        rooms.forEach((room) => unsubscribe(room));
      };
    } else {
      setLists({ [CONTEXT_FEED]: [], [CONTEXT_ADMIN]: [] });
    }
  }, [user, fetchNotifications]);

  // A assinatura aceita `context` (string). Chamadas antigas sem argumento
  // continuam caindo no bucket administrativo, que era o unico antes.
  const readArg = (maybeContext) => {
    if (typeof maybeContext === 'string' && maybeContext) return maybeContext;
    return CONTEXT_ADMIN;
  };

  const getNotifications = (context) => lists[readArg(context)] || [];
  const getUnreadCount = (context) => getNotifications(context).filter((n) => !n.read).length;

  const addNotification = async (notification) => {
    try {
      await apiClient.post('/notifications', {
        recipientId: notification.recipientId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || null,
        context: notification.context || CONTEXT_ADMIN
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const markAsRead = async (id, context) => {
    const ctx = readArg(context);
    try {
      await apiClient.post(`/notifications/${id}/read?context=${ctx}`);
      // Atualiza so a lista do contexto tocado: a outra fica intacta.
      setLists((prev) => ({
        ...prev,
        [ctx]: prev[ctx].map((n) => (n.id === id ? { ...n, read: true } : n))
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async (context) => {
    const ctx = readArg(context);
    try {
      await apiClient.post(`/notifications/read-all?context=${ctx}`);
      setLists((prev) => ({
        ...prev,
        [ctx]: prev[ctx].map((n) => ({ ...n, read: true }))
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    getNotifications,
    getUnreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    CONTEXT_FEED,
    CONTEXT_ADMIN
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => useContext(NotificationContext);
