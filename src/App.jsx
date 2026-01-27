import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <AppRoutes />
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
