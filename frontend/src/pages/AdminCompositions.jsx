import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { AdminLayout } from '../components/AdminLayout';
import { Play, Pause, Check, X, Music, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AdminCompositions = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [audio, setAudio] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [adminView, setAdminView] = useState('compositions');
  
  // Filters state
  const [activeTab, setActiveTab] = useState('pending');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterArtist, setFilterArtist] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [composers, setComposers] = useState([]);

  const [hitAdmin, setHitAdmin] = useState(null);
  const [hitDraft, setHitDraft] = useState(null);
  const [hitSaving, setHitSaving] = useState(false);
  const [hitClearLoading, setHitClearLoading] = useState(false);

  // Fetch composers for dropdown
  useEffect(() => {
    const fetchComposers = async () => {
      try {
        const data = await apiClient.get('/composers');
        if (data) setComposers(data);
      } catch (error) {
        console.error("Erro ao buscar compositores:", error);
        addToast("Não foi possível carregar os compositores.", "error");
      }
    };
    fetchComposers();
  }, []);

  const fetchCompositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/admin/compositions');
      setCompositions(data || []);
    } catch (error) {
      console.error("Erro ao buscar composições:", error);
      addToast("Não foi possível carregar as composições.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompositions();
    return () => {
        if (audio) {
            audio.pause();
        }
    }
  }, [fetchCompositions]);

  useEffect(() => {
    fetchHitAdmin();
  }, []);

  const sanitizeUrl = (u) => {
    const s = String(u || '').trim().replace(/^[`'"]+|[`'"]+$/g, '');
    return s;
  };
  const sanitizeHref = (u) => {
    const s = String(u || '').trim().replace(/^[`'"\s]+|[`'"\s]+$/g, '');
    const cut = s.split(/[\s<]+/)[0];
    return cut;
  };
  const canPlay = (u) => {
    try {
      const ext = (u.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
      const audio = document.createElement('audio');
      if (ext === 'mp3') return !!audio.canPlayType('audio/mpeg');
      if (ext === 'm4a' || ext === 'aac') return !!audio.canPlayType('audio/mp4');
      if (ext === 'ogg' || ext === 'oga') return !!audio.canPlayType('audio/ogg');
      if (u.startsWith('data:audio/')) return true;
      return true;
    } catch { return true; }
  };
  const togglePlay = (url, id) => {
    const u = sanitizeUrl(url);
    if (!u) return;
    if (playingId === id && audio) {
      audio.pause();
      setPlayingId(null);
      setAudio(null);
    } else {
      if (audio) audio.pause();
      if (!canPlay(u)) {
        addToast('Fonte de áudio não suportada', 'error');
        return;
      }
      const newAudio = new Audio(u);
      newAudio.play().catch(() => {
        addToast('Não foi possível reproduzir o áudio', 'error');
      });
      newAudio.onended = () => {
        setPlayingId(null);
        setAudio(null);
      };
      setAudio(newAudio);
      setPlayingId(id);
    }
  };

  const handleStatusChange = async (id, status, feedback = null) => {
    try {
        await apiClient.put(`/admin/compositions/${id}/status`, { status, feedback });
        addToast(`Composição ${status === 'approved' ? 'aprovada' : 'recusada'}!`, 'success');
        fetchCompositions();
        setRejectingId(null);
        setRejectReason('');
    } catch (error) {
        console.error(error);
        addToast('Erro ao atualizar status', 'error');
    }
  };

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
      setHitDraft(data ? {
        ...data,
        theme_ideas: Array.isArray(data?.theme_ideas) ? data.theme_ideas : ['Sofrência que dói', 'Música de bar', 'Pisadinha apaixonada', 'Refrão chiclete', 'História de traição']
      } : null);
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
        theme_ideas: Array.isArray(hitDraft.theme_ideas) ? hitDraft.theme_ideas : [],
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

  const clearHitHistory = async () => {
    const ok = window.confirm('Apagar todo o histórico de inscrições do Hit da Semana? Essa ação não pode ser desfeita.');
    if (!ok) return;
    setHitClearLoading(true);
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
        () => apiClient.post('/admin/hit-of-week/entries/clear'),
        () => apiClient.post('/admin/hit_of_week/entries/clear'),
        () => apiClient.post('/hit-of-week/entries/clear'),
        () => apiClient.post('/hit_of_week/entries/clear'),
      ]);
      const next = res?.hit || null;
      if (next) {
        setHitAdmin(next);
        setHitDraft({ ...next });
      }
      addToast('Histórico apagado.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao apagar histórico', 'error');
    } finally {
      setHitClearLoading(false);
    }
  };

  const filteredCompositions = compositions.filter(comp => {
    if (activeTab === 'approved' && comp.status !== 'approved') return false;
    if (activeTab === 'pending' && comp.status !== 'pending') return false;
    if (filterStatus !== 'todos' && comp.status !== filterStatus) return false;
    if (filterArtist && comp.composer_id !== filterArtist) return false;
    if (startDate && new Date(comp.created_at) < new Date(startDate)) return false;
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(comp.created_at) > end) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-beatwap-graphite rounded-2xl border border-white/5 shadow-xl space-y-4 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="font-bold text-white text-xl">Painel do Produtor</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdminView('compositions')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  adminView === 'compositions'
                    ? 'bg-beatwap-gold text-beatwap-black border-beatwap-gold'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Aceitar composições
              </button>
              <button
                type="button"
                onClick={() => setAdminView('hit')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  adminView === 'hit'
                    ? 'bg-beatwap-gold text-beatwap-black border-beatwap-gold'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Hit da Semana
              </button>
            </div>
          </div>
          
          {adminView === 'compositions' ? (
            <>
              <div className="flex flex-wrap gap-2 pb-2">
                <button 
                    onClick={() => setActiveTab('approved')}
                    className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${activeTab === 'approved' ? 'bg-beatwap-gold text-beatwap-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                    Músicas Aprovadas
                </button>
                <button 
                    onClick={() => setActiveTab('pending')}
                    className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${activeTab === 'pending' ? 'bg-beatwap-gold text-beatwap-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                    Pendentes
                </button>
                <button 
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${activeTab === 'all' ? 'bg-beatwap-gold text-beatwap-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                >
                    Todas
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full sm:col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
                >
                    <option value="todos" className="bg-beatwap-graphite">Status: Todos</option>
                    <option value="pending" className="bg-beatwap-graphite">Pendente</option>
                    <option value="approved" className="bg-beatwap-graphite">Aprovado</option>
                    <option value="rejected" className="bg-beatwap-graphite">Recusado</option>
                </select>
                <select 
                    value={filterArtist}
                    onChange={(e) => setFilterArtist(e.target.value)}
                    className="w-full sm:col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
                >
                    <option value="" className="bg-beatwap-graphite">Artista: Todos</option>
                    {composers.map(c => (
                        <option key={c.id} value={c.id} className="bg-beatwap-graphite">{c.nome || c.nome_completo_razao_social || 'Sem nome'}</option>
                    ))}
                </select>
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
                />
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
                />
                <div className="w-full sm:col-span-2 md:col-span-1">
                    <button 
                        type="button" 
                        onClick={fetchCompositions}
                        className="relative px-6 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 overflow-hidden bg-beatwap-gold text-beatwap-black hover:shadow-[0_0_20px_rgba(245,197,66,0.4)] w-full justify-center py-3 md:py-2"
                    >
                        Filtrar
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%]"></div>
                    </button>
                </div>
              </div>
            </>
          ) : (
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
                <div className="space-y-1 sm:col-span-2">
                  <div className="text-xs text-gray-400">Ideias de tema (1 por linha)</div>
                  <textarea
                    value={Array.isArray(hitDraft?.theme_ideas) ? hitDraft.theme_ideas.join('\n') : ''}
                    onChange={(e) => {
                      const rows = String(e.target.value || '').split(/\r?\n/);
                      const cleaned = [];
                      const seen = new Set();
                      for (const r of rows) {
                        const s = String(r || '').trim();
                        if (!s) continue;
                        const key = s.toLowerCase();
                        if (seen.has(key)) continue;
                        seen.add(key);
                        cleaned.push(s);
                        if (cleaned.length >= 30) break;
                      }
                      setHitDraft((prev) => (prev ? { ...prev, theme_ideas: cleaned } : prev));
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none min-h-[80px]"
                    rows={4}
                    placeholder={'Sofrência que dói\nMúsica de bar\nPisadinha apaixonada'}
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
                <AnimatedButton onClick={fetchHitAdmin} variant="secondary">
                  Recarregar
                </AnimatedButton>
                <AnimatedButton onClick={saveHitAdmin} isLoading={hitSaving}>
                  Salvar Desafio
                </AnimatedButton>
              </div>

              {Array.isArray(hitAdmin?.entries) && hitAdmin.entries.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="p-3 border-b border-white/10 flex items-center justify-end">
                    <AnimatedButton variant="danger" onClick={clearHitHistory} isLoading={hitClearLoading} className="px-4 py-2 text-xs">
                      <Trash2 size={14} />
                      Apagar histórico
                    </AnimatedButton>
                  </div>
                  <div className="max-h-[320px] overflow-auto">
                    <div className="divide-y divide-white/10">
                      {hitAdmin.entries.map((e) => {
                        const href = sanitizeHref(e.url);
                        return (
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
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-beatwap-gold hover:underline truncate"
                              >
                                {href}
                              </a>
                              <div className="text-[10px] text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {adminView === 'compositions' && (
          <div className="grid grid-cols-1 gap-4">
            {loading && <div className="text-gray-400">Carregando...</div>}
            {!loading && filteredCompositions.length === 0 && (
              <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
                <p>Nenhuma composição encontrada.</p>
              </div>
            )}
            {!loading && filteredCompositions.map((comp) => (
              <div key={comp.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div 
                      className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden shrink-0 relative cursor-pointer group"
                      onClick={() => togglePlay(comp.audio_url, comp.id)}
                  >
                      {comp.cover_url ? (
                      <img src={sanitizeUrl(comp.cover_url)} alt={comp.title} className="w-full h-full object-cover" />
                      ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Music size={24} />
                      </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {playingId === comp.id ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white" />}
                      </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-lg truncate">{comp.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          comp.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          comp.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                      }`}>
                          {comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">
                      Por: <span className="text-white">{comp.profiles?.nome || comp.profiles?.nome_completo_razao_social || 'Desconhecido'}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {comp.genre} • {new Date(comp.created_at).toLocaleDateString()} • {comp.price ? `R$ ${comp.price}` : 'Sem preço'}
                    </div>
                    {comp.description && (
                        <div className="text-sm text-gray-400 mt-2 bg-black/20 p-2 rounded-lg">
                            {comp.description}
                        </div>
                    )}
                    {comp.admin_feedback && (
                        <div className="text-xs text-red-400 mt-2">
                            Motivo recusa: {comp.admin_feedback}
                        </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    {comp.status === 'pending' && (
                        <>
                            <AnimatedButton 
                                onClick={() => handleStatusChange(comp.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700 border-none text-white w-full justify-center"
                            >
                                <Check size={16} className="mr-2" /> Aprovar
                            </AnimatedButton>
                            
                            {rejectingId === comp.id ? (
                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Motivo da recusa..." 
                                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleStatusChange(comp.id, 'rejected', rejectReason)}
                                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded flex-1"
                                        >
                                            Confirmar
                                        </button>
                                        <button 
                                            onClick={() => setRejectingId(null)}
                                            className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded flex-1"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <AnimatedButton 
                                    onClick={() => { setRejectingId(comp.id); setRejectReason(''); }}
                                    className="bg-red-600/20 hover:bg-red-600/30 border-red-600 text-red-500 w-full justify-center"
                                >
                                    <X size={16} className="mr-2" /> Recusar
                                </AnimatedButton>
                            )}
                        </>
                    )}
                    {comp.status === 'approved' && (
                        <AnimatedButton 
                            onClick={async () => {
                                if (window.confirm(`Tem certeza que deseja apagar a composição "${comp.title}"?`)) {
                                    try {
                                        await apiClient.del(`/admin/compositions/${comp.id}`);
                                        addToast('Composição apagada com sucesso', 'success');
                                        fetchCompositions();
                                    } catch (error) {
                                        addToast('Erro ao apagar composição', 'error');
                                    }
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 border-none text-white w-full justify-center"
                        >
                            <X size={16} className="mr-2" /> Apagar
                        </AnimatedButton>
                    )}
                    <a 
                        href={comp.audio_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-center text-gray-500 hover:text-white transition-colors"
                    >
                        Baixar Áudio
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCompositions;
