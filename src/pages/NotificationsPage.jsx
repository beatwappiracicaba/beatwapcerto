import React from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, Clock, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useNavigate } from 'react-router-dom';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { getNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotification();
  const navigate = useNavigate();

  const notifications = getNotifications(user?.id);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      case 'error': return <XCircle className="text-red-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Minhas Notificações</h1>
            <p className="text-gray-400">Fique por dentro de todas as atualizações.</p>
          </div>
          {notifications.some(n => !n.read) && (
            <AnimatedButton onClick={() => markAllAsRead(user?.id)} variant="outline">
              <Check size={18} />
              Marcar todas como lidas
            </AnimatedButton>
          )}
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <Card className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Bell size={48} className="mb-4 opacity-20" />
              <p className="text-lg">Você não tem notificações no momento.</p>
            </Card>
          ) : (
            notifications.map((notif) => (
              <Card 
                key={notif.id} 
                className={`p-6 transition-all hover:bg-white/5 cursor-pointer border-l-4 ${
                  !notif.read ? 'border-l-beatwap-gold bg-white/[0.02]' : 'border-l-transparent'
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 shrink-0 p-2 bg-white/5 rounded-full">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-bold text-lg ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                        {notif.title}
                      </h3>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(notif.date).toLocaleDateString()} • {new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-gray-400 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
