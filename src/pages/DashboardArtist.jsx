import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';

export const DashboardArtistHome = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchMetrics = async () => {
      const { data, error } = await supabase
        .from('artist_metrics')
        .select('*')
        .eq('artista_id', user.id)
        .maybeSingle();
      if (!error) setMetrics(data || { total_plays: 0, ouvintes_mensais: 0, receita_estimada: 0 });
      setLoading(false);
    };
    if (user) fetchMetrics();
  }, [user]);
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-sm text-gray-400">Total de Plays</div>
          <div className="text-3xl font-bold">{loading ? '...' : metrics?.total_plays ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400">Ouvintes Mensais</div>
          <div className="text-3xl font-bold">{loading ? '...' : metrics?.ouvintes_mensais ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400">Receita Estimada</div>
          <div className="text-3xl font-bold">{loading ? '...' : metrics?.receita_estimada ?? 0}</div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export const DashboardArtistMusics = () => {
  const { user } = useAuth();
  const [musics, setMusics] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchMusics = async () => {
      const { data, error } = await supabase
        .from('musics')
        .select('id,titulo,status,motivo_recusa,created_at')
        .eq('artista_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setMusics(data || []);
      setLoading(false);
    };
    if (user) fetchMusics();
  }, [user]);
  return (
    <DashboardLayout>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-semibold">Minhas Músicas</div>
        </div>
        <div className="space-y-3">
          {loading && <div className="text-gray-400">Carregando...</div>}
          {!loading && musics.length === 0 && <div className="text-gray-400">Nenhuma música encontrada.</div>}
          {!loading && musics.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-md border border-gray-800">
              <div>
                <div className="font-medium">{m.titulo}</div>
                <div className="text-xs text-gray-500">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-sm">{m.status}</div>
                {m.motivo_recusa && <div className="text-xs text-red-400">{m.motivo_recusa}</div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
};

export const DashboardArtistProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({ nome: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile) setForm({ nome: profile.nome || '', avatar_url: profile.avatar_url || '' });
  }, [profile]);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ nome: form.nome, avatar_url: form.avatar_url })
      .eq('id', user.id);
    if (!error) await refreshProfile();
    setSaving(false);
  };
  return (
    <DashboardLayout>
      <Card className="space-y-4">
        <AnimatedInput label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
        <AnimatedInput label="Avatar URL" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
        <AnimatedButton onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</AnimatedButton>
      </Card>
    </DashboardLayout>
  );
};

export const DashboardArtistChat = () => {
  const { user } = useAuth();
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const init = async () => {
      const { data: existing } = await supabase
        .from('chats')
        .select('id')
        .eq('artista_id', user.id)
        .limit(1)
        .maybeSingle();
      let cid = existing?.id;
      if (!cid) {
        const { data, error } = await supabase.from('chats').insert({ artista_id: user.id }).select('id').maybeSingle();
        if (!error) cid = data?.id;
      }
      setChatId(cid || null);
      if (cid) {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', cid)
          .order('created_at', { ascending: true });
        setMessages(data || []);
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
      setLoading(false);
    };
    if (user) init();
  }, [user]);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    await supabase.from('messages').insert({ chat_id: chatId, sender_cargo: 'Artista', message: input.trim() });
    setInput('');
  };
  return (
    <DashboardLayout>
      <Card className="space-y-4">
        {!chatId && <div className="text-gray-400">Criando chat...</div>}
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
    </DashboardLayout>
  );
};
