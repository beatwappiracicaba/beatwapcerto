import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, FileText, Lock, Save, Download, Moon, Sun, AlertTriangle, Image as ImageIcon, Play, Pause, Check, FolderDown, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import logo from '../assets/images/beatwap-logo.png';
import { ArtistContentManager } from '../components/admin/ArtistContentManager';
import { GalleryManager } from '../components/profile/GalleryManager';
import { ProfileEditModal } from '../components/ui/ProfileEditModal';
import { MusicEditModal } from '../components/admin/MusicEditModal';
import { MarketingManager } from '../components/admin/MarketingManager';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';
import { useData } from '../context/DataContext';
import { buildDistributionContractHTML } from '../utils/contractTemplate';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { encryptData, decryptData, downloadDecryptedFile } from '../utils/security';

export const AdminHome = () => {
  const [counts, setCounts] = useState({ artists: 0, musics: 0, pending: 0 });
  const [myMetrics, setMyMetrics] = useState(null);
  const { user } = useAuth();
  const { addToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    url: '',
    platform: 'YouTube'
  });
  // Upload de capa removido: thumbnail será carregada automaticamente do link (YouTube) ou usa logo
  useEffect(() => {
    const load = async () => {
      const stats = await apiClient.get('/admin/stats');
      setCounts({ artists: stats.artists || 0, musics: stats.musics || 0, pending: stats.pending || 0 });
    };
    load();
  }, []);

  useEffect(() => {
    const fetchMyMetrics = async () => {
      if (!user) return;
      const data = await apiClient.get(`/analytics/artist/${user.id}/summary`);
      setMyMetrics({
        plays: data?.plays || 0,
        time: data?.time || 0,
        profile_views: data?.profile_views || 0,
        social_clicks: data?.social_clicks || 0
      });
    };
    fetchMyMetrics();
  }, [user]);
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await apiClient.get('/producer-projects');
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading producer projects:', error);
      addToast('Falha ao carregar projetos', 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, [addToast]);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  const createProject = async () => {
    const title = projectForm.title.trim();
    const url = projectForm.url.trim();
    const platform = projectForm.platform.trim();
    if (!title || !url || !platform) { addToast('Informe título, link e plataforma', 'error'); return; }
    try {
      if (!user?.id) { addToast('Usuário inválido', 'error'); return; }
      const payload = { producer_id: user.id, title, url, platform, published: true };
      await apiClient.post('/producer-projects', payload);
      addToast('Projeto adicionado', 'success');
      setProjectForm({ title: '', url: '', platform: 'YouTube' });
      loadProjects();
    } catch (error) {
      console.error('Error creating producer project:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint);
      addToast('Falha ao adicionar projeto', 'error');
    }
  };
  const deleteProject = async (id) => {
    try {
      await apiClient.del(`/producer-projects/${id}`);
      addToast('Projeto removido', 'success');
      loadProjects();
    } catch (error) {
      console.error('Error deleting producer project:', error);
      addToast('Falha ao remover projeto', 'error');
    }
  };
  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Meu Perfil</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="text-sm text-gray-400">Visitas no Perfil</div>
              <div className="text-3xl font-bold">{myMetrics?.profile_views ?? 0}</div>
            </Card>
            <Card>
              <div className="text-sm text-gray-400">Cliques Sociais</div>
              <div className="text-3xl font-bold">{myMetrics?.social_clicks ?? 0}</div>
            </Card>
             <Card>
              <div className="text-sm text-gray-400">Total Plays</div>
              <div className="text-3xl font-bold">{myMetrics?.plays ?? 0}</div>
            </Card>
            <Card>
              <div className="text-sm text-gray-400">Tempo Ouvido</div>
              <div className="text-3xl font-bold">
                {(() => {
                   const s = myMetrics?.time || 0;
                   const h = Math.floor(s / 3600);
                   const m = Math.floor((s % 3600) / 60);
                   return `${h}h ${m}m`;
                })()}
              </div>
            </Card>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Plataforma</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card><div className="text-sm text-gray-400">Artistas</div><div className="text-3xl font-bold">{counts.artists}</div></Card>
        <Card><div className="text-sm text-gray-400">Músicas</div><div className="text-3xl font-bold">{counts.musics}</div></Card>
        <Card><div className="text-sm text-gray-400">Pendentes</div><div className="text-3xl font-bold">{counts.pending}</div></Card>
      </div>
      <Card className="space-y-4">
        <div className="font-bold">Projetos da Produtora</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AnimatedInput placeholder="Título" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
          <AnimatedInput placeholder="Link do Projeto (YouTube/Spotify)" value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} />
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={projectForm.platform} onChange={(e) => setProjectForm({ ...projectForm, platform: e.target.value })}>
            <option value="YouTube">YouTube</option>
            <option value="Spotify">Spotify</option>
            <option value="Outro">Outro</option>
          </select>
          <div className="text-xs text-gray-400 flex items-center">A capa será carregada do link (YouTube). Sem thumbnail válida, usamos a logo da BeatWap.</div>
        </div>
        <AnimatedButton onClick={createProject}>Adicionar Projeto</AnimatedButton>
        <div className="pt-4">
          <div className="text-sm text-gray-400 mb-2">Últimos projetos adicionados</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(loadingProjects ? [] : projects).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                  {p.cover_url ? (
                    <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (() => {
                      const isYT = (p.platform || '').toLowerCase() === 'youtube';
                      const m = (p.url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
                      const vid = m ? m[1] : null;
                      return (isYT && vid)
                        ? <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt={p.title} className="w-full h-full object-cover" />
                        : <img src={logo} alt="BeatWap" className="w-full h-full object-cover p-2" />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm truncate">{p.title}</div>
                  <div className="text-xs text-gray-400">{p.platform}</div>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatedButton onClick={() => window.open(p.url, '_blank')}>Abrir</AnimatedButton>
                  <AnimatedButton onClick={() => deleteProject(p.id)}>Excluir</AnimatedButton>
                </div>
              </div>
            ))}
            {(!loadingProjects && projects.length === 0) && (
              <div className="text-sm text-gray-400">Nenhum projeto ainda.</div>
            )}
          </div>
        </div>
      </Card>
      
    </AdminLayout>
  );
};

export const AdminArtists = () => {
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isMarketingOpen, setIsMarketingOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ plays: '', listeners: '', revenue: '', growth: '' });
  const [planForm, setPlanForm] = useState({ plano: 'Avulso', bonus_quota: 0, plan_started_at: '' });
  const [searchName, setSearchName] = useState('');
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  const { getArtistById, updateArtistMetrics } = useData();
  const [workEventForm, setWorkEventForm] = useState({ title: '', date: '', type: 'lançamento' });
  const [todoForm, setTodoForm] = useState({ title: '', due_date: '' });
  const [workEvents, setWorkEvents] = useState([]);
  const [workTodos, setWorkTodos] = useState([]);
  const [approvedMusics, setApprovedMusics] = useState([]);
  const [musicMetrics, setMusicMetrics] = useState({});
  const [selectedMusicId, setSelectedMusicId] = useState('');
  const [manualMusicMetrics, setManualMusicMetrics] = useState({ plays: '', listeners: '', revenue: '' });

  const load = useCallback(async () => {
    const data = await apiClient.get('/profiles');
    const decryptedArtists = (data || [])
      .filter(a => a.cargo === 'Artista')
      .map(artist => ({
        ...artist,
        nome_completo_razao_social: decryptData(artist.nome_completo_razao_social),
        nome: decryptData(artist.nome)
      }));
    
    setArtists(decryptedArtists);
  }, []);

  const loadMusicExternalMetrics = async (musicId) => {
    if (!musicId) {
      setManualMusicMetrics({ plays: '', listeners: '', revenue: '' });
      return;
    }
    const data = await apiClient.get(`/musics/${musicId}/external-metrics?source=manual`);
      
    if (data) {
      setManualMusicMetrics({
        plays: String(data.plays || ''),
        listeners: String(data.listeners || ''),
        revenue: String(data.revenue || '')
      });
    } else {
      setManualMusicMetrics({ plays: '', listeners: '', revenue: '' });
    }
  };

  useEffect(() => {
    if (selectedMusicId) {
      loadMusicExternalMetrics(selectedMusicId);
    }
  }, [selectedMusicId]);

  const handleSaveMusicMetrics = async () => {
    if (!selectedMusicId) { addToast('Selecione uma música', 'error'); return; }
    try {
      const payload = {
        music_id: selectedMusicId,
        source: 'manual',
        plays: parseInt(manualMusicMetrics.plays) || 0,
        listeners: parseInt(manualMusicMetrics.listeners) || 0,
        revenue: parseFloat(manualMusicMetrics.revenue) || 0,
        updated_at: new Date()
      };

      await apiClient.post(`/musics/${selectedMusicId}/external-metrics`, payload);
      addToast('Métricas da música atualizadas', 'success');
      loadArtistMusics(); // Refresh list to show updated values if needed
    } catch (err) {
      console.error(err);
      addToast('Falha ao salvar métricas da música', 'error');
    }
  };

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (selectedArtist) {
      const a = getArtistById(selectedArtist);
      const m = a?.metrics || { plays: '', listeners: '', revenue: '', growth: '' };
      setMetricsForm({
        plays: String(m.plays || ''),
        listeners: String(m.listeners || ''),
        revenue: String(m.revenue || ''),
        growth: String(m.growth || '')
      });
      // Decrypt sensitive data if present in profile (though AdminArtists usually lists public profiles, 
      // if we have sensitive columns here we should decrypt them)
    } else {
      setMetricsForm({ plays: '', listeners: '', revenue: '', growth: '' });
    }
  }, [selectedArtist, getArtistById]);
  const loadWork = useCallback(async () => {
    if (!selectedArtist) { setWorkEvents([]); setWorkTodos([]); return; }
    const ev = await apiClient.get(`/seller/artist-events?artist_id=${selectedArtist}`);
    setWorkEvents(ev || []);
    const td = await apiClient.get(`/admin/artist/${selectedArtist}/todos`);
    setWorkTodos(td || []);
  }, [selectedArtist]);
  useEffect(() => { loadWork(); }, [loadWork]);
  useEffect(() => {
    loadArtistMusics();
  }, [selectedArtist]);

  const loadArtistMusics = async () => {
    if (!selectedArtist) { setApprovedMusics([]); setMusicMetrics({}); return; }
    const mus = await apiClient.get(`/admin/musics?artist_id=${selectedArtist}&status=aprovado`);
    setApprovedMusics(mus || []);

    // Load metrics for all musics (internal + external)
    const musicIds = (mus || []).map(m => m.id);
    const metricsMap = {};

    // 1. Internal Analytics
    if (musicIds.length > 0) {
      const extMetrics = await Promise.all(
        musicIds.map(id => apiClient.get(`/musics/${id}/external-metrics?source=manual`))
      );
        
      (extMetrics || []).filter(Boolean).forEach(em => {
        const mid = em.music_id;
        if (!metricsMap[mid]) metricsMap[mid] = { plays: 0, totalSeconds: 0, presaves: 0, revenue: 0, listeners: 0 };
        metricsMap[mid].externalPlays = em.plays || 0;
        metricsMap[mid].externalListeners = em.listeners || 0;
        metricsMap[mid].externalRevenue = em.revenue || 0;
      });
    }
    setMusicMetrics(metricsMap);
  };

  useEffect(() => {
    const loadPlan = async () => {
      if (!selectedArtist) { setPlanForm({ plano: 'Gratuito', bonus_quota: 0, plan_started_at: '' }); return; }
      const data = await apiClient.get(`/profiles/${selectedArtist}`);
      setPlanForm({
        plano: data?.plano || 'Avulso',
        bonus_quota: Number(data?.bonus_quota || 0),
        plan_started_at: data?.plan_started_at ? String(data.plan_started_at).slice(0, 10) : ''
      });
    };
    loadPlan();
  }, [selectedArtist]);
  const handleSaveProfile = async ({ name, bio, blob }) => {
    try {
      if (!selectedArtist) return;
      let avatar_url = null;
      if (blob) {
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const resp = await apiClient.post('/profile/avatar', { dataUrl });
        avatar_url = resp?.avatar_url || null;
      }
      const updateData = {};
      if (name) updateData.nome = name;
      if (bio) updateData.bio = bio;
      if (avatar_url) updateData.avatar_url = avatar_url;
      if (Object.keys(updateData).length) {
        await apiClient.put('/profile', updateData);
        addToast('Perfil do artista atualizado', 'success');
      } else {
        addToast('Nada para atualizar no perfil.', 'warning');
      }
      setIsProfileOpen(false);
      load();
    } catch (err) {
      console.error('Erro ao atualizar perfil do artista:', err);
      addToast('Falha ao atualizar perfil do artista', 'error');
    }
  };
  const handleUpdateMetrics = async () => {
    if (!selectedArtist) { addToast('Selecione o artista', 'error'); return; }
    try {
      await updateArtistMetrics(selectedArtist, {
        plays: metricsForm.plays,
        listeners: metricsForm.listeners,
        revenue: metricsForm.revenue,
        growth: metricsForm.growth
      });
      addToast('Métricas atualizadas', 'success');
    } catch {
      addToast('Falha ao atualizar métricas', 'error');
    }
  };
  const handleSavePlan = async () => {
    if (!selectedArtist) { addToast('Selecione o artista', 'error'); return; }
    try {
      const update = {
        plano: planForm.plano,
        bonus_quota: Number(planForm.bonus_quota || 0),
      };
      if (planForm.plan_started_at) {
        update.plan_started_at = new Date(planForm.plan_started_at).toISOString();
      }
      await apiClient.put('/profile', update);
      addToast('Plano do artista atualizado', 'success');
    } catch {
      addToast('Falha ao atualizar plano', 'error');
    }
  };
  const createWorkEvent = async () => {
    if (!selectedArtist || !workEventForm.title.trim() || !workEventForm.date) { addToast('Informe artista, título e data', 'error'); return; }
    try {
      await apiClient.post('/seller/artist-events', {
        artista_id: selectedArtist,
        title: workEventForm.title.trim(),
        date: workEventForm.date,
        type: workEventForm.type
      });
    } catch {
      addToast('Falha ao adicionar evento', 'error'); 
      return;
    }
    addToast('Evento adicionado', 'success');
    setWorkEventForm({ title: '', date: '', type: 'lançamento' });
    loadWork();
  };
  const createTodo = async () => {
    if (!selectedArtist || !todoForm.title.trim()) { addToast('Informe artista e tarefa', 'error'); return; }
    try {
      await apiClient.post(`/admin/artist/${selectedArtist}/todos`, {
        title: todoForm.title.trim(),
        due_date: todoForm.due_date || null
      });
    } catch {
      addToast('Falha ao adicionar tarefa', 'error'); 
      return;
    }
    addToast('Tarefa adicionada', 'success');
    setTodoForm({ title: '', due_date: '' });
    loadWork();
  };
  const updateTodoStatus = async (id, status) => {
    try {
      await apiClient.post(`/admin/todos/${id}/status`, { status });
    } catch {
      addToast('Falha ao atualizar tarefa', 'error'); 
      return;
    }
    loadWork();
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="font-bold">Enviar música pelo artista</div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="w-full">
            <AnimatedInput 
              placeholder="Buscar artista pelo nome" 
              value={searchName} 
              onChange={(e) => setSearchName(e.target.value)} 
            />
          </div>
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full md:w-auto flex-1" value={selectedArtist || ''} onChange={(e) => setSelectedArtist(e.target.value)}>
            <option value="">Selecione o usuário</option>
            {(artists || [])
              .filter(a => {
                const term = searchName.toLowerCase();
                const n1 = (a.nome || '').toLowerCase();
                const n2 = (a.nome_completo_razao_social || '').toLowerCase();
                return n1.includes(term) || n2.includes(term);
              })
              .map(a => <option key={a.id} value={a.id}>{a.nome || a.nome_completo_razao_social || 'Sem nome'} ({a.cargo})</option>)}
          </select>
          <AnimatedButton onClick={() => setIsManagerOpen(true)} className="w-full md:w-auto whitespace-nowrap">Enviar Música</AnimatedButton>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="font-bold">Trabalho do artista</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AnimatedInput placeholder="Título do evento" value={workEventForm.title} onChange={(e) => setWorkEventForm({ ...workEventForm, title: e.target.value })} />
          <AnimatedInput type="date" value={workEventForm.date} onChange={(e) => setWorkEventForm({ ...workEventForm, date: e.target.value })} />
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={workEventForm.type} onChange={(e) => setWorkEventForm({ ...workEventForm, type: e.target.value })}>
            <option value="lançamento">Lançamento</option>
            <option value="show">Show</option>
            <option value="ensaio">Ensaio</option>
            <option value="gravação">Gravação</option>
            <option value="outro">Outro</option>
          </select>
          <AnimatedButton onClick={createWorkEvent}>Adicionar Evento</AnimatedButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AnimatedInput placeholder="Nova tarefa" value={todoForm.title} onChange={(e) => setTodoForm({ ...todoForm, title: e.target.value })} />
          <AnimatedInput type="date" value={todoForm.due_date} onChange={(e) => setTodoForm({ ...todoForm, due_date: e.target.value })} />
          <AnimatedButton onClick={createTodo}>Adicionar Tarefa</AnimatedButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="space-y-2">
            <div className="text-sm text-gray-400">Próximos eventos</div>
            <div className="space-y-2">
              {workEvents.map(ev => (
                <div key={ev.id} className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm truncate max-w-[150px]">{ev.type}: {ev.title}</div>
                    <div className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {workEvents.length === 0 && <div className="text-sm text-gray-400">Nenhum evento.</div>}
            </div>
          </Card>
          <Card className="space-y-2">
            <div className="text-sm text-gray-400">Afazeres</div>
            <div className="space-y-2">
              {workTodos.map(td => (
                <div key={td.id} className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm truncate max-w-[150px]">{td.title}</div>
                    <div className="text-xs text-gray-400">{td.due_date ? new Date(td.due_date).toLocaleDateString() : 'Sem prazo'}</div>
                  </div>
                  <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs" value={td.status} onChange={(e) => updateTodoStatus(td.id, e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              ))}
              {workTodos.length === 0 && <div className="text-sm text-gray-400">Nenhum afazer.</div>}
            </div>
          </Card>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="font-bold">Gerenciar perfil e métricas do artista</div>
        {selectedArtist && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-beatwap-gold/10 via-white/5 to-black/40 p-4"
          >
            <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full bg-beatwap-gold/10 blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-beatwap-gold/60 border border-white/10 bg-black/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,197,66,0.25)] flex-shrink-0">
                {(artists.find(a => a.id === selectedArtist)?.avatar_url) ? (
                  <img
                    src={artists.find(a => a.id === selectedArtist)?.avatar_url}
                    alt={artists.find(a => a.id === selectedArtist)?.nome || 'Artista'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-extrabold text-beatwap-gold">
                    {((artists.find(a => a.id === selectedArtist)?.nome || artists.find(a => a.id === selectedArtist)?.nome_completo_razao_social || 'A') || 'A')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 w-full sm:w-auto">
                <div className="text-2xl font-extrabold text-white tracking-wide break-words">
                  {artists.find(a => a.id === selectedArtist)?.nome || artists.find(a => a.id === selectedArtist)?.nome_completo_razao_social || 'Artista'}
                </div>
                <div className="text-xs text-gray-400">Artista selecionado</div>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap w-full sm:w-auto gap-2">
                <AnimatedButton onClick={() => setIsProfileOpen(true)} className="w-full sm:w-auto justify-center">Editar Perfil</AnimatedButton>
                <AnimatedButton onClick={() => setIsMarketingOpen(true)} variant="secondary" className="w-full sm:w-auto justify-center">Marketing</AnimatedButton>
              </div>
            </div>
          </motion.div>
        )}
        {isMarketingOpen && selectedArtist && (
          <MarketingManager
            isOpen={isMarketingOpen}
            onClose={() => setIsMarketingOpen(false)}
            artistId={selectedArtist}
            artistName={artists.find(a => a.id === selectedArtist)?.nome || 'Usuário'}
            artistRole={artists.find(a => a.id === selectedArtist)?.cargo || 'Artista'}
            embedded
          />
        )}
        {!isMarketingOpen && (
        <div className="pt-6">
          <div className="font-bold mb-4">Gerenciar Métricas por Música (SomVibe/Plataformas)</div>
          
          <div className="flex flex-col md:flex-row gap-3 mb-4">
             <select 
               className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white flex-1"
               value={selectedMusicId}
               onChange={(e) => setSelectedMusicId(e.target.value)}
             >
               <option value="">Selecione uma música para editar métricas...</option>
               {approvedMusics.map(m => (
                 <option key={m.id} value={m.id}>{m.titulo}</option>
               ))}
             </select>
          </div>

          {selectedMusicId && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
               <h4 className="text-sm font-bold text-gray-300 mb-3">Métricas Externas (SomVibe) - {approvedMusics.find(m => m.id === selectedMusicId)?.titulo}</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                 <AnimatedInput 
                   placeholder="Plays Totais (Externo)" 
                   type="number"
                   value={manualMusicMetrics.plays} 
                   onChange={(e) => setManualMusicMetrics({ ...manualMusicMetrics, plays: e.target.value })} 
                 />
                 <AnimatedInput 
                   placeholder="Ouvintes Mensais" 
                   type="number"
                   value={manualMusicMetrics.listeners} 
                   onChange={(e) => setManualMusicMetrics({ ...manualMusicMetrics, listeners: e.target.value })} 
                 />
                 <AnimatedInput 
                   placeholder="Receita Gerada (R$)" 
                   type="number"
                   value={manualMusicMetrics.revenue} 
                   onChange={(e) => setManualMusicMetrics({ ...manualMusicMetrics, revenue: e.target.value })} 
                 />
               </div>
               <AnimatedButton onClick={handleSaveMusicMetrics} className="w-full md:w-auto">Salvar Métricas da Música</AnimatedButton>
            </div>
          )}

          <div className="font-bold mb-2">Resumo das Músicas (Plataforma + Externo)</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {approvedMusics.map(m => {
              const mm = musicMetrics[m.id] || { plays: 0, totalSeconds: 0, presaves: 0 };
              const hh = Math.floor(mm.totalSeconds / 3600);
              const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
              const ss = mm.totalSeconds % 60;
              const totalFmt = `${hh}h ${mmn}m ${ss}s`;
              
              // Display priority: External > Internal
              const displayPlays = (mm.externalPlays !== undefined) ? mm.externalPlays : mm.plays;
              const displayRevenue = (mm.externalRevenue !== undefined) ? `R$ ${mm.externalRevenue}` : '-';

              return (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-white font-semibold">{m.titulo || 'Sem título'}</div>
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm text-gray-300">
                    <span title="Total de plays (Plataformas Digitais + Interno)">Plays: <span className="text-white font-bold">{displayPlays}</span></span>
                    {mm.externalRevenue !== undefined && <span>Receita: <span className="text-green-400 font-bold">{displayRevenue}</span></span>}
                    <span className="text-xs text-gray-500">(Interno: {mm.plays} plays)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
        <div className="pt-4 space-y-3">
          <div className="font-bold">Plano do artista</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={planForm.plano} onChange={(e) => setPlanForm({ ...planForm, plano: e.target.value })}>

              <option value="Avulso">Avulso</option>
              <option value="Mensal">Mensal</option>
              <option value="Anual">Anual</option>
              <option value="Vitalicio">Vitalicio</option>
              
            </select>
            <AnimatedInput placeholder="Envios extras (bonus_quota)" type="number" value={planForm.bonus_quota} onChange={(e) => setPlanForm({ ...planForm, bonus_quota: e.target.value })} />
            <AnimatedInput placeholder="Início do plano" type="date" value={planForm.plan_started_at} onChange={(e) => setPlanForm({ ...planForm, plan_started_at: e.target.value })} />
            <AnimatedButton onClick={handleSavePlan}>Salvar Plano</AnimatedButton>
          </div>
        </div>
      </Card>
      {isManagerOpen && (
        <ArtistContentManager
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          artist={artists.find(a => a.id === selectedArtist) || null}
        />
      )}
      {isProfileOpen && (
        <ProfileEditModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentAvatar={(artists.find(a => a.id === selectedArtist)?.avatar_url) || null}
          currentName={(artists.find(a => a.id === selectedArtist)?.nome) || ''}
          currentBio={(artists.find(a => a.id === selectedArtist)?.bio) || ''}
          onSave={handleSaveProfile}
          uploading={false}
        />
      )}
    </AdminLayout>
  );
};

export const AdminMusics = () => {
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  const [musics, setMusics] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pendente');
  const [artistFilter, setArtistFilter] = useState('');
  const [artists, setArtists] = useState([]);
  const [producers, setProducers] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [localInputs, setLocalInputs] = useState({});
  const [kindFilter, setKindFilter] = useState('todos');
  const [openAlbums, setOpenAlbums] = useState({});
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [musicToEdit, setMusicToEdit] = useState(null);

  // Group musics by album
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
            title: m.album_title || 'Álbum Desconhecido',
            artist_id: m.artista_id,
            cover_url: m.cover_url,
            tracks: [],
            created_at: m.created_at,
            status: m.status
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

  const togglePlay = (trackId, url) => {
    if (!url) return;
    if (playingTrack === trackId && audioElement) {
      if (isPaused) { audioElement.play().catch(() => {}); setIsPaused(false); }
      else { audioElement.pause(); setIsPaused(true); }
      return;
    }
    if (audioElement) { audioElement.pause(); }
    const audio = new Audio(url);
    audio.onended = () => { setPlayingTrack(null); setAudioElement(null); setIsPaused(false); };
    audio.play().catch(() => {});
    setAudioElement(audio);
    setPlayingTrack(trackId);
    setIsPaused(false);
  };

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'todos') params.set('status', statusFilter);
    if (artistFilter) params.set('artist_id', artistFilter);
    const data = await apiClient.get(`/admin/musics?${params.toString()}`);
    setMusics(data || []);
  }, [statusFilter, artistFilter, startDate, endDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const fetchArtists = async () => {
      const data = await apiClient.get('/artists');
      setArtists(data || []);
    };
    fetchArtists();
  }, []);

  useEffect(() => {
    const fetchProducers = async () => {
      const data = await apiClient.get('/producers');
      setProducers(data || []);
    };
    fetchProducers();
  }, []);

  const approve = async (m) => {
    const inputs = localInputs[m.id] || {};
    // If part of album, might fallback to album inputs if provided? No, specific overrides.
    // Actually, if it's an album track approved individually, we need UPC.
    // But usually UPC is album wide. I will check if album inputs exist if track input missing?
    // For simplicity, I'll require UPC in track input if single, or album input if bulk.
    // If approving single track of album, user should fill UPC.
    
    const upcVal = (inputs.upc || m.upc || localInputs[m.album_id]?.upc || '').trim();
    const presaveVal = (inputs.presave || m.presave_link || localInputs[m.album_id]?.presave || '').trim();
    const releaseVal = (inputs.release_date || m.release_date || localInputs[m.album_id]?.release_date || '').trim();
    const isrcVal = (inputs.isrc || m.isrc || '').trim();
    const isProduced = inputs.is_beatwap_produced || false;
    const producedBy = inputs.produced_by || null;
    const showHome = inputs.show_on_home || false;

    if (!upcVal) { addToast('Informe o UPC', 'error'); return; }
    if (isProduced && !producedBy) { addToast('Selecione o produtor responsável', 'error'); return; }

    await apiClient.put(`/admin/musics/${m.id}`, {
      status: 'aprovado',
      upc: upcVal,
      presave_link: presaveVal || null,
      release_date: releaseVal || null,
      is_beatwap_produced: isProduced,
      produced_by: isProduced ? producedBy : null,
      show_on_home: showHome,
      isrc: isrcVal || null
    });
    await addNotification({
      recipientId: m.artista_id,
      title: 'Música aprovada',
      message: `UPC: ${upcVal}. Pre-save: ${presaveVal || 'N/A'}. Lançamento: ${releaseVal || 'N/A'}`,
      type: 'success',
      link: presaveVal || null
    });
    setLocalInputs((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), upc: '', presave: '', release_date: '', isrc: '' } }));
    load();
  };

  const reject = async (m) => {
    const reason = (localInputs[m.id]?.reject || '').trim();
    if (!reason) { addToast('Informe o motivo da reprovação', 'error'); return; }
    await apiClient.put(`/admin/musics/${m.id}`, { status: 'recusado', motivo_recusa: reason });
    await addNotification({ recipientId: m.artista_id, title: 'Música reprovada', message: reason, type: 'error' });
    setLocalInputs((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), reject: '' } }));
    load();
  };

  const downloadAlbum = async (group) => {
    const zip = new JSZip();
    const folder = zip.folder(group.title.replace(/[^a-z0-9]/gi, '_'));
    addToast('Preparando download...', 'info');
    
    const promises = group.tracks.map(async (track) => {
      if (track.audio_url) {
        try {
          const response = await fetch(track.audio_url);
          const blob = await response.blob();
          const ext = track.audio_url.split('.').pop().split('?')[0] || 'mp3';
          folder.file(`${track.titulo}.${ext}`, blob);
        } catch (e) {
          console.error(`Erro ao baixar ${track.titulo}`, e);
        }
      }
    });

    await Promise.all(promises);
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${group.title}.zip`);
    addToast('Download iniciado!', 'success');
  };

  const approveAll = async (group) => {
    const inputs = localInputs[group.id] || {};
    const upcVal = (inputs.upc || '').trim();
    const releaseVal = (inputs.release_date || '').trim();
    const presaveVal = (inputs.presave || '').trim();
    const showHome = inputs.show_on_home || false;
    
    if (!upcVal) { addToast('Informe o UPC do álbum para aprovar todas', 'error'); return; }

    let approvedCount = 0;
    for (const m of group.tracks) {
        if (m.status !== 'pendente') continue;
        
        const trackInputs = localInputs[m.id] || {};
        const isrcVal = trackInputs.isrc || m.isrc || null;
        
        await apiClient.put(`/admin/musics/${m.id}`, {
            status: 'aprovado',
            upc: upcVal,
            presave_link: presaveVal || null,
            release_date: releaseVal || null,
            show_on_home: showHome,
            isrc: isrcVal || null
        });
        approvedCount++;
    }
    
    if (approvedCount > 0) {
        addToast(`${approvedCount} músicas aprovadas!`, 'success');
        load();
    } else {
        addToast('Nenhuma música pendente para aprovar.', 'info');
    }
  };

  const updateAlbumInfo = async (group) => {
    const inputs = localInputs[group.id] || {};
    const upcVal = (inputs.upc || '').trim();
    const releaseVal = (inputs.release_date || '').trim();
    const presaveVal = (inputs.presave || '').trim();
    const showHome = inputs.show_on_home || false;

    if (!upcVal) { addToast('Informe o UPC do álbum', 'error'); return; }

    try {
      const albumIds = group.tracks.map(t => t.id);
      await Promise.all(albumIds.map(id => apiClient.put(`/admin/musics/${id}`, {
        upc: upcVal,
        presave_link: presaveVal || null,
        release_date: releaseVal || null,
        show_on_home: showHome
      })));
      addToast('Informações do álbum atualizadas', 'success');
      load();
    } catch {
      addToast('Erro ao atualizar informações do álbum', 'error');
    }
  };

  const handleDownloadDoc = async (url, title) => {
    try {
      addToast('Baixando documento seguro...', 'info');
      const blob = await downloadDecryptedFile(url);
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const ext = url.split('.').pop().split('?')[0] || 'dat';
      link.download = `doc_${title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      addToast('Erro ao baixar documento.', 'error');
    }
  };

  const renderTrackCard = (m, isAlbumTrack = false) => (
    <motion.div
      key={m.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={`p-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-black/20 flex flex-col md:flex-row items-center gap-4 hover:border-beatwap-gold/40 hover:shadow-[0_0_30px_rgba(245,197,66,0.18)] ${isAlbumTrack ? 'ml-4 md:ml-8 border-l-4 border-l-beatwap-gold/20' : ''}`}
    >
      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-800 border border-white/10 ring-1 ring-black/50 flex items-center justify-center relative cursor-pointer flex-shrink-0"
           onClick={() => togglePlay(m.id, m.preview_url || m.audio_url)}>
        {m.cover_url ? (
          <img src={m.cover_url} alt={m.titulo} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs text-gray-400">Sem capa</span>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <button 
            className="w-8 h-8 bg-beatwap-gold rounded-full flex items-center justify-center text-black hover:bg-white"
            onClick={(e) => { e.stopPropagation(); togglePlay(m.id, m.preview_url || m.audio_url); }}
          >
            {playingTrack === m.id && !isPaused ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </div>
      <div className="flex-1 w-full">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="text-lg font-extrabold text-white tracking-wide break-words max-w-full">{m.titulo}</div>
          <div className={`text-[11px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
            m.status === 'aprovado' 
              ? 'bg-green-500/15 text-green-400 border-green-500/30' 
              : m.status === 'recusado' 
                ? 'bg-red-500/15 text-red-400 border-red-500/30' 
                : 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
          }`}>
            {m.status}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {m.audio_url && (
            <AnimatedButton onClick={() => window.open(m.audio_url, '_blank')}>
              <Download size={16} />
              Baixar Áudio
            </AnimatedButton>
          )}
          {m.authorization_url && (
            <AnimatedButton onClick={() => handleDownloadDoc(m.authorization_url, m.titulo)}>
              <Download size={16} />
              Baixar Documento
            </AnimatedButton>
          )}
          {m.cover_url && (
            <AnimatedButton onClick={() => window.open(m.cover_url, '_blank')}>
              <Download size={16} />
              Baixar Capa
            </AnimatedButton>
          )}
          {m.status === 'aprovado' && (
            <div className="flex flex-wrap items-center gap-2">
              <AnimatedButton 
                onClick={() => { setMusicToEdit(m); setEditModalOpen(true); }}
                className="!py-1 !px-2 text-[10px]"
                variant="secondary"
              >
                Editar Info
              </AnimatedButton>
              {m.upc && <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">UPC: {m.upc}</div>}
              {m.isrc && <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">ISRC: {m.isrc}</div>}
              {m.presave_link && <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">Pré-save disponível</div>}
              {m.release_date && <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">Lançamento: {m.release_date}</div>}
            </div>
          )}
        </div>
      </div>
      {m.status === 'pendente' && (
        <div className="flex flex-col w-full md:w-auto gap-3 mt-2 md:mt-0">
           <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                 <AnimatedInput
                    placeholder="ISRC"
                    value={localInputs[m.id]?.isrc || m.isrc || ''}
                    onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), isrc: e.target.value } }))}
                    className="w-full md:w-32"
                  />
                  {!isAlbumTrack && (
                    <AnimatedInput
                      placeholder="UPC"
                      value={localInputs[m.id]?.upc || ''}
                      onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), upc: e.target.value } }))}
                      className="w-full md:w-32"
                    />
                  )}
              </div>
              {!isAlbumTrack && (
                <div className="flex gap-2">
                  <AnimatedInput
                    placeholder="Link de Pre-save"
                    value={localInputs[m.id]?.presave || ''}
                    onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), presave: e.target.value } }))}
                    className="w-full md:w-48"
                  />
                  <input
                    type="date"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full md:w-40"
                    value={localInputs[m.id]?.release_date || ''}
                    onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), release_date: e.target.value } }))}
                  />
                </div>
              )}
           </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex flex-col gap-1 px-2">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), is_beatwap_produced: !localInputs[m.id]?.is_beatwap_produced } }))}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${localInputs[m.id]?.is_beatwap_produced ? 'bg-beatwap-gold border-beatwap-gold text-black' : 'border-white/20 bg-white/5'}`}>
                  {localInputs[m.id]?.is_beatwap_produced && <Check size={12} strokeWidth={4} />}
                </div>
                <span className="text-[10px] text-gray-300 select-none">Prod. BeatWap</span>
              </div>
              
              {localInputs[m.id]?.is_beatwap_produced && (
                <select
                  className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:border-beatwap-gold outline-none"
                  value={localInputs[m.id]?.produced_by || ''}
                  onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), produced_by: e.target.value } }))}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">Selecione o Produtor</option>
                  {producers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome || p.nome_completo_razao_social || 'Produtor'}
                    </option>
                  ))}
                </select>
              )}

              {!isAlbumTrack && (
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), show_on_home: !localInputs[m.id]?.show_on_home } }))}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${localInputs[m.id]?.show_on_home ? 'bg-beatwap-gold border-beatwap-gold text-black' : 'border-white/20 bg-white/5'}`}>
                    {localInputs[m.id]?.show_on_home && <Check size={12} strokeWidth={4} />}
                  </div>
                  <span className="text-[10px] text-gray-300 select-none">Mostrar Home</span>
                </div>
              )}
            </div>
            <AnimatedButton onClick={() => approve(m)} icon={Save}>Aprovar</AnimatedButton>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <AnimatedInput
              placeholder="Motivo da reprovação"
              value={localInputs[m.id]?.reject || ''}
              onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), reject: e.target.value } }))}
              className="w-full md:w-48"
            />
            <AnimatedButton onClick={() => reject(m)} icon={AlertTriangle}>Reprovar</AnimatedButton>
          </div>
        </div>
      )}
    </motion.div>
  );

  return (
    <AdminLayout>
      <Card className="space-y-4 p-4 md:p-6">
        <div className="font-bold">Aprovar / Reprovar</div>
        <div className="flex flex-wrap gap-2 pb-2">
          {['aprovado', 'pendente', 'todos'].map(st => (
             <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                  statusFilter === st 
                    ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {st === 'todos' ? 'Todas' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pb-4">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'singles', label: 'Singles' },
            { id: 'albuns', label: 'Álbuns' },
          ].map(k => (
            <button
              key={k.id}
              onClick={() => setKindFilter(k.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                kindFilter === k.id
                  ? 'bg-beatwap-gold text-beatwap-black font-bold'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <select className="w-full sm:col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Status: Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
          <select className="w-full sm:col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white" value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}>
            <option value="">Artista: Todos</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.nome || a.nome_completo_razao_social || 'Sem nome'}</option>)}
          </select>
          <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="w-full sm:col-span-2 md:col-span-1">
            <AnimatedButton onClick={load} className="w-full justify-center py-3 md:py-2">Filtrar</AnimatedButton>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {groupedMusics
          .filter(item => {
            if (kindFilter === 'albuns') return item.type === 'album';
            if (kindFilter === 'singles') return item.type === 'single';
            return true;
          })
          .map(item => {
            if (item.type === 'album') {
              const isOpen = !!openAlbums[item.id];
              const base = item.tracks[0] || {};
              const currentShowOnHome = localInputs[item.id]?.show_on_home ?? (base.show_on_home || false);
              return (
                <div key={item.id} className="border border-white/10 rounded-2xl bg-white/5">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenAlbums(prev => ({
                        ...prev,
                        [item.id]: !prev[item.id]
                      }))
                    }
                    className="w-full flex flex-col md:flex-row items-center justify-between gap-4 p-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                        {item.cover_url ? (
                          <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <FolderDown className="text-gray-500 w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base md:text-lg font-bold text-white truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-beatwap-gold uppercase font-semibold">
                            Álbum
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          <span>
                            {item.tracks.length} faixas • {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-wrap gap-2 justify-end">
                        <AnimatedButton onClick={() => downloadAlbum(item)} variant="secondary" icon={Download}>
                          Baixar Álbum (ZIP)
                        </AnimatedButton>
                        <AnimatedButton
                          variant="secondary"
                          onClick={() => {
                            const base = item.tracks[0] || {};
                            setLocalInputs(prev => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                upc: prev[item.id]?.upc ?? (base.upc || ''),
                                presave: prev[item.id]?.presave ?? (base.presave_link || ''),
                                release_date: prev[item.id]?.release_date ?? (base.release_date || ''),
                                show_on_home: prev[item.id]?.show_on_home ?? (base.show_on_home || false)
                              }
                            }));
                          }}
                        >
                          Editar Infos do Álbum
                        </AnimatedButton>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span>{isOpen ? 'Recolher' : 'Ver faixas'}</span>
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </div>
                  </button>
                  <div className="px-4 pb-3">
                    <div className="mt-2 flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="text-xs font-bold text-gray-300 mb-1">Informações do Álbum / Aprovar Tudo</div>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center">
                        <div className="flex gap-2 flex-1">
                          <AnimatedInput
                            placeholder="UPC do Álbum"
                            value={localInputs[item.id]?.upc ?? base.upc ?? ''}
                            onChange={(e) =>
                              setLocalInputs(prev => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), upc: e.target.value }
                              }))
                            }
                            className="w-32"
                          />
                          <AnimatedInput
                            placeholder="Pre-save / Smartlink"
                            value={localInputs[item.id]?.presave ?? base.presave_link ?? ''}
                            onChange={(e) =>
                              setLocalInputs(prev => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), presave: e.target.value }
                              }))
                            }
                            className="w-32"
                          />
                          <input
                            type="date"
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs w-32"
                            value={localInputs[item.id]?.release_date ?? base.release_date ?? ''}
                            onChange={(e) =>
                              setLocalInputs(prev => ({
                                ...prev,
                                [item.id]: { ...(prev[item.id] || {}), release_date: e.target.value }
                              }))
                            }
                          />
                        </div>
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() =>
                            setLocalInputs(prev => ({
                              ...prev,
                              [item.id]: {
                                ...(prev[item.id] || {}),
                                show_on_home: !currentShowOnHome
                              }
                            }))
                          }
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              currentShowOnHome
                                ? 'bg-beatwap-gold border-beatwap-gold text-black'
                                : 'border-white/20 bg-white/5'
                            }`}
                          >
                            {currentShowOnHome && <Check size={12} strokeWidth={4} />}
                          </div>
                          <span className="text-[10px] text-gray-300 select-none">Mostrar na Home</span>
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-2">
                        <AnimatedButton
                          onClick={() => approveAll(item)}
                          icon={CheckCircle2}
                          className="w-full md:w-1/2 justify-center"
                        >
                          Aprovar Todas as Faixas
                        </AnimatedButton>
                        <AnimatedButton
                          onClick={() => updateAlbumInfo(item)}
                          variant="secondary"
                          className="w-full md:w-1/2 justify-center"
                        >
                          Salvar Infos do Álbum
                        </AnimatedButton>
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-white/10 p-3 space-y-3">
                      {item.tracks.map(track => renderTrackCard(track, true))}
                    </div>
                  )}
                </div>
              );
            } else {
              return renderTrackCard(item, false);
            }
          })}
          {groupedMusics.length === 0 && <div className="text-gray-400 text-center py-8">Nenhuma música encontrada.</div>}
        </div>
        
        <MusicEditModal 
          isOpen={editModalOpen} 
          onClose={() => setEditModalOpen(false)} 
          music={musicToEdit} 
          onSuccess={load} 
        />
      </Card>
    </AdminLayout>
  );
};

export const AdminComposers = () => {
  const [composers, setComposers] = useState([]);
  const [selectedComposer, setSelectedComposer] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ plano: 'Avulso', bonus_quota: 0, plan_started_at: '' });
  const [internalMetrics, setInternalMetrics] = useState({ plays: 0, listeners: 0, time: 0 });
  const { addToast } = useToast();
  const load = useCallback(async () => {
    const data = await apiClient.get('/composers');
    const mapped = (data || []).map(p => ({
      ...p,
      nome: decryptData(p.nome),
      nome_completo_razao_social: decryptData(p.nome_completo_razao_social)
    }));
    setComposers(mapped);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const loadPlan = async () => {
      if (!selectedComposer) {
        setPlanForm({ plano: 'Avulso', bonus_quota: 0, plan_started_at: '' });
        return;
      }
      const data = await apiClient.get(`/profiles/${selectedComposer}`);
      setPlanForm({
        plano: data?.plano || 'Avulso',
        bonus_quota: Number(data?.bonus_quota || 0),
        plan_started_at: data?.plan_started_at ? String(data.plan_started_at).slice(0, 10) : ''
      });
    };
    loadPlan();
  }, [selectedComposer]);
  useEffect(() => {
    const loadMetrics = async () => {
      if (!selectedComposer) { setInternalMetrics({ plays: 0, listeners: 0, time: 0 }); return; }
      const s = await apiClient.get(`/analytics/artist/${selectedComposer}/summary`);
      setInternalMetrics({ plays: s?.plays || 0, listeners: s?.listeners || 0, time: s?.time || 0 });
    };
    loadMetrics();
  }, [selectedComposer]);
  const handleSaveProfile = async ({ name, bio, blob }) => {
    try {
      if (!selectedComposer) return;
      let avatar_url = null;
      if (blob) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        avatar_url = String(dataUrl);
      }
      const updateData = {};
      if (name) updateData.nome = name;
      if (bio) updateData.bio = bio;
      if (avatar_url) updateData.avatar_url = avatar_url;
      if (Object.keys(updateData).length) {
        await apiClient.put(`/profiles/${selectedComposer}`, updateData);
      }
      addToast('Perfil do compositor atualizado', 'success');
      setIsProfileOpen(false);
      load();
    } catch {
      addToast('Falha ao atualizar perfil do compositor', 'error');
    }
  };
  const handleSavePlan = async () => {
    if (!selectedComposer) { addToast('Selecione o compositor', 'error'); return; }
    try {
      const update = {
        plano: planForm.plano,
        bonus_quota: Number(planForm.bonus_quota || 0),
      };
      if (planForm.plan_started_at) update.plan_started_at = new Date(planForm.plan_started_at).toISOString();
      await apiClient.put(`/profiles/${selectedComposer}`, update);
      addToast('Plano do compositor atualizado', 'success');
    } catch {
      addToast('Falha ao atualizar plano', 'error');
    }
  };
  const filtered = (composers || []).filter(c => {
    const term = searchName.toLowerCase();
    const n1 = (c.nome || '').toLowerCase();
    const n2 = (c.nome_completo_razao_social || '').toLowerCase();
    return n1.includes(term) || n2.includes(term);
  });
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="font-bold">Enviar músicas pelo compositor</div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="w-full">
            <AnimatedInput placeholder="Buscar compositor pelo nome" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
          </div>
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full md:w-auto flex-1" value={selectedComposer || ''} onChange={(e) => setSelectedComposer(e.target.value)}>
            <option value="">Selecione o compositor</option>
            {filtered.map(c => <option key={c.id} value={c.id}>{c.nome || c.nome_completo_razao_social || 'Sem nome'}</option>)}
          </select>
          <AnimatedButton onClick={() => setIsUploadOpen(true)} className="w-full md:w-auto whitespace-nowrap">Enviar Composição</AnimatedButton>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="font-bold">Gerenciar perfil do compositor</div>
        {selectedComposer && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-beatwap-gold/10 via-white/5 to-black/40 p-4">
            <div className="absolute -top-20 -right-24 w-72 h-72 rounded-full bg-beatwap-gold/10 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-beatwap-gold/60 border border-white/10 bg-black/30 flex items-center justify-center">
                {(composers.find(a => a.id === selectedComposer)?.avatar_url) ? (
                  <img src={composers.find(a => a.id === selectedComposer)?.avatar_url} alt="Compositor" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-extrabold text-beatwap-gold">
                    {((composers.find(a => a.id === selectedComposer)?.nome || composers.find(a => a.id === selectedComposer)?.nome_completo_razao_social || 'C') || 'C')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xl font-extrabold text-white truncate">
                  {composers.find(a => a.id === selectedComposer)?.nome || composers.find(a => a.id === selectedComposer)?.nome_completo_razao_social || 'Compositor'}
                </div>
                <div className="text-xs text-gray-400">Selecionado</div>
              </div>
              <div className="flex gap-2">
                <AnimatedButton onClick={() => setIsProfileOpen(true)}>Editar Perfil</AnimatedButton>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <Card>
                <div className="text-xs text-gray-400">Plays Internos</div>
                <div className="text-2xl font-bold">{internalMetrics.plays}</div>
              </Card>
              <Card>
                <div className="text-xs text-gray-400">Ouvintes</div>
                <div className="text-2xl font-bold">{internalMetrics.listeners}</div>
              </Card>
              <Card>
                <div className="text-xs text-gray-400">Tempo Ouvido</div>
                <div className="text-2xl font-bold">
                  {(() => {
                    const s = internalMetrics.time || 0;
                    const h = Math.floor(s / 3600);
                    const m = Math.floor((s % 3600) / 60);
                    return `${h}h ${m}m`;
                  })()}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </Card>
      <Card className="space-y-4">
        <div className="font-bold">Plano do compositor</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={planForm.plano} onChange={(e) => setPlanForm({ ...planForm, plano: e.target.value })}>
            <option value="Avulso">Avulso</option>
            <option value="Mensal">Mensal</option>
            <option value="Anual">Anual</option>
            <option value="Vitalicio">Vitalicio</option>
          </select>
          <AnimatedInput placeholder="Envios extras (bonus_quota)" type="number" value={planForm.bonus_quota} onChange={(e) => setPlanForm({ ...planForm, bonus_quota: e.target.value })} />
          <AnimatedInput placeholder="Início do plano" type="date" value={planForm.plan_started_at} onChange={(e) => setPlanForm({ ...planForm, plan_started_at: e.target.value })} />
          <AnimatedButton onClick={handleSavePlan}>Salvar Plano</AnimatedButton>
        </div>
      </Card>
      {isProfileOpen && (
        <ProfileEditModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentAvatar={(composers.find(a => a.id === selectedComposer)?.avatar_url) || null}
          currentName={(composers.find(a => a.id === selectedComposer)?.nome) || ''}
          currentBio={(composers.find(a => a.id === selectedComposer)?.bio) || ''}
          onSave={handleSaveProfile}
          uploading={false}
        />
      )}
      {isUploadOpen && (
        <CompositionsUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => setIsUploadOpen(false)}
          composerId={selectedComposer}
        />
      )}
    </AdminLayout>
  );
};

export const AdminChat = () => {
  const { user } = useAuth();
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  useEffect(() => {
    const init = async () => {
      try {
        const msgs = await apiClient.get('/messages');
        setMessages(msgs || []);
        setChatId('inbox');
      } catch (e) { console.error(e); }
    };
    init();
  }, []);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    let receiver_id = null;
    for (const m of messages) {
      if (m.sender_id && m.sender_id !== user?.id) { receiver_id = m.sender_id; break; }
      if (m.receiver_id && m.receiver_id !== user?.id) { receiver_id = m.receiver_id; break; }
    }
    if (!receiver_id) return;
    await apiClient.post('/messages', { receiver_id, message: input.trim() });
    const msgs = await apiClient.get('/messages');
    setMessages(msgs || []);
    setInput('');
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        {!chatId && <div className="text-gray-400">Selecione uma conversa</div>}
        {chatId && (
          <>
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {messages.map((m) => (
                <div key={m.id} className="p-2 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-500">{m.sender_cargo}</div>
                  <div>{m.message}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <AnimatedInput placeholder="Escreva uma mensagem..." value={input} onChange={(e) => setInput(e.target.value)} />
              <AnimatedButton onClick={send}>Enviar</AnimatedButton>
            </div>
          </>
        )}
      </Card>
    </AdminLayout>
  );
};

export const AdminProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('detalhes');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo_razao_social: '',
    email: '',
    cpf_cnpj: '',
    celular: '',
    instagram_url: '',
    site_url: '',
    genero_musical: '',
    tema: 'dark',
    cep: '',
    logradouro: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    plano: 'Gratuito',
    nova_senha: '',
    confirmar_senha: ''
  });
  const [mandatoryMissing, setMandatoryMissing] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [artists, setArtists] = useState([]);
  const [selectedArtistEdit, setSelectedArtistEdit] = useState('');
  const [artistSearchName, setArtistSearchName] = useState('');
  const [isArtistProfileOpen, setIsArtistProfileOpen] = useState(false);

  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        nome_completo_razao_social: profile.nome_completo_razao_social || profile.nome || '',
        email: user.email || '',
        cpf_cnpj: decryptData(profile.cpf_cnpj || ''),
        celular: decryptData(profile.celular || ''),
        instagram_url: profile.instagram_url || '',
        site_url: profile.site_url || '',
        genero_musical: profile.genero_musical || '',
        tema: profile.tema || 'dark',
        cep: decryptData(profile.cep || ''),
        logradouro: decryptData(profile.logradouro || ''),
        complemento: decryptData(profile.complemento || ''),
        bairro: decryptData(profile.bairro || ''),
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        plano: profile.plano || 'Gratuito'
      }));
      const missing = !profile.nome_completo_razao_social || !profile.cpf_cnpj || !profile.celular || !profile.cep || !profile.logradouro || !profile.cidade || !profile.estado;
      setMandatoryMissing(missing);
    }
  }, [user, profile]);



  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.put('/profile', {
        nome_completo_razao_social: formData.nome_completo_razao_social,
        cpf_cnpj: encryptData(formData.cpf_cnpj),
        celular: encryptData(formData.celular),
        instagram_url: formData.instagram_url,
        site_url: formData.site_url,
        genero_musical: formData.genero_musical,
        tema: formData.tema,
        cep: encryptData(formData.cep),
        logradouro: encryptData(formData.logradouro),
        complemento: encryptData(formData.complemento),
        bairro: encryptData(formData.bairro),
        cidade: formData.cidade,
        estado: formData.estado
      });
      await refreshProfile();
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleSavePublicProfile = async ({ name, bio, genre, socials, blob }) => {
    try {
      let avatar_url = null;
      if (blob) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const r = await apiClient.post('/profile/avatar', { dataUrl });
        avatar_url = r?.avatar_url || null;
      }
      
      const updateData = {
        nome: name,
        genero_musical: genre,
        youtube_url: socials?.youtube || null,
        spotify_url: socials?.spotify || null,
        deezer_url: socials?.deezer || null,
        tiktok_url: socials?.tiktok || null,
        instagram_url: socials?.instagram || null,
        site_url: socials?.site || null,
      };
      if (bio) updateData.bio = bio;
      if (avatar_url) updateData.avatar_url = avatar_url;

      await apiClient.put('/profile', updateData);
      
      await refreshProfile();
      addToast('Perfil público atualizado', 'success');
      setIsArtistProfileOpen(false);
    } catch (e) {
      console.error(e);
      addToast('Falha ao atualizar perfil', 'error');
    }
  };

  const handleAvatarSave = async ({ blob }) => {
    if (!blob || !user) return;
    try {
      setUploadingAvatar(true);
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await apiClient.post('/profile/avatar', { dataUrl });
      await refreshProfile();
      addToast('Foto de perfil atualizada!', 'success');
      setAvatarModalOpen(false);
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar foto de perfil.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (formData.nova_senha !== formData.confirmar_senha) {
      addToast('As senhas não coincidem.', 'warning');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/change-password', { new_password: formData.nova_senha });
      addToast('Senha atualizada com sucesso!', 'success');
      setFormData(prev => ({ ...prev, nova_senha: '', confirmar_senha: '' }));
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar senha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateContract = () => {
    const artistName = formData.nome_completo_razao_social || '____________';
    const artistCPF = formData.cpf_cnpj || '____________';
    const artistAddress = `${formData.logradouro || ''}, ${formData.bairro || ''}, ${formData.cidade || ''} - ${formData.estado || ''}, CEP ${formData.cep || ''}`.replace(/(^, | ,)/g, '').trim();
    const html = buildDistributionContractHTML({
      artistName,
      artistCPF,
      artistAddress,
      beatwapCNPJ: 'CNPJ a definir',
      beatwapAddress: 'Endereço a definir',
      vigenciaAnos: 3,
      artistaPercent: 80,
      beatwapPercent: 20,
    });
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  const tabs = [
    { id: 'detalhes', label: 'Detalhes', icon: User },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'contrato', label: 'Contrato', icon: FileText },
    { id: 'senha', label: 'Minha Senha', icon: Lock },
    { id: 'artista', label: 'Meu Perfil Público', icon: User },
  ];

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Minha Conta (Produtor)</h1>
          {mandatoryMissing && (
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-lg text-sm">
              <AlertTriangle size={16} />
              <span>Complete seu cadastro para ter acesso total.</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pb-2 sm:flex sm:flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-2 py-3 md:px-4 md:py-2 rounded-xl transition-all text-xs md:text-base ${
                activeTab === tab.id 
                  ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={16} className="flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <Card className="min-h-[400px] p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'detalhes' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800 flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                    <AnimatedButton onClick={() => setIsArtistProfileOpen(true)} variant="secondary" className="w-full sm:w-auto justify-center">
                      Modificar Foto
                    </AnimatedButton>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4 text-center sm:text-left">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatedInput 
                      label="Nome Completo / Razão Social" 
                      value={formData.nome_completo_razao_social} 
                      onChange={(e) => setFormData({...formData, nome_completo_razao_social: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Email" 
                      value={formData.email} 
                      onChange={() => {}} 
                      disabled={true}
                    />
                    <AnimatedInput 
                      label="CPF / CNPJ" 
                      value={formData.cpf_cnpj} 
                      onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Celular" 
                      value={formData.celular} 
                      onChange={(e) => setFormData({...formData, celular: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Gênero Musical" 
                      value={formData.genero_musical} 
                      onChange={(e) => setFormData({...formData, genero_musical: e.target.value})} 
                      placeholder="Ex.: Sertanejo, Funk, Rap..."
                      className="md:col-span-2"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 mt-4 gap-3">
                    <span className="text-gray-300">Tema da Interface</span>
                    <button 
                      onClick={() => setFormData({...formData, tema: formData.tema === 'dark' ? 'light' : 'dark'})}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/20 w-full md:w-auto justify-center"
                    >
                      {formData.tema === 'dark' ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-400" />}
                      <span className="text-sm capitalize">{formData.tema}</span>
                    </button>
                  </div>
                  <div className="pt-4 flex flex-col sm:flex-row justify-end">
                    <AnimatedButton onClick={handleSave} isLoading={loading} icon={Save} className="w-full sm:w-auto justify-center">Salvar Detalhes</AnimatedButton>
                  </div>
                </div>
              )}

              {activeTab === 'endereco' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatedInput label="CEP" value={formData.cep} onChange={(e) => setFormData({...formData, cep: e.target.value})} />
                    <AnimatedInput label="Logradouro" value={formData.logradouro} onChange={(e) => setFormData({...formData, logradouro: e.target.value})} />
                    <AnimatedInput label="Complemento" value={formData.complemento} onChange={(e) => setFormData({...formData, complemento: e.target.value})} />
                    <AnimatedInput label="Bairro" value={formData.bairro} onChange={(e) => setFormData({...formData, bairro: e.target.value})} />
                    <AnimatedInput label="Cidade" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
                    <AnimatedInput label="Estado (UF)" value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} />
                  </div>
                  <div className="pt-4 flex flex-col sm:flex-row justify-end">
                    <AnimatedButton onClick={handleSave} isLoading={loading} icon={Save} className="w-full sm:w-auto justify-center">Salvar Endereço</AnimatedButton>
                  </div>
                </div>
              )}


              {activeTab === 'contrato' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white mb-4">Contrato de Serviço</h3>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500 flex-shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white font-bold break-words">Contrato de Distribuição Digital</h4>
                        <p className="text-sm text-gray-400 mt-1 break-words">Este é o contrato padrão que rege nossa parceria. Baixe, leia e mantenha uma cópia para seus registros.</p>
                        <div className="mt-4">
                          <button onClick={generateContract} className="flex items-center gap-2 text-beatwap-gold hover:underline text-sm">
                            <Download size={16} />
                            Baixar Contrato (PDF)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'senha' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>
                  <div className="max-w-md space-y-4">
                    <AnimatedInput label="Nova Senha" type="password" value={formData.nova_senha} onChange={(e) => setFormData({...formData, nova_senha: e.target.value})} />
                    <AnimatedInput label="Confirmar Nova Senha" type="password" value={formData.confirmar_senha} onChange={(e) => setFormData({...formData, confirmar_senha: e.target.value})} />
                    <div className="pt-4 flex flex-col sm:flex-row justify-end">
                      <AnimatedButton onClick={handlePasswordChange} isLoading={loading} icon={Lock} className="w-full sm:w-auto justify-center">Atualizar Senha</AnimatedButton>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
        {activeTab === 'artista' && (
          <Card className="space-y-6">
            <div>
              <div className="font-bold text-xl text-white">Meu Perfil Público</div>
              <p className="text-gray-400 text-sm mt-1">
                Gerencie as informações que aparecem na sua página de perfil público e na Home.
                Adicione fotos, links e biografia para atrair mais visibilidade.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-xl">
               <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <User size={48} />
                    </div>
                  )}
               </div>
               <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <div className="font-bold text-white text-xl">{profile?.nome || profile?.nome_completo_razao_social || 'Sem nome artístico'}</div>
                    <div className="text-beatwap-gold text-sm font-medium">{profile?.genero_musical || 'Gênero não definido'}</div>
                  </div>
                  <p className="text-gray-400 text-sm line-clamp-2 max-w-lg">
                    {profile?.bio || 'Sem biografia definida. Clique em editar para adicionar.'}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                     {profile?.youtube_url && <div className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20">YouTube</div>}
                     {profile?.spotify_url && <div className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded border border-green-500/20">Spotify</div>}
                     {profile?.instagram_url && <div className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs rounded border border-purple-500/20">Instagram</div>}
                  </div>
               </div>
               <AnimatedButton onClick={() => setIsArtistProfileOpen(true)} icon={User}>
                  Editar Perfil Completo
               </AnimatedButton>
            </div>
            
            <div className="pt-6 border-t border-white/10">
              <GalleryManager userId={profile?.id} />
            </div>
          </Card>
        )}
        <ProfileEditModal
          isOpen={isArtistProfileOpen}
          onClose={() => setIsArtistProfileOpen(false)}
          currentAvatar={profile?.avatar_url}
          currentName={profile?.nome || profile?.nome_completo_razao_social}
          currentBio={profile?.bio}
          currentGenre={profile?.genero_musical}
          currentSocials={{
            youtube: profile?.youtube_url,
            spotify: profile?.spotify_url,
            deezer: profile?.deezer_url,
            tiktok: profile?.tiktok_url,
            instagram: profile?.instagram_url,
            site: profile?.site_url
          }}
          onSave={handleSavePublicProfile}
          uploading={false}
        />
      </div>
    </AdminLayout>
  );
};

export const AdminSponsors = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [sponsors, setSponsors] = useState([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [form, setForm] = useState({ name: '', instagram_url: '', site_url: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);
  useEffect(() => {
    if (!imageSrc) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [imageSrc]);
  const loadSponsors = useCallback(async () => {
    try {
      setLoadingSponsors(true);
      const data = await apiClient.get('/sponsors');
      setSponsors(data || []);
    } catch {
      addToast('Falha ao carregar patrocinadores', 'error');
    } finally {
      setLoadingSponsors(false);
    }
  }, [addToast]);
  useEffect(() => { loadSponsors(); }, [loadSponsors]);
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result);
    reader.readAsDataURL(file);
  };
  const onCropComplete = (croppedArea, pixels) => setCroppedAreaPixels(pixels);
  const handleCropConfirm = async () => {
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 600, 600);
      const preview = URL.createObjectURL(blob);
      setLogoPreview(preview);
      setCroppedBlob(blob);
      setImageSrc(null);
    } catch (e) {
      addToast('Falha ao recortar imagem', 'error');
    }
  };
  const uploadLogo = async () => {
    const blobToUpload = croppedBlob || logoFile;
    if (!blobToUpload) return null;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blobToUpload);
    });
    return String(dataUrl);
  };
  const createSponsor = async () => {
    const name = form.name.trim();
    if (!name) { addToast('Informe o nome da marca', 'error'); return; }
    try {
      const logo_data = logoFile ? await uploadLogo() : null;
      await apiClient.post('/sponsors', {
        name,
        instagram_url: form.instagram_url || null,
        site_url: form.site_url || null,
        logo_data,
        created_by: user?.id || null
      });
      addToast('Patrocinador/Parceria adicionada', 'success');
      setForm({ name: '', instagram_url: '', site_url: '' });
      setLogoFile(null);
      setLogoPreview('');
      setImageSrc(null);
      setCroppedBlob(null);
      loadSponsors();
    } catch {
      addToast('Falha ao adicionar patrocinador', 'error');
    }
  };
  const toggleActive = async (id, active) => {
    try {
      await apiClient.put(`/sponsors/${id}`, { active });
      loadSponsors();
    } catch {
      addToast('Falha ao atualizar status', 'error');
    }
  };
  const deleteSponsor = async (id) => {
    try {
      await apiClient.del(`/sponsors/${id}`);
      addToast('Patrocinador/Parceria removida', 'success');
      loadSponsors();
    } catch {
      addToast('Falha ao remover patrocinador', 'error');
    }
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="font-bold">Catalogar Patrocinador/Parceria</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AnimatedInput placeholder="Nome da marca" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <AnimatedInput placeholder="Instagram (URL)" value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} />
          <AnimatedInput placeholder="Site (URL)" value={form.site_url} onChange={(e) => setForm({ ...form, site_url: e.target.value })} />
          <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${logoFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
            <input type="file" id="sponsor-logo" className="hidden" accept="image/*" onChange={onFileChange} />
            <label htmlFor="sponsor-logo" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="p-3 bg-gray-800 rounded-full text-white">
                <ImageIcon size={24} />
              </div>
              <span className="font-bold text-sm">Logo da Marca</span>
              <span className="text-xs text-gray-500">JPG/PNG quadrado recomendado</span>
              {logoFile && <span className="text-beatwap-gold text-xs font-bold mt-2">{logoFile.name}</span>}
            </label>
          </div>
        </div>
        {imageSrc ? (
          <div className="space-y-4">
            <div
              className="relative w-full max-w-sm aspect-square bg-transparent rounded-lg overflow-hidden pointer-events-auto mx-auto"
              style={{ touchAction: 'none' }}
            >
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                cropShape="rect"
                showGrid={false}
                objectFit="cover"
                restrictPosition={false}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => { setImageSrc(null); setLogoFile(null); setCroppedBlob(null); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <AnimatedButton onClick={handleCropConfirm}>
                Confirmar Recorte
              </AnimatedButton>
            </div>
          </div>
        ) : (
          logoPreview && (
            <div className="flex items-center gap-3">
              <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain rounded-lg border border-white/10 bg-white/5" />
              <AnimatedButton onClick={() => { setLogoFile(null); setLogoPreview(''); setCroppedBlob(null); }}>Remover</AnimatedButton>
            </div>
          )
        )}
        <AnimatedButton onClick={createSponsor}>Adicionar Patrocinador/Parceria</AnimatedButton>
      </Card>
      <Card className="space-y-4">
        <div className="font-bold">Patrocinadores/Parcerias</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(loadingSponsors ? [] : sponsors).map(s => (
            <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                {s.logo_url ? <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" /> : <span className="text-xs text-gray-400">Sem logo</span>}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-bold text-white text-sm truncate">{s.name}</div>
                <div className="text-xs text-gray-400 flex gap-2 mt-1">
                  {s.instagram_url && <a href={s.instagram_url} target="_blank" rel="noreferrer" className="hover:underline">Instagram</a>}
                  {s.site_url && <a href={s.site_url} target="_blank" rel="noreferrer" className="hover:underline">Site</a>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs" value={s.active ? 'ativo' : 'inativo'} onChange={(e) => toggleActive(s.id, e.target.value === 'ativo')}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
                <AnimatedButton onClick={() => deleteSponsor(s.id)}>Excluir</AnimatedButton>
              </div>
            </div>
          ))}
          {(!loadingSponsors && sponsors.length === 0) && (
            <div className="text-sm text-gray-400">Nenhum patrocinador/parceria cadastrado.</div>
          )}
        </div>
      </Card>
    </AdminLayout>
  );
};
