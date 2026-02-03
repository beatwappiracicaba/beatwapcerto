import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { MusicUploadModal } from '../components/artist/MusicUploadModal';
import { Plus } from 'lucide-react';

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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [remainingUploads, setRemainingUploads] = useState(null);

  const fetchMusics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('musics')
      .select('id,titulo,status,motivo_recusa,created_at,cover_url,nome_artista,upc,presave_link')
      .eq('artista_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setMusics(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchMusics();
  }, [user, fetchMusics]);

  const computeRemaining = useCallback(async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('plano, bonus_quota, plan_started_at').eq('id', user.id).maybeSingle();
    const plan = (prof?.plano || 'Gratuito').toLowerCase();
    const bonus = Number(prof?.bonus_quota || 0);
    let base = 0;
    let start = null;
    let end = null;
    const now = new Date();
    if (plan.includes('avulso')) {
      base = 1;
      const ps = prof?.plan_started_at ? new Date(prof.plan_started_at) : now;
      start = ps.toISOString();
    } else if (plan.includes('mensal')) {
      base = 4;
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      start = monthStart.toISOString();
      end = monthEnd.toISOString();
    } else if (plan.includes('anual')) {
      base = 48;
      const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      start = yearStart.toISOString();
      end = yearEnd.toISOString();
    } else {
      base = 0;
    }
    let q = supabase
      .from('musics')
      .select('id', { count: 'exact', head: true })
      .eq('artista_id', user.id);
    if (start) q = q.gte('created_at', start);
    if (end) q = q.lte('created_at', end);
    const { count } = await q;
    const used = Number(count || 0);
    const remaining = Math.max(0, base + bonus - used);
    setRemainingUploads(remaining);
  }, [user]);

  useEffect(() => {
    computeRemaining();
  }, [computeRemaining]);

  return (
    <DashboardLayout>
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="text-xl font-semibold text-white">Minhas Músicas</div>
          <AnimatedButton 
            onClick={() => {
              if (remainingUploads !== null && remainingUploads <= 0) {
                const wa = 'https://wa.me/5519981083497?text=Quero%20contratar%20mais%20envios';
                window.open(wa, '_blank');
              } else {
                setIsUploadModalOpen(true);
              }
            }}
            icon={Plus}
          >
            Nova Música
          </AnimatedButton>
        </div>
        <div className="mb-3 text-sm text-gray-300">
          Envios restantes: {remainingUploads === null ? '...' : remainingUploads}
        </div>

        <div className="space-y-3">
          {loading && <div className="text-gray-400">Carregando...</div>}
          {!loading && musics.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p>Nenhuma música encontrada.</p>
              <p className="text-sm mt-2">Clique em &quot;Nova Música&quot; para começar.</p>
            </div>
          )}
          {!loading && musics.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                {m.cover_url ? (
                  <img src={m.cover_url} alt={m.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Capa</div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{m.titulo}</div>
                <div className="text-xs text-gray-400">{m.nome_artista} • {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  m.status === 'aprovado' ? 'bg-green-500/20 text-green-500' :
                  m.status === 'recusado' ? 'bg-red-500/20 text-red-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {m.status}
                </div>
                {m.status === 'aprovado' && (
                  <>
                    {m.upc && (
                      <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white">
                        UPC: {m.upc}
                      </div>
                    )}
                    {m.presave_link && (
                      <AnimatedButton 
                        onClick={() => navigator.clipboard.writeText(m.presave_link)}
                      >
                        Copiar Pré-save
                      </AnimatedButton>
                    )}
                  </>
                )}
                {m.motivo_recusa && (
                  <div className="text-xs text-red-400 max-w-[150px] truncate" title={m.motivo_recusa}>
                    {m.motivo_recusa}
                  </div>
                )}
              </div>
            </div>
          ))}
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
  const [sellers, setSellers] = useState([]);
  const [presence, setPresence] = useState([]);
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
    };
    if (user) init();
  }, [user]);
  useEffect(() => {
    const loadSellers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('cargo', 'Vendedor');
      const ids = (data || []).map(d => d.id);
      let pres = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from('online_status')
          .select('profile_id, online, updated_at')
          .in('profile_id', ids);
        pres = p || [];
      }
      setSellers(data || []);
      setPresence(pres);
    };
    loadSellers();
    const channel = supabase
      .channel('public:online_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_status' }, () => {
        loadSellers();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    await supabase.from('messages').insert({ chat_id: chatId, sender_cargo: 'Artista', message: input.trim() });
    setInput('');
  };
  return (
    <DashboardLayout>
      <Card className="space-y-4">
        <div className="text-sm text-beatwap-gold font-bold">Chat com Vendedor de Show</div>
        <div className="flex -space-x-2">
          {sellers.slice(0, 6).map(s => {
            const st = presence.find(p => p.profile_id === s.id);
            const fresh = st?.updated_at ? (Date.now() - new Date(st.updated_at).getTime()) < 120000 : false;
            return (
              <div key={s.id} className="w-8 h-8 rounded-full border-2 border-[#121212] overflow-hidden bg-gray-700 relative">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.nome || 'Vendedor'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                    {(s.nome || 'V').charAt(0)}
                  </div>
                )}
                {(st?.online && fresh) && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#121212]" />}
              </div>
            );
          })}
        </div>
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
