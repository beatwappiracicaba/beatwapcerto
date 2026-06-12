import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';
import { Plus, Music, Bell, Clock, MessageCircle, LayoutGrid, User, Sparkles, Target, ArrowUpRight, BadgeCheck } from 'lucide-react';
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

  const revenueFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  );

  const getPitchTone = useCallback((score) => {
    if (score >= 82) return 'bg-green-500/10 text-green-300 border-green-500/30';
    if (score >= 64) return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    if (score >= 45) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
    return 'bg-white/10 text-gray-300 border-white/10';
  }, []);

  const pitchRadarItems = useMemo(() => {
    return compositions
      .map((comp) => {
        const status = String(comp?.status || '').toLowerCase();
        const plays = Number(compMetrics?.[comp.id]?.plays || 0);
        const price = Number(comp?.price) || 0;
        const hasFeedback = Boolean(String(comp?.admin_feedback || '').trim());

        let score = 26;
        if (status === 'approved') score += 34;
        else if (status === 'rejected') score += 8;
        else score += 18;

        score += Math.min(18, plays * 3);
        if (price > 0) score += 12;
        if (comp?.genre) score += 5;
        if (hasFeedback) score -= 6;
        score = Math.max(8, Math.min(96, score));

        const blockers = [];
        if (status !== 'approved') blockers.push(status === 'rejected' ? 'Precisa revisar devolutiva' : 'Aguardando aprovacao');
        if (price <= 0) blockers.push('Sem preco definido');
        if (plays === 0) blockers.push('Sem historico de plays');
        if (hasFeedback) blockers.push('Existe feedback administrativo');

        let nextAction = 'Refinar o material e aumentar o potencial comercial.';
        if (status === 'approved' && price > 0 && plays > 0) nextAction = 'Priorizar pitch para artistas e aquecer conversas.';
        else if (status === 'approved' && price <= 0) nextAction = 'Definir preco para abrir mais chance de conversao.';
        else if (status !== 'approved' && hasFeedback) nextAction = 'Aplicar o feedback e reenviar com mais chance de aceite.';
        else if (status !== 'approved') nextAction = 'Acompanhar status e preparar nova submissao.';

        return {
          id: comp.id,
          title: comp.title || 'Composicao',
          genre: comp.genre || 'Sem genero',
          status,
          statusLabel: status === 'approved' ? 'Aprovado' : status === 'rejected' ? 'Recusado' : 'Pendente',
          score,
          price,
          plays,
          blockers: blockers.slice(0, 3),
          nextAction,
          feedback: comp?.admin_feedback || '',
          createdAt: comp?.created_at || null
        };
      })
      .sort((a, b) => b.score - a.score || b.plays - a.plays || b.price - a.price)
      .slice(0, 5);
  }, [compositions, compMetrics]);

  const pitchSummary = useMemo(() => ({
    readyForPitch: pitchRadarItems.filter((item) => item.status === 'approved').length,
    missingPricing: pitchRadarItems.filter((item) => item.price <= 0).length,
    validatedByMarket: pitchRadarItems.filter((item) => item.plays > 0).length,
    hottestValue: pitchRadarItems.reduce((acc, item) => acc + item.price, 0)
  }), [pitchRadarItems]);

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

            <Card className="p-6 border border-beatwap-gold/20 bg-[linear-gradient(135deg,rgba(245,197,66,0.10),rgba(255,255,255,0.02),rgba(0,0,0,0.28))] shadow-[0_0_35px_rgba(245,197,66,0.08)]">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/30 bg-beatwap-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-beatwap-gold">
                    <Sparkles size={14} />
                    Radar de Pitch
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-3">Veja o que tem mais chance de virar negocio</div>
                  <div className="text-sm text-gray-300 mt-2 max-w-3xl">
                    Organizei o catalogo pelo que esta pronto para venda, pelo que ainda trava e pelo que precisa de ajuste para chamar mais atencao.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <AnimatedButton onClick={() => setIsUploadModalOpen(true)} icon={Plus}>
                    Nova composicao
                  </AnimatedButton>
                  <AnimatedButton onClick={() => navigate('/dashboard/chat')} variant="secondary" icon={MessageCircle}>
                    Abrir conversas
                  </AnimatedButton>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Prontas para pitch</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{pitchSummary.readyForPitch}</div>
                  <div className="text-xs text-gray-500 mt-2">Composicoes aprovadas para atacar mercado</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Sem preco</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{pitchSummary.missingPricing}</div>
                  <div className="text-xs text-gray-500 mt-2">Oportunidades travadas por precificacao</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Validadas por plays</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{pitchSummary.validatedByMarket}</div>
                  <div className="text-xs text-gray-500 mt-2">Faixas com algum sinal de interesse</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Valor priorizado</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{revenueFormatter.format(pitchSummary.hottestValue)}</div>
                  <div className="text-xs text-gray-500 mt-2">Catalogo mais quente do momento</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.8fr] gap-6">
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-bold text-white">Top oportunidades do catalogo</div>
                    <div className="text-sm text-gray-400">Score por aprovacao, plays, preco e maturidade comercial</div>
                  </div>
                  {pitchRadarItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-gray-400">
                      Envie composicoes para liberar o radar de pitch.
                    </div>
                  ) : pitchRadarItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getPitchTone(item.score)}`}>
                              Score {item.score}
                            </span>
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                              {item.statusLabel}
                            </span>
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                              {item.genre}
                            </span>
                          </div>
                          <div>
                            <div className="text-xl font-extrabold text-white">{item.title}</div>
                            <div className="text-sm text-gray-300 mt-1">
                              {item.plays} plays • {revenueFormatter.format(item.price || 0)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Travas atuais</div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.blockers.length > 0 ? item.blockers.map((blocker) => (
                                <span key={`${item.id}-${blocker}`} className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                                  {blocker}
                                </span>
                              )) : (
                                <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
                                  Sem travas criticas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="w-full lg:w-72 shrink-0 space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Acao recomendada</div>
                            <div className="text-sm text-white mt-2">{item.nextAction}</div>
                            {item.feedback ? (
                              <div className="mt-3 text-xs text-red-300">{item.feedback}</div>
                            ) : null}
                          </div>
                          <AnimatedButton onClick={() => setIsUploadModalOpen(true)} className="w-full justify-center" icon={ArrowUpRight}>
                            Melhorar catalogo
                          </AnimatedButton>
                          <AnimatedButton onClick={() => navigate('/dashboard/profile')} variant="secondary" className="w-full justify-center" icon={Target}>
                            Ajustar perfil
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <BadgeCheck size={18} className="text-beatwap-gold" />
                      Valor de assinatura
                    </div>
                    <div className="text-sm text-gray-300 mt-3">
                      Esse radar deixa claro para o compositor o que vender primeiro, o que revisar e onde esta o dinheiro mais facil do catalogo.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5 space-y-4">
                    <div className="text-white font-bold">Ataque rapido</div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-400">Pendencias do painel</span>
                      <span className="text-white font-bold">{pendingCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-400">Notificacoes nao lidas</span>
                      <span className="text-white font-bold">{unreadNotifications}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-400">Chats ativos</span>
                      <span className="text-white font-bold">{activeChatsCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

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
