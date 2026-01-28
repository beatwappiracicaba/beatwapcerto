import { useEffect, useState, useCallback } from 'react';
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

export const AdminHome = () => {
  const [counts, setCounts] = useState({ artists: 0, musics: 0, pending: 0 });
  useEffect(() => {
    const load = async () => {
      const { count: artistsCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('cargo', 'Artista');
      const { count: musicsCount } = await supabase.from('musics').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('musics').select('*', { count: 'exact', head: true }).eq('status', 'em_analise');
      setCounts({ artists: artistsCount || 0, musics: musicsCount || 0, pending: pendingCount || 0 });
    };
    load();
  }, []);
  return (
    <AdminLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><div className="text-sm text-gray-400">Artistas</div><div className="text-3xl font-bold">{counts.artists}</div></Card>
        <Card><div className="text-sm text-gray-400">Músicas</div><div className="text-3xl font-bold">{counts.musics}</div></Card>
        <Card><div className="text-sm text-gray-400">Pendentes</div><div className="text-3xl font-bold">{counts.pending}</div></Card>
      </div>
    </AdminLayout>
  );
};

export const AdminArtists = () => {
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [title, setTitle] = useState('');
  const [isrc, setIsrc] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [plataformas, setPlataformas] = useState('Todas');
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [metricsForm, setMetricsForm] = useState({ plays: '', listeners: '', revenue: '', growth: '' });
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  const { getArtistById, updateArtistMetrics } = useData();
  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome, avatar_url').eq('cargo', 'Artista');
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
  const sendMusic = async () => {
    if (!selectedArtist) { addToast('Selecione o artista', 'error'); return; }
    if (!title.trim()) { addToast('Informe o título', 'error'); return; }
    if (!audioUrl.trim()) { addToast('Informe o link do áudio', 'error'); return; }
    try {
      await supabase.from('musics').insert({ 
        artista_id: selectedArtist, 
        titulo: title, 
        status: 'em_analise',
        isrc: isrc || null,
        audio_url: audioUrl,
        cover_url: coverUrl || null,
        plataformas: plataformas === 'Todas' ? ['Todas'] : plataformas.split(',').map(s => s.trim())
      });
      addToast('Música enviada para análise', 'success');
      setTitle(''); setIsrc(''); setAudioUrl(''); setCoverUrl('');
    } catch (e) {
      addToast('Falha ao enviar música', 'error');
    }
  };
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
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={selectedArtist || ''} onChange={(e) => setSelectedArtist(e.target.value)}>
            <option value="">Selecione o artista</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.nome || a.id}</option>)}
          </select>
          <AnimatedInput placeholder="Título da música" value={title} onChange={(e) => setTitle(e.target.value)} />
          <AnimatedInput placeholder="ISRC (opcional)" value={isrc} onChange={(e) => setIsrc(e.target.value)} />
          <AnimatedInput placeholder="Link do áudio (obrigatório)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
          <AnimatedInput placeholder="Capa (URL opcional)" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
          <AnimatedInput placeholder="Plataformas (ex: Spotify, Apple)" value={plataformas} onChange={(e) => setPlataformas(e.target.value)} />
          <AnimatedButton onClick={sendMusic}>Enviar</AnimatedButton>
          <AnimatedButton onClick={() => setIsManagerOpen(true)}>Abrir painel completo</AnimatedButton>
        </div>
      </Card>
      <Card className="space-y-4">
        <div className="font-bold">Gerenciar perfil e métricas do artista</div>
        <div className="flex items-center gap-3">
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={selectedArtist || ''} onChange={(e) => setSelectedArtist(e.target.value)}>
            <option value="">Selecione o artista</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.nome || a.id}</option>)}
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
  const [statusFilter, setStatusFilter] = useState('em_analise');
  const [artistFilter, setArtistFilter] = useState('');
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
        <div className="flex flex-wrap items-center gap-2">
          <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="todos">Status: Todos</option>
            <option value="em_analise">Em análise</option>
            <option value="aprovado">Aprovado</option>
            <option value="recusado">Recusado</option>
          </select>
          <AnimatedInput placeholder="ID do artista (opcional)" value={artistFilter} onChange={(e) => setArtistFilter(e.target.value)} />
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
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const handleSave = async ({ name, bio, blob }) => {
    try {
      setUploading(true);
      let avatar_url = profile?.avatar_url || null;
      if (blob) {
        const fileName = `${user.id}-${Date.now()}.jpg`;
        const { data: uploadRes, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(uploadRes.path);
        avatar_url = publicUrl.publicUrl;
      }
      const { error } = await supabase.from('profiles').update({
        nome: name || profile?.nome,
        bio: bio || profile?.bio || null,
        avatar_url
      }).eq('id', user.id);
      if (error) throw error;
      addToast('Perfil atualizado', 'success');
      setIsOpen(false);
    } catch (e) {
      addToast('Falha ao atualizar perfil', 'error');
    } finally {
      setUploading(false);
    }
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400">Perfil</div>
            <div className="text-2xl font-bold">{profile?.nome || 'Produtor'}</div>
          </div>
          <AnimatedButton onClick={() => setIsOpen(true)}>Editar Perfil</AnimatedButton>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-gray-800 flex items-center justify-center">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-gray-400">Sem avatar</span>}
          </div>
          <div className="text-gray-400">
            {profile?.bio || 'Adicione uma bio no seu perfil.'}
          </div>
        </div>
      </Card>
      <ProfileEditModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        currentAvatar={profile?.avatar_url || null}
        currentName={profile?.nome || ''}
        currentBio={profile?.bio || ''}
        onSave={handleSave}
        uploading={uploading}
      />
    </AdminLayout>
  );
};
