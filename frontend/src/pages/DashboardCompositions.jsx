import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';
import { Plus, Music, Bell, Clock, MessageCircle, LayoutGrid, User } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';

export const DashboardCompositions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications = [] } = useNotification();
  const { chats = [], supportQueue = [] } = useChat();
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [compMetrics, setCompMetrics] = useState({});
  const [activePanelTab, setActivePanelTab] = useState('resumo');

  const fetchCompositions = useCallback(async () => {
    setLoading(true);
    const data = await apiClient.get('/composer/compositions');
    setCompositions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCompositions();
  }, [user, fetchCompositions]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      const ev = await apiClient.get(`/analytics/artist/${user.id}/events`);
      
      const agg = {};

      (ev || []).forEach(e => {
        // Individual Composition Metrics
        const mid = e.music_id || 'unknown';
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0 };
        if (e.type === 'music_play') {
          agg[mid].plays += 1;
          agg[mid].totalSeconds += Number(e.duration_seconds || 0);
        }
      });

      setCompMetrics(agg);
    };
    loadMetrics();
  }, [user]);

  const formatActivityTime = (value) => {
    const ts = new Date(value || 0).getTime();
    if (!Number.isFinite(ts)) return 'Agora';
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const approvedCount = compositions.filter((comp) => comp.status === 'approved').length;
  const pendingCount = compositions.filter((comp) => comp.status !== 'approved' && comp.status !== 'rejected').length;
  const totalCatalogValue = compositions.reduce((acc, comp) => acc + (Number(comp.price) || 0), 0);
  const unreadNotifications = notifications.filter((item) => !item?.read).length;
  const activeChatsCount = chats.filter((chat) => String(chat?.status || '').toLowerCase() !== 'closed').length;
  const recentNotifications = notifications
    .slice()
    .sort((a, b) => new Date(b?.created_at || b?.date || 0) - new Date(a?.created_at || a?.date || 0))
    .slice(0, 4);
  const activityItems = [
    ...notifications.map((notif) => ({
      id: `notif-${notif.id}`,
      title: notif.title || 'Notificacao',
      description: notif.message || 'Nova notificacao recebida.',
      kind: 'Notificacao',
      timestamp: notif.created_at || notif.date || null
    })),
    ...chats.map((chat) => ({
      id: `chat-${chat.id}`,
      title: chat.subject || 'Conversa atualizada',
      description: chat.lastMessage || 'Nova movimentacao no chat.',
      kind: 'Chat',
      timestamp: chat.lastMessageTime || chat.updated_at || chat.created_at || null
    })),
    ...supportQueue.map((item) => ({
      id: `queue-${item.id}`,
      title: item.subject || 'Solicitacao de suporte',
      description: item.message || item.status || 'Sua fila de atendimento foi atualizada.',
      kind: 'Fila',
      timestamp: item.created_at || item.updated_at || null
    })),
    ...compositions.map((comp) => ({
      id: `comp-${comp.id}`,
      title: comp.title || 'Composicao',
      description: `Status atual: ${comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}`,
      kind: 'Composicao',
      timestamp: comp.created_at || null
    }))
  ]
    .map((item) => ({
      ...item,
      timestampMs: (() => {
        const ts = new Date(item.timestamp || 0).getTime();
        return Number.isFinite(ts) ? ts : 0;
      })()
    }))
    .filter((item) => item.timestampMs > 0)
    .sort((a, b) => b.timestampMs - a.timestampMs)
    .slice(0, 8);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-beatwap-gold/80 font-bold">Painel do Compositor</div>
              <div className="text-2xl font-extrabold text-white mt-2">Resumo e atividade do catalogo</div>
              <div className="text-sm text-gray-400 mt-1">
                Controle suas composicoes, acompanhe notificacoes e veja o que aconteceu por ultimo.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
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
        </Card>

        {activePanelTab === 'resumo' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <div className="text-sm text-gray-400">Total de composicoes</div>
                <div className="text-3xl font-bold text-white">{compositions.length}</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-400">Aprovadas</div>
                <div className="text-3xl font-bold text-white">{approvedCount}</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-400">Pendentes</div>
                <div className="text-3xl font-bold text-white">{pendingCount}</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-400">Valor do catalogo</div>
                <div className="text-3xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCatalogValue)}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                  <Bell size={16} />
                  <span>Notificacoes</span>
                </div>
                <div className="text-3xl font-bold text-white">{unreadNotifications}</div>
                <div className="text-xs text-gray-500 mt-1">Nao lidas no momento</div>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                  <MessageCircle size={16} />
                  <span>Chats ativos</span>
                </div>
                <div className="text-3xl font-bold text-white">{activeChatsCount}</div>
                <div className="text-xs text-gray-500 mt-1">Conversas abertas no sistema</div>
              </Card>
              <Card>
                <div className="flex items-center gap-2 mb-2 text-gray-400 text-sm">
                  <LayoutGrid size={16} />
                  <span>Atalhos</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AnimatedButton onClick={() => setIsUploadModalOpen(true)} className="w-full sm:w-auto justify-center">
                    Nova Composicao
                  </AnimatedButton>
                  <AnimatedButton onClick={() => navigate('/dashboard/profile')} variant="secondary" className="w-full sm:w-auto justify-center">
                    Perfil
                  </AnimatedButton>
                </div>
              </Card>
            </div>

            <Card>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
                <div className="text-xl font-semibold text-white"><span>Minhas Composições</span></div>
                <AnimatedButton 
                  onClick={() => setIsUploadModalOpen(true)}
                  icon={Plus}
                >
                  Nova Composição
                </AnimatedButton>
              </div>

              <div className="space-y-3">
                {loading && <div className="text-gray-400"><span>Carregando...</span></div>}
                {!loading && compositions.length === 0 && (
                  <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
                    <p><span>Nenhuma composição encontrada.</span></p>
                    <p className="text-sm mt-2"><span>Clique em &quot;Nova Composição&quot; para enviar.</span></p>
                  </div>
                )}
                {!loading && compositions.map((comp) => (
                  <div key={comp.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                      {comp.cover_url ? (
                        <img src={comp.cover_url} alt={comp.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          <Music size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white"><span>{comp.title}</span></div>
                      <div className="text-xs text-gray-400"><span>{comp.genre} • {new Date(comp.created_at).toLocaleDateString()}</span></div>
                      {comp.status === 'approved' && (
                        <div className="mt-1 text-xs text-gray-300">
                          <span>
                          {(() => {
                            const mm = compMetrics[comp.id] || { plays: 0, totalSeconds: 0 };
                            const hh = Math.floor(mm.totalSeconds / 3600);
                            const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
                            const ss = mm.totalSeconds % 60;
                            const totalFmt = `${hh}h ${mmn}m ${ss}s`;
                            return `Plays: ${mm.plays} • Tempo total: ${totalFmt}`;
                          })()}
                          </span>
                        </div>
                      )}
                      {comp.price && (
                          <div className="text-xs text-beatwap-gold mt-1 font-bold"><span>R$ {comp.price}</span></div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                        comp.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                        comp.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                        'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        <span>{comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}</span>
                      </div>
                      {comp.admin_feedback && (
                        <div className="text-xs text-red-400 max-w-[150px] truncate" title={comp.admin_feedback}>
                          <span>{comp.admin_feedback}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {activePanelTab === 'atividade' && (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-400"><span>Atividade recente</span></div>
                <div className="px-2 py-1 bg-white/10 rounded-lg text-white text-xs font-bold">{activityItems.length} itens</div>
              </div>
              {activityItems.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhuma atividade recente para mostrar ainda.</div>
              ) : (
                <div className="space-y-3">
                  {activityItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-white font-bold text-sm">{item.title}</div>
                          <div className="text-xs text-beatwap-gold mt-1">{item.kind}</div>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 shrink-0">
                          <Clock size={12} />
                          {formatActivityTime(item.timestamp)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400 mt-2">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="text-sm text-gray-400 mb-4"><span>Atalhos uteis</span></div>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white font-bold">
                    <Music size={16} />
                    Nova composicao
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Envie uma nova composicao e aumente seu catalogo.</div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/chat')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white font-bold">
                    <MessageCircle size={16} />
                    Conversas
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Acompanhe chats e contatos que surgirem a partir das composicoes.</div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/profile')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white font-bold">
                    <User size={16} />
                    Meu perfil
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Ajuste seus dados publicos e mantenha seu perfil atualizado.</div>
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <CompositionsUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchCompositions}
      />
    </DashboardLayout>
  );
};

export default DashboardCompositions;
