import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { MusicUploadModal } from '../components/artist/MusicUploadModal';
import { Plus, DollarSign } from 'lucide-react';

export const DashboardArtistHome = () => {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCompositor = profile?.cargo && profile.cargo.toLowerCase().trim() === 'compositor';

  useEffect(() => {
    const fetchMetrics = async () => {
      // Legacy metrics
      const { data: legacy } = await supabase
        .from('artist_metrics')
        .select('*')
        .eq('artista_id', user.id)
        .maybeSingle();

      // Analytics events
      const { data: events } = await supabase
        .from('analytics_events')
        .select('type, duration_seconds, ip_hash')
        .eq('artist_id', user.id);

      // Show Revenue
      const { data: shows } = await supabase
        .from('artist_work_events')
        .select('artist_share')
        .eq('artista_id', user.id)
        .eq('status', 'pago');

      const showRevenue = shows?.reduce((acc, curr) => acc + (Number(curr.artist_share) || 0), 0) || 0;

      const agg = {
        plays: 0,
        listeners: new Set(),
        time: 0,
        profile_views: 0,
        social_clicks: 0
      };

      (events || []).forEach(e => {
        if (e.type === 'music_play') {
          agg.plays++;
          agg.time += Number(e.duration_seconds || 0);
          if (e.ip_hash) agg.listeners.add(e.ip_hash);
        } else if (e.type === 'profile_view') {
          agg.profile_views++;
        } else if (e.type && e.type.startsWith('artist_click_')) {
          agg.social_clicks++;
        }
      });

      setMetrics({ 
        total_plays: agg.plays, 
        ouvintes_mensais: agg.listeners.size, 
        receita_estimada: legacy?.receita_estimada || 0,
        tempo_ouvido: agg.time,
        visitas_perfil: agg.profile_views,
        cliques_sociais: agg.social_clicks,
        faturamento_shows: showRevenue
      });
      setLoading(false);
    };
    if (user) fetchMetrics();
  }, [user]);
  return (
    <DashboardLayout>
      {!isCompositor && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="text-sm text-gray-400"><span>Total de Plays</span></div>
            <div className="text-3xl font-bold"><span>{loading ? '...' : metrics?.total_plays ?? 0}</span></div>
          </Card>
          <Card>
            <div className="text-sm text-gray-400"><span>Ouvintes</span></div>
            <div className="text-3xl font-bold"><span>{loading ? '...' : metrics?.ouvintes_mensais ?? 0}</span></div>
          </Card>
          <Card>
            <div className="text-sm text-gray-400"><span>Receita Estimada (Streaming)</span></div>
            <div className="text-3xl font-bold"><span>{loading ? '...' : metrics?.receita_estimada ?? 0}</span></div>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign size={80} className="text-green-500" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-500/10 rounded-lg text-green-500"><DollarSign size={16} /></div>
              <span className="text-sm text-gray-400">Faturamento Shows</span>
            </div>
            <div className="text-3xl font-bold text-white relative z-10">
              <span>{loading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics?.faturamento_shows || 0)}</span>
            </div>
          </Card>
        </div>
      )}
      
      {!isCompositor && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
          <p className="text-sm text-yellow-200">
            ⚠️ O dinheiro das vendas cai direto na conta da produtora e a produtora faz os repasses conforme é para cada um ganhar. 
            A produtora retém uma porcentagem para a manutenção do site.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-sm text-gray-400"><span>Tempo Ouvido</span></div>
          <div className="text-3xl font-bold">
            <span>
            {loading ? '...' : (() => {
               const s = metrics?.tempo_ouvido || 0;
               const h = Math.floor(s / 3600);
               const m = Math.floor((s % 3600) / 60);
               return `${h}h ${m}m`;
            })()}
            </span>
          </div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400"><span>Visitas no Perfil</span></div>
          <div className="text-3xl font-bold"><span>{loading ? '...' : metrics?.visitas_perfil ?? 0}</span></div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400"><span>Cliques Sociais</span></div>
          <div className="text-3xl font-bold"><span>{loading ? '...' : metrics?.cliques_sociais ?? 0}</span></div>
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
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [musicMetrics, setMusicMetrics] = useState({});

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
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      const { data: ev } = await supabase
        .from('analytics_events')
        .select('type,music_id,duration_seconds')
        .eq('artist_id', user.id)
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
    loadMetrics();
  }, [user]);

  const computeRemaining = useCallback(async () => {
    if (!user) return;
    const { data: prof } = await supabase.from('profiles').select('plano, bonus_quota, plan_started_at').eq('id', user.id).maybeSingle();
    const plan = (prof?.plano || 'Gratuito').toLowerCase();
    const bonus = Number(prof?.bonus_quota || 0);
    let base = 0;
    let start = null;
    let end = null;
    const now = new Date();
    setIsUnlimited(false);
    if (plan.includes('avulso')) {
      base = 1;
      const ps = prof?.plan_started_at ? new Date(prof.plan_started_at) : now;
      start = ps.toISOString();
    } else if (plan.includes('vitalicio')) {
      setIsUnlimited(true);
      setRemainingUploads(null);
      return;
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div className="text-xl font-semibold text-white"><span>Minhas Músicas</span></div>
          <AnimatedButton 
            onClick={() => {
              if (!isUnlimited && remainingUploads !== null && remainingUploads <= 0) {
                const wa = 'https://wa.me/5519981083497?text=Quero%20contratar%20mais%20envios';
                window.open(wa, '_blank');
              } else {
                setIsUploadModalOpen(true);
              }
            }}
            icon={Plus}
          >
            <span>Nova Música</span>
          </AnimatedButton>
        </div>
        <div className="mb-3 text-sm text-gray-300">
          <span>Envios restantes: {isUnlimited ? 'Ilimitado' : (remainingUploads === null ? '...' : remainingUploads)}</span>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-gray-400"><span>Carregando...</span></div>}
          {!loading && musics.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p><span>Nenhuma música encontrada.</span></p>
              <p className="text-sm mt-2"><span>Clique em &quot;Nova Música&quot; para começar.</span></p>
            </div>
          )}
          {!loading && musics.map((m) => (
            <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-4 w-full sm:flex-1 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                  {m.cover_url ? (
                    <img src={m.cover_url} alt={m.titulo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs"><span>Capa</span></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate"><span>{m.titulo}</span></div>
                  <div className="text-xs text-gray-400 truncate"><span>{m.nome_artista} • {new Date(m.created_at).toLocaleDateString()}</span></div>
                  {m.status === 'aprovado' && (
                    <div className="mt-1 text-xs text-gray-300">
                      <span>
                      {(() => {
                        const mm = musicMetrics[m.id] || { plays: 0, totalSeconds: 0, presaves: 0 };
                        const hh = Math.floor(mm.totalSeconds / 3600);
                        const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
                        const ss = mm.totalSeconds % 60;
                        const totalFmt = `${hh}h ${mmn}m ${ss}s`;
                        return `Plays: ${mm.plays} • Tempo total: ${totalFmt} • Pré-saves: ${mm.presaves}`;
                      })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
                <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  m.status === 'aprovado' ? 'bg-green-500/20 text-green-500' :
                  m.status === 'recusado' ? 'bg-red-500/20 text-red-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  <span>{m.status}</span>
                </div>
                {m.status === 'aprovado' && (
                  <>
                    {m.upc && (
                      <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white whitespace-nowrap">
                        <span>UPC: {m.upc}</span>
                      </div>
                    )}
                    {m.presave_link && (
                      <AnimatedButton 
                        onClick={() => navigator.clipboard.writeText(m.presave_link)}
                        className="w-full sm:w-auto justify-center"
                      >
                        <span>Copiar Pré-save</span>
                      </AnimatedButton>
                    )}
                  </>
                )}
                {m.motivo_recusa && (
                  <div className="text-xs text-red-400 max-w-full sm:max-w-[150px] truncate" title={m.motivo_recusa}>
                    <span>{m.motivo_recusa}</span>
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
  const [composers, setComposers] = useState([]);
  const [presence, setPresence] = useState([]);
  useEffect(() => {
    const init = async () => {
      const { data: existing } = await supabase
        .from('chats')
        .select('id')
        .contains('participant_ids', [user.id])
        .limit(1)
        .maybeSingle();
      let cid = existing?.id;
      if (!cid) {
        const { data, error } = await supabase.from('chats').insert({ 
          participant_ids: [user.id],
          owner_id: user.id 
        }).select('id').maybeSingle();
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
    const loadComposers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('cargo', 'Compositor');
      const ids = (data || []).map(d => d.id);
      let pres = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from('online_status')
          .select('profile_id, online, updated_at')
          .in('profile_id', ids);
        pres = p || [];
      }
      setComposers(data || []);
      setPresence(pres);
    };
    loadComposers();
    const channel = supabase
      .channel('public:online_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_status' }, () => {
        loadComposers();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    await supabase.from('messages').insert({ 
      chat_id: chatId, 
      sender_id: user.id, 
      content: input.trim(),
      metadata: { sender_cargo: 'Artista' }
    });
    setInput('');
  };
  return (
    <DashboardLayout>
      <Card className="space-y-4">
        <div className="text-sm text-beatwap-gold font-bold"><span>Chat com Compositor</span></div>
        <div className="flex -space-x-2">
          {composers.slice(0, 6).map(s => {
            const st = presence.find(p => p.profile_id === s.id);
            const fresh = st?.updated_at ? (Date.now() - new Date(st.updated_at).getTime()) < 120000 : false;
            return (
              <div key={s.id} className="w-8 h-8 rounded-full border-2 border-[#121212] overflow-hidden bg-gray-700 relative">
                {s.avatar_url ? (
                  <img src={s.avatar_url} alt={s.nome || 'Compositor'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-white font-bold">
                    <span>{(s.nome || 'C').charAt(0)}</span>
                  </div>
                )}
                {(st?.online && fresh) && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#121212]" />}
              </div>
            );
          })}
        </div>
        {!chatId && <div className="text-gray-400"><span>Criando chat...</span></div>}
        {chatId && (
          <>
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {messages.map((m) => (
                <div key={m.id} className="p-2 rounded-md border border-gray-800">
                  <div className="text-xs text-gray-500"><span>{m.sender_cargo}</span></div>
                  <div><span>{m.message}</span></div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <AnimatedInput placeholder="Escreva uma mensagem..." value={input} onChange={(e) => setInput(e.target.value)} />
              <AnimatedButton onClick={send}><span>Enviar</span></AnimatedButton>
            </div>
          </>
        )}
      </Card>
    </DashboardLayout>
  );
};
