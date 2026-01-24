import React, { createContext, useContext, useState } from 'react';
import { mockNotifications } from '../data/mockNotifications';
import { useToast } from './ToastContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const { addToast } = useToast();

  // Filter notifications for current user (simulated)
  // In a real app, this would be handled by the backend or a user ID prop
  const getNotifications = (userId) => {
    return notifications
      .filter(n => n.recipientId === userId || n.recipientId === 'all')
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getUnreadCount = (userId) => {
    return getNotifications(userId).filter(n => !n.read).length;
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Optional: Show a toast as well for immediate feedback
    // addToast(notification.title, notification.type === 'error' ? 'error' : 'info');
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = (userId) => {
    setNotifications(prev => prev.map(n => 
      (n.recipientId === userId || n.recipientId === 'all') ? { ...n, read: true } : n
    ));
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
