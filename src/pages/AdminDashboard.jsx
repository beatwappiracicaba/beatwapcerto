import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, CreditCard, FileText, Lock, Save, Download, Moon, Sun, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../services/supabaseClient';
import { ArtistContentManager } from '../components/admin/ArtistContentManager';
import { ProfileEditModal } from '../components/ui/ProfileEditModal';
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
    project_url: '',
    platform_type: 'youtube',
    thumbnail_url: ''
  });
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
        .select('id,title,project_url,platform_type,thumbnail_url,created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setProjects(data || []);
    } catch {
      addToast('Falha ao carregar projetos', 'error');
    } finally {
      setLoadingProjects(false);
    }
  }, [addToast]);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  const createProject = async () => {
    const title = projectForm.title.trim();
    const url = projectForm.project_url.trim();
    const platform = projectForm.platform_type.trim();
    const thumb = (projectForm.thumbnail_url || '').trim();
    if (!title || !url || !platform) { addToast('Informe título, link e plataforma', 'error'); return; }
    try {
      if (!user?.id) { addToast('Usuário inválido', 'error'); return; }
      const { error } = await supabase.from('producer_projects').insert({
        producer_id: user.id,
        title,
        project_url: url,
        platform_type: platform,
        thumbnail_url: thumb || null
      });
      if (error) throw error;
      addToast('Projeto adicionado', 'success');
      setProjectForm({ title: '', project_url: '', platform_type: 'youtube', thumbnail_url: '' });
      loadProjects();
    } catch {
      addToast('Falha ao adicionar projeto', 'error');
    }
  };
  const deleteProject = async (id) => {
    try {
      const { error } = await supabase.from('producer_projects').delete().eq('id', id);
      if (error) throw error;
      addToast('Projeto removido', 'success');
      loadProjects();
    } catch {
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
          <AnimatedInput placeholder="Link do Projeto (YouTube/Spotify)" value={projectForm.project_url} onChange={(e) => setProjectForm({ ...projectForm, project_url: e.target.value })} />
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={projectForm.platform_type} onChange={(e) => setProjectForm({ ...projectForm, platform_type: e.target.value })}>
            <option value="youtube">YouTube</option>
            <option value="spotify">Spotify</option>
            <option value="other">Outro</option>
          </select>
          <AnimatedInput placeholder="Thumbnail (URL opcional)" value={projectForm.thumbnail_url} onChange={(e) => setProjectForm({ ...projectForm, thumbnail_url: e.target.value })} />
        </div>
        <AnimatedButton onClick={createProject}>Adicionar Projeto</AnimatedButton>
        <div className="pt-4">
          <div className="text-sm text-gray-400 mb-2">Últimos projetos adicionados</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(loadingProjects ? [] : projects).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700">
                  {p.thumbnail_url ? (
                    <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">{p.platform_type.toUpperCase()}</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-white text-sm truncate">{p.title}</div>
                  <div className="text-xs text-gray-400">{p.platform_type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatedButton onClick={() => window.open(p.project_url, '_blank')}>Abrir</AnimatedButton>
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ plays: '', listeners: '', revenue: '', growth: '' });
  const [searchName, setSearchName] = useState('');
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  const { getArtistById, updateArtistMetrics } = useData();
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
        <div className="font-bold">Gerenciar perfil e métricas do artista</div>
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
          <AnimatedButton onClick={() => setIsProfileOpen(true)}>Editar Perfil</AnimatedButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <AnimatedInput placeholder="Plays" value={metricsForm.plays} onChange={(e) => setMetricsForm({ ...metricsForm, plays: e.target.value })} />
          <AnimatedInput placeholder="Listeners" value={metricsForm.listeners} onChange={(e) => setMetricsForm({ ...metricsForm, listeners: e.target.value })} />
          <AnimatedInput placeholder="Receita" value={metricsForm.revenue} onChange={(e) => setMetricsForm({ ...metricsForm, revenue: e.target.value })} />
          <AnimatedInput placeholder="Crescimento" value={metricsForm.growth} onChange={(e) => setMetricsForm({ ...metricsForm, growth: e.target.value })} />
        </div>
        <AnimatedButton onClick={handleUpdateMetrics}>Salvar métricas</AnimatedButton>
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
  const load = useCallback(async () => {
    let q = supabase
      .from('musics')
      .select('id,titulo,status,motivo_recusa,artista_id,upc,presave_link,created_at')
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
    if (!upcVal) { addToast('Informe o UPC', 'error'); return; }
    await supabase.from('musics').update({ status: 'aprovado', upc: upcVal, presave_link: presaveVal || null }).eq('id', m.id);
    await addNotification({ recipientId: m.artista_id, title: 'Música aprovada', message: `UPC: ${upcVal}. Pre-save: ${presaveVal || 'N/A'}`, type: 'success', link: presaveVal || null });
    setLocalInputs((prev) => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), upc: '', presave: '' } }));
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
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="grid grid-cols-1 gap-3">
          {musics.map(m => (
            <div key={m.id} className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-white">{m.titulo}</div>
                <div className="text-xs text-gray-400">{m.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-32"
                  placeholder="UPC"
                  value={localInputs[m.id]?.upc || ''}
                  onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), upc: e.target.value } }))}
                />
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-48"
                  placeholder="Link de Pre-save"
                  value={localInputs[m.id]?.presave || ''}
                  onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), presave: e.target.value } }))}
                />
                <AnimatedButton onClick={() => approve(m)}>Aprovar</AnimatedButton>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-48"
                  placeholder="Motivo da reprovação"
                  value={localInputs[m.id]?.reject || ''}
                  onChange={(e) => setLocalInputs(prev => ({ ...prev, [m.id]: { ...(prev[m.id] || {}), reject: e.target.value } }))}
                />
                <AnimatedButton onClick={() => reject(m)}>Reprovar</AnimatedButton>
              </div>
            </div>
          ))}
        </div>
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
        <div className="flex justify-between items-center">
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
