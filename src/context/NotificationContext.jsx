import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const { addToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get('/notifications'); // endpoint a ser adicionado
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      addToast('Erro ao carregar notificações', 'error');
    }
  }, [user, addToast]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const id = setInterval(fetchNotifications, 30000);
      return () => clearInterval(id);
    } else {
      setNotifications([]);
    }
  }, [user, fetchNotifications, addToast]);

  const getNotifications = () => {
    return notifications; 
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const addNotification = async (notification) => {
    try {
      await api.post('/notifications', {
        recipientId: notification.recipientId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        link: notification.link || null
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error adding notification:', error);
      addToast('Erro ao enviar notificação', 'error');
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      getNotifications, 
      getUnreadCount, 
      addNotification, 
      markAsRead, 
      markAllAsRead 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
