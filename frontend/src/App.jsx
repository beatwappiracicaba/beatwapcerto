import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';
import { DataProvider } from './context/DataContext';
import { GlobalAudioPlayerDock, GlobalAudioPlayerProvider } from './context/GlobalAudioPlayerContext';
import { AppRoutes } from './routes/AppRoutes';
import { ImageProtectionManager } from './components/security/ImageProtectionManager';
import PWAInstallButton from './components/PWAInstallButton';

function App() {
  return (
    <ToastProvider>
      <GlobalAudioPlayerProvider>
        <AuthProvider>
          <NotificationProvider>
            <DataProvider>
              <ChatProvider>
                <ImageProtectionManager />
                <AppRoutes />
                <GlobalAudioPlayerDock />
                <PWAInstallButton />
              </ChatProvider>
            </DataProvider>
          </NotificationProvider>
        </AuthProvider>
      </GlobalAudioPlayerProvider>
    </ToastProvider>
  );
}

export default App;