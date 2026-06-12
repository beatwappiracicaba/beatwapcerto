import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { apiClient } from '../services/apiClient';
import { TrendingUp, Calendar, Users, DollarSign, Target, Award, Bell, Clock, LayoutGrid, MessageSquare, FileText, Sparkles, BadgeCheck, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SellerDashboard = () => {
  const { profile } = useAuth();
  const { notifications = [] } = useNotification();
  const { chats = [], supportQueue = [] } = useChat();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [dealRoomLoading, setDealRoomLoading] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState('resumo');

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

            <Card className="p-6 border border-beatwap-gold/20 bg-[linear-gradient(135deg,rgba(245,197,66,0.10),rgba(255,255,255,0.02),rgba(0,0,0,0.30))] shadow-[0_0_40px_rgba(245,197,66,0.08)]">
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/30 bg-beatwap-gold/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-beatwap-gold">
                    <Sparkles size={14} />
                    Deal Room Inteligente
                  </div>
                  <div className="text-2xl font-extrabold text-white mt-3">Radar comercial para vender mais rapido</div>
                  <div className="text-sm text-gray-300 mt-2 max-w-3xl">
                    Reuni leads, propostas, conversas e gargalos num mesmo lugar para destacar o que merece ataque imediato.
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <AnimatedButton onClick={() => navigate('/seller/leads')} icon={Target}>
                    Gerir pipeline
                  </AnimatedButton>
                  <AnimatedButton onClick={() => navigate('/seller/proposals')} variant="secondary" icon={FileText}>
                    Abrir propostas
                  </AnimatedButton>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Leads ativos</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{dealRoomSummary.activeLeadsCount}</div>
                  <div className="text-xs text-gray-500 mt-2">Negocios ainda vivos no pipeline</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Em negociacao</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{dealRoomSummary.negotiationLeadsCount}</div>
                  <div className="text-xs text-gray-500 mt-2">Pontes quentes para fechar</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Propostas enviadas</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{dealRoomSummary.sentProposalsCount}</div>
                  <div className="text-xs text-gray-500 mt-2">Materiais ja em decisao</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Valor em jogo</div>
                  <div className="text-3xl font-extrabold text-white mt-2">{revenueFormatter.format(dealRoomSummary.dealRoomValue || dealRoomSummary.proposalValue || 0)}</div>
                  <div className="text-xs text-gray-500 mt-2">Oportunidade financeira do momento</div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.8fr] gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-white">Oportunidades priorizadas</div>
                      <div className="text-sm text-gray-400">Score automatico por fase, proposta, data e aquecimento comercial</div>
                    </div>
                    <div className="text-xs text-gray-500">Top 5 do pipeline</div>
                  </div>

                  {dealRoomLoading ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-gray-400">
                      Carregando oportunidades do Deal Room...
                    </div>
                  ) : dealRoomItems.length > 0 ? dealRoomItems.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-3 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStageTone(item.score)}`}>
                              Score {item.score}
                            </span>
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                              {item.leadStatusLabel}
                            </span>
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                              {item.proposalStatusLabel}
                            </span>
                          </div>
                          <div>
                            <div className="text-xl font-extrabold text-white">{item.title}</div>
                            <div className="text-sm text-gray-300 mt-1">
                              {item.artistName} • {item.clientName}{item.city ? ` • ${item.city}` : ''}
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-xs text-gray-500 uppercase tracking-[0.18em]">Valor</div>
                              <div className="text-white font-bold mt-1">{revenueFormatter.format(item.budget || 0)}</div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-xs text-gray-500 uppercase tracking-[0.18em]">Data</div>
                              <div className="text-white font-bold mt-1">
                                {item.eventDate ? new Date(item.eventDate).toLocaleDateString('pt-BR') : 'Definir'}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="text-xs text-gray-500 uppercase tracking-[0.18em]">Proximo passo</div>
                              <div className="text-white font-bold mt-1">Ataque agora</div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Gargalos atuais</div>
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

                        <div className="w-full lg:w-64 shrink-0 space-y-3">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="text-xs uppercase tracking-[0.18em] text-gray-500">Acao recomendada</div>
                            <div className="text-sm text-white mt-2">{item.nextAction}</div>
                          </div>
                          <AnimatedButton onClick={() => navigate('/seller/leads')} className="w-full justify-center" icon={ArrowUpRight}>
                            Abrir lead
                          </AnimatedButton>
                          <AnimatedButton onClick={() => navigate(item.matchedProposalId ? '/seller/proposals' : '/seller/communications')} variant="secondary" className="w-full justify-center" icon={item.matchedProposalId ? FileText : MessageSquare}>
                            {item.matchedProposalId ? 'Ir para proposta' : 'Aquecer contato'}
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-gray-400">
                      Ainda nao ha leads ou propostas suficientes para o Deal Room ranquear seu pipeline.
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <BadgeCheck size={18} className="text-beatwap-gold" />
                      BeatWap Intelligence
                    </div>
                    <div className="text-sm text-gray-300 mt-3">
                      Este modulo entrega uma leitura que chama muita atencao para assinatura porque mostra dinheiro, urgencia e proximo passo num unico quadro.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5 space-y-4">
                    <div className="text-white font-bold">Foco do dia</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-400">Leads sem proposta</span>
                        <span className="text-white font-bold">{dealRoomItems.filter((item) => !item.matchedProposalId).length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-400">Aceites prontos para operar</span>
                        <span className="text-white font-bold">{dealRoomSummary.acceptedProposalsCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-400">Conversas quentes</span>
                        <span className="text-white font-bold">{activeChatsCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-400">Fila comercial viva</span>
                        <span className="text-white font-bold">{sellerQueue.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5 space-y-3">
                    <div className="text-white font-bold">Atalhos de fechamento</div>
                    <AnimatedButton onClick={() => navigate('/seller/proposals')} className="w-full justify-center" icon={FileText}>
                      Resolver propostas
                    </AnimatedButton>
                    <AnimatedButton onClick={() => navigate('/seller/communications')} variant="secondary" className="w-full justify-center" icon={MessageSquare}>
                      Abrir comunicacao
                    </AnimatedButton>
                    <AnimatedButton onClick={() => navigate('/seller/finance')} variant="secondary" className="w-full justify-center" icon={DollarSign}>
                      Ver impacto financeiro
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            </Card>

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
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Leads ativos</span>
                    <span className="text-white font-bold">{dealRoomSummary.activeLeadsCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-400">Propostas enviadas</span>
                    <span className="text-white font-bold">{dealRoomSummary.sentProposalsCount}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white/5 border border-white/10">
                <div className="text-lg font-bold text-white mb-4">Radar de fechamento</div>
                <div className="space-y-3">
                  {dealRoomLoading ? (
                    <div className="text-sm text-gray-400">Carregando prioridades comerciais...</div>
                  ) : dealRoomItems.slice(0, 3).map((item) => (
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
                  )) : (
                    <div className="text-sm text-gray-400">Sem oportunidades ranqueadas ainda.</div>
                  )}
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
