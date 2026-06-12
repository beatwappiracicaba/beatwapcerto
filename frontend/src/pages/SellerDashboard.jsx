import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { apiClient } from '../services/apiClient';
import { TrendingUp, Calendar, Users, DollarSign, Target, Award, Bell, Clock, LayoutGrid, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SellerDashboard = () => {
  const { profile } = useAuth();
  const { notifications = [] } = useNotification();
  const { chats = [], supportQueue = [] } = useChat();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);
  const [activePanelTab, setActivePanelTab] = useState('resumo');

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await apiClient.get('/seller/dashboard');
      setGoals(data || { shows_target: 10, current_shows: 0, revenue_target: 50000, current_revenue: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateProgress = (current, target) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  const remainingShows = (goals?.shows_target || 0) - (goals?.current_shows || 0);
  const revenueFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const unreadNotifications = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((item) => !item?.read).length : 0),
    [notifications]
  );

  const activeChatsCount = useMemo(
    () => (Array.isArray(chats) ? chats.filter((chat) => String(chat?.status || '').toLowerCase() !== 'closed').length : 0),
    [chats]
  );

  const sellerQueue = useMemo(
    () => (Array.isArray(supportQueue) ? supportQueue.filter((item) => String(item?.role_needed || '').toLowerCase() === 'vendedor') : []),
    [supportQueue]
  );

  const recentNotifications = useMemo(
    () => (
      Array.isArray(notifications)
        ? notifications
            .slice()
            .sort((a, b) => new Date(b?.created_at || b?.date || 0) - new Date(a?.created_at || a?.date || 0))
            .slice(0, 4)
        : []
    ),
    [notifications]
  );

  const activityItems = useMemo(() => {
    const makeTs = (value) => {
      const ts = new Date(value || 0).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    const notifItems = (Array.isArray(notifications) ? notifications : []).map((notif) => ({
      id: `notif-${notif.id}`,
      title: notif.title || 'Notificacao',
      description: notif.message || 'Nova notificacao recebida.',
      kind: 'Notificacao',
      timestamp: notif.created_at || notif.date || null,
      timestampMs: makeTs(notif.created_at || notif.date || null)
    }));

    const chatItems = (Array.isArray(chats) ? chats : []).map((chat) => ({
      id: `chat-${chat.id}`,
      title: chat.subject || chat.artistName || chat.composerName || 'Conversa atualizada',
      description: chat.lastMessage || 'Nova movimentacao no chat.',
      kind: 'Chat',
      timestamp: chat.lastMessageTime || chat.updated_at || chat.created_at || null,
      timestampMs: makeTs(chat.lastMessageTime || chat.updated_at || chat.created_at || null)
    }));

    const queueItems = sellerQueue.map((item) => ({
      id: `queue-${item.id}`,
      title: item.subject || 'Nova oportunidade comercial',
      description: item.message || item.status || 'Existe uma solicitacao aguardando atendimento.',
      kind: 'Fila',
      timestamp: item.created_at || item.updated_at || null,
      timestampMs: makeTs(item.created_at || item.updated_at || null)
    }));

    return [...notifItems, ...chatItems, ...queueItems]
      .filter((item) => item.timestampMs > 0)
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [notifications, chats, sellerQueue]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Painel do Vendedor</h1>
            <p className="text-gray-400">Bem-vindo, {profile?.nome || 'Vendedor'}. Vamos bater as metas!</p>
          </div>
          <div className="flex gap-3">
            <AnimatedButton onClick={() => navigate('/seller/leads')} variant="primary" icon={Target}>
              Novas Oportunidades
            </AnimatedButton>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-beatwap-gold/80 font-bold">Painel Organizado</div>
            <h2 className="text-2xl font-extrabold text-white mt-2">Resumo rapido e atividade recente</h2>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">
              Separei o painel por foco para voce acompanhar metas, contatos e oportunidades sem mudar o fluxo atual.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'resumo', label: 'Resumo' },
              { id: 'atividade', label: 'Atividade' }
            ].map((tab) => {
              const isActive = activePanelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePanelTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-beatwap-gold text-black' : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activePanelTab === 'resumo' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="p-5 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-400">Notificacoes</div>
                    <div className="text-3xl font-extrabold text-white mt-1">{unreadNotifications}</div>
                    <div className="text-xs text-gray-500 mt-2">Itens ainda nao lidos</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
                    <Bell size={22} />
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-400">Chats ativos</div>
                    <div className="text-3xl font-extrabold text-white mt-1">{activeChatsCount}</div>
                    <div className="text-xs text-gray-500 mt-2">Conversas em andamento</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400">
                    <MessageSquare size={22} />
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-400">Fila comercial</div>
                    <div className="text-3xl font-extrabold text-white mt-1">{sellerQueue.length}</div>
                    <div className="text-xs text-gray-500 mt-2">Pedidos aguardando retorno</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-red-500/10 text-red-400">
                    <Clock size={22} />
                  </div>
                </div>
              </Card>
              <Card className="p-5 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-400">Meta restante</div>
                    <div className="text-3xl font-extrabold text-white mt-1">{Math.max(remainingShows, 0)}</div>
                    <div className="text-xs text-gray-500 mt-2">Shows para fechar a meta</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-beatwap-gold/10 text-beatwap-gold">
                    <LayoutGrid size={22} />
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 relative overflow-hidden group hover:border-beatwap-gold/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Award size={100} className="text-beatwap-gold" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-beatwap-gold/10 text-beatwap-gold">
                    <Target size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-white">Meta de Shows</h2>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-end">
                    <div className="text-4xl font-bold text-white">{goals?.current_shows || 0}</div>
                    <div className="text-sm text-gray-400">de {goals?.shows_target || 0} shows</div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-beatwap-gold transition-all duration-1000"
                      style={{ width: `${calculateProgress(goals?.current_shows || 0, goals?.shows_target || 1)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-300">
                    {remainingShows > 0
                      ? `Faltam ${remainingShows} shows para bater sua meta 🎯`
                      : 'Meta batida! Parabéns! 🚀'}
                  </p>
                </div>
              </Card>

              <Card className="p-6 relative overflow-hidden group hover:border-green-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <DollarSign size={100} className="text-green-500" />
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                    <TrendingUp size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-white">Meta de Faturamento</h2>
                </div>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-end">
                    <div className="text-4xl font-bold text-white">
                      {revenueFormatter.format(goals?.current_revenue || 0)}
                    </div>
                    <div className="text-sm text-gray-400">
                      de {revenueFormatter.format(goals?.revenue_target || 0)}
                    </div>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-1000"
                      style={{ width: `${calculateProgress(goals?.current_revenue || 0, goals?.revenue_target || 1)}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-300">
                    {calculateProgress(goals?.current_revenue || 0, goals?.revenue_target || 1) >= 100
                      ? 'Faturamento extraordinário! 💸'
                      : 'Continue prospectando para alcançar o objetivo.'}
                  </p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/artists')}>
                <Users className="text-blue-400 mb-3" size={32} />
                <h3 className="font-bold text-white">Artistas</h3>
                <p className="text-xs text-gray-400">Base de trabalho</p>
              </Card>
              <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/calendar')}>
                <Calendar className="text-purple-400 mb-3" size={32} />
                <h3 className="font-bold text-white">Agenda</h3>
                <p className="text-xs text-gray-400">Disponibilidade</p>
              </Card>
              <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/leads')}>
                <Target className="text-red-400 mb-3" size={32} />
                <h3 className="font-bold text-white">Leads</h3>
                <p className="text-xs text-gray-400">Oportunidades</p>
              </Card>
              <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/finance')}>
                <DollarSign className="text-green-400 mb-3" size={32} />
                <h3 className="font-bold text-white">Comissões</h3>
                <p className="text-xs text-gray-400">Seus ganhos</p>
              </Card>
            </div>

            <Card className="p-6 bg-white/5 border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-lg font-bold text-white">Ultimas notificacoes</div>
                  <div className="text-sm text-gray-400">Atualizacoes importantes do seu fluxo comercial</div>
                </div>
                <Bell className="text-beatwap-gold" size={20} />
              </div>
              <div className="space-y-3">
                {recentNotifications.length > 0 ? recentNotifications.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{item.title || 'Notificacao'}</div>
                        <div className="text-sm text-gray-300 mt-1">{item.message || 'Atualizacao recebida.'}</div>
                      </div>
                      {!item.read && (
                        <span className="shrink-0 rounded-full bg-beatwap-gold/15 px-2 py-1 text-[11px] font-bold text-beatwap-gold">
                          Nova
                        </span>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
                    Nenhuma notificacao recente por aqui.
                  </div>
                )}
              </div>
            </Card>
          </>
        )}

        {activePanelTab === 'atividade' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
            <Card className="p-6 bg-white/5 border border-white/10">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-lg font-bold text-white">Movimentacoes recentes</div>
                  <div className="text-sm text-gray-400">Notificacoes, conversas e fila comercial em um so lugar</div>
                </div>
                <Clock className="text-beatwap-gold" size={20} />
              </div>
              <div className="space-y-3">
                {activityItems.length > 0 ? activityItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] uppercase tracking-[0.2em] text-beatwap-gold/80 font-bold">{item.kind}</span>
                          <span className="text-xs text-gray-500">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : 'Sem horario'}
                          </span>
                        </div>
                        <div className="font-bold text-white mt-2">{item.title}</div>
                        <div className="text-sm text-gray-300 mt-1">{item.description}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-gray-400">
                    Ainda nao ha atividade recente suficiente para montar a linha do tempo.
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-6 bg-white/5 border border-white/10">
                <div className="text-lg font-bold text-white mb-4">Atalhos do dia</div>
                <div className="space-y-3">
                  <AnimatedButton onClick={() => navigate('/seller/leads')} variant="primary" icon={Target}>
                    Abrir leads
                  </AnimatedButton>
                  <AnimatedButton onClick={() => navigate('/seller/communications')} icon={MessageSquare}>
                    Ir para comunicacoes
                  </AnimatedButton>
                  <AnimatedButton onClick={() => navigate('/seller/calendar')} icon={Calendar}>
                    Revisar agenda
                  </AnimatedButton>
                </div>
              </Card>

              <Card className="p-6 bg-white/5 border border-white/10">
                <div className="text-lg font-bold text-white mb-4">Indicadores rapidos</div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Shows confirmados</span>
                    <span className="text-white font-bold">{goals?.current_shows || 0}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Faturamento atual</span>
                    <span className="text-white font-bold">{revenueFormatter.format(goals?.current_revenue || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Fila comercial</span>
                    <span className="text-white font-bold">{sellerQueue.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Conversas ativas</span>
                    <span className="text-white font-bold">{activeChatsCount}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SellerDashboard;
