import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { BoostedProfilesStories } from '../components/BoostedProfilesStories';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { EmptyState } from '../components/ui/EmptyState';
import { HighlightRailCard } from '../components/ui/HighlightRailCard';
import { PanelSection } from '../components/ui/PanelSection';
import { PersistentPanelTabs } from '../components/ui/PersistentPanelTabs';
import { PremiumMetricCard } from '../components/ui/PremiumMetricCard';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { apiClient } from '../services/apiClient';
import { TrendingUp, Calendar, DollarSign, Target, Award, Clock, MessageSquare, FileText, Sparkles, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePersistentState } from '../hooks/usePersistentState';
import { PainelCabecalho } from '../components/dashboard/PainelCabecalho';
import { IndicadoresPainel } from '../components/dashboard/IndicadoresPainel';
import { AcoesRapidas } from '../components/dashboard/AcoesRapidas';
import { AtividadeRecente, PendenciasPainel } from '../components/dashboard/ListasPainel';
import { SecaoPainel } from '../components/dashboard/SecaoPainel';
import { atalhosDoCargo } from '../components/dashboard/atalhos';

const SellerDashboard = () => {
  const { profile } = useAuth();
  const { notifications = [] } = useNotification();
  const { chats = [], supportQueue = [] } = useChat();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [dealRoomLoading, setDealRoomLoading] = useState(true);
  const [activePanelTab, setActivePanelTab] = usePersistentState('seller-dashboard-active-tab', 'resumo');
  const [searchTerm, setSearchTerm] = usePersistentState('seller-dashboard-search', '');

  useEffect(() => {
    fetchGoals();
    fetchDealRoom();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await apiClient.get('/seller/dashboard');
      setGoals(data || { shows_target: 10, current_shows: 0, revenue_target: 50000, current_revenue: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchDealRoom = async () => {
    try {
      setDealRoomLoading(true);
      const [leadData, proposalData] = await Promise.all([
        apiClient.get('/seller/leads').catch(() => []),
        apiClient.get('/seller/proposals').catch(() => [])
      ]);
      setLeads(Array.isArray(leadData) ? leadData : []);
      setProposals(Array.isArray(proposalData) ? proposalData : []);
    } catch (error) {
      console.error('Error loading deal room:', error);
      setLeads([]);
      setProposals([]);
    } finally {
      setDealRoomLoading(false);
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

  const getLeadStatusLabel = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'novo':
        return 'Novo';
      case 'negociacao':
        return 'Negociacao';
      case 'fechado':
        return 'Fechado';
      case 'perdido':
        return 'Perdido';
      case 'cancelado':
        return 'Cancelado';
      default:
        return 'Lead';
    }
  };

  const getProposalStatusLabel = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'rascunho':
        return 'Rascunho';
      case 'enviado':
        return 'Enviado';
      case 'aceito':
        return 'Aceito';
      case 'rejeitado':
        return 'Rejeitado';
      default:
        return 'Proposta';
    }
  };

  const getStageTone = (score) => {
    if (score >= 80) return 'bg-green-500/10 text-green-300 border-green-500/30';
    if (score >= 60) return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    if (score >= 40) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
    return 'bg-white/10 text-gray-300 border-white/10';
  };

  const dealRoomSummary = useMemo(() => {
    const activeLeads = leads.filter((lead) => !['perdido', 'cancelado'].includes(String(lead?.status || '').toLowerCase()));
    const negotiationLeads = leads.filter((lead) => String(lead?.status || '').toLowerCase() === 'negociacao');
    const sentProposals = proposals.filter((proposal) => String(proposal?.status || '').toLowerCase() === 'enviado');
    const acceptedProposals = proposals.filter((proposal) => String(proposal?.status || '').toLowerCase() === 'aceito');
    const activeValue = activeLeads.reduce((acc, lead) => acc + (Number(lead?.budget) || 0), 0);
    const proposalValue = proposals.reduce((acc, proposal) => acc + (Number(proposal?.value) || 0), 0);

    return {
      activeLeadsCount: activeLeads.length,
      negotiationLeadsCount: negotiationLeads.length,
      sentProposalsCount: sentProposals.length,
      acceptedProposalsCount: acceptedProposals.length,
      dealRoomValue: activeValue,
      proposalValue
    };
  }, [leads, proposals]);

  const dealRoomItems = useMemo(() => {
    const proposalScoreMap = {
      rascunho: 6,
      enviado: 16,
      aceito: 28,
      rejeitado: -10
    };
    const leadScoreMap = {
      novo: 34,
      negociacao: 56,
      fechado: 82,
      perdido: 10,
      cancelado: 4
    };

    const getArtistName = (item) =>
      item?.artist?.nome ||
      item?.artist?.nome_completo_razao_social ||
      item?.artist_name ||
      item?.nome_artista ||
      'Artista';

    const getClientName = (item) =>
      item?.client_name ||
      item?.contractor_name ||
      item?.contractor?.nome ||
      item?.contractor?.nome_completo_razao_social ||
      'Cliente em definicao';

    const getLeadProposalMatches = (lead) =>
      proposals.filter((proposal) => {
        if (proposal?.lead_id && lead?.id && String(proposal.lead_id) === String(lead.id)) return true;
        if (proposal?.artist_id && lead?.artist_id && String(proposal.artist_id) === String(lead.artist_id)) {
          return String(proposal?.client_name || '').trim().toLowerCase() === String(lead?.contractor_name || '').trim().toLowerCase();
        }
        return false;
      });

    const itemsFromLeads = leads.map((lead) => {
      const matchedProposals = getLeadProposalMatches(lead);
      const topProposal = matchedProposals
        .slice()
        .sort((a, b) => (Number(b?.value) || 0) - (Number(a?.value) || 0))[0];
      const budget = Number(lead?.budget) || Number(topProposal?.value) || 0;
      const leadStatus = String(lead?.status || '').toLowerCase();
      const proposalStatus = String(topProposal?.status || '').toLowerCase();
      const artistName = getArtistName(lead);
      const chatMatch = chats.find((chat) =>
        String(chat?.artistId || '') === String(lead?.artist_id || '') ||
        String(chat?.artistName || '').trim().toLowerCase() === String(artistName || '').trim().toLowerCase()
      );

      let score =
        (leadScoreMap[leadStatus] ?? 24) +
        (proposalScoreMap[proposalStatus] ?? 0) +
        Math.min(18, Math.round(budget / 2000));

      if (lead?.event_date) score += 5;
      if (topProposal) score += 8;
      if (chatMatch) score += 7;

      score = Math.max(8, Math.min(96, score));

      const blockers = [];
      if (!lead?.budget) blockers.push('Sem orcamento definido');
      if (!lead?.event_date) blockers.push('Sem data confirmada');
      if (!topProposal) blockers.push('Falta proposta vinculada');
      if (!chatMatch) blockers.push('Contato ainda frio');

      let nextAction = 'Aquecer relacionamento e registrar proximo passo.';
      if (!topProposal) nextAction = 'Criar proposta comercial para acelerar o fechamento.';
      else if (proposalStatus === 'rascunho') nextAction = 'Finalizar e enviar a proposta hoje.';
      else if (proposalStatus === 'enviado') nextAction = 'Fazer follow-up comercial com o cliente.';
      else if (proposalStatus === 'aceito') nextAction = 'Levar para agenda e garantir operacao.';
      else if (leadStatus === 'negociacao') nextAction = 'Fechar condicoes e converter em show confirmado.';

      return {
        id: `lead-${lead.id}`,
        title: lead?.event_name || 'Oportunidade comercial',
        artistName,
        clientName: getClientName(lead),
        city: lead?.city || null,
        score,
        budget,
        leadStatus,
        leadStatusLabel: getLeadStatusLabel(leadStatus),
        proposalStatusLabel: topProposal ? getProposalStatusLabel(proposalStatus) : 'Sem proposta',
        proposalStatus,
        matchedProposalId: topProposal?.id || null,
        blockers: blockers.slice(0, 3),
        nextAction,
        eventDate: lead?.event_date || null
      };
    });

    const standaloneProposals = proposals
      .filter((proposal) => !proposal?.lead_id)
      .map((proposal) => {
        const proposalStatus = String(proposal?.status || '').toLowerCase();
        const proposalValue = Number(proposal?.value) || 0;
        let score = (proposalScoreMap[proposalStatus] ?? 8) + Math.min(18, Math.round(proposalValue / 2000)) + 20;
        score = Math.max(12, Math.min(88, score));

        return {
          id: `proposal-${proposal.id}`,
          title: proposal?.title || 'Proposta em andamento',
          artistName: getArtistName(proposal),
          clientName: getClientName(proposal),
          city: null,
          score,
          budget: proposalValue,
          leadStatus: 'negociacao',
          leadStatusLabel: 'Negociacao',
          proposalStatusLabel: getProposalStatusLabel(proposalStatus),
          proposalStatus,
          matchedProposalId: proposal?.id || null,
          blockers: proposalStatus === 'rascunho' ? ['Falta enviar para o cliente'] : ['Sem lead vinculado'],
          nextAction: proposalStatus === 'rascunho' ? 'Enviar proposta e registrar retorno.' : 'Converter em lead estruturado para acompanhar melhor.',
          eventDate: null
        };
      });

    return [...itemsFromLeads, ...standaloneProposals]
      .sort((a, b) => b.score - a.score || (b.budget || 0) - (a.budget || 0))
      .slice(0, 5);
  }, [leads, proposals, chats]);

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

  const panelTabs = useMemo(
    () => [
      { id: 'resumo', label: 'Resumo', helper: 'Metas, pipeline e deal room', count: dealRoomItems.length + unreadNotifications },
      { id: 'pipeline', label: 'Pipeline', helper: 'Leitura por fase, gargalo e fechamento', count: dealRoomItems.length },
      { id: 'atividade', label: 'Atividade', helper: 'Timeline comercial e atalhos do dia', count: activityItems.length }
    ],
    [activityItems.length, dealRoomItems.length, unreadNotifications]
  );

  const normalizedSearch = String(searchTerm || '').trim().toLowerCase();

  const filteredDealRoomItems = useMemo(
    () => dealRoomItems.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.title || ''} ${item?.artistName || ''} ${item?.clientName || ''} ${item?.nextAction || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [dealRoomItems, normalizedSearch]
  );

  const filteredActivityItems = useMemo(
    () => activityItems.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.title || ''} ${item?.description || ''} ${item?.kind || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [activityItems, normalizedSearch]
  );

  const atalhosVendedor = useMemo(() => atalhosDoCargo('Vendedor'), []);

  const pipelineSummary = useMemo(() => ({
    hotDeals: filteredDealRoomItems.filter((item) => item.score >= 80).length,
    blockedDeals: filteredDealRoomItems.filter((item) => item.blockers.length > 0).length,
    proposalMissing: filteredDealRoomItems.filter((item) => !item.matchedProposalId).length,
    negotiation: filteredDealRoomItems.filter((item) => item.leadStatus === 'negociacao').length
  }), [filteredDealRoomItems]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <PainelCabecalho
          cargo="Painel do Vendedor"
          saudacao={`Bem-vindo, ${profile?.nome || 'Vendedor'}. Vamos bater as metas!`}
          resumo="Leads, propostas, negociacoes e os acompanhamentos que ainda dependem de voce."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar lead, cliente, artista, acao ou atividade..."
        >
          <AnimatedButton onClick={() => navigate('/seller/leads')} icon={Target}>
            Novas oportunidades
          </AnimatedButton>
          <AnimatedButton onClick={() => navigate('/seller/proposals')} variant="secondary" icon={FileText}>
            Abrir propostas
          </AnimatedButton>
        </PainelCabecalho>

        <BoostedProfilesStories
          limit={14}
          title="Impulsionados em toda a plataforma"
          description="O vendedor passa a enxergar os perfis mais expostos do momento, o que ajuda a priorizar abordagem, proposta e fechamento."
        />

        <PersistentPanelTabs tabs={panelTabs} activeTab={activePanelTab} onChange={setActivePanelTab} />

        {activePanelTab === 'resumo' && (
          <div className="space-y-8">

            {/* 1. Indicadores comerciais */}
            <SecaoPainel titulo="Metas e pipeline">
              <IndicadoresPainel
                itens={[
                  { icon: Target, title: 'Leads ativos', value: dealRoomSummary.activeLeadsCount, hint: 'Oportunidades abertas', tone: 'gold' },
                  { icon: Clock, title: 'Em negociacao', value: dealRoomSummary.negotiationLeadsCount, hint: 'Conversas em andamento', tone: 'blue' },
                  { icon: Award, title: 'Propostas aceitas', value: dealRoomSummary.acceptedProposalsCount, hint: 'Fechados no periodo', tone: 'green' },
                  { icon: FileText, title: 'Propostas enviadas', value: dealRoomSummary.sentProposalsCount, hint: 'Aguardando retorno', tone: 'purple' },
                  { icon: DollarSign, title: 'Pipeline', value: revenueFormatter.format(dealRoomSummary.dealRoomValue), hint: 'Soma dos leads ativos', tone: 'gold' },
                  { icon: TrendingUp, title: 'Shows restantes', value: remainingShows, hint: `Meta de ${goals?.shows_target || 0} shows`, tone: 'slate' }
                ]}
              />
            </SecaoPainel>

            {/* 2. Acoes rapidas */}
            <AcoesRapidas
              atalhos={atalhosVendedor}
              descricao="Atalhos para pipeline, propostas e agenda."
            />

            {/* 3. Atividades recentes e 4. Pendencias */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <AtividadeRecente
                itens={filteredActivityItems}
                descricao="Leads, propostas, conversas e notificacoes."
                vazio="Sem atividade registrada por aqui."
                maximo={7}
              />
              <PendenciasPainel
                titulo="Acompanhamentos pendentes"
                descricao="O que trava ou espera sua acao."
                itens={[
                  { id: 'notif', rotulo: 'Nao lidas', valor: unreadNotifications, dica: 'Notificacoes em aberto' },
                  { id: 'bloqueados', rotulo: 'Com travas', valor: pipelineSummary.blockedDeals, dica: 'Dependem de acao', para: '/seller/leads' },
                  { id: 'sem-proposta', rotulo: 'Sem proposta', valor: pipelineSummary.proposalMissing, dica: 'Lead sem proposta', para: '/seller/proposals' },
                  { id: 'chats', rotulo: 'Conversas ativas', valor: activeChatsCount, dica: 'Sem resposta sua', para: '/seller/communications' }
                ]}
                notificacoes={recentNotifications}
              />
            </div>

            {/* 5. Complemento: oportunidades com score */}
            <SecaoPainel
              titulo="Oportunidades com maior potencial"
              descricao="Leads e propostas priorizados por valor e proximidade de fechamento."
              aside={(
                <AnimatedButton onClick={() => navigate('/seller/leads')} variant="secondary" icon={Target}>
                  Abrir pipeline
                </AnimatedButton>
              )}
            >
              {filteredDealRoomItems.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="Nenhuma oportunidade encontrada"
                  description={normalizedSearch ? 'Sua busca nao encontrou itens no pipeline.' : 'Assim que houver leads e propostas, o painel organiza por prioridade.'}
                  action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                />
              ) : (
                <ul className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                  {filteredDealRoomItems.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-beatwap-gold/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{item.title}</div>
                          <div className="mt-0.5 truncate text-xs text-gray-400">
                            {item.clientName}{item.artistName ? ` · ${item.artistName}` : ''}
                          </div>
                        </div>
                        {Number.isFinite(item.score) ? (
                          <span className="shrink-0 rounded-full border border-beatwap-gold/30 bg-beatwap-gold/10 px-2.5 py-1 text-[11px] font-bold text-beatwap-gold">
                            {item.score}
                          </span>
                        ) : null}
                      </div>

                      {item.nextAction ? (
                        <div className="mt-3 text-xs leading-relaxed text-gray-300">{item.nextAction}</div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {item.budget ? (
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-gray-200">
                            {revenueFormatter.format(item.budget)}
                          </span>
                        ) : null}
                        {item.eventDate ? (
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-400">
                            {new Date(item.eventDate).toLocaleDateString('pt-BR')}
                          </span>
                        ) : null}
                        {item.blockers && item.blockers.length > 0 ? (
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
          </div>
        )}

        {activePanelTab === 'pipeline' && (
          <div className="space-y-6">
            <PanelSection eyebrow="Pipeline Visual" title="Leitura premium do fechamento comercial" description="Os cards agora deixam mais claro onde ha dinheiro em jogo, quais deals aqueceram e o que ainda trava o fechamento.">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <PremiumMetricCard icon={Sparkles} tone="green" title="Deals quentes" value={pipelineSummary.hotDeals} description="Score 80+ e maior chance de fechar" />
                <PremiumMetricCard icon={TrendingUp} tone="blue" title="Em negociacao" value={pipelineSummary.negotiation} description="Deals exigindo follow-up comercial" />
                <PremiumMetricCard icon={FileText} tone="gold" title="Sem proposta" value={pipelineSummary.proposalMissing} description="Oportunidades travadas por material" />
                <PremiumMetricCard icon={Clock} tone="red" title="Com gargalos" value={pipelineSummary.blockedDeals} description="Precisam de acao antes do fechamento" />
              </div>
            </PanelSection>

            <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.82fr] gap-6">
              <PanelSection title="Pipeline operacional" description="Visual premium das oportunidades que exigem acao hoje">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="text-xs text-gray-500">{filteredDealRoomItems.length} deals</div>
                </div>

                <div className="space-y-4">
                  {filteredDealRoomItems.length === 0 ? (
                    <EmptyState
                      icon={Target}
                      title="Nenhum deal encontrado no pipeline"
                      description={normalizedSearch ? 'A busca atual nao encontrou oportunidades nesta aba.' : 'Alimente leads e propostas para montar o pipeline operacional.'}
                      action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                    />
                  ) : filteredDealRoomItems.map((item) => (
                    <div key={`pipeline-${item.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStageTone(item.score)}`}>
                              Score {item.score}
                            </span>
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                              {item.leadStatusLabel}
                            </span>
                          </div>
                          <div className="text-xl font-extrabold text-white">{item.title}</div>
                          <div className="text-sm text-gray-300">{item.artistName} • {item.clientName}</div>
                          <div className="flex flex-wrap gap-2">
                            {item.blockers.length > 0 ? item.blockers.map((blocker) => (
                              <span key={`${item.id}-${blocker}-pipeline`} className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                                {blocker}
                              </span>
                            )) : (
                              <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
                                Sem travas criticas
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-full lg:w-64 shrink-0 space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Valor estimado</div>
                            <div className="text-sm text-white mt-2">{revenueFormatter.format(item.budget || 0)}</div>
                          </div>
                          <AnimatedButton onClick={() => navigate('/seller/leads')} className="w-full justify-center" icon={ArrowUpRight}>
                            Abrir pipeline
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelSection>

              <div className="space-y-6">
                <HighlightRailCard title="Playbook de fechamento" description="Passos rapidos para dar cara de sistema consultivo ao pipeline." badge="guia">
                  <div className="space-y-3 mt-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">1. Resolva os deals sem proposta</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">2. Faça follow-up dos que estao em negociacao</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">3. Leve aceites para agenda e financeiro</div>
                  </div>
                </HighlightRailCard>

                <HighlightRailCard title="Acoes rapidas" description="Atalhos com mais peso visual para facilitar decisao." badge="atalhos">
                  <div className="space-y-3 mt-4">
                    <AnimatedButton onClick={() => navigate('/seller/proposals')} className="w-full justify-center" icon={FileText}>
                      Resolver propostas
                    </AnimatedButton>
                    <AnimatedButton onClick={() => navigate('/seller/communications')} variant="secondary" className="w-full justify-center" icon={MessageSquare}>
                      Fazer follow-up
                    </AnimatedButton>
                  </div>
                </HighlightRailCard>
              </div>
            </div>
          </div>
        )}

        {activePanelTab === 'atividade' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
            <PanelSection title="Movimentacoes recentes" description="Notificacoes, conversas e fila comercial em um so lugar com visual mais executivo.">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Clock className="text-beatwap-gold" size={20} />
              </div>
              <div className="space-y-3">
                {filteredActivityItems.length > 0 ? filteredActivityItems.map((item) => (
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
                  <EmptyState
                    icon={Clock}
                    title="Nenhuma atividade localizada"
                    description={normalizedSearch ? 'A busca atual nao encontrou eventos no timeline.' : 'Ainda nao ha atividade recente suficiente para montar a linha do tempo.'}
                    action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                  />
                )}
              </div>
            </PanelSection>

            <div className="space-y-6">
              <HighlightRailCard title="Atalhos do dia" description="Caixa lateral com acoes prioritarias do vendedor." badge="hoje">
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
              </HighlightRailCard>

              <HighlightRailCard title="Indicadores rapidos" description="Resumo comercial lateral com leitura mais premium." badge="kpi">
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Leads ativos</span>
                    <span className="text-white font-bold">{dealRoomSummary.activeLeadsCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Propostas enviadas</span>
                    <span className="text-white font-bold">{dealRoomSummary.sentProposalsCount}</span>
                  </div>
                </div>
              </HighlightRailCard>

              <HighlightRailCard title="Radar de fechamento" description="Mini vitrine das prioridades comerciais mais quentes." badge="radar">
                <div className="space-y-3">
                  {dealRoomLoading ? (
                    <div className="text-sm text-gray-400">Carregando prioridades comerciais...</div>
                  ) : filteredDealRoomItems.length > 0 ? (
                    filteredDealRoomItems.slice(0, 3).map((item) => (
                      <div key={`activity-${item.id}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{item.title}</div>
                            <div className="text-xs text-gray-400 mt-1 truncate">{item.clientName}</div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-bold ${getStageTone(item.score)}`}>
                            {item.score}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">
                      {normalizedSearch ? 'Nenhuma oportunidade corresponde a essa busca.' : 'Sem oportunidades ranqueadas ainda.'}
                    </div>
                  )}
                </div>
              </HighlightRailCard>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SellerDashboard;
