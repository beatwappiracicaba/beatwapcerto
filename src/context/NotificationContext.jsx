import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const channel = supabase
        .channel('public:notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          addToast(payload.new.title, payload.new.type || 'info');
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setNotifications([]);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      addToast('Erro ao carregar notificações', 'error');
    }
  };

  const getNotifications = (userId) => {
    return notifications; 
  };

  const getUnreadCount = (userId) => {
    return notifications.filter(n => !n.read).length;
  };

  const addNotification = async (notification) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
            recipient_id: notification.recipientId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            link: notification.link,
            read: false
        }])
        .select();

      if (error) throw error;
      // Realtime subscription will handle the state update if the sender is also the recipient
      // otherwise, we don't need to update local state for sent notifications
    } catch (error) {
      console.error('Error adding notification:', error);
      addToast('Erro ao enviar notificação', 'error');
    }
  };

  const markAsRead = async (id) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async (userId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', userId)
        .eq('read', false);

      if (error) throw error;

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
