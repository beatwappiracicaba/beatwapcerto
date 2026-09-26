import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { BoostedProfilesStories } from '../components/BoostedProfilesStories';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { EmptyState } from '../components/ui/EmptyState';
import { HighlightRailCard } from '../components/ui/HighlightRailCard';
import { PanelSection } from '../components/ui/PanelSection';
import { PersistentPanelTabs } from '../components/ui/PersistentPanelTabs';
import { PremiumMetricCard } from '../components/ui/PremiumMetricCard';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { MusicUploadModal } from '../components/artist/MusicUploadModal';
import { Plus, DollarSign, Folder, ChevronDown, ChevronRight, MessageCircle, Play, Pause, Bell, Clock, User, Sparkles, Target, ArrowUpRight, Eye } from 'lucide-react';
import { PainelCabecalho } from '../components/dashboard/PainelCabecalho';
import { IndicadoresPainel } from '../components/dashboard/IndicadoresPainel';
import { AcoesRapidas } from '../components/dashboard/AcoesRapidas';
import { AtividadeRecente, PendenciasPainel } from '../components/dashboard/ListasPainel';
import { SecaoPainel } from '../components/dashboard/SecaoPainel';
import { atalhosDoCargo } from '../components/dashboard/atalhos';
import { decryptData } from '../utils/security';
import { useNotification } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { useNavigate } from 'react-router-dom';
import { usePersistentState } from '../hooks/usePersistentState';
import { useGlobalAudioPlayer } from '../context/GlobalAudioPlayerContext';

export const DashboardArtistHome = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { currentTrackId, isPlaying, toggleTrack } = useGlobalAudioPlayer();
  const { notifications = [] } = useNotification();
  const { chats = [], supportQueue = [] } = useChat();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latestCompositions, setLatestCompositions] = useState([]);
  const [canViewCompositions, setCanViewCompositions] = useState(true);
  const [activePanelTab, setActivePanelTab] = usePersistentState('dashboard-artist-active-tab', 'resumo');
  const [searchTerm, setSearchTerm] = usePersistentState('dashboard-artist-search', '');

  const isCompositor = profile?.cargo && profile.cargo.toLowerCase().trim() === 'compositor';
  const planNorm = String(profile?.plano || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const planAllowsPublicProfile =
    planNorm.includes('mensal') ||
    planNorm.includes('anual') ||
    planNorm.includes('vitalicio') ||
    planNorm.includes('lifetime');

  const sanitizeUrl = (u) => String(u || '').trim().replace(/^[`'"]+|[`'"]+$/g, '');

  const buildWhatsAppHref = useCallback((rawPhone, title) => {
    const dec = decryptData(rawPhone);
    const raw = dec || rawPhone;
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    const phone = digits.startsWith('55') ? digits : `55${digits}`;
    const text = encodeURIComponent(`Olá, vi sua composição "${title}" na BeatWap e gostaria de saber mais.`);
    return `https://wa.me/${phone}?text=${text}`;
  }, []);

  const formatWhatsAppPhone = useCallback((rawPhone) => {
    const dec = decryptData(rawPhone);
    const raw = dec || rawPhone;
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    const normalized = digits.startsWith('55') ? digits : `55${digits}`;
    const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
    const ddd = national.slice(0, 2);
    const rest = national.slice(2);
    if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    return `+${normalized}`;
  }, []);

  const enrichCompositionsFromProfiles = useCallback(async (comps) => {
    const idsSet = new Set();
    (comps || []).forEach((c) => {
      const authorId = c?.composer_id;
      if (authorId) idsSet.add(String(authorId));
    });
    const ids = Array.from(idsSet);
    if (!ids.length) return comps;

    const results = await Promise.allSettled(
      ids.map((id) => apiClient.get(`/profiles/${id}`, { cache: true, cacheTtlMs: 15000 }))
    );
    const byId = new Map();
    results.forEach((r) => {
      if (r.status !== 'fulfilled') return;
      const p = r.value;
      if (!p?.id) return;
      byId.set(String(p.id), p);
    });

    const filtered = (comps || []).filter((c) => {
      const p = c?.composer_id ? byId.get(String(c.composer_id)) : null;
      if (!p) return true;
      const plan = String(p.plano || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return !plan.includes('avulso');
    });

    return filtered.map((c) => {
      const authorId = c?.composer_id;
      const p = authorId ? byId.get(String(authorId)) : null;
      if (!p) return c;

      const name =
        (c?.composer_name && c.composer_name !== 'Autor')
          ? c.composer_name
          : ((decryptData(p.nome) || decryptData(p.nome_completo_razao_social)) || (p.nome || p.nome_completo_razao_social) || 'Autor');

      const phone = c?.composer_phone || p.celular || p.phone || p.whatsapp || p.whats || null;
      const avatar = p.avatar_url || p.avatar || null;

      return { ...c, composer_name: name, composer_phone: phone, composer_avatar: avatar };
    });
  }, [formatWhatsAppPhone]);

  useEffect(() => {

    const fetchMetrics = async () => {
      const safeGet = async (url, fallback) => {
        try {
          const data = await apiClient.get(url);
          return data ?? fallback;
        } catch {
          return fallback;
        }
      };

      try {
        const events = await safeGet(`/analytics/artist/${user.id}/events`, []);
        const shows = await safeGet('/artist/finance/events', []);
        const allMusics = await safeGet('/songs/mine', []);
        const posts = await safeGet(`/profiles/${user.id}/posts`, []);

        const showRevenue = (shows || []).reduce((acc, curr) => acc + (Number(curr.artist_share) || 0), 0) || 0;
        const totalLikes = (posts || []).reduce((acc, p) => acc + (Number(p.likes_count || 0)), 0);

        const musicIds = (allMusics || []).map(m => m.id);
        const musicMap = (allMusics || []).reduce((acc, m) => {
          acc[m.id] = m;
          return acc;
        }, {});
        
        let totalExternalPlays = 0;
        let totalExternalListeners = 0;
        let totalExternalRevenue = 0;
        let extMetrics = [];
        
        if (musicIds.length > 0) {
          extMetrics = await safeGet('/songs/external-metrics', []);
            
          (extMetrics || []).forEach(em => {
            totalExternalPlays += Number(em.plays || 0);
            totalExternalListeners += Number(em.listeners || 0); 
            totalExternalRevenue += Number(em.revenue || 0);
          });
        }

        const agg = {
          plays: 0,
          listeners: new Set(),
          time: 0,
          profile_views: 0,
          social_clicks: 0
        };

        const playsPerMusic = {};

        (events || []).forEach(e => {
          if (e.type === 'music_play') {
            agg.plays++;
            agg.time += Number(e.duration_seconds || 0);
            if (e.ip_hash) agg.listeners.add(e.ip_hash);
            
            const mid = e.music_id;
            if (mid) playsPerMusic[mid] = (playsPerMusic[mid] || 0) + 1;
          } else if (e.type === 'profile_view') {
            agg.profile_views++;
          } else if (e.type && e.type.startsWith('artist_click_')) {
            agg.social_clicks++;
          }
        });
        
        const extForTop = extMetrics || [];
        extForTop.forEach(em => {
          if (em.music_id) {
            playsPerMusic[em.music_id] = (playsPerMusic[em.music_id] || 0) + Number(em.plays || 0);
          }
        });

        let topMusic = null;
        let maxPlays = -1;
        let topMusicId = null;
        
        for (const [mid, count] of Object.entries(playsPerMusic)) {
          if (count > maxPlays) {
            maxPlays = count;
            topMusicId = mid;
          }
        }
        
        if (topMusicId && musicMap[topMusicId]) {
           topMusic = { ...musicMap[topMusicId], totalPlays: maxPlays };
        }

        const finalPlays = totalExternalPlays;
        const finalListeners = totalExternalListeners; 
        const finalStreamingRevenue = totalExternalRevenue;

        setMetrics({ 
          total_plays: finalPlays, 
          ouvintes_mensais: finalListeners, 
          receita_estimada: finalStreamingRevenue,
          tempo_ouvido: agg.time, 
          visitas_perfil: agg.profile_views,
          cliques_sociais: agg.social_clicks,
          faturamento_shows: showRevenue,
          curtidas_perfil_publico: totalLikes,
          topMusic
        });
      } finally {
        setLoading(false);
      }
    };
    const fetchLatestCompositions = async () => {
      try {
        // Primary source: latest partner-recorded compositions
        let list = await apiClient.get('/compositions/latest?limit=10');
        if (!Array.isArray(list) || list.length === 0) {
          // Fallback: public compositions list (approved handled server-side when using /home; otherwise map client-side)
          const home = await apiClient.get('/home', { cache: true, cacheTtlMs: 15000 });
          const comps = Array.isArray(home?.compositions) ? home.compositions : [];
          list = comps.slice(0, 10);
        }
        const mapped = (Array.isArray(list) ? list : []).map((c) => {
          const title = c?.title || c?.titulo || 'Sem título';
          const composer_id =
            c?.composer_id ||
            c?.composerId ||
            c?.composer_partner_id ||
            c?.composer_partnerId ||
            c?.author_id ||
            c?.authorId ||
            c?.autor_id ||
            c?.created_by ||
            c?.created_by_id ||
            c?.owner_id ||
            c?.ownerId ||
            c?.user_id ||
            c?.userId ||
            c?.profile_id ||
            c?.profileId ||
            null;
          const composer_name_raw = c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || c?.nome_artista || c?.nome || '';
          const decrypted_name = decryptData(composer_name_raw);
          const composer_name = decrypted_name || composer_name_raw || 'Autor';
          const composer_phone = c?.composer_phone || c?.celular || c?.whatsapp || c?.phone || c?.whats || c?.whats_app || null;
          return {
            ...c,
            title,
            titulo: title,
            composer_id,
            composer_name,
            composer_phone,
            cover_url: c?.cover_url || null,
            audio_url: c?.audio_url || null,
            created_at: c?.created_at
          };
        }).sort((a, b) => {
          const da = new Date(a.created_at || 0).getTime();
          const db = new Date(b.created_at || 0).getTime();
          return db - da;
        }).slice(0, 10);
        setLatestCompositions(mapped);
        enrichCompositionsFromProfiles(mapped)
          .then((enriched) => setLatestCompositions(enriched))
          .catch(() => void 0);
        setCanViewCompositions(true);
      } catch {
        setLatestCompositions([]);
        setCanViewCompositions(true);
      }
    };
    if (user) {
      fetchMetrics();
      if (!planAllowsPublicProfile) {
        setCanViewCompositions(false);
        setLatestCompositions([]);
      } else {
        setCanViewCompositions(true);
        fetchLatestCompositions();
      }
    }
  }, [user, enrichCompositionsFromProfiles, planAllowsPublicProfile]);

  const togglePlay = (item) => {
    const src = sanitizeUrl(item?.audio_url);
    if (!src) return;
    toggleTrack({
      id: `composition:${item.id}`,
      src,
      title: item?.titulo || item?.title || 'Composição',
      artist: item?.composer_name || 'Autor',
      coverUrl: sanitizeUrl(item?.cover_url),
      startSeconds: Number(item?.chorus_start_seconds ?? 0),
      endSeconds: Number(item?.chorus_end_seconds ?? NaN)
    });
  };

  const recentNotifications = useMemo(
    () => (Array.isArray(notifications) ? notifications.slice().sort((a, b) => new Date(b?.created_at || b?.date || 0) - new Date(a?.created_at || a?.date || 0)).slice(0, 4) : []),
    [notifications]
  );

  const unreadNotifications = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((item) => !item?.read).length : 0),
    [notifications]
  );

  const activeChatsCount = useMemo(
    () => (Array.isArray(chats) ? chats.filter((chat) => String(chat?.status || '').toLowerCase() !== 'closed').length : 0),
    [chats]
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

    const queueItems = (Array.isArray(supportQueue) ? supportQueue : []).map((item) => ({
      id: `queue-${item.id}`,
      title: item.subject || 'Solicitacao de suporte',
      description: item.message || item.status || 'Sua fila de atendimento foi atualizada.',
      kind: 'Fila',
      timestamp: item.created_at || item.updated_at || null,
      timestampMs: makeTs(item.created_at || item.updated_at || null)
    }));

    return [...notifItems, ...chatItems, ...queueItems]
      .filter((item) => item.timestampMs > 0)
      .sort((a, b) => b.timestampMs - a.timestampMs)
      .slice(0, 8);
  }, [notifications, chats, supportQueue]);

  const formatActivityTime = useCallback((value) => {
    const ts = new Date(value || 0).getTime();
    if (!Number.isFinite(ts)) return 'Agora';
    return new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const revenueFormatter = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    []
  );

  const getOpportunityTone = useCallback((score) => {
    if (score >= 82) return 'bg-green-500/10 text-green-300 border-green-500/30';
    if (score >= 62) return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    if (score >= 45) return 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30';
    return 'bg-white/10 text-gray-300 border-white/10';
  }, []);

  const opportunityRadarItems = useMemo(() => {
    return latestCompositions
      .map((item) => {
        const title = item?.titulo || item?.title || 'Composicao';
        const whatsappHref = item?.composer_phone ? buildWhatsAppHref(item.composer_phone, title) : null;
        const hashtagCount = Array.isArray(item?.hashtags) ? item.hashtags.length : 0;
        const hasPreview = Boolean(item?.audio_url);
        const hasCover = Boolean(String(item?.cover_url || '').trim());

        let score = 28;
        if (whatsappHref) score += 24;
        if (hasPreview) score += 12;
        if (hasCover) score += 7;
        if (hashtagCount >= 3) score += 10;
        if (Number(item?.chorus_start_seconds) >= 0) score += 6;
        score = Math.max(10, Math.min(96, score));

        const blockers = [];
        if (!whatsappHref) blockers.push('Contato sem WhatsApp');
        if (!hasPreview) blockers.push('Sem audio de apoio');
        if (!hasCover) blockers.push('Sem capa para chamar atencao');
        if (hashtagCount === 0) blockers.push('Sem contexto por hashtags');

        return {
          id: item.id,
          title,
          composerName: item?.composer_name || 'Autor',
          whatsappHref,
          score,
          blockers: blockers.slice(0, 3),
          hashtags: Array.isArray(item?.hashtags) ? item.hashtags.slice(0, 4) : [],
          hasPreview,
          nextAction: whatsappHref
            ? 'Chamar o compositor agora e validar fit para gravacao.'
            : 'Revisar o contato e salvar esta oportunidade para abordar depois.'
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [latestCompositions, buildWhatsAppHref]);

  // Atalhos do artista. Composicoes somem quando o plano nao libera o
  // catalogo, que e a mesma regra que esconde a secao de repertorio.
  const atalhosArtista = useMemo(
    () => atalhosDoCargo('Artista', canViewCompositions ? [] : ['compositions']),
    [canViewCompositions]
  );

  const panelTabs = useMemo(
    () => [
      { id: 'resumo', label: 'Resumo', helper: 'Metricas, repertorio e radar do dia', count: (latestCompositions?.length || 0) + unreadNotifications },
      { id: 'oportunidades', label: 'Oportunidades', helper: 'Onde agir primeiro para converter mais rapido', count: opportunityRadarItems.length },
      { id: 'atividade', label: 'Atividade', helper: 'Chats, fila e movimento recente', count: activityItems.length }
    ],
    [activityItems.length, latestCompositions?.length, opportunityRadarItems.length, unreadNotifications]
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

  const filteredLatestCompositions = useMemo(
    () => latestCompositions.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.titulo || item?.title || ''} ${item?.composer_name || ''} ${(item?.hashtags || []).join(' ')}`.toLowerCase().includes(normalizedSearch);
    }),
    [latestCompositions, normalizedSearch]
  );

  const filteredOpportunityRadarItems = useMemo(
    () => opportunityRadarItems.filter((item) => {
      if (!normalizedSearch) return true;
      return `${item?.title || ''} ${item?.composerName || ''} ${(item?.hashtags || []).join(' ')} ${item?.nextAction || ''}`.toLowerCase().includes(normalizedSearch);
    }),
    [normalizedSearch, opportunityRadarItems]
  );

  const artistOpportunitySummary = useMemo(() => ({
    missingContact: filteredOpportunityRadarItems.filter((item) => !item.whatsappHref).length,
    readyNow: filteredOpportunityRadarItems.filter((item) => item.whatsappHref && item.hasPreview).length,
    averageScore: filteredOpportunityRadarItems.length
      ? Math.round(filteredOpportunityRadarItems.reduce((acc, item) => acc + item.score, 0) / filteredOpportunityRadarItems.length)
      : 0
  }), [filteredOpportunityRadarItems]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PainelCabecalho
          cargo="Painel do Artista"
          saudacao={`Ola, ${String(profile?.nome || user?.nome || '').trim() || 'artista'}. Aqui esta o resumo do seu trabalho.`}
          resumo="Indicadores da carreira, atalhos, atividade recente e as oportunidades que mais valem ataque agora."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar faixa, compositor, alerta ou atividade..."
        />

        <BoostedProfilesStories
          limit={14}
          title="Impulsionados em toda a plataforma"
          description="Essa vitrine mostra todos os perfis com destaque ativo, ajudando o artista a encontrar parceiros e oportunidades com mais rapidez."
        />

        <PersistentPanelTabs tabs={panelTabs} activeTab={activePanelTab} onChange={setActivePanelTab} />

        {activePanelTab === 'resumo' && (
          <div className="space-y-8">

            {/* 1. Indicadores principais, em cards compactos */}
            <SecaoPainel titulo="Seus numeros">
              <IndicadoresPainel
                itens={[
                  { icon: Play, title: 'Plays totais', value: loading ? '...' : (metrics?.total_plays ?? 0), hint: 'Consumo do seu repertoorio', tone: 'blue' },
                  { icon: User, title: 'Ouvintes', value: loading ? '...' : (metrics?.ouvintes_mensais ?? 0), hint: 'Alcance mensal estimado', tone: 'purple' },
                  { icon: Eye, title: 'Visitas ao perfil', value: loading ? '...' : (metrics?.visitas_perfil ?? 0), hint: 'Interesse no seu nome', tone: 'slate' },
                  { icon: Bell, title: 'Curtidas publicas', value: loading ? '...' : (metrics?.curtidas_perfil_publico ?? 0), hint: 'Sinais de interesse', tone: 'red' },
                  { icon: Sparkles, title: 'Receita streaming', value: loading ? '...' : (metrics?.receita_estimada ?? 0), hint: 'Estimativa das plataformas', tone: 'gold' },
                  { icon: DollarSign, title: 'Faturamento shows', value: loading ? '...' : revenueFormatter.format(metrics?.faturamento_shows || 0), hint: 'Receita ao vivo capturada', tone: 'green' }
                ]}
              />
            </SecaoPainel>

            {/* 2. Acoes rapidas */}
            <AcoesRapidas
              atalhos={atalhosArtista}
              descricao="Atalhos para as areas que voce mais usa."
            />

            {/* 3. Atividades recentes e 4. Pendencias, lado a lado */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <AtividadeRecente
                itens={filteredActivityItems}
                descricao="Notificacoes, conversas e movimentacoes mais recentes."
                vazio="Sem atividade registrada por aqui."
                maximo={7}
              />
              <PendenciasPainel
                titulo="Pendencias e avisos"
                descricao="O que ainda pede a sua atencao."
                itens={[
                  { id: 'notif', rotulo: 'Nao lidas', valor: unreadNotifications, dica: 'Notificacoes em aberto' },
                  { id: 'chats', rotulo: 'Conversas ativas', valor: activeChatsCount, dica: 'Sem resposta sua', para: '/dashboard/chat' },
                  { id: 'contatos', rotulo: 'Falta contato', valor: artistOpportunitySummary.missingContact, dica: 'Oportunidades travadas', para: '/dashboard/profile' },
                  { id: 'prontas', rotulo: 'Prontas agora', valor: artistOpportunitySummary.readyNow, dica: 'Contato e preview juntos' }
                ]}
                notificacoes={filteredRecentNotifications}
              />
            </div>

            {/* 5. Area complementar: oportunidades com maior potencial */}
            {canViewCompositions && (
              <SecaoPainel
                titulo="Oportunidades com maior potencial"
                descricao="Composicoes priorizadas por contato direto, preview e contexto do material."
                aside={(
                  <AnimatedButton onClick={() => navigate('/dashboard/chat')} variant="secondary" icon={MessageCircle}>
                    Abrir conversas
                  </AnimatedButton>
                )}
              >
                {filteredOpportunityRadarItems.length === 0 ? (
                  <EmptyState
                    icon={Target}
                    title="Nenhuma oportunidade encontrada"
                    description={normalizedSearch ? 'Sua busca nao encontrou oportunidades no radar atual.' : 'Assim que houver repertorio suficiente, o radar destaca as melhores chances.'}
                    action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                  />
                ) : (
                  <ul className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                    {filteredOpportunityRadarItems.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-beatwap-gold/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">{item.title}</div>
                            <div className="mt-0.5 truncate text-xs text-gray-400">{item.composerName}</div>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getOpportunityTone(item.score)}`}>
                            {item.score}
                          </span>
                        </div>

                        <div className="mt-3 text-xs leading-relaxed text-gray-300">{item.nextAction}</div>

                        {item.hashtags.length > 0 ? (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {item.hashtags.slice(0, 4).map((tag) => (
                              <span key={`${item.id}-${tag}`} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-400">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {item.whatsappHref ? (
                            <button
                              type="button"
                              onClick={() => window.open(item.whatsappHref, '_blank', 'noopener,noreferrer')}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-300 transition hover:bg-green-500/20"
                            >
                              Chamar no WhatsApp
                            </button>
                          ) : (
                            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-gray-400">
                              Contato indisponivel
                            </span>
                          )}
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
            )}

            {/* Complemento: faixa mais tocada e repertorio recente */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              <SecaoPainel titulo="Musica com mais visualizacoes">
                {loading ? (
                  <div className="py-6 text-sm text-gray-500">Carregando...</div>
                ) : !metrics?.topMusic ? (
                  <p className="py-6 text-sm text-gray-500">Nenhuma musica com visualizacoes ainda.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-800">
                      {metrics.topMusic.cover_url ? (
                        <img src={metrics.topMusic.cover_url} alt={metrics.topMusic.titulo} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">Capa</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-white">{metrics.topMusic.titulo}</div>
                      <div className="mt-1 text-sm text-gray-400">
                        <span className="font-bold text-beatwap-gold">{metrics.topMusic.totalPlays}</span> plays totais
                      </div>
                    </div>
                  </div>
                )}
              </SecaoPainel>

              <SecaoPainel
                titulo="Ultimas composicoes"
                descricao="Repertorio recente disponivel para suas conexoes."
                aside={canViewCompositions ? (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/compositions')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-beatwap-gold/40 hover:text-beatwap-gold"
                  >
                    Ver composicoes
                  </button>
                ) : null}
              >
                {filteredLatestCompositions.length === 0 ? (
                  <p className="py-6 text-sm text-gray-500">
                    {normalizedSearch ? 'Nenhuma faixa recente combinou com a busca.' : 'Quando o catalogo parceiro ganhar novidades, elas aparecerao aqui.'}
                  </p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {filteredLatestCompositions.map((item) => {
                      const safeCover = String(item.cover_url || '').replace(/^[`'"]+|[`'"]+$/g, '').trim();
                      return (
                        <li key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-beatwap-gold/25">
                          <div className="flex items-center gap-3">
                            <div className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-gray-800" onClick={() => togglePlay(item)}>
                              {safeCover ? (
                                <img src={safeCover} alt={item.titulo || item.title} className="h-full w-full object-cover" draggable={false} style={{ userSelect: 'none' }} />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-500">Capa</div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity hover:opacity-100">
                                <button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center rounded-full bg-beatwap-gold text-black"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePlay(item);
                                  }}
                                  aria-label={currentTrackId === `composition:${item.id}` && isPlaying ? 'Pausar' : 'Tocar'}
                                >
                                  {currentTrackId === `composition:${item.id}` && isPlaying
                                    ? <Pause size={14} fill="currentColor" />
                                    : <Play size={14} fill="currentColor" />}
                                </button>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-bold text-white">{item.titulo || item.title}</div>
                              <div className="truncate text-xs text-gray-400">{item.composer_name || 'Autor'}</div>
                            </div>
                          </div>
                          {item.composer_phone ? (
                            <button
                              type="button"
                              onClick={() => {
                                const href = buildWhatsAppHref(item.composer_phone, item.titulo || item.title || 'Composicao');
                                if (!href) return;
                                window.open(href, '_blank', 'noopener,noreferrer');
                              }}
                              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-300 transition hover:bg-green-500/20"
                            >
                              <MessageCircle size={13} />
                              Chamar no WhatsApp
                            </button>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SecaoPainel>
            </div>
          </div>
        )}

        {activePanelTab === 'oportunidades' && (
          <div className="space-y-6">
            <PanelSection eyebrow="Mesa De Oportunidades" title="Onde agir primeiro para converter mais rapido" description="Esses indicadores deixam a aba mais executiva, com foco em contato, qualidade do material e calor do repertorio.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <PremiumMetricCard icon={ArrowUpRight} tone="green" title="Prontas para contato" value={artistOpportunitySummary.readyNow} description="Com preview e WhatsApp pronto" />
                <PremiumMetricCard icon={Clock} tone="red" title="Sem contato direto" value={artistOpportunitySummary.missingContact} description="Oportunidades que precisam de enriquecimento" />
                <PremiumMetricCard icon={Sparkles} tone="gold" title="Score medio" value={artistOpportunitySummary.averageScore} description="Pulso geral do repertorio acionavel" />
              </div>
            </PanelSection>

            <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.85fr] gap-6">
              <PanelSection title="Fila de oportunidades" description="Prioridade por score, contato e contexto do material">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="text-xs text-gray-500">{filteredOpportunityRadarItems.length} itens</div>
                </div>

                <div className="space-y-4">
                  {filteredOpportunityRadarItems.length === 0 ? (
                    <EmptyState
                      icon={Target}
                      title="Nenhuma oportunidade pronta"
                      description={normalizedSearch ? 'A busca atual nao encontrou itens nesta aba.' : 'Assim que houver repertorio com mais contexto, a fila vai aparecer aqui.'}
                      action={normalizedSearch ? <AnimatedButton onClick={() => setSearchTerm('')}>Limpar busca</AnimatedButton> : null}
                    />
                  ) : filteredOpportunityRadarItems.map((item) => (
                    <div key={`artist-opportunity-${item.id}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getOpportunityTone(item.score)}`}>
                              Score {item.score}
                            </span>
                            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
                              {item.composerName}
                            </span>
                          </div>
                          <div className="text-xl font-extrabold text-white">{item.title}</div>
                          <div className="text-sm text-gray-300">{item.nextAction}</div>
                          <div className="flex flex-wrap gap-2">
                            {item.blockers.map((blocker) => (
                              <span key={`${item.id}-${blocker}-opps`} className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                                {blocker}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="w-full lg:w-64 shrink-0 space-y-3">
                          <AnimatedButton
                            onClick={() => {
                              if (!item.whatsappHref) return;
                              window.open(item.whatsappHref, '_blank', 'noopener,noreferrer');
                            }}
                            disabled={!item.whatsappHref}
                            className="w-full justify-center"
                            icon={ArrowUpRight}
                          >
                            {item.whatsappHref ? 'Abrir contato' : 'Contato indisponivel'}
                          </AnimatedButton>
                          <AnimatedButton onClick={() => navigate('/dashboard/chat')} variant="secondary" className="w-full justify-center" icon={MessageCircle}>
                            Ir para conversas
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelSection>

              <div className="space-y-6">
                <HighlightRailCard title="Playbook do artista" description="Fluxo recomendado para transformar repertorio em contato quente." badge="guia">
                  <div className="space-y-3 mt-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">1. Filtre as faixas com score mais alto</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">2. Priorize as que ja tem preview e WhatsApp</div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-gray-300">3. Abra conversa e registre o retorno no mesmo dia</div>
                  </div>
                </HighlightRailCard>

                <HighlightRailCard title="Faixas recentes para explorar" description="Pequena vitrine lateral para manter a aba visualmente viva." badge="novas">
                  <div className="space-y-3 mt-4">
                    {filteredLatestCompositions.slice(0, 3).map((item) => (
                      <div key={`artist-latest-${item.id}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="font-bold text-white text-sm">{item.titulo || item.title}</div>
                        <div className="text-xs text-gray-400 mt-1">{item.composer_name || 'Autor'}</div>
                      </div>
                    ))}
                    {filteredLatestCompositions.length === 0 ? (
                      <div className="text-sm text-gray-500">Sem faixas recentes para destacar.</div>
                    ) : null}
                  </div>
                </HighlightRailCard>
              </div>
            </div>
          </div>
        )}

        {activePanelTab === 'atividade' && (
          <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
            <PanelSection title="Atividade recente" description="Timeline com mais presença visual e moldura de dashboard premium.">
              <div className="flex items-center justify-between mb-4">
                <div className="px-2 py-1 bg-white/10 rounded-lg text-white text-xs font-bold">{activityItems.length} itens</div>
              </div>
              {filteredActivityItems.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Nenhuma atividade localizada"
                  description={normalizedSearch ? 'A busca atual nao encontrou itens recentes.' : 'Quando chats, filas e notificacoes se moverem, a linha do tempo sera alimentada aqui.'}
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

            <HighlightRailCard title="Atalhos uteis" description="Coluna de apoio com visual mais profissional para navegar entre as funcoes." badge="apoio">
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/chat')}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-white font-bold">
                    <MessageCircle size={16} />
                    Conversas
                  </div>
                  <div className="text-xs text-gray-400 mt-2">Abra o chat para responder mensagens e acompanhar atendimentos.</div>
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
                  <div className="text-xs text-gray-400 mt-2">Atualize seu perfil e mantenha as informacoes publicas em dia.</div>
                </button>
                {!isCompositor && (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/musics')}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Play size={16} />
                      Minhas musicas
                    </div>
                    <div className="text-xs text-gray-400 mt-2">Gerencie uploads, resultados e desempenho dos lancamentos.</div>
                  </button>
                )}
              </div>
            </HighlightRailCard>
          </div>
        )}
      </div>
      
    </DashboardLayout>
  );
};

export const DashboardArtistMusics = () => {
  const { user } = useAuth();
  const [musics, setMusics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [remainingUploads, setRemainingUploads] = useState(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [musicMetrics, setMusicMetrics] = useState({});
  const [expandedAlbums, setExpandedAlbums] = useState({});

  const fetchMusics = useCallback(async () => {
    setLoading(true);
    const data = await apiClient.get('/songs/mine');
    setMusics(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchMusics();
  }, [user, fetchMusics]);

  const groupedMusics = useMemo(() => {
    const groups = [];
    const albumMap = new Map();
    const singles = [];

    musics.forEach(m => {
      if (m.album_id) {
        if (!albumMap.has(m.album_id)) {
          const group = {
            type: 'album',
            id: m.album_id,
            title: m.album_title || m.titulo || 'Álbum',
            cover_url: m.cover_url,
            tracks: [],
            created_at: m.created_at,
            nome_artista: m.nome_artista
          };
          albumMap.set(m.album_id, group);
          groups.push(group);
        }
        albumMap.get(m.album_id).tracks.push(m);
      } else {
        singles.push({ type: 'single', ...m });
      }
    });

    return [...groups, ...singles].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [musics]);

  const toggleAlbumExpanded = (albumId) => {
    setExpandedAlbums(prev => ({ ...prev, [albumId]: !prev[albumId] }));
  };
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      
      const ev = await apiClient.get(`/analytics/artist/${user.id}/events`);
        
      const agg = {};
      
      // Initialize with internal data
      (ev || []).forEach(e => {
        const mid = e.music_id || 'unknown';
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0, presaves: 0, revenue: 0 };
        if (e.type === 'music_play') {
          agg[mid].plays += 1;
          agg[mid].totalSeconds += Number(e.duration_seconds || 0);
        } else if (e.type === 'music_click_presave') {
          agg[mid].presaves += 1;
        }
      });

      const extMetrics = await apiClient.get('/songs/external-metrics');
      (extMetrics || []).forEach(em => {
        const mid = em.music_id;
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0, presaves: 0, revenue: 0 };
        agg[mid].externalPlays = Number(em.plays || 0);
        agg[mid].externalRevenue = Number(em.revenue || 0);
      });

      setMusicMetrics(agg);
    };
    if (musics.length > 0) {
      loadMetrics();
    }
  }, [user, musics]);

  const renderTrackRow = (m, isAlbumTrack = false) => {
    const mm = musicMetrics[m.id] || { plays: 0, totalSeconds: 0, presaves: 0 };
    const hh = Math.floor(mm.totalSeconds / 3600);
    const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
    const ss = mm.totalSeconds % 60;
    const totalFmt = `${hh}h ${mmn}m ${ss}s`;
    const displayPlays = (mm.externalPlays || 0) + (mm.plays || 0);
    const displayRevenue = mm.externalRevenue ? ` • R$ ${mm.externalRevenue}` : '';

    return (
      <div
        key={m.id}
        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${isAlbumTrack ? 'ml-4 border-l-2 border-l-beatwap-gold/40' : ''}`}
      >
        <div className="flex items-center gap-4 w-full sm:flex-1 min-w-0">
          <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
            {m.cover_url ? (
              <img src={m.cover_url} alt={m.titulo} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs"><span>Capa</span></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white truncate"><span>{m.titulo}</span></div>
            <div className="text-xs text-gray-400 truncate"><span>{m.nome_artista} • {new Date(m.created_at).toLocaleDateString()}</span></div>
            {m.status === 'aprovado' && (
              <div className="mt-1 text-xs text-gray-300">
                <span>{`Plays: ${displayPlays}${displayRevenue} • Tempo total: ${totalFmt} • Pré-saves: ${mm.presaves || 0}`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
          <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
            m.status === 'aprovado' ? 'bg-green-500/20 text-green-500' :
            m.status === 'recusado' ? 'bg-red-500/20 text-red-500' :
            'bg-yellow-500/20 text-yellow-500'
          }`}>
            <span>{m.status}</span>
          </div>
          {m.status === 'aprovado' && (
            <>
              <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white whitespace-nowrap">
                <span>UPC: {m.upc || 'Pendente'}</span>
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white whitespace-nowrap">
                <span>ISRC: {m.isrc || 'Pendente'}</span>
              </div>
              {m.presave_link && (
                <AnimatedButton 
                  onClick={() => navigator.clipboard.writeText(m.presave_link)}
                  className="w-full sm:w-auto justify-center"
                >
                  <span>
                    {(() => {
                      if (!m.release_date) return 'Copiar Pré-save';
                      try {
                        const [y, mo, d] = String(m.release_date).split('-');
                        const rDate = new Date(Number(y), Number(mo) - 1, Number(d));
                        const today = new Date(); today.setHours(0,0,0,0);
                        return rDate <= today ? 'Copiar Smartlink' : 'Copiar Pré-save';
                      } catch {
                        return 'Copiar Pré-save';
                      }
                    })()}
                  </span>
                </AnimatedButton>
              )}
            </>
          )}
          {m.motivo_recusa && (
            <div className="text-xs text-red-400 max-w-full sm:max-w-[150px] truncate" title={m.motivo_recusa}>
              <span>{m.motivo_recusa}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const computeRemaining = useCallback(async () => {
    if (!user) return;
    const prof = await apiClient.get('/profile');
    const plan = String(prof?.plano || 'sem plano')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const bonus = Number(prof?.bonus_quota || 0);
    let base = 0;
    let start = null;
    let end = null;
    const now = new Date();
    setIsUnlimited(false);
    if (plan.includes('avulso')) {
      base = 1;
      const ps = prof?.plan_started_at ? new Date(prof.plan_started_at) : now;
      start = ps.toISOString();
    } else if (plan.includes('vitalicio') || plan.includes('lifetime')) {
      setIsUnlimited(true);
      setRemainingUploads(null);
      return;
    } else if (plan.includes('mensal')) {
      base = 2;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      start = monthStart.toISOString();
      end = monthEnd.toISOString();
    } else if (plan.includes('anual')) {
      base = 24;
      const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      start = yearStart.toISOString();
      end = yearEnd.toISOString();
    } else {
      base = 0;
    }
    const rangeStart = start ? new Date(start).getTime() : null;
    const rangeEnd = end ? new Date(end).getTime() : null;
    const used = (musics || []).filter((m) => {
      const d = new Date(String(m.created_at || ''));
      const t = d.getTime();
      if (!Number.isFinite(t)) return true;
      if (rangeStart != null && t < rangeStart) return false;
      if (rangeEnd != null && t > rangeEnd) return false;
      return true;
    }).length;
    const remaining = Math.max(0, base + bonus - used);
    setRemainingUploads(remaining);
  }, [user, musics]);

  useEffect(() => {
    computeRemaining();
  }, [computeRemaining]);

  return (
    <DashboardLayout>
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div className="text-xl font-semibold text-white"><span>Minhas Músicas</span></div>
          <AnimatedButton 
            onClick={() => {
              if (!isUnlimited && remainingUploads !== null && remainingUploads <= 0) {
                const wa = 'https://wa.me/5519981083497?text=Quero%20contratar%20mais%20envios';
                window.open(wa, '_blank');
              } else {
                setIsUploadModalOpen(true);
              }
            }}
            icon={Plus}
          >
            <span>Nova Música</span>
          </AnimatedButton>
        </div>
          <div className="mb-3 text-sm text-gray-300">
          <span>Envios restantes: {isUnlimited ? 'Ilimitado' : (remainingUploads === null ? '...' : remainingUploads)}</span>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-gray-400"><span>Carregando...</span></div>}
            {!loading && groupedMusics.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p><span>Nenhuma música encontrada.</span></p>
              <p className="text-sm mt-2"><span>Clique em &quot;Nova Música&quot; para começar.</span></p>
            </div>
          )}
            {!loading && groupedMusics.map(item => {
              if (item.type === 'album') {
                const albumId = item.id;
                const isExpanded = !!expandedAlbums[albumId];
                const approvedTracks = item.tracks.filter(t => t.status === 'aprovado');
                const totalMetrics = item.tracks.reduce((acc, t) => {
                  const mm = musicMetrics[t.id] || {};
                  acc.plays += (mm.plays || 0) + (mm.externalPlays || 0);
                  acc.revenue += mm.externalRevenue || 0;
                  return acc;
                }, { plays: 0, revenue: 0 });

                return (
                  <div key={albumId} className="border border-white/10 rounded-2xl bg-white/5">
                    <button
                      type="button"
                      onClick={() => toggleAlbumExpanded(albumId)}
                      className="w-full flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gray-900 overflow-hidden flex items-center justify-center border border-white/10">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <Folder className="w-6 h-6 text-beatwap-gold" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{item.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-beatwap-gold uppercase font-semibold">
                              Álbum
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            <span>{item.nome_artista} • {item.tracks.length} faixas • {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          {approvedTracks.length > 0 && (
                            <div className="text-[11px] text-gray-300 mt-1">
                              <span>{`Aprovadas: ${approvedTracks.length} • Plays: ${totalMetrics.plays}${totalMetrics.revenue ? ` • R$ ${totalMetrics.revenue}` : ''}`}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span>{isExpanded ? 'Recolher' : 'Ver faixas'}</span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/10 p-3 space-y-2">
                        {item.tracks.map(track => renderTrackRow(track, true))}
                      </div>
                    )}
                  </div>
                );
              }
              return renderTrackRow(item, false);
            })}
        </div>
      </Card>

      <MusicUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={async () => { await fetchMusics(); await computeRemaining(); }}
      />
    </DashboardLayout>
  );
};

export const DashboardArtistChat = () => {
  const { user } = useAuth();
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [composers, setComposers] = useState([]);
  const [presence, setPresence] = useState([]);
  useEffect(() => {
    const init = async () => {
      try {
        const msgs = await apiClient.get('/messages');
        setMessages(msgs || []);
        setChatId('inbox');
      } catch (e) { console.error(e); }
    };
    if (user) init();
  }, [user]);
  useEffect(() => {
    const loadComposers = async () => {
      const data = await apiClient.get('/composers');
      setComposers(data || []);
      setPresence([]);
    };
    loadComposers();
  }, []);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    let receiver_id = null;
    for (const m of messages) {
      if (m.sender_id && m.sender_id !== user?.id) { receiver_id = m.sender_id; break; }
      if (m.receiver_id && m.receiver_id !== user?.id) { receiver_id = m.receiver_id; break; }
    }
    if (!receiver_id && composers.length) receiver_id = composers[0].id;
    if (!receiver_id) return;
    await apiClient.post('/messages', { receiver_id, message: input.trim() });
    const msgs = await apiClient.get('/messages');
    setMessages(msgs || []);
    setInput('');
  };
  return (
    <DashboardLayout>
      <Card className="space-y-4">
        <div className="text-sm text-beatwap-gold font-bold"><span>Chat com Compositor</span></div>
        <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-center sm:justify-start gap-2 sm:gap-0 sm:-space-x-2">
          {composers.slice(0, 6).map(s => {
            const st = presence.find(p => p.profile_id === s.id);
            const fresh = st?.updated_at ? (Date.now() - new Date(st.updated_at).getTime()) < 120000 : false;
            return (
              <div key={s.id} className="w-8 h-8 rounded-full border-2 border-[#121212] overflow-hidden bg-gray-700 relative">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.nome || 'Compositor'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                    <span>{(s.nome || 'C').charAt(0)}</span>
                  </div>
                )}
                {(st?.online && fresh) && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#121212]" />}
              </div>
            );
          })}
        </div>
        {!chatId && <div className="text-gray-400"><span>Criando chat...</span></div>}
        {chatId && (
          <>
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {messages.map((m) => (
                <div key={m.id} className="p-2 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-500"><span>{m.sender_cargo}</span></div>
                  <div><span>{m.message}</span></div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <AnimatedInput placeholder="Escreva uma mensagem..." value={input} onChange={(e) => setInput(e.target.value)} />
              <AnimatedButton onClick={send}><span>Enviar</span></AnimatedButton>
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
};
