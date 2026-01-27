import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';

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
  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome, avatar_url').eq('cargo', 'Artista');
    setArtists(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const sendMusic = async () => {
    if (!selectedArtist || !title.trim()) return;
    await supabase.from('musics').insert({ artista_id: selectedArtist, titulo: title, status: 'em_analise' });
    setTitle('');
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
          <AnimatedButton onClick={sendMusic}>Enviar</AnimatedButton>
        </div>
      </Card>
    </AdminLayout>
  );
};

export const AdminMusics = () => {
  const { addNotification } = useNotification();
  const [musics, setMusics] = useState([]);
  const [upc, setUpc] = useState('');
  const [presave, setPresave] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const load = useCallback(async () => {
    const { data } = await supabase
      .from('musics')
      .select('id,titulo,status,motivo_recusa,artista_id,upc,presave_link,created_at')
      .order('created_at', { ascending: false });
    setMusics(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);
  const approve = async (m) => {
    if (!upc.trim()) return;
    await supabase.from('musics').update({ status: 'aprovado', upc, presave_link: presave }).eq('id', m.id);
    await addNotification({ recipientId: m.artista_id, title: 'Música aprovada', message: `UPC: ${upc}. Pre-save: ${presave || 'N/A'}`, type: 'success', link: presave || null });
    setUpc('');
    setPresave('');
    load();
  };
  const reject = async (m) => {
    if (!rejectReason.trim()) return;
    await supabase.from('musics').update({ status: 'recusado', motivo_recusa: rejectReason }).eq('id', m.id);
    await addNotification({ recipientId: m.artista_id, title: 'Música reprovada', message: rejectReason, type: 'error' });
    setRejectReason('');
    load();
  };
  return (
    <AdminLayout>
      <Card className="space-y-4">
        <div className="font-bold">Aprovar / Reprovar</div>
        <div className="grid grid-cols-1 gap-3">
          {musics.map(m => (
            <div key={m.id} className="p-3 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold text-white">{m.titulo}</div>
                <div className="text-xs text-gray-400">{m.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-32" placeholder="UPC" value={upc} onChange={(e) => setUpc(e.target.value)} />
                <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-48" placeholder="Link de Pre-save" value={presave} onChange={(e) => setPresave(e.target.value)} />
                <AnimatedButton onClick={() => approve(m)}>Aprovar</AnimatedButton>
              </div>
              <div className="flex items-center gap-2">
                <input className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-48" placeholder="Motivo da reprovação" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
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
