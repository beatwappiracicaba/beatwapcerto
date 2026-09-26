import { useEffect, useState, useCallback, useMemo } from 'react';
import { BoostedProfilesStories } from '../components/BoostedProfilesStories';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { EmptyState } from '../components/ui/EmptyState';
import { HighlightRailCard } from '../components/ui/HighlightRailCard';
import { PanelSection } from '../components/ui/PanelSection';
import { PersistentPanelTabs } from '../components/ui/PersistentPanelTabs';
import { PremiumMetricCard } from '../components/ui/PremiumMetricCard';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';
import { Plus, Music, Clock, MessageCircle, User, Sparkles, Target, ArrowUpRight, BadgeCheck, DollarSign } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import { usePersistentState } from '../hooks/usePersistentState';
import { PainelCabecalho } from '../components/dashboard/PainelCabecalho';
import { IndicadoresPainel } from '../components/dashboard/IndicadoresPainel';
import { AcoesRapidas } from '../components/dashboard/AcoesRapidas';
import { AtividadeRecente, PendenciasPainel } from '../components/dashboard/ListasPainel';
import { SecaoPainel } from '../components/dashboard/SecaoPainel';
import { atalhosDoCargo } from '../components/dashboard/atalhos';

export const DashboardCompositions = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { notifications = [] } = useNotification();
  const { chats = [], supportQueue = [] } = useChat();
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [compMetrics, setCompMetrics] = useState({});
  const [activePanelTab, setActivePanelTab] = usePersistentState('dashboard-compositions-active-tab', 'resumo');
  const [searchTerm, setSearchTerm] = usePersistentState('dashboard-compositions-search', '');

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

  const atalhosCompositor = useMemo(() => atalhosDoCargo('Compositor'), []);

  const panelTabs = useMemo(
    () => [
      { id: 'resumo', label: 'Resumo', helper: 'Catalogo, radar e atalhos do dia', count: compositions.length },
      { id: 'pitch', label: 'Pitch', helper: 'O que vender primeiro e o que corrigir antes', count: pitchRadarItems.length },
      { id: 'atividade', label: 'Atividade', helper: 'Linha do tempo com notificacoes e chats', count: activityItems.length }
    ],
    [activityItems.length, compositions.length, pitchRadarItems.length]
  );

  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

  const filteredRecentNotifications = useMemo(
    () => recentNotifications.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.title || ''} ${item?.message || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [normalizedSearch, recentNotifications]
  );

  const filteredActivityItems = useMemo(
    () => activityItems.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.title || ''} ${item?.description || ''} ${item?.kind || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [activityItems, normalizedSearch]
  );

  const filteredCompositions = useMemo(
    () => compositions.filter((comp) => {
      if (!normalizedSearch) return true;
      return `${comp?.title || ''} ${comp?.genre || ''} ${comp?.status || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [compositions, normalizedSearch]
  );

  const filteredPitchRadarItems = useMemo(
    () => pitchRadarItems.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.title || ''} ${item?.genre || ''} ${item?.statusLabel || ''} ${item?.nextAction || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [normalizedSearch, pitchRadarItems]
  );

  const pitchBoardSummary = useMemo(() => ({
    hot: filteredPitchRadarItems.filter((item) => item.score >= 80).length,
    revision: filteredPitchRadarItems.filter((item) => item.feedback || item.status !== 'approved').length,
    monetized: filteredPitchRadarItems.filter((item) => item.price > 0).length
  }), [filteredPitchRadarItems]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PainelCabecalho
          cargo="Painel do Compositor"
          saudacao={`Ola, ${String(profile?.nome || user?.nome || '').trim() || 'compositor'}. Seu catalogo em um so lugar.`}
          resumo="Tamanho do catalogo, o que esta pronto para pitch, atalhos, atividade recente e o que ainda pede atencao."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar composicao, status, acao ou notificacao..."
        >
          <AnimatedButton onClick={() => setIsUploadModalOpen(true)} icon={Plus}>
            Nova composicao
          </AnimatedButton>
        </PainelCabecalho>

        <BoostedProfilesStories
          limit={14}
          title="Impulsionados em toda a plataforma"
          description="Assim o compositor enxerga quem esta em vitrine agora e consegue atacar networking, pitch e parceria com mais contexto."
        />

        <PersistentPanelTabs tabs={panelTabs} activeTab={activePanelTab} onChange={setActivePanelTab} />

        {activePanelTab === 'resumo' && (
          <div className="space-y-8">

            {/* 1. Indicadores principais */}
            <SecaoPainel titulo="Seu catalogo em numeros">
              <IndicadoresPainel
                itens={[
                  { icon: Music, title: 'Composicoes', value: compositions.length, hint: 'Faixas no catalogo', tone: 'purple' },
                  { icon: BadgeCheck, title: 'Aprovadas', value: approvedCount, hint: 'Liberadas para o mercado', tone: 'green' },
                  { icon: Clock, title: 'Pendentes', value: pendingCount, hint: 'Aguardando proximo passo', tone: 'gold' },
                  { icon: Sparkles, title: 'Prontas para pitch', value: pitchSummary.readyForPitch, hint: 'Com score para ataque', tone: 'blue' },
                  { icon: Target, title: 'Sem preco', value: pitchSummary.missingPricing, hint: 'Travam oportunidades', tone: 'red' },
                  { icon: DollarSign, title: 'Valor do catalogo', value: revenueFormatter.format(totalCatalogValue), hint: 'Potencial do acervo', tone: 'gold' }
                ]}
              />
            </SecaoPainel>

            {/* 2. Acoes rapidas */}
            <AcoesRapidas
              atalhos={atalhosCompositor}
              descricao="Atalhos do compositor para as areas mais usadas."
            />

            {/* 3. Atividades recentes e 4. Pendencias */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <AtividadeRecente
                itens={filteredActivityItems}
                descricao="Composicoes, conversas, fila e notificacoes."
                vazio="Sem atividade registrada por aqui."
                maximo={7}
              />
              <PendenciasPainel
                titulo="Pendencias e avisos"
                descricao="O que ainda pede a sua atencao."
                itens={[
                  { id: 'notif', rotulo: 'Nao lidas', valor: unreadNotifications, dica: 'Notificacoes em aberto' },
                  { id: 'chats', rotulo: 'Conversas ativas', valor: activeChatsCount, dica: 'Sem resposta sua', para: '/dashboard/chat' },
                  { id: 'preco', rotulo: 'Sem preco', valor: pitchSummary.missingPricing, dica: 'Oportunidades travadas' },
                  { id: 'revisar', rotulo: 'Para revisar', valor: pitchBoardSummary.revision, dica: 'Itens fora do pitch' }
                ]}
                notificacoes={filteredRecentNotifications}
              />
            </div>

            {/* 5. Complemento: radar de pitch */}
            <SecaoPainel
              titulo="Oportunidades do catalogo"
              descricao="Composicoes priorizadas por aprovacao, plays, preco e maturidade comercial."
              aside={(
                <AnimatedButton onClick={() => setIsUploadModalOpen(true)} icon={Plus}>
                  Nova composicao
                </AnimatedButton>
              )}
            >
              {filteredPitchRadarItems.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Nenhuma composicao combina com a busca"
                  description={normalizedSearch ? 'Tente outro termo para localizar itens do radar ou limpe a busca.' : 'Envie composicoes para liberar o radar de pitch.'}
                  action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                />
              ) : (
                <ul className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                  {filteredPitchRadarItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-beatwap-gold/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{item.title}</div>
                          <div className="mt-0.5 truncate text-xs text-gray-400">
                            {item.genre} &middot; {item.plays} plays &middot; {revenueFormatter.format(item.price || 0)}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getPitchTone(item.score)}`}>
                          {item.score}
                        </span>
                      </div>

                      <div className="mt-3 text-xs leading-relaxed text-gray-300">{item.nextAction}</div>

                      {item.feedback ? (
                        <div className="mt-2 text-[11px] leading-relaxed text-red-300">{item.feedback}</div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300">
                          {item.statusLabel}
                        </span>
                        {item.blockers.length > 0 ? (
                          <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300">
                            {item.blockers[0]}
                          </span>
                        ) : (
                          <span className="rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-300">
                            Sem travas
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SecaoPainel>

            {/* Complemento: catalogo completo */}
            <SecaoPainel
              titulo="Minhas composicoes"
              descricao={loading ? 'Carregando...' : `${filteredCompositions.length} de ${compositions.length} itens no catalogo.`}
              aside={(
                <AnimatedButton onClick={() => setIsUploadModalOpen(true)} icon={Plus}>
                  Nova composicao
                </AnimatedButton>
              )}
            >
              {loading ? (
                <p className="py-6 text-sm text-gray-500">Carregando...</p>
              ) : filteredCompositions.length === 0 ? (
                <EmptyState
                  icon={Music}
                  title={normalizedSearch ? 'Nenhuma composicao encontrada nessa busca' : 'Nenhuma composicao encontrada'}
                  description={normalizedSearch ? 'Ajuste o termo buscado ou limpe o filtro para ver todo o catalogo.' : 'Use o botao acima para enviar seu primeiro material.'}
                  action={<AnimatedButton onClick={() => (normalizedSearch ? setSearchTerm('') : setIsUploadModalOpen(true))}>{normalizedSearch ? 'Limpar busca' : 'Nova composicao'}</AnimatedButton>}
                />
              ) : (
                <ul className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {filteredCompositions.map((comp) => {
                    const mm = compMetrics[comp.id] || { plays: 0, totalSeconds: 0 };
                    const tempoTotal = `${Math.floor(mm.totalSeconds / 3600)}h ${Math.floor((mm.totalSeconds % 3600) / 60)}m ${mm.totalSeconds % 60}s`;
                    return (
                      <li key={comp.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-beatwap-gold/25">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-800">
                          {comp.cover_url ? (
                            <img src={comp.cover_url} alt={comp.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-500">
                              <Music size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-white">{comp.title}</div>
                          <div className="truncate text-[11px] text-gray-400">
                            {comp.genre} &middot; {new Date(comp.created_at).toLocaleDateString('pt-BR')}
                          </div>
                          {comp.status === 'approved' ? (
                            <div className="truncate text-[11px] text-gray-500">
                              {mm.plays} plays &middot; {tempoTotal}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              comp.status === 'approved'
                                ? 'bg-green-500/20 text-green-400'
                                : comp.status === 'rejected'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}
                          </span>
                          {comp.price ? (
                            <span className="text-[11px] font-bold text-beatwap-gold">R$ {comp.price}</span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SecaoPainel>
          </div>
        )}


        {activePanelTab === 'pitch' && (
          <div className="space-y-6">
            <PanelSection eyebrow="Mesa Comercial" title="Leitura premium da prontidao do pitch" description="Esses indicadores ajudam a enxergar o que esta quente, o que ainda trava e o que ja esta pronto para dinheiro.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <PremiumMetricCard icon={Sparkles} tone="green" title="Muito quentes" value={pitchBoardSummary.hot} description="Itens com maior chance de conversao" />
                <PremiumMetricCard icon={Clock} tone="gold" title="Precisam de revisao" value={pitchBoardSummary.revision} description="Com feedback ou fora da aprovacao final" />
                <PremiumMetricCard icon={BadgeCheck} tone="blue" title="Monetizadas" value={pitchBoardSummary.monetized} description="Ja com preco definido para pitch" />
              </div>
            </PanelSection>

            <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.85fr] gap-6">
              <PanelSection title="Mesa de pitch" description="Ordenacao executiva do catalogo por prontidao comercial">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="text-xs text-gray-500">{filteredPitchRadarItems.length} composicoes</div>
                </div>

                <div className="space-y-4">
                  {filteredPitchRadarItems.length === 0 ? (
                    <EmptyState
                      icon={Target}
                      title="Nenhuma composicao no pitch"
                      description={normalizedSearch ? 'A busca atual nao encontrou itens na mesa de pitch.' : 'Suba ou ajuste composicoes para alimentar esta aba.'}
                      action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                    />
                  ) : filteredPitchRadarItems.map((item) => (
                    <div key={`pitch-board-${item.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
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
                          <div className="text-xl font-extrabold text-white">{item.title}</div>
                          <div className="text-sm text-gray-300">{item.nextAction}</div>
                          <div className="flex flex-wrap gap-2">
                            {item.blockers.map((blocker) => (
                              <span key={`${item.id}-${blocker}-pitch`} className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                                {blocker}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="w-full lg:w-64 shrink-0 space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Valor e validacao</div>
                            <div className="text-sm text-white mt-2">{revenueFormatter.format(item.price || 0)} • {item.plays} plays</div>
                          </div>
                          <AnimatedButton onClick={() => setIsUploadModalOpen(true)} className="w-full justify-center" icon={ArrowUpRight}>
                            Melhorar material
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelSection>

              <div className="space-y-6">
                <HighlightRailCard title="Regra de ouro do pitch" description="Regras simples que deixam a interface mais consultiva e menos fria." badge="guia">
                  <div className="space-y-3 mt-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">1. Aprovada + preco definido + plays acima de zero = prioridade maxima</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">2. Se houver feedback, revise antes de insistir no mercado</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">3. Se faltou preco, voce esta travando sua conversao</div>
                  </div>
                </HighlightRailCard>

                <HighlightRailCard title="Atalhos do compositor" description="Acoes visuais com mais peso para facilitar o proximo passo." badge="rapido">
                  <div className="space-y-3 mt-4">
                    <AnimatedButton onClick={() => setIsUploadModalOpen(true)} className="w-full justify-center" icon={Plus}>
                      Nova composicao
                    </AnimatedButton>
                    <AnimatedButton onClick={() => navigate('/dashboard/chat')} variant="secondary" className="w-full justify-center" icon={MessageCircle}>
                      Abrir conversas
                    </AnimatedButton>
                    <AnimatedButton onClick={() => navigate('/dashboard/profile')} variant="secondary" className="w-full justify-center" icon={User}>
                      Ver perfil
                    </AnimatedButton>
                  </div>
                </HighlightRailCard>
              </div>
            </div>
          </div>
        )}

        {activePanelTab === 'atividade' && (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <PanelSection title="Atividade recente" description="A timeline ganhou moldura mais nobre para ficar com leitura de sistema profissional.">
              <div className="flex items-center justify-between mb-4">
                <div className="px-2 py-1 bg-white/10 rounded-lg text-white text-xs font-bold">{activityItems.length} itens</div>
              </div>
                {filteredActivityItems.length === 0 ? (
                  <EmptyState
                    icon={Clock}
                    title="Nenhuma atividade localizada"
                    description={normalizedSearch ? 'A busca atual nao encontrou itens na linha do tempo.' : 'Conforme seu catalogo, chats e notificacoes se moverem, a atividade vai aparecer aqui.'}
                    action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                  />
              ) : (
                <div className="space-y-3">
                    {filteredActivityItems.map((item) => (
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
            </PanelSection>

            <HighlightRailCard title="Atalhos uteis" description="Apoio lateral mais bonito e mais claro para navegar pelo sistema." badge="atalhos">
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
            </HighlightRailCard>
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
