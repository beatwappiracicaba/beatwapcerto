import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '../context/ToastContext';
import { Mail, User, Settings, Shield, Search, Save, Check, Loader, Trash2, X, Lock } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { connectRealtime, subscribe, unsubscribe } from '../services/realtime';

export const AdminSettings = () => {
  const { addToast } = useToast();
  
  // Invite Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Artista',
    plano: 'Sem Plano',
    p_chat: true,
    p_musics: true,
    p_compositions: true,
    p_work: true,
    p_marketing: true,
    p_finance: true,
    // Admin permissions
    p_admin_artists: true,
    p_admin_musics: true,
    p_admin_composers: true,
    p_admin_sellers: true,
    p_admin_compositions: true,
    p_admin_sponsors: true,
    p_admin_settings: true,
    p_admin_finance: true,
    // Seller permissions
    p_seller_artists: true,
    p_seller_calendar: true,
    p_seller_leads: true,
    p_seller_finance: true,
    p_seller_proposals: true,
    p_seller_communications: true
  });
  const [inviteLink, setInviteLink] = useState('');
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
  const [featuredPlansAdmin, setFeaturedPlansAdmin] = useState(null);
  const [featuredPlansDraft, setFeaturedPlansDraft] = useState(null);
  const [featuredPlansSaving, setFeaturedPlansSaving] = useState(false);
  const [hitAdmin, setHitAdmin] = useState(null);
  const [hitDraft, setHitDraft] = useState(null);
  const [hitSaving, setHitSaving] = useState(false);

  const pad2 = (n) => String(n).padStart(2, '0');
  const formatDateLocal = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const isoToDateInput = (iso) => {
    const s = String(iso || '').trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  };
  const startIsoFromDateInput = (dateStr) => (dateStr ? `${dateStr}T00:00:00.000Z` : '');
  const endIsoFromDateInput = (dateStr) => (dateStr ? `${dateStr}T23:59:59.999Z` : '');
  const applyHitPreset = (key) => {
    if (!hitDraft) return;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (key === 'none') {
      setHitDraft((prev) => (prev ? { ...prev, starts_at: '', ends_at: '' } : prev));
      return;
    }
    if (key === 'today') {
      const d = formatDateLocal(now);
      setHitDraft((prev) => (prev ? { ...prev, starts_at: startIsoFromDateInput(d), ends_at: endIsoFromDateInput(d) } : prev));
      return;
    }
    const day = (now.getDay() + 6) % 7;
    const start = new Date(now);
    start.setDate(start.getDate() - day + (key === 'next_week' ? 7 : 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const s = formatDateLocal(start);
    const e = formatDateLocal(end);
    setHitDraft((prev) => (prev ? { ...prev, starts_at: startIsoFromDateInput(s), ends_at: endIsoFromDateInput(e) } : prev));
  };

  const validEmail = String(form.email).trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    fetchInvites();
  }, []);

  useEffect(() => {
    fetchFeaturedPlansAdmin();
    fetchHitAdmin();
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

  const fetchHitAdmin = async () => {
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
        () => apiClient.get('/admin/hit-of-week'),
        () => apiClient.get('/admin/hit_of_week'),
        () => apiClient.get('/hit-of-week'),
        () => apiClient.get('/hit_of_week'),
      ]);
      setHitAdmin(data || null);
      setHitDraft(data ? { ...data } : null);
    } catch {
      setHitAdmin(null);
      setHitDraft(null);
    }
  };

  const saveHitAdmin = async () => {
    if (!hitDraft) return;
    setHitSaving(true);
    try {
      const payload = {
        theme: hitDraft.theme,
        home_subtitle: hitDraft.home_subtitle,
        home_helper_text: hitDraft.home_helper_text,
        starts_at: hitDraft.starts_at || null,
        ends_at: hitDraft.ends_at || null,
        entry_fee: hitDraft.entry_fee
      };

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
        () => apiClient.put('/admin/hit-of-week', payload),
        () => apiClient.put('/admin/hit_of_week', payload),
        () => apiClient.put('/hit-of-week', payload),
        () => apiClient.put('/hit_of_week', payload),
      ]);
      const next = res?.hit || hitDraft;
      setHitAdmin(next);
      setHitDraft(next ? { ...next } : null);
      addToast('Desafio atualizado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao salvar desafio', 'error');
    } finally {
      setHitSaving(false);
    }
  };

  const setHitEntryPaid = async (entryId, paid) => {
    try {
      const body = { paid };
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
        () => apiClient.post(`/admin/hit-of-week/entries/${entryId}/mark-paid`, body),
        () => apiClient.post(`/admin/hit_of_week/entries/${entryId}/mark-paid`, body),
        () => apiClient.post(`/hit-of-week/entries/${entryId}/mark-paid`, body),
        () => apiClient.post(`/hit_of_week/entries/${entryId}/mark-paid`, body),
      ]);
      const entry = res?.entry || null;
      if (!entry) return;
      setHitAdmin((prev) => {
        if (!prev || !Array.isArray(prev.entries)) return prev;
        return { ...prev, entries: prev.entries.map((e) => (e.id === entryId ? entry : e)) };
      });
      setHitDraft((prev) => {
        if (!prev || !Array.isArray(prev.entries)) return prev;
        return { ...prev, entries: prev.entries.map((e) => (e.id === entryId ? entry : e)) };
      });
    } catch (e) {
      addToast(e?.message || 'Erro ao atualizar pagamento', 'error');
    }
  };

  const setHitEntryStatus = async (entryId, status) => {
    try {
      const body = { status };
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
        () => apiClient.post(`/admin/hit-of-week/entries/${entryId}/status`, body),
        () => apiClient.post(`/admin/hit_of_week/entries/${entryId}/status`, body),
        () => apiClient.post(`/hit-of-week/entries/${entryId}/status`, body),
        () => apiClient.post(`/hit_of_week/entries/${entryId}/status`, body),
      ]);
      const entry = res?.entry || null;
      if (!entry) return;
      setHitAdmin((prev) => {
        if (!prev || !Array.isArray(prev.entries)) return prev;
        return { ...prev, entries: prev.entries.map((e) => (e.id === entryId ? entry : e)) };
      });
      setHitDraft((prev) => {
        if (!prev || !Array.isArray(prev.entries)) return prev;
        return { ...prev, entries: prev.entries.map((e) => (e.id === entryId ? entry : e)) };
      });
      addToast('Status atualizado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao atualizar status', 'error');
    }
  };

  const setHitWinner = async (entryId) => {
    try {
      const body = { winner_entry_id: entryId || null };
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
        () => apiClient.post('/admin/hit-of-week/winner', body),
        () => apiClient.post('/admin/hit_of_week/winner', body),
        () => apiClient.post('/hit-of-week/winner', body),
        () => apiClient.post('/hit_of_week/winner', body),
      ]);
      const next = res?.hit || null;
      if (next) {
        setHitAdmin(next);
        setHitDraft({ ...next });
      }
      addToast('Vencedor atualizado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao definir vencedor', 'error');
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
          finance: true,
          musics: true,
          public_profile: true,
          work: true,
          marketing: true,
          verified: false,
          plan_override: false,
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



  // Auto-update link when form changes
  useEffect(() => {
    if (form.name.trim() && validEmail) {
      const params = new URLSearchParams();
      params.set('name', form.name.trim());
      params.set('email', form.email.trim());
      params.set('role', form.role);
      if (form.role === 'Artista' || form.role === 'Compositor') {
        const plano = String(form.plano || '').trim();
        if (plano) params.set('plano', plano);
      }
      params.set('p_chat', form.p_chat ? '1' : '0');
      
      if (form.role === 'Produtor') {
        params.set('p_admin_artists', form.p_admin_artists ? '1' : '0');
        params.set('p_admin_composers', form.p_admin_composers ? '1' : '0');
        params.set('p_admin_sellers', form.p_admin_sellers ? '1' : '0');
        params.set('p_admin_musics', form.p_admin_musics ? '1' : '0');
        params.set('p_admin_compositions', form.p_admin_compositions ? '1' : '0');
        params.set('p_admin_sponsors', form.p_admin_sponsors ? '1' : '0');
        params.set('p_admin_settings', form.p_admin_settings ? '1' : '0');
        params.set('p_admin_finance', form.p_admin_finance ? '1' : '0');
      } else if (form.role === 'Vendedor') {
        params.set('p_seller_artists', form.p_seller_artists ? '1' : '0');
        params.set('p_seller_calendar', form.p_seller_calendar ? '1' : '0');
        params.set('p_seller_leads', form.p_seller_leads ? '1' : '0');
        params.set('p_seller_finance', form.p_seller_finance ? '1' : '0');
        params.set('p_seller_proposals', form.p_seller_proposals ? '1' : '0');
        params.set('p_seller_communications', form.p_seller_communications ? '1' : '0');
      } else if (form.role === 'Compositor') {
        params.set('p_compositions', form.p_compositions ? '1' : '0');
        params.set('p_marketing', form.p_marketing ? '1' : '0');
        params.set('p_finance', form.p_finance ? '1' : '0');
      } else {
        params.set('p_musics', form.p_musics ? '1' : '0');
        params.set('p_work', form.p_work ? '1' : '0');
        params.set('p_marketing', form.p_marketing ? '1' : '0');
        params.set('p_finance', form.p_finance ? '1' : '0');
      }
      
      const url = `${window.location.origin}/register?${params.toString()}`;
      setInviteLink(url);
    } else {
      setInviteLink('');
    }
  }, [form, validEmail]);

  const copyLink = () => {
    if (!inviteLink) {
      addToast('Preencha nome e email para gerar o link.', 'error');
      return;
    }
    navigator.clipboard.writeText(inviteLink).then(() => {
      addToast('Link de convite copiado.', 'success');
    }).catch(() => {
      addToast('Não foi possível copiar o link.', 'error');
    });
  };

  const createInvite = async () => {
    try {
      if (!validEmail) {
        addToast('Informe um email válido para enviar convite.', 'error');
        return;
      }
      await apiClient.post('/auth/admin/create-invite', { email: form.email });
      addToast('Convite enviado por email.', 'success');
    } catch (e) {
      addToast(e?.message || 'Falha ao enviar convite', 'error');
    }
  };

  const sendEmail = () => {
    if (!inviteLink) {
      addToast('Gere o link primeiro.', 'error');
      return;
    }
    const subject = encodeURIComponent('Convite BeatWap');
    const body = encodeURIComponent(`Olá,\n\nUse este link para criar sua conta:\n${inviteLink}\n\nSelecione seu cargo e conclua o cadastro.`);
    window.location.href = `mailto:${form.email}?subject=${subject}&body=${body}`;
  };

  const handlePermissionChange = (artistId, key, value) => {
    setArtists(artists.map(a => {
      if (a.id === artistId) {
        const policy = planPolicyFor(a);
        if (policy?.locked?.[key]) {
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

  const PermissionPill = ({ enabled, label, onClick, locked = false }) => (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
        enabled
          ? 'bg-beatwap-gold/15 text-beatwap-gold border-beatwap-gold/40 hover:bg-beatwap-gold/20'
          : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-gray-200'
      } ${locked ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      aria-disabled={locked}
    >
      <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-beatwap-gold' : 'bg-gray-500'}`} />
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={`ml-1 text-[10px] px-2 py-0.5 rounded-full border ${
          enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
        }`}
      >
        {enabled ? 'Pode ver' : 'Bloqueado'}
      </span>
      {locked && (
        <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full border bg-black/20 border-white/10 text-gray-400">
          Plano
        </span>
      )}
    </button>
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
        ? ['musics','compositions','work','marketing','finance','chat','public_profile']
        : isComposer
          ? ['compositions','marketing','finance','chat','public_profile']
          : isProducer
            ? ['admin_artists','admin_composers','admin_sellers','admin_musics','admin_compositions','admin_sponsors','admin_settings','admin_finance','marketing','chat']
            : isSeller
              ? ['seller_artists','seller_calendar','seller_leads','seller_finance','seller_proposals','seller_communications','chat']
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
        allow = isComposer ? ['compositions','chat'] : ['musics','chat'];
      } else if (nplan.includes('mensal') || nplan.includes('anual') || nplan.includes('vital')) {
        allow = isComposer ? ['compositions','marketing','finance','chat','public_profile'] : ['musics','compositions','work','marketing','finance','chat','public_profile'];
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
    const policy = planPolicyFor(artist);
    const locked = !!policy.locked?.[key];
    const forcedValue = policy.forced?.[key];
    const current = artist?.access_control?.[key] !== false;
    const enabled = locked ? !!forcedValue : current;
    return { enabled, locked };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card className="space-y-6">
          <div className="flex items-center gap-2 text-lg md:text-xl font-bold">
            <Settings size={20} className="text-beatwap-gold" />
            Sistema e Convites
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="rounded-2xl border p-4 sm:p-6 shadow-xl space-y-4 bg-white/5 border-white/10 w-full overflow-hidden">
              <div className="text-base md:text-lg font-bold flex items-center gap-2">
                <User size={18} /> Criar novo convite
              </div>
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
                    // Admin Permissions
                    [
                      { key: 'p_admin_artists', label: 'Artistas' },
                      { key: 'p_admin_composers', label: 'Compositores' },
                      { key: 'p_admin_sellers', label: 'Vendedores' },
                      { key: 'p_admin_musics', label: 'Músicas' },
                      { key: 'p_admin_compositions', label: 'Composições' },
                      { key: 'p_admin_sponsors', label: 'Patrocinadores / Parcerias' },
                      { key: 'p_admin_settings', label: 'Sistema' },
                      { key: 'p_admin_finance', label: 'Financeiro' }
                    ].map((perm) => (
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
                    // Seller Permissions
                    [
                      { key: 'p_seller_artists', label: 'Artistas' },
                      { key: 'p_seller_calendar', label: 'Agenda' },
                      { key: 'p_seller_leads', label: 'Oportunidades' },
                      { key: 'p_seller_finance', label: 'Comissões' },
                      { key: 'p_seller_proposals', label: 'Propostas' },
                      { key: 'p_seller_communications', label: 'Comunicação' }
                    ].map((perm) => (
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
                    // Artist & Composer Permissions
                    (form.role === 'Compositor' ? [
                      { key: 'p_compositions', label: 'Composições' },
                      { key: 'p_marketing', label: 'Marketing' },
                      { key: 'p_finance', label: 'Financeiro' }
                    ] : [
                      { key: 'p_musics', label: 'Músicas' },
                      { key: 'p_work', label: 'Trabalho' },
                      { key: 'p_marketing', label: 'Marketing' },
                      { key: 'p_finance', label: 'Financeiro' }
                    ]).map((perm) => (
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
                  onClick={copyLink}
                  className="w-full sm:flex-1 bg-beatwap-gold text-beatwap-black hover:shadow-[0_0_20px_rgba(245,197,66,0.4)]"
                >
                  {inviteLink ? 'Copiar Link' : 'Preencha os dados'}
                </AnimatedButton>
                
                <AnimatedButton 
                  onClick={sendEmail}
                  className="w-full sm:flex-1"
                >
                  Enviar Email
                </AnimatedButton>
                <AnimatedButton 
                  onClick={createInvite}
                  className="w-full sm:flex-1"
                >
                  Enviar Convite por Email
                </AnimatedButton>
              </div>
            </div>
            
            <div className="rounded-2xl border p-4 sm:p-6 shadow-xl space-y-4 bg-white/5 border-white/10 w-full overflow-hidden">
              <div className="text-base md:text-lg font-bold flex items-center gap-2">
                <Shield size={18} /> Migração de Cargos
              </div>
              <ul className="space-y-3 text-sm text-gray-400 list-disc list-inside">
                <li>Use este formulário para convidar novos artistas ou produtores.</li>
                <li>Defina as permissões iniciais que o usuário terá ao se cadastrar.</li>
                <li>O link gerado contém todas as configurações e expira apenas se o email mudar.</li>
                <li>Para usuários existentes, use a seção &quot;Gerenciar Permissões&quot; abaixo.</li>
              </ul>
            </div>
          </div>
        </Card>

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

            <div className="rounded-2xl border p-4 sm:p-6 shadow-xl space-y-4 bg-white/5 border-white/10 w-full overflow-hidden">
              <div className="text-base md:text-lg font-bold">Hit da Semana BeatWap</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <div className="text-xs text-gray-400">Tema</div>
                  <input
                    value={hitDraft?.theme || ''}
                    onChange={(e) => setHitDraft((prev) => prev ? { ...prev, theme: e.target.value } : prev)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                    placeholder="Hit da Semana BeatWap"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Texto 1 (Home)</div>
                  <input
                    value={hitDraft?.home_subtitle || ''}
                    onChange={(e) => setHitDraft((prev) => prev ? { ...prev, home_subtitle: e.target.value } : prev)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                    placeholder="Sua música pode ser a próxima a estourar"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Texto 2 (Home)</div>
                  <textarea
                    value={hitDraft?.home_helper_text || ''}
                    onChange={(e) => setHitDraft((prev) => prev ? { ...prev, home_helper_text: e.target.value } : prev)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none min-h-[42px]"
                    rows={2}
                    placeholder={'Para participar, envie uma nova composição no seu painel e marque "Participar do Hit da Semana".'}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <div className="text-xs text-gray-400">Período (opções prontas)</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs font-bold text-gray-200 hover:border-white/20 transition-colors"
                      onClick={() => applyHitPreset('none')}
                    >
                      Sem período
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs font-bold text-gray-200 hover:border-white/20 transition-colors"
                      onClick={() => applyHitPreset('none')}
                    >
                      Limpar datas
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs font-bold text-gray-200 hover:border-white/20 transition-colors"
                      onClick={() => applyHitPreset('today')}
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs font-bold text-gray-200 hover:border-white/20 transition-colors"
                      onClick={() => applyHitPreset('this_week')}
                    >
                      Semana atual
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-xs font-bold text-gray-200 hover:border-white/20 transition-colors"
                      onClick={() => applyHitPreset('next_week')}
                    >
                      Próxima semana
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Início</div>
                  <input
                    type="date"
                    value={isoToDateInput(hitDraft?.starts_at)}
                    onChange={(e) => setHitDraft((prev) => prev ? { ...prev, starts_at: startIsoFromDateInput(e.target.value) } : prev)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  />
                  <div className="text-[10px] text-gray-500 truncate">
                    {hitDraft?.starts_at ? `Salva como: ${hitDraft.starts_at}` : 'Sem data (sempre aberto)'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Fim</div>
                  <input
                    type="date"
                    value={isoToDateInput(hitDraft?.ends_at)}
                    onChange={(e) => setHitDraft((prev) => prev ? { ...prev, ends_at: endIsoFromDateInput(e.target.value) } : prev)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  />
                  <div className="text-[10px] text-gray-500 truncate">
                    {hitDraft?.ends_at ? `Salva como: ${hitDraft.ends_at}` : 'Sem data (sempre aberto)'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Taxa (R$)</div>
                  <input
                    type="number"
                    min="0"
                    value={hitDraft?.entry_fee ?? ''}
                    onChange={(e) => setHitDraft((prev) => prev ? { ...prev, entry_fee: e.target.value === '' ? '' : Number(e.target.value) } : prev)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Inscrições</div>
                  <div className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200">
                    {Array.isArray(hitAdmin?.entries) ? hitAdmin.entries.length : 0}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <AnimatedButton onClick={fetchHitAdmin} variant="outline">
                  Recarregar
                </AnimatedButton>
                <AnimatedButton onClick={saveHitAdmin} isLoading={hitSaving}>
                  Salvar Desafio
                </AnimatedButton>
              </div>

              {Array.isArray(hitAdmin?.entries) && hitAdmin.entries.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="max-h-[320px] overflow-auto">
                    <div className="divide-y divide-white/10">
                      {hitAdmin.entries.map((e) => (
                        <div key={e.id} className="p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-extrabold text-white truncate">{e.title || 'Música'}</div>
                              <div className="text-xs text-gray-400 truncate">{e.profile_email || e.profile_id || 'Sem perfil'}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                                String(e.status || 'pending') === 'approved' ? 'bg-green-500/15 text-green-300 border-green-400/30' :
                                String(e.status || 'pending') === 'rejected' ? 'bg-red-500/15 text-red-300 border-red-400/30' :
                                'bg-black/20 text-gray-300 border-white/10'
                              }`}>
                                {String(e.status || 'pending') === 'approved' ? 'Aprovado' : String(e.status || 'pending') === 'rejected' ? 'Reprovado' : 'Pendente'}
                              </div>
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                                  e.paid ? 'bg-green-500/15 text-green-300 border-green-400/30' : 'bg-black/20 text-gray-300 border-white/10 hover:border-white/20'
                                }`}
                                onClick={() => setHitEntryPaid(e.id, !e.paid)}
                              >
                                {e.paid ? 'Pago' : 'Não pago'}
                              </button>
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                                  String(e.status || 'pending') === 'approved' ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-black/20 text-gray-300 border-white/10 hover:border-white/20'
                                }`}
                                onClick={() => setHitEntryStatus(e.id, 'approved')}
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                                  String(e.status || 'pending') === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-400/30' : 'bg-black/20 text-gray-300 border-white/10 hover:border-white/20'
                                }`}
                                onClick={() => setHitEntryStatus(e.id, 'rejected')}
                              >
                                Reprovar
                              </button>
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                                  hitAdmin?.winner_entry_id === e.id ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-black/20 text-gray-300 border-white/10 hover:border-white/20'
                                }`}
                                onClick={() => setHitWinner(e.id)}
                              >
                                {hitAdmin?.winner_entry_id === e.id ? 'Vencedor' : 'Definir vencedor'}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-beatwap-gold hover:underline truncate"
                            >
                              {e.url}
                            </a>
                            <div className="text-[10px] text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Shield size={20} className="text-beatwap-gold" />
              Gerenciar Permissões
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">

              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-beatwap-gold outline-none"
                />
              </div>
              <div className="w-full md:w-72">
                <select
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  onChange={(e) => setSelectedUserId(e.target.value || null)}
                >
                  <option value="">Selecionar usuário ({roleLabel(activeTab)})</option>
                  {artists
                    .filter(a => a.cargo === activeTab)
                    .sort((a,b) => (a.nome || a.nome_completo_razao_social || '').localeCompare(b.nome || b.nome_completo_razao_social || ''))
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.nome || a.nome_completo_razao_social || a.email || `#${a.id}`}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
              {roleTabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab 
                      ? 'bg-beatwap-gold text-black shadow-[0_0_0_1px_rgba(245,197,66,0.35)]' 
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{roleLabel(tab)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    activeTab === tab ? 'bg-black/10 border-black/20' : 'bg-black/20 border-white/10'
                  }`}>
                    {roleCount(tab)}
                  </span>
                </button>
              ))}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Clique em cada função para alternar. “Pode ver” libera o acesso ao menu/módulo; “Bloqueado” esconde e restringe.
            </div>

            {loadingArtists ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : !selectedUserId ? (
              <div className="text-center py-8 text-gray-500">Selecione um usuário para editar as permissões.</div>
            ) : filteredArtists.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum usuário encontrado nesta categoria.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredArtists.map(artist => (
                  <div key={artist.id} className="rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all overflow-hidden">
                    <div className="p-4 md:p-5">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-3 flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                            {artist.avatar_url ? (
                              <img src={artist.avatar_url} alt={artist.nome || artist.nome_completo_razao_social} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-beatwap-gold to-yellow-600 flex items-center justify-center text-black font-bold">
                                {(artist.nome || artist.nome_completo_razao_social || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="font-extrabold text-white truncate">
                                {artist.nome || artist.nome_completo_razao_social || 'Sem Nome'}
                              </div>
                              {artist?.access_control?.verified && (
                                <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-beatwap-gold/20 border border-beatwap-gold/30 text-beatwap-gold font-bold">
                                  Verificado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{artist.email}</div>
                            <div className="text-xs text-beatwap-gold mt-1 font-bold">{artist.cargo}</div>
                          </div>
                        </div>

                        <div className="lg:col-span-6 space-y-3">
                          {artist.cargo === 'Produtor' ? (
                            <>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Administração</div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'admin_artists', label: 'Artistas' },
                                    { key: 'admin_composers', label: 'Compositores' },
                                    { key: 'admin_sellers', label: 'Vendedores' },
                                    { key: 'admin_musics', label: 'Músicas' },
                                    { key: 'admin_compositions', label: 'Composições' },
                                    { key: 'admin_sponsors', label: 'Patrocinadores' },
                                    { key: 'admin_settings', label: 'Sistema' },
                                    { key: 'admin_finance', label: 'Financeiro' },
                                  ].map((perm) => (
                                    <PermissionPill
                                      key={perm.key}
                                      enabled={getPermState(artist, perm.key).enabled}
                                      locked={getPermState(artist, perm.key).locked}
                                      label={perm.label}
                                      onClick={() => {
                                        const s = getPermState(artist, perm.key);
                                        if (s.locked) return;
                                        handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key]);
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Geral</div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'marketing', label: 'Marketing' },
                                    { key: 'chat', label: 'Chat' },
                                  ].map((perm) => (
                                    <PermissionPill
                                      key={perm.key}
                                      enabled={getPermState(artist, perm.key).enabled}
                                      locked={getPermState(artist, perm.key).locked}
                                      label={perm.label}
                                      onClick={() => {
                                        const s = getPermState(artist, perm.key);
                                        if (s.locked) return;
                                        handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key]);
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : artist.cargo === 'Vendedor' ? (
                            <>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Vendas</div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'seller_artists', label: 'Artistas' },
                                    { key: 'seller_calendar', label: 'Agenda' },
                                    { key: 'seller_leads', label: 'Oportunidades' },
                                    { key: 'seller_finance', label: 'Comissões' },
                                    { key: 'seller_proposals', label: 'Propostas' },
                                    { key: 'seller_communications', label: 'Comunicação' },
                                  ].map((perm) => (
                                    <PermissionPill
                                      key={perm.key}
                                      enabled={getPermState(artist, perm.key).enabled}
                                      locked={getPermState(artist, perm.key).locked}
                                      label={perm.label}
                                      onClick={() => {
                                        const s = getPermState(artist, perm.key);
                                        if (s.locked) return;
                                        handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key]);
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Geral</div>
                                <div className="flex flex-wrap gap-2">
                                  <PermissionPill
                                    enabled={getPermState(artist, 'chat').enabled}
                                    locked={getPermState(artist, 'chat').locked}
                                    label="Chat"
                                    onClick={() => {
                                      const s = getPermState(artist, 'chat');
                                      if (s.locked) return;
                                      handlePermissionChange(artist.id, 'chat', !artist.access_control.chat);
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          ) : activeTab === 'Compositor' ? (
                            <>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Painel</div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'compositions', label: 'Composições' },
                                    { key: 'marketing', label: 'Marketing' },
                                    { key: 'finance', label: 'Financeiro' },
                                  ].map((perm) => (
                                    <PermissionPill
                                      key={perm.key}
                                      enabled={getPermState(artist, perm.key).enabled}
                                      locked={getPermState(artist, perm.key).locked}
                                      label={perm.label}
                                      onClick={() => {
                                        const s = getPermState(artist, perm.key);
                                        if (s.locked) return;
                                        handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key]);
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Geral</div>
                                <div className="flex flex-wrap gap-2">
                                  <PermissionPill
                                    enabled={getPermState(artist, 'chat').enabled}
                                    locked={getPermState(artist, 'chat').locked}
                                    label="Chat"
                                    onClick={() => {
                                      const s = getPermState(artist, 'chat');
                                      if (s.locked) return;
                                      handlePermissionChange(artist.id, 'chat', !artist.access_control.chat);
                                    }}
                                  />
                                  <PermissionPill
                                    enabled={getPermState(artist, 'public_profile').enabled}
                                    locked={getPermState(artist, 'public_profile').locked}
                                    label="Perfil Público"
                                    onClick={() => {
                                      const s = getPermState(artist, 'public_profile');
                                      if (s.locked) return;
                                      handlePermissionChange(artist.id, 'public_profile', !artist.access_control.public_profile);
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Painel</div>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'musics', label: 'Músicas' },
                                { key: 'compositions', label: 'Composições' },
                                    { key: 'work', label: 'Agenda / Afazeres' },
                                    { key: 'marketing', label: 'Marketing' },
                                    { key: 'finance', label: 'Financeiro' },
                                  ].map((perm) => (
                                    <PermissionPill
                                      key={perm.key}
                                      enabled={getPermState(artist, perm.key).enabled}
                                      locked={getPermState(artist, perm.key).locked}
                                      label={perm.label}
                                      onClick={() => {
                                        const s = getPermState(artist, perm.key);
                                        if (s.locked) return;
                                        handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key]);
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Geral</div>
                                <div className="flex flex-wrap gap-2">
                                  <PermissionPill
                                    enabled={getPermState(artist, 'chat').enabled}
                                    locked={getPermState(artist, 'chat').locked}
                                    label="Chat"
                                    onClick={() => {
                                      const s = getPermState(artist, 'chat');
                                      if (s.locked) return;
                                      handlePermissionChange(artist.id, 'chat', !artist.access_control.chat);
                                    }}
                                  />
                                  <PermissionPill
                                    enabled={getPermState(artist, 'public_profile').enabled}
                                    locked={getPermState(artist, 'public_profile').locked}
                                    label="Perfil Público"
                                    onClick={() => {
                                      const s = getPermState(artist, 'public_profile');
                                      if (s.locked) return;
                                      handlePermissionChange(artist.id, 'public_profile', !artist.access_control.public_profile);
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="lg:col-span-3 space-y-2">
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
                              const updated = {
                                ...artist,
                                access_control: {
                                  ...(artist.access_control || {}),
                                  plan_override: next,
                                },
                              };
                              setArtists((prev) => prev.map((a) => (a.id === artist.id ? updated : a)));
                            }}
                            disabled={savingId === artist.id}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                              artist?.access_control?.plan_override
                                ? 'bg-blue-500/10 border-blue-400/30 hover:bg-blue-500/15'
                                : 'bg-black/20 border-white/10 hover:border-white/20'
                            } ${savingId === artist.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                artist?.access_control?.plan_override ? 'border-blue-400/30 bg-blue-500/10' : 'border-white/10 bg-white/5'
                              }`}>
                                <Lock size={16} className={artist?.access_control?.plan_override ? 'text-blue-400' : 'text-gray-400'} />
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-extrabold text-white leading-tight">Override bloqueios do plano</div>
                                <div className="text-xs text-gray-400">{artist?.access_control?.plan_override ? 'Ativo' : 'Inativo'}</div>
                              </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full p-1 transition-colors ${
                              artist?.access_control?.plan_override ? 'bg-blue-500' : 'bg-white/10'
                            }`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                artist?.access_control?.plan_override ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleVerified(artist)}
                            disabled={savingId === artist.id}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                              artist?.access_control?.verified
                                ? 'bg-beatwap-gold/10 border-beatwap-gold/30 hover:bg-beatwap-gold/15'
                                : 'bg-black/20 border-white/10 hover:border-white/20'
                            } ${savingId === artist.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                artist?.access_control?.verified ? 'border-beatwap-gold/30 bg-beatwap-gold/10' : 'border-white/10 bg-white/5'
                              }`}>
                                <Check size={16} className={artist?.access_control?.verified ? 'text-beatwap-gold' : 'text-gray-400'} />
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-extrabold text-white leading-tight">Perfil verificado</div>
                                <div className="text-xs text-gray-400">{artist?.access_control?.verified ? 'Ativo' : 'Inativo'}</div>
                              </div>
                            </div>
                            <div className={`w-11 h-6 rounded-full p-1 transition-colors ${
                              artist?.access_control?.verified ? 'bg-beatwap-gold' : 'bg-white/10'
                            }`}>
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                artist?.access_control?.verified ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </button>

                          {(() => {
                            const f = artist?.access_control?.featured && typeof artist.access_control.featured === 'object' ? artist.access_control.featured : null;
                            const enabled = !!(f && f.enabled !== false);
                            const level = String(f?.level || '').toLowerCase();
                            const endsAt = f?.ends_at || f?.until || null;
                            const endsText = endsAt ? (() => {
                              const t = new Date(endsAt);
                              const ms = t.getTime();
                              if (!Number.isFinite(ms)) return null;
                              return t.toLocaleString();
                            })() : null;
                            const label = level === 'top' ? 'Destaque Top' : level === 'pro' ? 'Destaque Pro' : level === 'basic' ? 'Destaque Básico' : 'Destaque';

                            return (
                              <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-left">
                                    <div className="text-sm font-extrabold text-white leading-tight">Impulsionar na Home</div>
                                    <div className="text-xs text-gray-400">
                                      {enabled ? `${label}${endsText ? ` • até ${endsText}` : ''}` : 'Sem destaque'}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    disabled={savingId === artist.id}
                                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-extrabold text-white hover:border-beatwap-gold transition-colors disabled:opacity-60"
                                    onClick={() => applyFeaturedToUser(artist.id, 'basic')}
                                  >
                                    Destaque Básico
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingId === artist.id}
                                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-extrabold text-white hover:border-purple-400 transition-colors disabled:opacity-60"
                                    onClick={() => applyFeaturedToUser(artist.id, 'pro')}
                                  >
                                    Destaque Pro
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingId === artist.id}
                                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-extrabold text-white hover:border-beatwap-gold transition-colors disabled:opacity-60"
                                    onClick={() => applyFeaturedToUser(artist.id, 'top')}
                                  >
                                    Destaque Top
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingId === artist.id}
                                    className="px-3 py-2 rounded-xl border border-white/10 bg-black/30 text-xs font-extrabold text-gray-300 hover:border-white/20 transition-colors disabled:opacity-60"
                                    onClick={() => applyFeaturedToUser(artist.id, 'off')}
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          <AnimatedButton
                            onClick={() => savePermissions(artist)}
                            disabled={savingId === artist.id}
                            className="w-full justify-center"
                          >
                            {savingId === artist.id ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                            <span className="ml-2">Salvar alterações</span>
                          </AnimatedButton>

                          <AnimatedButton
                            onClick={() => openPurgeModal(artist)}
                            variant="danger"
                            className="w-full justify-center"
                          >
                            <Trash2 size={16} />
                            <span className="ml-2">Apagar conta</span>
                          </AnimatedButton>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
      {purgeTarget && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <Card className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Trash2 size={18} className="text-red-400" />
                  Apagar conta
                </div>
                <button
                  type="button"
                  onClick={closePurgeModal}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <X size={16} className="text-gray-300" />
                </button>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <div className="text-sm text-gray-200">
                  Você está prestes a apagar permanentemente a conta de <span className="text-white font-extrabold">{purgeTarget.nome || purgeTarget.nome_completo_razao_social || 'Sem Nome'}</span>.
                </div>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Remove o acesso de login (email) e dados vinculados no sistema.</li>
                  <li>Essa ação é irreversível.</li>
                </ul>
                <div className="text-sm text-gray-300">
                  Para confirmar, digite: <span className="text-white font-extrabold">APAGAR {purgeTarget.email}</span>
                </div>
              </div>

              <input
                type="text"
                value={purgeConfirm}
                onChange={(e) => setPurgeConfirm(e.target.value)}
                placeholder={`APAGAR ${purgeTarget.email}`}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-beatwap-gold outline-none"
              />

              <input
                type="password"
                value={purgePin}
                onChange={(e) => setPurgePin(e.target.value)}
                placeholder="PIN (PIM)"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-beatwap-gold outline-none"
              />

              <label className="flex items-start gap-3 p-3 rounded-2xl bg-black/20 border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={purgeAcknowledge}
                  onChange={(e) => setPurgeAcknowledge(e.target.checked)}
                  className="mt-0.5 rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">Entendo que essa ação é permanente</div>
                  <div className="text-xs text-gray-400">Use essa opção apenas quando realmente precisar excluir a conta.</div>
                </div>
              </label>

              <div className="flex gap-2 justify-end">
                <AnimatedButton onClick={closePurgeModal} variant="secondary" className="px-4">
                  Cancelar
                </AnimatedButton>
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
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
