import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';
import { DataProvider } from './context/DataContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <DataProvider>
            <ChatProvider>
              <AppRoutes />
            </ChatProvider>
          </DataProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
