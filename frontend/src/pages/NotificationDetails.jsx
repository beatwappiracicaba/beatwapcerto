import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { AdminLayout } from '../components/AdminLayout';
import { Clock, CheckCircle, AlertTriangle, Info, ArrowLeft, Bell, XCircle } from 'lucide-react';

const NotificationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { getNotifications, markAsRead } = useNotification();
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (user && id) {
      const notifs = getNotifications(user.id);
      const found = notifs.find(n => n.id === id);
      if (found) {
        setNotification(found);
        if (!found.read) {
          markAsRead(id);
        }
      }
    }
  }, [user, id, getNotifications, markAsRead]);

  const Layout = profile?.cargo === 'Produtor' ? AdminLayout : DashboardLayout;

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={48} />;
      case 'error': return <XCircle className="text-red-500" size={48} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={48} />;
      default: return <Info className="text-blue-500" size={48} />;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Postado em ${day}/${month}/${year} as ${hours}:${minutes}`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Voltar
        </button>

        <div className="bg-[#121212] border border-white/10 rounded-2xl p-6 md:p-10 shadow-xl">
          {!notification ? (
             <div className="text-center py-20 text-gray-500">
               <Bell size={64} className="mx-auto mb-4 opacity-20" />
               <h2 className="text-xl font-bold">Notificação não encontrada</h2>
               <p className="text-sm mt-2">Esta notificação pode ter sido removida ou não existe.</p>
             </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-white/5 p-4 rounded-2xl shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex flex-col gap-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-white break-words">
                      {notification.title}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock size={16} />
                      {formatDate(notification.created_at || notification.date)}
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-white/10 my-4" />
                  
                  <div className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap break-words">
                    {notification.message}
                  </div>

                  {notification.link && notification.link !== '#' && !notification.link.includes('dashboard') && (
                    <div className="pt-6">
                      <button
                        onClick={() => navigate(notification.link)}
                        className="px-6 py-3 bg-beatwap-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default NotificationDetails;
