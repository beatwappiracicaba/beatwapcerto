import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, FileText, Lock, Save, Download, Moon, Sun, AlertTriangle, Image as ImageIcon, Play, Pause, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { ArtistContentManager } from '../components/admin/ArtistContentManager';
import { ProfileEditModal } from '../components/ui/ProfileEditModal';
import { MusicEditModal } from '../components/admin/MusicEditModal';
import { useData } from '../context/DataContext';
import { buildDistributionContractHTML } from '../utils/contractTemplate';

export const AdminHome = () => {
  const [counts, setCounts] = useState({ artists: 0, musics: 0, pending: 0 });
  const { user } = useAuth();
  const { addToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title: '',
    url: '',
    platform: 'YouTube'
  });
  const [projectCoverFile, setProjectCoverFile] = useState(null);
  const [projectCoverPreview, setProjectCoverPreview] = useState(null);
  const [projectCropImage, setProjectCropImage] = useState(null);
  const [projectCrop, setProjectCrop] = useState({ x: 0, y: 0 });
  const [projectZoom, setProjectZoom] = useState(1);
  const [projectAspect, setProjectAspect] = useState(16 / 9);
  const [projectCroppedAreaPixels, setProjectCroppedAreaPixels] = useState(null);

  const onProjectFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProjectCropImage(reader.result);
      setProjectAspect(projectForm.platform === 'YouTube' ? 16 / 9 : 1);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const onProjectCropComplete = useCallback((croppedArea, pixels) => {
    setProjectCroppedAreaPixels(pixels);
  }, []);

  const handleProjectCropConfirm = async () => {
    try {
      const blob = await getCroppedImg(projectCropImage, projectCroppedAreaPixels);
      const preview = URL.createObjectURL(blob);
      setProjectCoverPreview(preview);
      setProjectCoverFile(blob);
      setProjectCropImage(null);
    } catch (e) {
      addToast('Falha ao recortar imagem', 'error');
    }
  };

  const validateCover = async (file, platform) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const ratio = Number((w / h).toFixed(2));
        if (platform === 'YouTube') {
          resolve(Math.abs(ratio - 1.78) < 0.1);
        } else if (platform === 'Spotify') {
          resolve(Math.abs(ratio - 1.0) < 0.1);
        } else {
          resolve(true);
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };
  useEffect(() => {
    const load = async () => {
      const { count: artistsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('cargo', 'Artista');
      const { count: musicsCount } = await supabase.from('musics').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('musics').select('*', { count: 'exact', head: true }).eq('status', 'pendente');
      setCounts({ artists: artistsCount || 0, musics: musicsCount || 0, pending: pendingCount || 0 });
    };
    load();
  }, []);
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from('producer_projects')
        .select('id,title,url,platform,published,created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
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
      const { error: tableError } = await supabase
        .from('producer_projects')
        .select('id')
        .limit(1);
      if (tableError && /relation.*does not exist/i.test(String(tableError?.message || ''))) {
        addToast('Tabela producer_projects ausente no banco. Aplique as migrações SQL.', 'error');
        return;
      }
      let cover_url = null;
      if (projectCoverFile) {
        const ok = await validateCover(projectCoverFile, platform);
        if (!ok) { addToast('Capa com proporção incorreta para a plataforma selecionada', 'error'); return; }
        const fileName = `${user.id}/${Date.now()}-${projectCoverFile.name}`;
        const { data: up, error: upErr } = await supabase.storage.from('project_covers').upload(fileName, projectCoverFile, { upsert: true });
        if (upErr) { addToast('Falha ao enviar capa', 'error'); return; }
        const { data: pub } = supabase.storage.from('project_covers').getPublicUrl(up.path);
        cover_url = pub.publicUrl;
      }
      const { error } = await supabase.from('producer_projects').insert({
        producer_id: user.id,
        title,
        url,
        platform,
        cover_url,
        published: true
      });
      if (error) throw error;
      addToast('Projeto adicionado', 'success');
      setProjectForm({ title: '', url: '', platform: 'YouTube' });
      setProjectCoverFile(null);
      setProjectCoverPreview(null);
      loadProjects();
    } catch (error) {
      console.error('Error creating producer project:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint);
      addToast('Falha ao adicionar projeto', 'error');
    }
  };
  const deleteProject = async (id) => {
    try {
      const { error } = await supabase.from('producer_projects').delete().eq('id', id);
      if (error) throw error;
      addToast('Projeto removido', 'success');
      loadProjects();
    } catch (error) {
      console.error('Error deleting producer project:', error);
      addToast('Falha ao remover projeto', 'error');
    }
  };
  return (
    <AdminLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="space-y-2">
            <input
              id="project-cover"
              type="file"
              accept="image/*"
              onChange={onProjectFileChange}
              className="hidden"
            />
            <label htmlFor="project-cover" className="cursor-pointer flex flex-col items-center gap-2">
              <div className="p-3 bg-gray-800 rounded-full text-white">
                <ImageIcon size={24} />
              </div>
              <span className="font-bold text-sm">Capa do Projeto</span>
              <span className="text-xs text-gray-500">YouTube 16:9 • Spotify 1:1</span>
            </label>
            {projectCoverPreview && (
              <div className="w-full h-24 rounded-xl overflow-hidden bg-black/30 border border-white/10">
                <img src={projectCoverPreview} alt="Prévia da capa" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
        <AnimatedButton onClick={createProject}>Adicionar Projeto</AnimatedButton>
        <div className="pt-4">
          <div className="text-sm text-gray-400 mb-2">Últimos projetos adicionados</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(loadingProjects ? [] : projects).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                  {p.cover_url ? <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" /> : (p.platform || '').toUpperCase()}
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
      {projectCropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-beatwap-black">
              <h3 className="text-xl font-bold text-white">Ajustar Capa</h3>
              <button onClick={() => setProjectCropImage(null)} className="text-gray-400 hover:text-white">
                <ImageIcon size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={projectCropImage}
                  crop={projectCrop}
                  zoom={projectZoom}
                  aspect={projectAspect}
                  onCropChange={setProjectCrop}
                  onCropComplete={onProjectCropComplete}
                  onZoomChange={setProjectZoom}
                  showGrid={true}
                />
              </div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setProjectAspect(16 / 9)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${projectAspect === 16 / 9 ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                >
                  Paisagem (16:9)
                </button>
                <button
                  onClick={() => setProjectAspect(1)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${projectAspect === 1 ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                >
                  Perfil (1:1)
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Zoom</span>
                  <span>{projectZoom}x</span>
                </div>
                <input
                  type="range"
                  value={projectZoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setProjectZoom(e.target.value)}
                  className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setProjectCropImage(null)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <AnimatedButton onClick={handleProjectCropConfirm}>
                  Confirmar e Usar
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export const AdminArtists = () => {
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ plays: '', listeners: '', revenue: '', growth: '' });
  const [planForm, setPlanForm] = useState({ plano: 'Gratuito', bonus_quota: 0, plan_started_at: '' });
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
  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome, nome_completo_razao_social, avatar_url').eq('cargo', 'Artista');
    setArtists(data || []);
  }, []);
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
    } else {
      setMetricsForm({ plays: '', listeners: '', revenue: '', growth: '' });
    }
  }, [selectedArtist, getArtistById]);
  const loadWork = useCallback(async () => {
    if (!selectedArtist) { setWorkEvents([]); setWorkTodos([]); return; }
    const { data: ev } = await supabase
      .from('artist_work_events')
      .select('id,title,date,type,notes,created_at')
      .eq('artista_id', selectedArtist)
      .order('date', { ascending: true });
    setWorkEvents(ev || []);
    const { data: td } = await supabase
      .from('artist_todos')
      .select('id,title,due_date,status,created_at,updated_at')
      .eq('artista_id', selectedArtist)
      .order('created_at', { ascending: false });
    setWorkTodos(td || []);
  }, [selectedArtist]);
  useEffect(() => { loadWork(); }, [loadWork]);
  useEffect(() => {
    if (!selectedArtist) return;
    const channel = supabase
      .channel(`realtime-artist-work-${selectedArtist}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_work_events', filter: `artista_id=eq.${selectedArtist}` }, loadWork)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_todos', filter: `artista_id=eq.${selectedArtist}` }, loadWork)
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch (e) { console.error(e); }
    };
  }, [selectedArtist]);
  useEffect(() => {
    const loadArtistMusics = async () => {
      if (!selectedArtist) { setApprovedMusics([]); setMusicMetrics({}); return; }
      const { data: mus } = await supabase
        .from('musics')
        .select('id,titulo')
        .eq('artista_id', selectedArtist)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });
      setApprovedMusics(mus || []);
      const { data: ev } = await supabase
        .from('analytics_events')
        .select('type,music_id,duration_seconds')
        .eq('artist_id', selectedArtist)
        .in('type', ['music_play','music_click_presave']);
      const agg = {};
      (ev || []).forEach(e => {
        const mid = e.music_id || 'unknown';
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0, presaves: 0 };
        if (e.type === 'music_play') {
          agg[mid].plays += 1;
          agg[mid].totalSeconds += Number(e.duration_seconds || 0);
        } else if (e.type === 'music_click_presave') {
          agg[mid].presaves += 1;
        }
      });
      setMusicMetrics(agg);
    };
    loadArtistMusics();
  }, [selectedArtist]);
  useEffect(() => {
    const loadPlan = async () => {
      if (!selectedArtist) { setPlanForm({ plano: 'Gratuito', bonus_quota: 0, plan_started_at: '' }); return; }
      const { data } = await supabase
        .from('profiles')
        .select('plano, bonus_quota, plan_started_at')
        .eq('id', selectedArtist)
        .maybeSingle();
      setPlanForm({
        plano: data?.plano || 'Gratuito',
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
        const fileName = `${selectedArtist}-${Date.now()}.jpg`;
        const { data: uploadRes, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(uploadRes.path);
        avatar_url = publicUrl.publicUrl;
      }
      const updateData = {};
      if (name) updateData.nome = name;
      if (bio) updateData.bio = bio;
      if (avatar_url) updateData.avatar_url = avatar_url;
      if (Object.keys(updateData).length) {
        const { error } = await supabase.from('profiles').update(updateData).eq('id', selectedArtist);
        if (error) throw error;
      }
      addToast('Perfil do artista atualizado', 'success');
      setIsProfileOpen(false);
      load();
    } catch {
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
      const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', selectedArtist);
      if (error) throw error;
      addToast('Plano do artista atualizado', 'success');
    } catch {
      addToast('Falha ao atualizar plano', 'error');
    }
  };
  const createWorkEvent = async () => {
    if (!selectedArtist || !workEventForm.title.trim() || !workEventForm.date) { addToast('Informe artista, título e data', 'error'); return; }
    const { error } = await supabase
      .from('artist_work_events')
      .insert({
        artista_id: selectedArtist,
        title: workEventForm.title.trim(),
        date: workEventForm.date,
        type: workEventForm.type,
        created_by: (await supabase.auth.getUser()).data.user?.id || null
      });
    if (error) { addToast('Falha ao adicionar evento', 'error'); return; }
    addToast('Evento adicionado', 'success');
    setWorkEventForm({ title: '', date: '', type: 'lançamento' });
    loadWork();
  };
  const createTodo = async () => {
    if (!selectedArtist || !todoForm.title.trim()) { addToast('Informe artista e tarefa', 'error'); return; }
    const { error } = await supabase
      .from('artist_todos')
      .insert({
        artista_id: selectedArtist,
        title: todoForm.title.trim(),
        due_date: todoForm.due_date || null,
        status: 'pendente',
        created_by: (await supabase.auth.getUser()).data.user?.id || null
      });
    if (error) { addToast('Falha ao adicionar tarefa', 'error'); return; }
    addToast('Tarefa adicionada', 'success');
    setTodoForm({ title: '', due_date: '' });
    loadWork();
  };
  const updateTodoStatus = async (id, status) => {
    const { error } = await supabase.from('artist_todos').update({ status }).eq('id', id);
    if (error) { addToast('Falha ao atualizar tarefa', 'error'); return; }
    loadWork();
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="font-bold">Enviar música pelo artista</div>
        <div className="flex items-center gap-3">
          <AnimatedInput 
            placeholder="Buscar artista pelo nome" 
            value={searchName} 
            onChange={(e) => setSearchName(e.target.value)} 
          />
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={selectedArtist || ''} onChange={(e) => setSelectedArtist(e.target.value)}>
            <option value="">Selecione o artista</option>
            {(artists || [])
              .filter(a => {
                const term = searchName.toLowerCase();
                const n1 = (a.nome || '').toLowerCase();
                const n2 = (a.nome_completo_razao_social || '').toLowerCase();
                return n1.includes(term) || n2.includes(term);
              })
              .map(a => <option key={a.id} value={a.id}>{a.nome || a.nome_completo_razao_social || 'Sem nome'}</option>)}
          </select>
          <AnimatedButton onClick={() => setIsManagerOpen(true)}>Enviar Música</AnimatedButton>
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
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-beatwap-gold/60 border border-white/10 bg-black/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,197,66,0.25)]">
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
              <div className="flex-1">
                <div className="text-2xl font-extrabold text-white tracking-wide">
                  {artists.find(a => a.id === selectedArtist)?.nome || artists.find(a => a.id === selectedArtist)?.nome_completo_razao_social || 'Artista'}
                </div>
                <div className="text-xs text-gray-400">Artista selecionado</div>
              </div>
              <AnimatedButton onClick={() => setIsProfileOpen(true)}>Editar Perfil</AnimatedButton>
            </div>
          </motion.div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AnimatedInput placeholder="Plays" value={metricsForm.plays} onChange={(e) => setMetricsForm({ ...metricsForm, plays: e.target.value })} />
          <AnimatedInput placeholder="Listeners" value={metricsForm.listeners} onChange={(e) => setMetricsForm({ ...metricsForm, listeners: e.target.value })} />
          <AnimatedInput placeholder="Receita" value={metricsForm.revenue} onChange={(e) => setMetricsForm({ ...metricsForm, revenue: e.target.value })} />
          <AnimatedInput placeholder="Crescimento" value={metricsForm.growth} onChange={(e) => setMetricsForm({ ...metricsForm, growth: e.target.value })} />
        </div>
        <AnimatedButton onClick={handleUpdateMetrics}>Salvar métricas</AnimatedButton>
        {approvedMusics.length > 0 && (
          <div className="pt-6">
            <div className="font-bold mb-2">Métricas por Música (automático)</div>
            <div className="space-y-2">
              {approvedMusics.map(m => {
                const mm = musicMetrics[m.id] || { plays: 0, totalSeconds: 0, presaves: 0 };
                const hh = Math.floor(mm.totalSeconds / 3600);
                const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
                const ss = mm.totalSeconds % 60;
                const totalFmt = `${hh}h ${mmn}m ${ss}s`;
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white font-semibold">{m.titulo || 'Sem título'}</div>
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <span>Plays: <span className="text-white font-bold">{mm.plays}</span></span>
                      <span>Tempo total: <span className="text-white font-bold">{totalFmt}</span></span>
                      <span>Pré-saves: <span className="text-white font-bold">{mm.presaves}</span></span>
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
              <option value="Gratuito">Gratuito</option>
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [localInputs, setLocalInputs] = useState({});
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [musicToEdit, setMusicToEdit] = useState(null);

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
    let q = supabase
      .from('musics')
      .select('id,titulo,status,motivo_recusa,artista_id,upc,presave_link,release_date,created_at,cover_url,audio_url,authorization_url,is_beatwap_produced,show_on_home')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'todos') q = q.eq('status', statusFilter);
    if (artistFilter) q = q.eq('artista_id', artistFilter);
    if (startDate) q = q.gte('created_at', new Date(startDate).toISOString());
    if (endDate) q = q.lte('created_at', new Date(endDate).toISOString());
    const { data } = await q;
    setMusics(data || []);
  }, [statusFilter, artistFilter, startDate, endDate]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social')
        .eq('cargo', 'Artista')
        .order('nome', { ascending: true });
      setArtists(data || []);
    };
    fetchArtists();
  }, []);
  const approve = async (m) => {
    const inputs = localInputs[m.id] || {};
    const upcVal = (inputs.upc || '').trim();
    const presaveVal = (inputs.presave || '').trim();
    const releaseVal = (inputs.release_date || '').trim();
    const isProduced = inputs.is_beatwap_produced || false;
    const showHome = inputs.show_on_home || false;

    if (!upcVal) { addToast('Informe o UPC', 'error'); return; }
    await supabase
      .from('musics')
      .update({ 
        status: 'aprovado', 
        upc: upcVal, 
        presave_link: presaveVal || null, 
        release_date: releaseVal || null,
        is_beatwap_produced: isProduced,
        show_on_home: showHome
      })
      .eq('id', m.id);
    await addNotification({
      recipientId: m.artista_id,
      title: 'Música aprovada',
      message: `UPC: ${upcVal}. Pre-save: ${presaveVal || 'N/A'}. Lançamento: ${releaseVal || 'N/A'}`,
      type: 'success',
      link: presaveVal || null
    });
    setLocalInputs((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), upc: '', presave: '', release_date: '' } }));
    load();
  };
  const reject = async (m) => {
    const reason = (localInputs[m.id]?.reject || '').trim();
    if (!reason) { addToast('Informe o motivo da reprovação', 'error'); return; }
    await supabase.from('musics').update({ status: 'recusado', motivo_recusa: reason }).eq('id', m.id);
    await addNotification({ recipientId: m.artista_id, title: 'Música reprovada', message: reason, type: 'error' });
    setLocalInputs((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), reject: '' } }));
    load();
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="font-bold">Aprovar / Reprovar</div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('aprovado')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'aprovado' 
                ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Músicas Aprovadas
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'pendente' 
                ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('todos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === 'todos' 
                ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            Todas
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Status: Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)}>
            <option value="">Artista: Todos</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.nome || a.nome_completo_razao_social || 'Sem nome'}</option>)}
          </select>
          <input type="date" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <AnimatedButton onClick={load}>Filtrar</AnimatedButton>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {musics.map(m => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-black/20 flex flex-col md:flex-row items-center gap-4 hover:border-beatwap-gold/40 hover:shadow-[0_0_30px_rgba(245,197,66,0.18)]"
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
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-extrabold text-white tracking-wide">{m.titulo}</div>
                  <div className={`text-[11px] px-2 py-0.5 rounded-full border ${
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
                    <AnimatedButton onClick={() => window.open(m.authorization_url, '_blank')}>
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
                      {m.upc && (
                        <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                          UPC: {m.upc}
                        </div>
                      )}
                      {m.presave_link && (
                        <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                          Pré-save disponível
                        </div>
                      )}
                      {m.release_date && (
                        <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                          Lançamento: {m.release_date}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {m.status === 'pendente' && (
                <div className="flex flex-col w-full gap-3 mt-2 md:mt-0">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                    <AnimatedInput
                      placeholder="UPC"
                      value={localInputs[m.id]?.upc || ''}
                      onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), upc: e.target.value } }))}
                      className="w-full md:w-32"
                    />
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
                      placeholder="Data de lançamento"
                    />
                    <div className="flex flex-col gap-1 px-2">
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), is_beatwap_produced: !localInputs[m.id]?.is_beatwap_produced } }))}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${localInputs[m.id]?.is_beatwap_produced ? 'bg-beatwap-gold border-beatwap-gold text-black' : 'border-white/20 bg-white/5'}`}>
                          {localInputs[m.id]?.is_beatwap_produced && <Check size={12} strokeWidth={4} />}
                        </div>
                        <span className="text-[10px] text-gray-300 select-none">Prod. BeatWap</span>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), show_on_home: !localInputs[m.id]?.show_on_home } }))}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${localInputs[m.id]?.show_on_home ? 'bg-beatwap-gold border-beatwap-gold text-black' : 'border-white/20 bg-white/5'}`}>
                          {localInputs[m.id]?.show_on_home && <Check size={12} strokeWidth={4} />}
                        </div>
                        <span className="text-[10px] text-gray-300 select-none">Mostrar Home</span>
                      </div>
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
          ))}
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

export const AdminChat = () => {
  const { user } = useAuth();
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase
        .from('chats')
        .select('id')
        .limit(1)
        .maybeSingle();
      const cid = data?.id || null;
      setChatId(cid);
      if (cid) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', cid)
          .order('created_at', { ascending: true });
        setMessages(msgs || []);
        const channel = supabase
          .channel('public:messages')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${cid}` }, (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          })
          .subscribe();
        return () => {
          supabase.removeChannel(channel);
        };
      }
    };
    init();
  }, []);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    await supabase.from('messages').insert({ chat_id: chatId, sender_cargo: 'Produtor', message: input.trim() });
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
        cpf_cnpj: profile.cpf_cnpj || '',
        celular: profile.celular || '',
        instagram_url: profile.instagram_url || '',
        site_url: profile.site_url || '',
        genero_musical: profile.genero_musical || '',
        tema: profile.tema || 'dark',
        cep: profile.cep || '',
        logradouro: profile.logradouro || '',
        complemento: profile.complemento || '',
        bairro: profile.bairro || '',
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        plano: profile.plano || 'Gratuito'
      }));
      const missing = !profile.nome_completo_razao_social || !profile.cpf_cnpj || !profile.celular || !profile.cep || !profile.logradouro || !profile.cidade || !profile.estado;
      setMandatoryMissing(missing);
    }
  }, [user, profile]);

  useEffect(() => {
    const fetchArtists = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, bio')
        .eq('cargo', 'Artista')
        .order('nome', { ascending: true });
      setArtists(data || []);
    };
    fetchArtists();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo_razao_social: formData.nome_completo_razao_social,
          cpf_cnpj: formData.cpf_cnpj,
          celular: formData.celular,
          instagram_url: formData.instagram_url,
          site_url: formData.site_url,
          genero_musical: formData.genero_musical,
          tema: formData.tema,
          cep: formData.cep,
          logradouro: formData.logradouro,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArtistProfile = async ({ name, bio, blob }) => {
    try {
      if (!selectedArtistEdit) return;
      let avatar_url = null;
      if (blob) {
        const fileName = `${selectedArtistEdit}-${Date.now()}.jpg`;
        const { data: uploadRes, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(uploadRes.path);
        avatar_url = publicUrl.publicUrl;
      }
      const updateData = {};
      if (name) updateData.nome = name;
      if (bio) updateData.bio = bio;
      if (avatar_url) updateData.avatar_url = avatar_url;
      if (Object.keys(updateData).length) {
        const { error } = await supabase.from('profiles').update(updateData).eq('id', selectedArtistEdit);
        if (error) throw error;
      }
      addToast('Perfil do artista atualizado', 'success');
      setIsArtistProfileOpen(false);
    } catch {
      addToast('Falha ao atualizar perfil do artista', 'error');
    }
  };
  const handleAvatarSave = async ({ blob }) => {
    if (!blob || !user) return;
    try {
      setUploadingAvatar(true);
      const fileName = `${user.id}/${Date.now()}_avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = await supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
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
      const { error } = await supabase.auth.updateUser({ password: formData.nova_senha });
      if (error) throw error;
      addToast('Senha atualizada com sucesso!', 'success');
      setFormData(prev => ({ ...prev, nova_senha: '', confirmar_senha: '' }));
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar senha: ' + error.message, 'error');
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
    { id: 'artista', label: 'Perfil de Artista', icon: User },
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

        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="min-h-[400px]">
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
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                    <AnimatedButton onClick={() => setAvatarModalOpen(true)} variant="secondary">
                      Modificar Foto
                    </AnimatedButton>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4">Dados Pessoais</h3>
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
                      label="Instagram (URL)" 
                      value={formData.instagram_url} 
                      onChange={(e) => setFormData({...formData, instagram_url: e.target.value})} 
                      placeholder="https://instagram.com/seu_perfil"
                    />
                    <AnimatedInput 
                      label="Site (URL)" 
                      value={formData.site_url} 
                      onChange={(e) => setFormData({...formData, site_url: e.target.value})} 
                      placeholder="https://seusite.com"
                    />
                    <AnimatedInput 
                      label="Gênero Musical" 
                      value={formData.genero_musical} 
                      onChange={(e) => setFormData({...formData, genero_musical: e.target.value})} 
                      placeholder="Ex.: Sertanejo, Funk, Rap..."
                      className="md:col-span-2"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 mt-4">
                    <span className="text-gray-300">Tema da Interface</span>
                    <button 
                      onClick={() => setFormData({...formData, tema: formData.tema === 'dark' ? 'light' : 'dark'})}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/20"
                    >
                      {formData.tema === 'dark' ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-400" />}
                      <span className="text-sm capitalize">{formData.tema}</span>
                    </button>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <AnimatedButton onClick={handleSave} isLoading={loading} icon={Save}>Salvar Detalhes</AnimatedButton>
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
                  <div className="pt-4 flex justify-end">
                    <AnimatedButton onClick={handleSave} isLoading={loading} icon={Save}>Salvar Endereço</AnimatedButton>
                  </div>
                </div>
              )}


              {activeTab === 'contrato' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white mb-4">Contrato de Serviço</h3>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">Contrato de Distribuição Digital</h4>
                        <p className="text-sm text-gray-400 mt-1">Este é o contrato padrão que rege nossa parceria. Baixe, leia e mantenha uma cópia para seus registros.</p>
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
                    <div className="pt-4">
                      <AnimatedButton onClick={handlePasswordChange} isLoading={loading} icon={Lock}>Atualizar Senha</AnimatedButton>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
        {activeTab === 'artista' && (
          <Card className="space-y-4">
            <div className="font-bold">Editar perfil de um artista</div>
            <div className="flex items-center gap-3">
              <AnimatedInput 
                placeholder="Buscar artista pelo nome" 
                value={artistSearchName} 
                onChange={(e) => setArtistSearchName(e.target.value)} 
              />
              <select 
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" 
                value={selectedArtistEdit} 
                onChange={(e) => setSelectedArtistEdit(e.target.value)}
              >
                <option value="">Selecione o artista</option>
                {(artists || [])
                  .filter(a => {
                    const term = artistSearchName.toLowerCase();
                    const n1 = (a.nome || '').toLowerCase();
                    const n2 = (a.nome_completo_razao_social || '').toLowerCase();
                    return n1.includes(term) || n2.includes(term);
                  })
                  .map(a => <option key={a.id} value={a.id}>{a.nome || a.nome_completo_razao_social || 'Sem nome'}</option>)}
              </select>
              <AnimatedButton onClick={() => setIsArtistProfileOpen(true)}>Editar Perfil</AnimatedButton>
            </div>
          </Card>
        )}
        <ProfileEditModal
          isOpen={avatarModalOpen}
          onClose={() => setAvatarModalOpen(false)}
          currentAvatar={profile?.avatar_url}
          currentName={profile?.nome || profile?.nome_completo_razao_social}
          currentBio={''}
          onSave={handleAvatarSave}
          uploading={uploadingAvatar}
        />
        <ProfileEditModal
          isOpen={isArtistProfileOpen}
          onClose={() => setIsArtistProfileOpen(false)}
          currentAvatar={(artists.find(a => a.id === selectedArtistEdit)?.avatar_url) || null}
          currentName={(artists.find(a => a.id === selectedArtistEdit)?.nome) || ''}
          currentBio={(artists.find(a => a.id === selectedArtistEdit)?.bio) || ''}
          onSave={handleSaveArtistProfile}
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
  const loadSponsors = useCallback(async () => {
    try {
      setLoadingSponsors(true);
      const { data, error } = await supabase
        .from('sponsors')
        .select('id,name,logo_url,instagram_url,site_url,active,created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
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
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
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
    const namePart = (logoFile?.name || 'logo').replace(/\s+/g,'_');
    const fileName = `logo-${Date.now()}-${namePart}`;
    const { data: uploadRes, error: uploadErr } = await supabase.storage.from('sponsor_logos').upload(fileName, blobToUpload, { upsert: true });
    if (uploadErr) throw uploadErr;
    const { data: publicUrl } = supabase.storage.from('sponsor_logos').getPublicUrl(uploadRes.path);
    return publicUrl.publicUrl;
  };
  const createSponsor = async () => {
    const name = form.name.trim();
    if (!name) { addToast('Informe o nome da marca', 'error'); return; }
    try {
      const logo_url = logoFile ? await uploadLogo() : null;
      const { error } = await supabase.from('sponsors').insert({
        name,
        instagram_url: form.instagram_url || null,
        site_url: form.site_url || null,
        logo_url,
        active: true,
        created_by: user?.id || null
      });
      if (error) throw error;
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
      const { error } = await supabase.from('sponsors').update({ active }).eq('id', id);
      if (error) throw error;
      loadSponsors();
    } catch {
      addToast('Falha ao atualizar status', 'error');
    }
  };
  const deleteSponsor = async (id) => {
    try {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw error;
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
            <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden">
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
                onChange={(e) => setZoom(e.target.value)}
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
