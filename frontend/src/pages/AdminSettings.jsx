import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { SettingsShell } from '../components/settings/SettingsShell';
import { useToast } from '../context/ToastContext';
import { Mail, User, Settings, Shield, Search, Save, Check, Loader, Trash2, X, Lock } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { connectRealtime, subscribe, unsubscribe } from '../services/realtime';

export const AdminSettings = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // Invite Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Artista',
    plano: 'Sem Plano',
    p_chat: true,
    p_dashboard_panel: true,
    p_dashboard_feed: true,
    p_dashboard_search: true,
    p_dashboard_profile: true,
    p_dashboard_auditions: true,
    p_public_profile: true,
    p_musics: true,
    p_compositions: true,
    p_work: true,
    p_marketing: true,
    p_finance: true,
    // Admin permissions
    p_admin_panel: true,
    p_admin_feed: true,
    p_admin_search: true,
    p_admin_events: true,
    p_admin_scanner: true,
    p_admin_auditions: true,
    p_admin_artists: true,
    p_admin_musics: true,
    p_admin_composers: true,
    p_admin_sellers: true,
    p_admin_compositions: true,
    p_admin_sponsors: true,
    p_admin_settings: true,
    p_admin_finance: true,
    p_admin_profile: true,
    p_admin_public_profile: true,
    // Seller permissions
    p_seller_artists: true,
    p_seller_calendar: true,
    p_seller_leads: true,
    p_seller_finance: true,
    p_seller_proposals: true,
    p_seller_communications: true
  });
  const [inviteLink, setInviteLink] = useState('');
  const [generatedInviteToken, setGeneratedInviteToken] = useState('');
  const [generatedInviteKey, setGeneratedInviteKey] = useState('');
  const [invites, setInvites] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [invFilter, setInvFilter] = useState('pending');
  
  // Artists Management State
  const [artists, setArtists] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Artista');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [purgeConfirm, setPurgeConfirm] = useState('');
  const [purgeAcknowledge, setPurgeAcknowledge] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgePin, setPurgePin] = useState('');
  const [migrateUserId, setMigrateUserId] = useState('');
  const [migrateToRole, setMigrateToRole] = useState('Compositor');
  const [migrateConfirm, setMigrateConfirm] = useState('');
  const [migrateAcknowledge, setMigrateAcknowledge] = useState(false);
  const [migratePin, setMigratePin] = useState('');
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [featuredPlansAdmin, setFeaturedPlansAdmin] = useState(null);
  const [featuredPlansDraft, setFeaturedPlansDraft] = useState(null);
  const [featuredPlansSaving, setFeaturedPlansSaving] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState('convites');
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');

  const validEmail = String(form.email).trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  const baseDashboardInvitePermissions = [
    { key: 'p_dashboard_panel', label: 'Painel' },
    { key: 'p_dashboard_feed', label: 'Feed' },
    { key: 'p_dashboard_search', label: 'Pesquisar' },
    { key: 'p_dashboard_profile', label: 'Perfil' },
    { key: 'p_public_profile', label: 'Perfil Público' }
  ];
  const producerInvitePermissions = [
    { key: 'p_admin_panel', label: 'Painel' },
    { key: 'p_admin_feed', label: 'Feed' },
    { key: 'p_admin_search', label: 'Pesquisar' },
    { key: 'p_admin_events', label: 'Eventos' },
    { key: 'p_admin_scanner', label: 'Portaria' },
    { key: 'p_admin_auditions', label: 'Audições' },
    { key: 'p_admin_artists', label: 'Artistas' },
    { key: 'p_admin_composers', label: 'Compositores' },
    { key: 'p_admin_sellers', label: 'Vendedores' },
    { key: 'p_admin_musics', label: 'Músicas' },
    { key: 'p_admin_compositions', label: 'Composições' },
    { key: 'p_admin_sponsors', label: 'Patrocinadores / Parcerias' },
    { key: 'p_admin_finance', label: 'Financeiro' },
    { key: 'p_admin_settings', label: 'Configurações' },
    { key: 'p_admin_profile', label: 'Perfil' },
    { key: 'p_admin_public_profile', label: 'Perfil Público' }
  ];
  const sellerInvitePermissions = [
    ...baseDashboardInvitePermissions,
    { key: 'p_seller_artists', label: 'Artistas' },
    { key: 'p_seller_calendar', label: 'Agenda' },
    { key: 'p_seller_leads', label: 'Oportunidades' },
    { key: 'p_seller_finance', label: 'Comissões' },
    { key: 'p_seller_proposals', label: 'Propostas' },
    { key: 'p_seller_communications', label: 'Comunicação' }
  ];
  const composerInvitePermissions = [
    ...baseDashboardInvitePermissions,
    { key: 'p_dashboard_auditions', label: 'Audições' },
    { key: 'p_compositions', label: 'Composições' },
    { key: 'p_marketing', label: 'Marketing' },
    { key: 'p_finance', label: 'Financeiro' }
  ];
  const artistInvitePermissions = [
    ...baseDashboardInvitePermissions,
    { key: 'p_musics', label: 'Músicas' },
    { key: 'p_compositions', label: 'Composições' },
    { key: 'p_work', label: 'Agenda / Afazeres' },
    { key: 'p_marketing', label: 'Marketing' },
    { key: 'p_finance', label: 'Financeiro' }
  ];

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    fetchInvites();
  }, []);

  useEffect(() => {
    fetchFeaturedPlansAdmin();
    fetchYoutubeVideoUrl();
  }, []);

  const fetchInvites = async () => {
    setInvLoading(true);
    try {
      const data = await apiClient.get(`/auth/admin/invites`);
      setInvites(Array.isArray(data?.invites) ? data.invites : []);
    } catch (e) {
      addToast('Erro ao carregar convites', 'error');
    } finally {
      setInvLoading(false);
    }
  };

  const fetchFeaturedPlansAdmin = async () => {
    try {
      const tryCall = async (calls) => {
        let last = null;
        for (const call of calls) {
          try {
            return await call();
          } catch (e) {
            last = e;
            if (Number(e?.status) === 404) continue;
            throw e;
          }
        }
        throw last || new Error('Not found');
      };

      const data = await tryCall([
        () => apiClient.get('/admin/featured-plans'),
        () => apiClient.get('/admin/featured_plans'),
        () => apiClient.get('/featured-plans'),
        () => apiClient.get('/featured_plans'),
      ]);
      setFeaturedPlansAdmin(data || null);
      setFeaturedPlansDraft(data ? JSON.parse(JSON.stringify(data)) : null);
    } catch {
      setFeaturedPlansAdmin(null);
      setFeaturedPlansDraft(null);
    }
  };

  const saveFeaturedPlansAdmin = async () => {
    if (!featuredPlansDraft) return;
    setFeaturedPlansSaving(true);
    try {
      const tryCall = async (calls) => {
        let last = null;
        for (const call of calls) {
          try {
            return await call();
          } catch (e) {
            last = e;
            if (Number(e?.status) === 404) continue;
            throw e;
          }
        }
        throw last || new Error('Not found');
      };

      const res = await tryCall([
        () => apiClient.put('/admin/featured-plans', featuredPlansDraft),
        () => apiClient.put('/admin/featured_plans', featuredPlansDraft),
        () => apiClient.put('/featured-plans', featuredPlansDraft),
        () => apiClient.put('/featured_plans', featuredPlansDraft),
      ]);
      const next = res?.featured_plans || featuredPlansDraft;
      setFeaturedPlansAdmin(next);
      setFeaturedPlansDraft(next ? JSON.parse(JSON.stringify(next)) : null);
      addToast('Configuração de destaque salva.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao salvar destaque', 'error');
    } finally {
      setFeaturedPlansSaving(false);
    }
  };

  const fetchYoutubeVideoUrl = async () => {
    try {
      const data = await apiClient.get('/admin/youtube-video');
      setYoutubeVideoUrl(String(data?.video_url || ''));
    } catch {
      setYoutubeVideoUrl('');
    }
  };

  const saveYoutubeVideoUrl = async () => {
    try {
      const res = await apiClient.put('/admin/youtube-video', { video_url: youtubeVideoUrl });
      addToast(res?.message || 'Link do YouTube salvo com sucesso.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao salvar link do YouTube', 'error');
    }
  };

  const applyFeaturedToUser = async (userId, level) => {
    const id = String(userId || '').trim();
    if (!id) return;
    setSavingId(id);
    try {
      const body = { level };
      const tryCall = async (calls) => {
        let last = null;
        for (const call of calls) {
          try {
            return await call();
          } catch (e) {
            last = e;
            if (Number(e?.status) === 404) continue;
            throw e;
          }
        }
        throw last || new Error('Not found');
      };

      const res = await tryCall([
        () => apiClient.post(`/admin/profiles/${id}/featured`, body),
        () => apiClient.post(`/profiles/${id}/featured`, body),
        () => apiClient.post(`/admin/profile/${id}/featured`, body),
        () => apiClient.post(`/profile/${id}/featured`, body),
      ]);
      const updated = res?.profile || null;
      if (updated?.id) {
        setArtists((prev) => prev.map((a) => (String(a.id) === String(updated.id) ? { ...a, ...updated } : a)));
        addToast('Destaque atualizado.', 'success');
      }
    } catch (e) {
      addToast(e?.message || 'Erro ao aplicar destaque', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const copyInvite = (token) => {
    const url = `${window.location.origin}/register/invite?token=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(url).then(() => {
      addToast('Link de convite copiado.', 'success');
    }).catch(() => {
      addToast('Não foi possível copiar o link.', 'error');
    });
  };

  const resendInvite = async (id) => {
    try {
      await apiClient.post(`/auth/admin/invites/${id}/resend`);
      addToast('Convite reenviado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Falha ao reenviar convite', 'error');
    }
  };

  const regenerateInvite = async (id) => {
    try {
      await apiClient.post(`/auth/admin/invites/${id}/regenerate`);
      addToast('Convite regenerado e enviado.', 'success');
      fetchInvites();
    } catch (e) {
      addToast(e?.message || 'Falha ao regenerar convite', 'error');
    }
  };

  const deleteInvite = async (id) => {
    const ok = window.confirm('Excluir este convite?');
    if (!ok) return;
    const prev = invites;
    setInvites(prev => prev.filter(i => i.id !== id));
    try {
      await apiClient.delete(`/auth/admin/invites/${id}`);
      addToast('Convite excluído.', 'success');
    } catch (e) {
      const msg = String(e?.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('404')) {
        addToast('Convite removido localmente.', 'success');
      } else {
        setInvites(prev);
        addToast(e?.message || 'Falha ao excluir convite', 'error');
      }
    }
  };

  useEffect(() => {
    const socket = connectRealtime('https://api.beatwap.com.br');
    const handler = (evt) => {
      const id = evt?.id;
      if (!id) return;
      setArtists(prev => prev.map(a => (a.id === id ? { ...a, access_control: evt?.access_control || a.access_control } : a)));
    };
    const rooms = artists.map(a => `profile:${a.id}`);
    rooms.forEach(r => subscribe(r));
    socket.on('profiles.access_control.updated', handler);
    return () => {
      rooms.forEach(r => unsubscribe(r));
      socket.off('profiles.access_control.updated', handler);
    };
  }, [artists.map(a => a.id).join(',')]);

  const fetchArtists = async () => {
    setLoadingArtists(true);
    try {
      const data = await apiClient.get('/profiles');
      const filtered = (data || []).filter(a => ['Artista','Produtor','Compositor','Vendedor'].includes(a.cargo));
      // Normalize permissions
      const formatted = filtered.map(artist => ({
        ...artist,
        access_control: artist.access_control || {
          chat: true,
          dashboard_panel: true,
          dashboard_feed: true,
          dashboard_search: true,
          dashboard_profile: true,
          dashboard_auditions: true,
          finance: true,
          musics: true,
          public_profile: true,
          show_on_home: true,
          work: true,
          marketing: true,
          verified: false,
          plan_override: false,
          admin_panel: true,
          admin_feed: true,
          admin_search: true,
          admin_events: true,
          admin_scanner: true,
          admin_auditions: true,
          admin_artists: true,
          admin_composers: true,
          admin_musics: true,
          admin_compositions: true,
          admin_sponsors: true,
          admin_settings: true,
          admin_sellers: true,
          admin_finance: true,
          seller_artists: true,
          seller_calendar: true,
          seller_leads: true,
          seller_finance: true,
          seller_proposals: true,
          seller_communications: true
        }
      }));
      
      setArtists(formatted);
    } catch (error) {
      console.error('Error fetching artists:', error);
      addToast('Erro ao carregar artistas', 'error');
    } finally {
      setLoadingArtists(false);
    }
  };

  const checkSchema = async () => {
    // verificação de schema agora deve ser feita via migrações do banco
  };

  useEffect(() => {
    checkSchema();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsMobile(false);
      return;
    }
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(!!mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      mq.onchange = update;
      return () => { mq.onchange = null; };
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSettingsSection]);
  const buildInvitePayload = () => {
    const payload = {
      name: String(form.name || '').trim(),
      email: String(form.email || '').trim().toLowerCase(),
      role: String(form.role || '').trim(),
      plano: String(form.plano || '').trim(),
      p_chat: !!form.p_chat,
      p_dashboard_panel: !!form.p_dashboard_panel,
      p_dashboard_feed: !!form.p_dashboard_feed,
      p_dashboard_search: !!form.p_dashboard_search,
      p_dashboard_profile: !!form.p_dashboard_profile,
      p_dashboard_auditions: !!form.p_dashboard_auditions,
      p_public_profile: !!form.p_public_profile,
      p_musics: !!form.p_musics,
      p_compositions: !!form.p_compositions,
      p_work: !!form.p_work,
      p_marketing: !!form.p_marketing,
      p_finance: !!form.p_finance,
      p_admin_panel: !!form.p_admin_panel,
      p_admin_feed: !!form.p_admin_feed,
      p_admin_search: !!form.p_admin_search,
      p_admin_events: !!form.p_admin_events,
      p_admin_scanner: !!form.p_admin_scanner,
      p_admin_auditions: !!form.p_admin_auditions,
      p_admin_artists: !!form.p_admin_artists,
      p_admin_musics: !!form.p_admin_musics,
      p_admin_composers: !!form.p_admin_composers,
      p_admin_sellers: !!form.p_admin_sellers,
      p_admin_compositions: !!form.p_admin_compositions,
      p_admin_sponsors: !!form.p_admin_sponsors,
      p_admin_settings: !!form.p_admin_settings,
      p_admin_finance: !!form.p_admin_finance,
      p_admin_profile: !!form.p_admin_profile,
      p_admin_public_profile: !!form.p_admin_public_profile,
      p_seller_artists: !!form.p_seller_artists,
      p_seller_calendar: !!form.p_seller_calendar,
      p_seller_leads: !!form.p_seller_leads,
      p_seller_finance: !!form.p_seller_finance,
      p_seller_proposals: !!form.p_seller_proposals,
      p_seller_communications: !!form.p_seller_communications,
    };
    if (payload.role !== 'Artista' && payload.role !== 'Compositor') delete payload.plano;
    return payload;
  };

  const buildInviteKey = (payload) => JSON.stringify(payload || {});

  useEffect(() => {
    if (generatedInviteToken) {
      const url = `${window.location.origin}/register/invite?token=${encodeURIComponent(generatedInviteToken)}`;
      setInviteLink(url);
    } else {
      setInviteLink('');
    }
  }, [generatedInviteToken]);

  useEffect(() => {
    if (!generatedInviteToken || !generatedInviteKey) return;
    if (!validEmail) {
      setGeneratedInviteToken('');
      setGeneratedInviteKey('');
      return;
    }
    const key = buildInviteKey(buildInvitePayload());
    if (key !== generatedInviteKey) {
      setGeneratedInviteToken('');
      setGeneratedInviteKey('');
    }
  }, [form, validEmail, generatedInviteToken, generatedInviteKey]);

  const ensureGeneratedInviteToken = async ({ sendEmail }) => {
    if (!validEmail) {
      addToast('Informe um email válido.', 'error');
      return '';
    }
    const payload = buildInvitePayload();
    const key = buildInviteKey(payload);
    // O cache so vale para o fluxo de "criar link". Quando o usuario pede o
    // envio por email e obrigatorio chamar a API de novo, senao o botao
    // responderia sucesso sem tentar enviar nada.
    if (!sendEmail && generatedInviteToken && generatedInviteKey === key) return generatedInviteToken;
    const resp = await apiClient.post('/auth/admin/create-invite', { ...payload, send_email: !!sendEmail });
    const token = String(resp?.invite?.token || '').trim();
    if (!token) throw new Error('Falha ao gerar convite');
    setGeneratedInviteToken(token);
    setGeneratedInviteKey(key);
    return token;
  };

  const createInviteLink = async () => {
    try {
      const token = await ensureGeneratedInviteToken({ sendEmail: false });
      if (!token) return;
      addToast('Link de convite criado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Falha ao criar link', 'error');
    }
  };

  const copyLink = async () => {
    try {
      if (!generatedInviteToken) {
        addToast('Crie o link de convite primeiro.', 'error');
        return;
      }
      const url = `${window.location.origin}/register/invite?token=${encodeURIComponent(generatedInviteToken)}`;
      await navigator.clipboard.writeText(url);
      addToast('Link de convite copiado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Não foi possível copiar o link.', 'error');
    }
  };

  const createInvite = async () => {
    try {
      await ensureGeneratedInviteToken({ sendEmail: true });
      addToast('Convite enviado por email.', 'success');
      fetchInvites();
    } catch (e) {
      // O convite pode ter sido criado mesmo sem o email ter saido. Nesse caso
      // o token volta na resposta e o link continua valendo para envio manual.
      const fallbackToken = String(e?.response?.invite?.token || '').trim();
      if (fallbackToken) {
        setGeneratedInviteToken(fallbackToken);
        addToast(`Convite criado, mas o email nao foi enviado: ${e?.message || 'falha no servidor'}. Use "Copiar link" para enviar manualmente.`, 'error');
      } else {
        addToast(e?.message || 'Falha ao enviar convite', 'error');
      }
    }
  };

  const handlePermissionChange = (artistId, key, value) => {
    setArtists(artists.map(a => {
      if (a.id === artistId) {
        const policy = planPolicyFor(a);
        if (key !== 'show_on_home' && policy?.locked?.[key]) {
          return a;
        }
        return {
          ...a,
          access_control: {
            ...a.access_control,
            [key]: value
          }
        };
      }
      return a;
    }));
  };

  const savePermissions = async (artist) => {
    setSavingId(artist.id);
    try {
      const policy = planPolicyFor(artist);
      const enforced = { ...(artist.access_control || {}) };
      if (!enforced.plan_override) {
        Object.keys(policy.forced || {}).forEach((k) => {
          enforced[k] = !!policy.forced[k];
        });
      }
      const payload = { access_control: enforced };
      try {
        await apiClient.put(`/profiles/${artist.id}/access-control`, payload);
      } catch (e) {
        if (Number(e?.status) === 404) {
          try {
            await apiClient.put(`/profiles/${artist.id}/access_control`, payload);
          } catch (err) {
            if (Number(err?.status) === 404) {
              await apiClient.put(`/profiles/${artist.id}/accesscontrol`, payload);
            } else {
              throw err;
            }
          }
        } else {
          throw e;
        }
      }
      addToast('Permissões atualizadas com sucesso!', 'success');
      await fetchArtists();
    } catch (error) {
      console.error('Error saving permissions:', error);
      addToast('Erro ao salvar permissões', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const toggleVerified = async (artist) => {
    const name = artist?.nome || artist?.nome_completo_razao_social || artist?.email || 'Usuário';
    const current = !!artist?.access_control?.verified;
    const next = !current;
    const ok = window.confirm(next ? `Confirmar verificação do perfil de ${name}?` : `Remover verificação do perfil de ${name}?`);
    if (!ok) return;

    const updated = {
      ...artist,
      access_control: {
        ...(artist.access_control || {}),
        verified: next,
      },
    };
    setArtists((prev) => prev.map((a) => (a.id === artist.id ? updated : a)));
    await savePermissions(updated);
  };

  const openPurgeModal = (artist) => {
    setPurgeTarget(artist);
    setPurgeConfirm('');
    setPurgeAcknowledge(false);
    setPurgePin('');
  };

  const closePurgeModal = () => {
    if (purgeLoading) return;
    setPurgeTarget(null);
    setPurgeConfirm('');
    setPurgeAcknowledge(false);
    setPurgePin('');
  };

  const migrateTarget = migrateUserId ? artists.find((a) => String(a.id) === String(migrateUserId)) : null;
  const migrateExpected = migrateTarget?.email ? `MIGRAR ${migrateTarget.email} PARA ${migrateToRole}` : '';
  const migrateRoles = ['Artista', 'Compositor', 'Produtor', 'Vendedor'];

  useEffect(() => {
    if (!migrateTarget) return;
    const fromRole = String(migrateTarget.cargo || '').trim();
    const defaultNext = migrateRoles.find((r) => r !== fromRole) || migrateToRole;
    if (!migrateRoles.includes(String(migrateToRole || '').trim()) || String(migrateToRole || '').trim() === fromRole) {
      if (defaultNext && defaultNext !== migrateToRole) setMigrateToRole(defaultNext);
    }
    setMigrateConfirm('');
    setMigrateAcknowledge(false);
    setMigratePin('');
  }, [migrateUserId]);

  const migrateRole = async () => {
    if (!migrateTarget?.id) {
      addToast('Selecione um usuário para migrar.', 'error');
      return;
    }
    if (!migrateRoles.includes(String(migrateTarget.cargo || '').trim())) {
      addToast('Selecione um usuário com cargo válido.', 'error');
      return;
    }
    if (!migrateRoles.includes(String(migrateToRole || '').trim())) {
      addToast('Selecione o cargo de destino.', 'error');
      return;
    }
    if (String(migrateToRole || '').trim() === String(migrateTarget.cargo || '').trim()) {
      addToast('Cargo de destino deve ser diferente do atual.', 'error');
      return;
    }
    if (String(migrateConfirm || '').trim() !== migrateExpected) {
      addToast('Confirmação inválida. Digite exatamente a frase solicitada.', 'error');
      return;
    }
    if (!migrateAcknowledge) {
      addToast('Confirme que você entende a mudança de cargo.', 'error');
      return;
    }
    if (String(migratePin || '').trim() !== '18084907') {
      addToast('PIN incorreto', 'error');
      return;
    }
    setMigrateLoading(true);
    try {
      await apiClient.post(`/admin/users/${migrateTarget.id}/migrate-role`, { to_role: migrateToRole, confirm: migrateConfirm });
      addToast('Cargo migrado com sucesso! Dados do perfil preservados.', 'success');
      setMigrateUserId('');
      setMigrateConfirm('');
      setMigrateAcknowledge(false);
      setMigratePin('');
      await fetchArtists();
    } catch (e) {
      addToast(e?.message || 'Erro ao migrar cargo', 'error');
    } finally {
      setMigrateLoading(false);
    }
  };

  const purgeAccount = async () => {
    if (!purgeTarget?.id) return;
    const expected = `APAGAR ${purgeTarget.email}`;
    if (String(purgeConfirm || '').trim() !== expected) {
      addToast('Confirmação inválida. Digite exatamente a frase solicitada.', 'error');
      return;
    }
    if (!purgeAcknowledge) {
      addToast('Confirme que você entende que esta ação é permanente.', 'error');
      return;
    }
    if (String(purgePin || '').trim() !== '18084907') {
      addToast('PIN incorreto', 'error');
      return;
    }
    setPurgeLoading(true);
    try {
      await apiClient.post(`/admin/users/${purgeTarget.id}/purge`, { confirm: purgeConfirm });
      addToast('Conta apagada com sucesso!', 'success');
      setArtists((prev) => prev.filter((a) => a.id !== purgeTarget.id));
      closePurgeModal();
    } catch (error) {
      console.error('Error purging account:', error);
      addToast(error?.message || 'Erro ao apagar conta', 'error');
    } finally {
      setPurgeLoading(false);
    }
  };

  const filteredArtists = artists.filter(a => {
    if (a.cargo !== activeTab) return false;
    if (!selectedUserId) return false;
    if (String(a.id) !== String(selectedUserId)) return false;
    const term = searchTerm.toLowerCase();
    return (
      (a.nome || '').toLowerCase().includes(term) ||
      (a.nome_completo_razao_social || '').toLowerCase().includes(term) ||
      (a.email || '').toLowerCase().includes(term)
    );
  });

  const roleTabs = ['Artista', 'Compositor', 'Produtor', 'Vendedor'];
  const roleLabel = (tab) => (tab === 'Artista' ? 'Artistas' : tab === 'Compositor' ? 'Compositores' : tab === 'Produtor' ? 'Produtores' : 'Vendedores');
  const roleCount = (tab) => artists.filter((a) => a.cargo === tab).length;

  // Grupos de permissao por cargo. Substitui os quatro ramos de JSX duplicados
  // que existiam antes: chaves, rotulos, agrupamentos e descricoes ficam em
  // um lugar so, e o renderizador e unico para todos os cargos.
  const PERMISSION_GROUPS = {
    Produtor: [
      {
        title: 'Administracao',
        hint: 'Modulos de operacao do painel do produtor',
        items: [
          { key: 'admin_panel', label: 'Painel', desc: 'Acesso ao painel principal' },
          { key: 'admin_feed', label: 'Feed' },
          { key: 'admin_search', label: 'Pesquisar' },
          { key: 'admin_events', label: 'Eventos' },
          { key: 'admin_scanner', label: 'Portaria' },
          { key: 'admin_auditions', label: 'Audicoes' },
          { key: 'admin_podcasts', label: 'Podcasts' },
          { key: 'admin_settings', label: 'Sistema', desc: 'Acesso as configuracoes do painel' }
        ]
      },
      {
        title: 'Conteudo',
        hint: 'Quem pode ser gerenciado no catalogo',
        items: [
          { key: 'admin_artists', label: 'Artistas' },
          { key: 'admin_composers', label: 'Compositores' },
          { key: 'admin_sellers', label: 'Vendedores' },
          { key: 'admin_musics', label: 'Musicas' },
          { key: 'admin_compositions', label: 'Composicoes' },
          { key: 'admin_sponsors', label: 'Patrocinadores' }
        ]
      },
      {
        title: 'Gestao',
        hint: 'Areas financeiras e de negocio',
        items: [
          { key: 'admin_finance', label: 'Financeiro', desc: 'Permite visualizar informacoes financeiras' }
        ]
      },
      {
        title: 'Perfil e experiencia',
        items: [
          { key: 'chat', label: 'Chat' },
          { key: 'admin_profile', label: 'Perfil' },
          { key: 'admin_public_profile', label: 'Perfil Publico' },
          { key: 'show_on_home', label: 'Mostrar na Home' }
        ]
      }
    ],
    Vendedor: [
      {
        title: 'Administracao',
        hint: 'Modulos do painel do vendedor',
        items: [
          { key: 'dashboard_panel', label: 'Painel', desc: 'Acesso ao painel principal' },
          { key: 'dashboard_feed', label: 'Feed' },
          { key: 'dashboard_search', label: 'Pesquisar' },
          { key: 'dashboard_profile', label: 'Perfil' }
        ]
      },
      {
        title: 'Gestao de vendas',
        hint: 'Operacao comercial do vendedor',
        items: [
          { key: 'seller_artists', label: 'Artistas' },
          { key: 'seller_calendar', label: 'Agenda' },
          { key: 'seller_leads', label: 'Oportunidades' },
          { key: 'seller_finance', label: 'Comissoes', desc: 'Permite visualizar comissoes e valores' },
          { key: 'seller_proposals', label: 'Propostas' },
          { key: 'seller_communications', label: 'Comunicacao' }
        ]
      },
      {
        title: 'Perfil e experiencia',
        items: [
          { key: 'chat', label: 'Chat' },
          { key: 'public_profile', label: 'Perfil Publico' },
          { key: 'show_on_home', label: 'Mostrar na Home' }
        ]
      }
    ],
    Compositor: [
      {
        title: 'Administracao',
        hint: 'Modulos do painel do compositor',
        items: [
          { key: 'dashboard_panel', label: 'Painel', desc: 'Acesso ao painel principal' },
          { key: 'dashboard_feed', label: 'Feed' },
          { key: 'dashboard_search', label: 'Pesquisar' },
          { key: 'dashboard_profile', label: 'Perfil' },
          { key: 'dashboard_auditions', label: 'Audicoes' }
        ]
      },
      {
        title: 'Conteudo',
        items: [
          { key: 'compositions', label: 'Composicoes' },
          { key: 'marketing', label: 'Marketing' },
          { key: 'finance', label: 'Financeiro', desc: 'Permite visualizar informacoes financeiras' }
        ]
      },
      {
        title: 'Perfil e experiencia',
        items: [
          { key: 'chat', label: 'Chat' },
          { key: 'public_profile', label: 'Perfil Publico' },
          { key: 'show_on_home', label: 'Mostrar na Home' }
        ]
      }
    ],
    Artista: [
      {
        title: 'Administracao',
        hint: 'Modulos do painel do artista',
        items: [
          { key: 'dashboard_panel', label: 'Painel', desc: 'Acesso ao painel principal' },
          { key: 'dashboard_feed', label: 'Feed' },
          { key: 'dashboard_search', label: 'Pesquisar' },
          { key: 'dashboard_profile', label: 'Perfil' }
        ]
      },
      {
        title: 'Conteudo',
        items: [
          { key: 'musics', label: 'Musicas' },
          { key: 'compositions', label: 'Composicoes' },
          { key: 'work', label: 'Agenda / Afazeres' }
        ]
      },
      {
        title: 'Gestao',
        items: [
          { key: 'marketing', label: 'Marketing' },
          { key: 'finance', label: 'Financeiro', desc: 'Permite visualizar informacoes financeiras' }
        ]
      },
      {
        title: 'Perfil e experiencia',
        items: [
          { key: 'chat', label: 'Chat' },
          { key: 'public_profile', label: 'Perfil Publico' },
          { key: 'show_on_home', label: 'Mostrar na Home' }
        ]
      }
    ]
  };

  const settingsSections = [
    {
      id: 'convites',
      title: 'Convites',
      helper: 'Criar novos acessos, links e migrar cargos',
      count: invites.filter((invite) => invite.status === 'pending').length
    },
    {
      id: 'lista',
      title: 'Lista de convites',
      helper: 'Visualizar pendentes, expirados, usados e reenviar',
      count: invites.length
    },
    {
      id: 'monetizacao',
      title: 'Monetização',
      helper: 'Editar destaque pago e monetizacao da Home',
      count: featuredPlansDraft?.plans ? Object.keys(featuredPlansDraft.plans).length : 0
    },
    {
      id: 'video',
      title: 'Video Home',
      helper: 'Configurar link do YouTube para fundo da Home',
      count: 1
    },
    {
      id: 'permissoes',
      title: 'Permissoes',
      helper: 'Gerenciar acessos, verificacao, override e destaque',
      count: artists.length
    }
  ];

  // Linha de permissao. Substitui as "pills" soltas: cada permissao passa a
  // ocupar uma linha propria, com nome, descricao opcional e estado a direita.
  const PermissionRow = ({ enabled, label, desc, locked = false, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-disabled={locked}
      aria-pressed={enabled}
      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/[0.04]'
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
          enabled ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'
        }`}
      >
        {enabled ? <Check size={14} /> : <Lock size={13} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${enabled ? 'text-white' : 'text-gray-400'}`}>
          {label}
        </span>
        {desc && <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{desc}</span>}
      </span>

      {locked && (
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
          Pelo plano
        </span>
      )}
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
          enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}
      >
        {enabled ? 'Pode ver' : 'Bloqueado'}
      </span>
    </button>
  );

  const PermissionGroup = ({ title, hint, children }) => (
    <section className="rounded-2xl bg-white/[0.03] p-1.5">
      <header className="px-3 pb-2 pt-3">
        <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-beatwap-gold">
          {title}
        </h4>
        {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </header>
      <div className="space-y-0.5 pb-1.5">{children}</div>
    </section>
  );


  const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const planPolicyFor = (artist) => {
    const role = artist?.cargo || '';
    const nplan = normalize(artist?.plano || '');
    const override = !!artist?.access_control?.plan_override;
    const isArtist = role === 'Artista';
    const isComposer = role === 'Compositor';
    const isProducer = role === 'Produtor';
    const isSeller = role === 'Vendedor';
    const forced = {};
    const locked = {};
    // Define keys by role
    const keys =
      isArtist
        ? ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','musics','compositions','work','marketing','finance','chat','public_profile']
        : isComposer
          ? ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','dashboard_auditions','compositions','marketing','finance','chat','public_profile']
          : isProducer
            ? ['admin_panel','admin_feed','admin_search','admin_events','admin_scanner','admin_auditions','admin_podcasts','admin_artists','admin_composers','admin_sellers','admin_musics','admin_compositions','admin_sponsors','admin_settings','admin_finance','admin_profile','admin_public_profile','chat']
            : isSeller
              ? ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','public_profile','seller_artists','seller_calendar','seller_leads','seller_finance','seller_proposals','seller_communications','chat']
              : [];
    if (!keys.length) return { forced, locked };
    if (override) {
      keys.forEach((k) => {
        locked[k] = false;
      });
      return { forced, locked };
    }
    // For Artist/Composer, apply plan-based allowlist; for others, lock to current state
    if (isArtist || isComposer) {
      let allow = [];
      if (!nplan || nplan.includes('sem')) {
        allow = [];
      } else if (nplan.includes('avulso')) {
        allow = isComposer ? ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','dashboard_auditions','compositions','chat'] : ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','musics','chat'];
      } else if (nplan.includes('mensal') || nplan.includes('anual') || nplan.includes('vital')) {
        allow = isComposer ? ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','dashboard_auditions','compositions','marketing','finance','chat','public_profile'] : ['dashboard_panel','dashboard_feed','dashboard_search','dashboard_profile','musics','compositions','work','marketing','finance','chat','public_profile'];
      }
      keys.forEach((k) => {
        forced[k] = allow.includes(k);
        locked[k] = true;
      });
    } else {
      keys.forEach((k) => {
        forced[k] = artist?.access_control?.[k] !== false;
        locked[k] = true;
      });
    }
    return { forced, locked };
  };
  const getPermState = (artist, key) => {
    if (key === 'show_on_home') {
      return { enabled: artist?.access_control?.show_on_home !== false, locked: false };
    }
    const policy = planPolicyFor(artist);
    const locked = !!policy.locked?.[key];
    const forcedValue = policy.forced?.[key];
    const current = artist?.access_control?.[key] !== false;
    const enabled = locked ? !!forcedValue : current;
    return { enabled, locked };
  };

  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/admin');
  }, [navigate]);

  return (
    <SettingsShell onBack={goBack}>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Configuracoes</h1>
          <p className="text-sm text-gray-400">
            Gerencie as configuracoes da sua conta e as permissoes de acesso da equipe.
          </p>
        </div>

        <nav className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 scrollbar-hide sm:mx-0 sm:px-0">
          {settingsSections.map((section) => {
            const active = activeSettingsSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSettingsSection(section.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-beatwap-gold text-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{section.title}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-black/15 text-black' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {section.count}
                </span>
              </button>
            );
          })}
        </nav>

        {activeSettingsSection === 'convites' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-white sm:text-xl">Sistema e Convites</h2>
            <p className="mt-1 text-sm text-gray-400">
              Gerencie convites, cargos e acessos dos usuários.
            </p>
          </div>

          {/* items-start: cada card usa a propria altura natural, sem esticar o
              mais curto para "caber" o mais longo. */}
          <div className="grid items-start gap-4 lg:grid-cols-2 md:gap-6">
            <section className="w-full space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-xl sm:p-6">
              <header className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-beatwap-gold/10 text-beatwap-gold">
                  <User size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white md:text-lg">Criar novo convite</h3>
                  <p className="mt-0.5 text-sm text-gray-400">
                    Convide novos membros para fazer parte da BeatWap.
                  </p>
                </div>
              </header>
              <div className="w-full">
                <AnimatedInput
                  label="Nome"
                  icon={User}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: MC Future"
                  className="w-full"
                />
              </div>
              <div className="w-full">
                <AnimatedInput
                  label="Email"
                  type="email"
                  icon={Mail}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-300">Cargo</div>
                <select
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Artista" className="bg-[#121212]">Artista</option>
                  <option value="Compositor" className="bg-[#121212]">Compositor</option>
                  <option value="Vendedor" className="bg-[#121212]">Vendedor</option>
                  <option value="Produtor" className="bg-[#121212]">Produtor</option>
                </select>
              </div>

              {(form.role === 'Artista' || form.role === 'Compositor') && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-300">Plano</div>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                    value={form.plano}
                    onChange={(e) => setForm({ ...form, plano: e.target.value })}
                  >
                    <option value="Sem Plano" className="bg-[#121212]">Sem Plano</option>
                    <option value="Avulso" className="bg-[#121212]">Avulso</option>
                    <option value="Mensal" className="bg-[#121212]">Mensal</option>
                    <option value="Anual" className="bg-[#121212]">Anual</option>
                    <option value="Vitalício" className="bg-[#121212]">Vitalício</option>
                  </select>
                </div>
              )}
              
              <div className="space-y-3 pt-2">
                <div className="text-sm text-gray-300 font-bold">Permissões Iniciais</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors w-full">
                    <input
                      type="checkbox"
                      checked={form.p_chat}
                      onChange={(e) => setForm({ ...form, p_chat: e.target.checked })}
                      className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                    />
                    <span className="text-sm">Chat</span>
                  </label>

                  {form.role === 'Produtor' ? (
                    producerInvitePermissions.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={form[perm.key]}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))
                  ) : form.role === 'Vendedor' ? (
                    sellerInvitePermissions.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={form[perm.key]}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))
                  ) : (
                    (form.role === 'Compositor' ? composerInvitePermissions : artistInvitePermissions).map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={form[perm.key]}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <AnimatedButton 
                  onClick={createInviteLink}
                  className="w-full sm:flex-1 bg-beatwap-gold text-beatwap-black hover:shadow-[0_0_20px_rgba(245,197,66,0.4)]"
                >
                  Criar link de convite
                </AnimatedButton>
                
                <AnimatedButton 
                  onClick={copyLink}
                  className="w-full sm:flex-1"
                >
                  Copiar Link
                </AnimatedButton>
                <AnimatedButton 
                  onClick={createInvite}
                  className="w-full sm:flex-1"
                >
                  Enviar Convite por Email
                </AnimatedButton>
              </div>
              </section>

            <section className="w-full space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-xl sm:p-6">
              <header className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-beatwap-gold/10 text-beatwap-gold">
                  <Shield size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white md:text-lg">Migração de cargos</h3>
                  <p className="mt-0.5 text-sm text-gray-400">
                    Altere o cargo de um usuário existente sem perder os dados atuais do perfil.
                  </p>
                </div>
              </header>
              <div className="space-y-4">
                <div className="rounded-xl border border-beatwap-gold/20 bg-beatwap-gold/[0.06] p-3">
                  <div className="text-sm font-bold text-beatwap-gold">Dados preservados</div>
                  <div className="mt-0.5 text-sm text-gray-400">
                    Foto, nome, WhatsApp, endereço e demais informações serão mantidos.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-gray-300">Usuário</label>
                  <select
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                    value={migrateUserId}
                    onChange={(e) => setMigrateUserId(e.target.value)}
                  >
                    <option value="" className="bg-[#121212]">Selecionar usuário</option>
                    {artists
                      .filter((a) => a && migrateRoles.includes(a.cargo))
                      .slice()
                      .sort((a, b) => (a.nome || a.nome_completo_razao_social || a.email || '').localeCompare(b.nome || b.nome_completo_razao_social || b.email || ''))
                      .map((a) => (
                        <option key={a.id} value={a.id} className="bg-[#121212]">
                          {(a.nome || a.nome_completo_razao_social || a.email || `#${a.id}`)} ({a.cargo})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">Cargo de destino</div>
                    <select
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                      value={migrateToRole}
                      onChange={(e) => setMigrateToRole(e.target.value)}
                      disabled={!migrateTarget}
                    >
                      <option value="Artista" className="bg-[#121212]">Artista</option>
                      <option value="Compositor" className="bg-[#121212]">Compositor</option>
                      <option value="Produtor" className="bg-[#121212]">Produtor</option>
                      <option value="Vendedor" className="bg-[#121212]">Vendedor</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-300">Email</div>
                    <div className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 truncate">
                      {migrateTarget?.email || '—'}
                    </div>
                  </div>
                </div>

                {migrateTarget?.email && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 space-y-2">
                    <div className="text-sm font-extrabold text-red-200 flex items-center gap-2">
                      <Shield size={16} className="text-red-300" /> Atenção: ação sensível
                    </div>
                    <div className="text-xs text-red-100/80">
                      Para confirmar, digite: <span className="text-white font-extrabold">{migrateExpected}</span>
                    </div>
                    <input
                      type="text"
                      value={migrateConfirm}
                      onChange={(e) => setMigrateConfirm(e.target.value)}
                      placeholder={migrateExpected}
                      className="w-full bg-black/20 border border-red-500/30 rounded-lg px-3 py-2 text-white focus:border-red-400 outline-none"
                    />
                    <label className="flex items-center gap-2 text-xs text-red-100/90">
                      <input
                        type="checkbox"
                        checked={migrateAcknowledge}
                        onChange={(e) => setMigrateAcknowledge(e.target.checked)}
                        className="rounded border-red-500/40 text-red-300 focus:ring-red-400 bg-transparent"
                      />
                      Eu entendo que o cargo será alterado e os dados do perfil serão preservados.
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-200/70" />
                      <input
                        type="password"
                        value={migratePin}
                        onChange={(e) => setMigratePin(e.target.value)}
                        placeholder="PIN"
                        className="w-full bg-black/20 border border-red-500/30 rounded-lg pl-9 pr-3 py-2 text-white focus:border-red-400 outline-none"
                      />
                    </div>

                    <AnimatedButton
                      onClick={migrateRole}
                      isLoading={migrateLoading}
                      className="w-full bg-red-500 text-white hover:bg-red-600"
                      disabled={migrateLoading || !migrateTarget?.email}
                    >
                      Migrar Cargo
                    </AnimatedButton>
                  </div>
                )}
              </div>
            </section>
          </div>
          </div>
        )}

            {activeSettingsSection === 'lista' && (
        <Card className="space-y-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
              <Settings size={20} className="text-beatwap-gold" />
              Convites Enviados
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-1 flex gap-1 overflow-x-auto whitespace-nowrap">
              {['pending','expired','used','all'].map(f => (
                <button
                  key={f}
                  onClick={() => setInvFilter(f)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-bold shrink-0 ${
                    invFilter === f ? 'bg-beatwap-gold text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {f === 'pending' ? 'Pendentes' : f === 'expired' ? 'Expirados' : f === 'used' ? 'Usados' : 'Todos'}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
            {invLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando convites...</div>
            ) : invites.filter(i => invFilter === 'all' ? true : i.status === invFilter).length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum convite.</div>
            ) : (
              <div className="divide-y divide-white/10">
                {invites
                  .filter(i => invFilter === 'all' ? true : i.status === invFilter)
                  .map(inv => (
                  <div key={inv.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{inv.email}</div>
                      <div className="text-xs text-gray-400">
                        Expira: {new Date(inv.expires_at).toLocaleString()} •
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] border ${inv.status==='pending' ? 'text-green-400 border-green-500/30 bg-green-500/10' : inv.status==='expired' ? 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10' : 'text-gray-300 border-white/10 bg-white/5'}`}>
                          {inv.status === 'pending' ? 'Pendente' : inv.status === 'expired' ? 'Expirado' : 'Usado'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AnimatedButton onClick={() => copyInvite(inv.token)} className="px-3">
                        Copiar Link
                      </AnimatedButton>
                      <AnimatedButton onClick={() => resendInvite(inv.id)} className="px-3" disabled={inv.status !== 'pending'}>
                        Reenviar
                      </AnimatedButton>
                      <AnimatedButton onClick={() => regenerateInvite(inv.id)} className="px-3" variant="secondary">
                        Regenerar
                      </AnimatedButton>
                      <button
                        onClick={() => deleteInvite(inv.id)}
                        className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20"
                        title="Excluir"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <AnimatedButton onClick={fetchInvites} isLoading={invLoading}>
              Atualizar lista
            </AnimatedButton>
          </div>
        </Card>
        )}

        {activeSettingsSection === 'monetizacao' && (
        <Card className="space-y-6">
          <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
            <Settings size={20} className="text-beatwap-gold" />
            Monetização (Home)
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-2xl border p-4 sm:p-6 shadow-xl space-y-4 bg-white/5 border-white/10 w-full overflow-hidden">
              <div className="text-base md:text-lg font-bold">Destaque Pago</div>

              <div className="space-y-2">
                <div className="text-sm text-gray-300">Frase do botão</div>
                <input
                  value={featuredPlansDraft?.cta || ''}
                  onChange={(e) => setFeaturedPlansDraft((prev) => prev ? { ...prev, cta: e.target.value } : prev)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  placeholder="Apareça primeiro e aumente suas chances de ser descoberto"
                />
              </div>

              {(['basic','pro','top']).map((k) => (
                <div key={k} className="rounded-xl bg-black/20 border border-white/10 p-4 space-y-3">
                  <div className="text-sm font-extrabold text-white">
                    {featuredPlansDraft?.plans?.[k]?.label || (k === 'top' ? 'Destaque Top' : k === 'pro' ? 'Destaque Pro' : 'Destaque Básico')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Preço (R$)</div>
                      <input
                        type="number"
                        min="0"
                        value={featuredPlansDraft?.plans?.[k]?.price ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFeaturedPlansDraft((prev) => {
                            if (!prev) return prev;
                            const plans = { ...(prev.plans || {}) };
                            const plan = { ...(plans[k] || {}) };
                            plan.price = v === '' ? '' : Number(v);
                            plans[k] = plan;
                            return { ...prev, plans };
                          });
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Duração (horas)</div>
                      <input
                        type="number"
                        min="0"
                        value={featuredPlansDraft?.plans?.[k]?.duration_hours ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFeaturedPlansDraft((prev) => {
                            if (!prev) return prev;
                            const plans = { ...(prev.plans || {}) };
                            const plan = { ...(plans[k] || {}) };
                            plan.duration_hours = v === '' ? '' : Number(v);
                            plans[k] = plan;
                            return { ...prev, plans };
                          });
                        }}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400">Fixado no topo</div>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 rounded-lg border text-sm font-bold transition-colors ${
                          featuredPlansDraft?.plans?.[k]?.pinned ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-black/20 text-gray-300 border-white/10 hover:border-white/20'
                        }`}
                        onClick={() => {
                          setFeaturedPlansDraft((prev) => {
                            if (!prev) return prev;
                            const plans = { ...(prev.plans || {}) };
                            const plan = { ...(plans[k] || {}) };
                            plan.pinned = !(plan.pinned === true);
                            plans[k] = plan;
                            return { ...prev, plans };
                          });
                        }}
                      >
                        {featuredPlansDraft?.plans?.[k]?.pinned ? 'Sim' : 'Não'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2">
                <AnimatedButton onClick={fetchFeaturedPlansAdmin} variant="outline">
                  Recarregar
                </AnimatedButton>
                <AnimatedButton onClick={saveFeaturedPlansAdmin} isLoading={featuredPlansSaving}>
                  Salvar Destaque
                </AnimatedButton>
              </div>
            </div>
</div>
            </Card>
          )}
          
          {activeSettingsSection === 'video' && (
            <Card className="space-y-6">
              <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
                <Settings size={20} className="text-beatwap-gold" />
                Vídeo da Home
              </div>
              <div className="text-sm text-gray-300">
                Configure o link do YouTube que será exibido como fundo da Home. Deixe em branco para usar a imagem padrão.
              </div>

              <div className="space-y-2">
                <div className="text-sm text-gray-300">Link do YouTube</div>
                <input
                  value={youtubeVideoUrl}
                  onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  placeholder="https://www.youtube.com/watch?v=af-M8NS89F4"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Exemplos: https://www.youtube.com/watch?v=af-M8NS89F4 ou https://youtu.be/af-M8NS89F4
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <AnimatedButton onClick={fetchYoutubeVideoUrl} variant="outline">
                  Recarregar
                </AnimatedButton>
                <AnimatedButton onClick={saveYoutubeVideoUrl}>
                  Salvar Vídeo
                </AnimatedButton>
              </div>
            </Card>
          )}
          
        {activeSettingsSection === 'permissoes' && (
          <div className="space-y-8">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-beatwap-gold/10">
                    <Shield size={20} className="text-beatwap-gold" />
                  </span>
                  <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                    Gerenciar Permissoes
                  </h2>
                </div>
                <p className="mt-2 max-w-xl text-sm text-gray-400">
                  Controle quais areas e recursos cada usuario pode acessar.
                </p>
              </div>

              <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[420px]">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm text-white placeholder-gray-600 outline-none transition focus:border-beatwap-gold/60"
                  />
                </div>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-beatwap-gold/60"
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                >
                  <option value="">Selecionar usuario ({roleLabel(activeTab)})</option>
                  {artists
                    .filter((a) => a.cargo === activeTab)
                    .sort((a, b) =>
                      (a.nome || a.nome_completo_razao_social || '')
                        .localeCompare(b.nome || b.nome_completo_razao_social || '')
                    )
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome || a.nome_completo_razao_social || a.email || `#${a.id}`}
                      </option>
                    ))}
                </select>
              </div>
            </header>

            <div className="-mx-3 overflow-x-auto px-3 scrollbar-hide sm:mx-0 sm:px-0">
              <div
                role="tablist"
                aria-label="Categorias de usuarios"
                className="inline-flex min-w-full gap-1 rounded-2xl bg-white/[0.03] p-1"
              >
                {roleTabs.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab)}
                      className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                        active
                          ? 'bg-beatwap-gold text-black'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{roleLabel(tab)}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          active ? 'bg-black/15 text-black' : 'bg-white/10 text-gray-500'
                        }`}
                      >
                        {roleCount(tab)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingArtists ? (
              <div className="rounded-2xl bg-white/[0.03] py-16 text-center text-sm text-gray-500">
                Carregando usuarios...
              </div>
            ) : filteredArtists.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] py-16 text-center">
                <p className="text-sm text-gray-400">
                  Nenhum usuario encontrado nesta categoria.
                </p>
                {!selectedUserId && (
                  <p className="mt-1.5 text-xs text-gray-600">
                    Selecione um usuario para editar as permissoes.
                  </p>
                )}
              </div>
            ) : (
              filteredArtists.map((artist) => {
                const groups = PERMISSION_GROUPS[artist.cargo] || PERMISSION_GROUPS.Artista;
                const featured = artist?.access_control?.featured && typeof artist.access_control.featured === 'object'
                  ? artist.access_control.featured
                  : null;
                const featuredOn = !!(featured && featured.enabled !== false);
                const featuredLevel = String(featured?.level || '').toLowerCase();
                const featuredEndsAt = featured?.ends_at || featured?.until || null;
                const featuredEndsText = (() => {
                  if (!featuredEndsAt) return null;
                  const t = new Date(featuredEndsAt);
                  return Number.isFinite(t.getTime()) ? t.toLocaleString() : null;
                })();
                const featuredLabel =
                  featuredLevel === 'top'
                    ? 'Destaque Top'
                    : featuredLevel === 'pro'
                      ? 'Destaque Pro'
                      : featuredLevel === 'basic'
                        ? 'Destaque Basico'
                        : 'Destaque';
                const busy = savingId === artist.id;

                // show_on_home usa a semantica invertida (=== false), por isso
                // fica separado do resto. Preserva o comportamento anterior.
                const nextValueFor = (key) =>
                  key === 'show_on_home'
                    ? artist?.access_control?.show_on_home === false
                    : !artist?.access_control?.[key];

                return (
                  <div key={artist.id} className="space-y-6">
                    <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/[0.03] p-4 sm:p-5">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                        {artist.avatar_url ? (
                          <img
                            src={artist.avatar_url}
                            alt={artist.nome || artist.nome_completo_razao_social}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-beatwap-gold to-yellow-600 text-lg font-extrabold text-black">
                            {(artist.nome || artist.nome_completo_razao_social || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-extrabold text-white">
                            {artist.nome || artist.nome_completo_razao_social || 'Sem Nome'}
                          </h3>
                          {artist?.access_control?.verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-beatwap-gold/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-beatwap-gold">
                              <Check size={11} /> Verificado
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-400">{artist.email}</p>
                      </div>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-gray-300">
                        {artist.cargo}
                      </span>
                    </section>

                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                      <div className="space-y-4 xl:col-span-8">
                        {groups.map((group) => (
                          <PermissionGroup key={group.title} title={group.title} hint={group.hint}>
                            {group.items.map((perm) => {
                              const state = getPermState(artist, perm.key);
                              return (
                                <PermissionRow
                                  key={perm.key}
                                  enabled={state.enabled}
                                  locked={state.locked}
                                  label={perm.label}
                                  desc={perm.desc}
                                  onClick={() => {
                                    if (state.locked) return;
                                    handlePermissionChange(artist.id, perm.key, nextValueFor(perm.key));
                                  }}
                                />
                              );
                            })}
                          </PermissionGroup>
                        ))}
                      </div>

                      <div className="space-y-4 xl:col-span-4">
                        <section className="rounded-2xl bg-white/[0.03] p-4">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                            Controle da conta
                          </h4>

                          <div className="mt-4 space-y-3">
                            <button
                              type="button"
                              onClick={() => {
                                const next = !artist?.access_control?.plan_override;
                                if (next) {
                                  const pin = window.prompt('Digite o PIN (PIM) para liberar override');
                                  if (String(pin || '').trim() !== '18084907') {
                                    addToast('PIN incorreto', 'error');
                                    return;
                                  }
                                }
                                setArtists((prev) =>
                                  prev.map((a) =>
                                    a.id === artist.id
                                      ? {
                                          ...a,
                                          access_control: { ...(a.access_control || {}), plan_override: next },
                                        }
                                      : a
                                  )
                                );
                              }}
                              disabled={busy}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                artist?.access_control?.plan_override
                                  ? 'bg-blue-500/10'
                                  : 'bg-white/[0.03] hover:bg-white/[0.06]'
                              }`}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                  artist?.access_control?.plan_override
                                    ? 'bg-blue-500/10 text-blue-300'
                                    : 'bg-white/5 text-gray-500'
                                }`}
                              >
                                <Lock size={15} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-white">Override do plano</span>
                                <span className="mt-0.5 block text-xs text-gray-500">
                                  Permite acesso mesmo quando bloqueado pelo plano.
                                </span>
                              </span>
                              <span
                                className={`h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${
                                  artist?.access_control?.plan_override ? 'bg-blue-500' : 'bg-white/10'
                                }`}
                              >
                                <span
                                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                    artist?.access_control?.plan_override ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleVerified(artist)}
                              disabled={busy}
                              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                artist?.access_control?.verified
                                  ? 'bg-beatwap-gold/10'
                                  : 'bg-white/[0.03] hover:bg-white/[0.06]'
                              }`}
                            >
                              <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                                  artist?.access_control?.verified
                                    ? 'bg-beatwap-gold/10 text-beatwap-gold'
                                    : 'bg-white/5 text-gray-500'
                                }`}
                              >
                                <Check size={15} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-white">Perfil verificado</span>
                                <span className="mt-0.5 block text-xs text-gray-500">
                                  Exibe o selo de verificacao no perfil.
                                </span>
                              </span>
                              <span
                                className={`h-6 w-11 shrink-0 rounded-full p-1 transition-colors ${
                                  artist?.access_control?.verified ? 'bg-beatwap-gold' : 'bg-white/10'
                                }`}
                              >
                                <span
                                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                                    artist?.access_control?.verified ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </span>
                            </button>
                          </div>
                        </section>

                        <section className="rounded-2xl bg-white/[0.03] p-4">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                            Destaque na Home
                          </h4>
                          <p className="mt-2 text-sm text-gray-400">
                            {featuredOn
                              ? `${featuredLabel}${featuredEndsText ? ` • ate ${featuredEndsText}` : ''}`
                              : 'Sem destaque'}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {[
                              { level: 'basic', label: 'Destaque Basico', active: featuredOn && featuredLevel === 'basic' },
                              { level: 'pro', label: 'Destaque Pro', active: featuredOn && featuredLevel === 'pro' },
                              { level: 'top', label: 'Destaque Top', active: featuredOn && featuredLevel === 'top' },
                              { level: 'off', label: 'Remover', active: !featuredOn }
                            ].map((opt) => (
                              <button
                                key={opt.level}
                                type="button"
                                disabled={busy}
                                aria-pressed={opt.active}
                                onClick={() => applyFeaturedToUser(artist.id, opt.level)}
                                className={`rounded-xl px-3 py-2.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                  opt.active
                                    ? 'bg-beatwap-gold text-black'
                                    : 'bg-white/[0.03] text-gray-300 hover:bg-white/[0.06] hover:text-white'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </section>

                        <AnimatedButton
                          onClick={() => savePermissions(artist)}
                          disabled={busy}
                          className="w-full justify-center"
                        >
                          {busy ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                          <span className="ml-2">Salvar alteracoes</span>
                        </AnimatedButton>

                        <section className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
                          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-red-400/90">
                            Zona destrutiva
                          </h4>
                          <p className="mt-2 text-xs leading-relaxed text-gray-400">
                            A remocao e definitiva e apaga todos os dados deste usuario.
                          </p>
                          <AnimatedButton
                            onClick={() => openPurgeModal(artist)}
                            variant="danger"
                            className="mt-3 w-full justify-center"
                          >
                            <Trash2 size={15} />
                            <span className="ml-2">Apagar conta</span>
                          </AnimatedButton>
                        </section>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {purgeTarget && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4">
                <div className="absolute inset-0" onClick={closePurgeModal} />
                <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#121212] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-white">Apagar conta definitivamente</h3>
                    <button
                      type="button"
                      onClick={closePurgeModal}
                      aria-label="Fechar"
                      className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:bg-white/10"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">
                    Esta acao nao pode ser desfeita. Digite <strong className="text-white">APAGAR {purgeTarget.email}</strong> para confirmar.
                  </p>
                  <input
                    type="text"
                    value={purgeConfirm}
                    onChange={(e) => setPurgeConfirm(e.target.value)}
                    placeholder={`APAGAR ${purgeTarget.email}`}
                    className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-400"
                  />
                  <input
                    type="password"
                    value={purgePin}
                    onChange={(e) => setPurgePin(e.target.value)}
                    placeholder="PIN (PIM)"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-beatwap-gold"
                  />
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <input
                      type="checkbox"
                      checked={purgeAcknowledge}
                      onChange={(e) => setPurgeAcknowledge(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-xs text-gray-300">Entendo que esta acao e irreversivel.</span>
                  </label>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closePurgeModal}
                      className="rounded-xl border border-white/10 px-4 py-2 text-white hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                    <AnimatedButton
                      onClick={purgeAccount}
                      variant="danger"
                      isLoading={purgeLoading}
                      disabled={String(purgeConfirm || '').trim() !== `APAGAR ${purgeTarget.email}` || !purgeAcknowledge || String(purgePin || '').trim() !== '18084907'}
                      className="px-4"
                    >
                      Apagar definitivamente
                    </AnimatedButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </SettingsShell>
  );
};
