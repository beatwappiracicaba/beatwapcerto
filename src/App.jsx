import React from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <ChatProvider>
            <NotificationProvider>
              <AppRoutes />
            </NotificationProvider>
          </ChatProvider>
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
