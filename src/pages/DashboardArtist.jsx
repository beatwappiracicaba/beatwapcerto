import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { MusicUploadModal } from '../components/artist/MusicUploadModal';
import { Plus, DollarSign, Folder, ChevronDown, ChevronRight } from 'lucide-react';

export const DashboardArtistHome = () => {
  const { user, profile } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCompositor = profile?.cargo && profile.cargo.toLowerCase().trim() === 'compositor';

  useEffect(() => {
    const fetchMetrics = async () => {
      const legacy = await api.get(`/admin/artist/${user.id}/metrics`);
      const events = await api.get(`/analytics/artist/${user.id}/events`);
      const shows = await api.get('/artist/finance/events');
      const allMusics = await api.get('/songs/mine');

      const showRevenue = (shows || []).reduce((acc, curr) => acc + (Number(curr.artist_share) || 0), 0) || 0;

      const musicIds = (allMusics || []).map(m => m.id);
      const musicMap = (allMusics || []).reduce((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {});
      
      let totalExternalPlays = 0;
      let totalExternalListeners = 0;
      let totalExternalRevenue = 0;
      
      if (musicIds.length > 0) {
        const extMetrics = await api.get('/songs/external-metrics');
          
        (extMetrics || []).forEach(em => {
          totalExternalPlays += Number(em.plays || 0);
          // Listeners might overlap between musics, but since we have no user ID for external listeners, 
          // we usually sum them or take max?
          // For simplicity and typical "monthly listeners" logic, usually it's per artist. 
          // But here we input per music. If user inputs 1000 listeners on Song A and 1000 on Song B, 
          // total listeners is hard to know without deduplication.
          // However, usually "Monthly Listeners" is an artist-level metric.
          // But the user asked to input metrics "of each music manually".
          // Let's sum them for now, or maybe the user inputs "Monthly Listeners" in the artist profile metrics (legacy)?
          // Actually, the legacy `artist_metrics` table had `listeners`. 
          // The new `music_external_metrics` has `listeners`.
          // Let's assume we sum them or take the max? Summing listeners across tracks usually inflates numbers.
          // Let's SUM for now as requested "put metrics of each music... and it appears".
          totalExternalListeners += Number(em.listeners || 0); 
          totalExternalRevenue += Number(em.revenue || 0);
        });
      }

      const agg = {
        plays: 0,
        listeners: new Set(),
        time: 0,
        profile_views: 0,
        social_clicks: 0
      };

      // Track plays per music to find Top 1
      const playsPerMusic = {}; // { musicId: count }

      (events || []).forEach(e => {
        if (e.type === 'music_play') {
          agg.plays++;
          agg.time += Number(e.duration_seconds || 0);
          if (e.ip_hash) agg.listeners.add(e.ip_hash);
          
          // Count internal plays per music
          const mid = e.music_id;
          if (mid) playsPerMusic[mid] = (playsPerMusic[mid] || 0) + 1;
        } else if (e.type === 'profile_view') {
          agg.profile_views++;
        } else if (e.type && e.type.startsWith('artist_click_')) {
          agg.social_clicks++;
        }
      });
      
      const extForTop = (await api.get('/songs/external-metrics')) || [];
      extForTop.forEach(em => {
        if (em.music_id) {
          playsPerMusic[em.music_id] = (playsPerMusic[em.music_id] || 0) + Number(em.plays || 0);
        }
      });

      // Find Top Music
      let topMusic = null;
      let maxPlays = -1;
      let topMusicId = null;
      
      for (const [mid, count] of Object.entries(playsPerMusic)) {
        if (count > maxPlays) {
          maxPlays = count;
          topMusicId = mid;
        }
      }
      
      if (topMusicId && musicMap[topMusicId]) {
         topMusic = { ...musicMap[topMusicId], totalPlays: maxPlays };
      }

      // Merge Internal + External totals
      const finalPlays = agg.plays + totalExternalPlays;
      const finalListeners = agg.listeners.size + totalExternalListeners; 
      const finalStreamingRevenue = (Number(legacy?.receita_estimada || 0)) + totalExternalRevenue;

      setMetrics({ 
        total_plays: finalPlays, 
        ouvintes_mensais: finalListeners, 
        receita_estimada: finalStreamingRevenue,
        tempo_ouvido: agg.time, 
        visitas_perfil: agg.profile_views,
        cliques_sociais: agg.social_clicks,
        faturamento_shows: showRevenue,
        topMusic
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
           <div className="flex items-center justify-between mb-4">
             <div className="text-sm text-gray-400"><span>Música com mais visualizações</span></div>
             <div className="px-2 py-1 bg-green-500/10 rounded-lg text-green-500 text-xs font-bold">TOP 1</div>
           </div>
           
           {(() => {
             if (loading) return <div className="text-2xl font-bold text-gray-500">...</div>;
             
             if (!metrics?.topMusic) {
               return <div className="text-sm text-gray-500">Nenhuma música com visualizações ainda.</div>;
             }
             
             const tm = metrics.topMusic;
             return (
               <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                   {tm.cover_url ? (
                     <img src={tm.cover_url} alt={tm.titulo} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Capa</div>
                   )}
                 </div>
                 <div>
                   <div className="font-bold text-xl text-white line-clamp-1">{tm.titulo}</div>
                   <div className="text-gray-400 text-sm">
                     <span className="text-beatwap-gold font-bold">{tm.totalPlays}</span> plays totais
                   </div>
                 </div>
               </div>
             );
           })()}
        </Card>
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
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
  const [expandedAlbums, setExpandedAlbums] = useState({});

  const fetchMusics = useCallback(async () => {
    setLoading(true);
    const data = await api.get('/songs/mine');
    setMusics(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchMusics();
  }, [user, fetchMusics]);

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
            title: m.album_title || m.titulo || 'Álbum',
            cover_url: m.cover_url,
            tracks: [],
            created_at: m.created_at,
            nome_artista: m.nome_artista
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

  const toggleAlbumExpanded = (albumId) => {
    setExpandedAlbums(prev => ({ ...prev, [albumId]: !prev[albumId] }));
  };
  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      
      const ev = await api.get(`/analytics/artist/${user.id}/events`);
        
      const agg = {};
      
      // Initialize with internal data
      (ev || []).forEach(e => {
        const mid = e.music_id || 'unknown';
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0, presaves: 0, revenue: 0 };
        if (e.type === 'music_play') {
          agg[mid].plays += 1;
          agg[mid].totalSeconds += Number(e.duration_seconds || 0);
        } else if (e.type === 'music_click_presave') {
          agg[mid].presaves += 1;
        }
      });

      const extMetrics = await api.get('/songs/external-metrics');
      (extMetrics || []).forEach(em => {
        const mid = em.music_id;
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0, presaves: 0, revenue: 0 };
        agg[mid].externalPlays = Number(em.plays || 0);
        agg[mid].externalRevenue = Number(em.revenue || 0);
      });

      setMusicMetrics(agg);
    };
    if (musics.length > 0) {
      loadMetrics();
    }
  }, [user, musics]);

  const renderTrackRow = (m, isAlbumTrack = false) => {
    const mm = musicMetrics[m.id] || { plays: 0, totalSeconds: 0, presaves: 0 };
    const hh = Math.floor(mm.totalSeconds / 3600);
    const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
    const ss = mm.totalSeconds % 60;
    const totalFmt = `${hh}h ${mmn}m ${ss}s`;
    const displayPlays = (mm.externalPlays || 0) + (mm.plays || 0);
    const displayRevenue = mm.externalRevenue ? ` • R$ ${mm.externalRevenue}` : '';

    return (
      <div
        key={m.id}
        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${isAlbumTrack ? 'ml-4 border-l-2 border-l-beatwap-gold/40' : ''}`}
      >
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
                <span>{`Plays: ${displayPlays}${displayRevenue} • Tempo total: ${totalFmt} • Pré-saves: ${mm.presaves || 0}`}</span>
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
              <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white whitespace-nowrap">
                <span>UPC: {m.upc || 'Pendente'}</span>
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-white/10 text-white whitespace-nowrap">
                <span>ISRC: {m.isrc || 'Pendente'}</span>
              </div>
              {m.presave_link && (
                <AnimatedButton 
                  onClick={() => navigator.clipboard.writeText(m.presave_link)}
                  className="w-full sm:w-auto justify-center"
                >
                  <span>
                    {(() => {
                      if (!m.release_date) return 'Copiar Pré-save';
                      try {
                        const [y, mo, d] = String(m.release_date).split('-');
                        const rDate = new Date(Number(y), Number(mo) - 1, Number(d));
                        const today = new Date(); today.setHours(0,0,0,0);
                        return rDate <= today ? 'Copiar Smartlink' : 'Copiar Pré-save';
                      } catch {
                        return 'Copiar Pré-save';
                      }
                    })()}
                  </span>
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
    );
  };

  const computeRemaining = useCallback(async () => {
    if (!user) return;
    const prof = await api.get('/profile');
    const plan = (prof?.plano || 'sem plano').toLowerCase();
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
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const r = await api.get(`/me/uploads/count?${params.toString()}`);
    const used = Number(r?.count || 0);
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
            {!loading && groupedMusics.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p><span>Nenhuma música encontrada.</span></p>
              <p className="text-sm mt-2"><span>Clique em &quot;Nova Música&quot; para começar.</span></p>
            </div>
          )}
            {!loading && groupedMusics.map(item => {
              if (item.type === 'album') {
                const albumId = item.id;
                const isExpanded = !!expandedAlbums[albumId];
                const approvedTracks = item.tracks.filter(t => t.status === 'aprovado');
                const totalMetrics = item.tracks.reduce((acc, t) => {
                  const mm = musicMetrics[t.id] || {};
                  acc.plays += (mm.plays || 0) + (mm.externalPlays || 0);
                  acc.revenue += mm.externalRevenue || 0;
                  return acc;
                }, { plays: 0, revenue: 0 });

                return (
                  <div key={albumId} className="border border-white/10 rounded-2xl bg-white/5">
                    <button
                      type="button"
                      onClick={() => toggleAlbumExpanded(albumId)}
                      className="w-full flex items-center justify-between gap-4 p-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gray-900 overflow-hidden flex items-center justify-center border border-white/10">
                          {item.cover_url ? (
                            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <Folder className="w-6 h-6 text-beatwap-gold" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{item.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-beatwap-gold uppercase font-semibold">
                              Álbum
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            <span>{item.nome_artista} • {item.tracks.length} faixas • {new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                          {approvedTracks.length > 0 && (
                            <div className="text-[11px] text-gray-300 mt-1">
                              <span>{`Aprovadas: ${approvedTracks.length} • Plays: ${totalMetrics.plays}${totalMetrics.revenue ? ` • R$ ${totalMetrics.revenue}` : ''}`}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span>{isExpanded ? 'Recolher' : 'Ver faixas'}</span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/10 p-3 space-y-2">
                        {item.tracks.map(track => renderTrackRow(track, true))}
                      </div>
                    )}
                  </div>
                );
              }
              return renderTrackRow(item, false);
            })}
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
      try {
        const msgs = await api.get('/messages');
        setMessages(msgs || []);
        setChatId('inbox');
      } catch (e) { console.error(e); }
    };
    if (user) init();
  }, [user]);
  useEffect(() => {
    const loadComposers = async () => {
      const data = await api.get('/composers');
      setComposers(data || []);
      setPresence([]);
    };
    loadComposers();
  }, []);
  const send = async () => {
    if (!chatId || !input.trim()) return;
    let receiver_id = null;
    for (const m of messages) {
      if (m.sender_id && m.sender_id !== user?.id) { receiver_id = m.sender_id; break; }
      if (m.receiver_id && m.receiver_id !== user?.id) { receiver_id = m.receiver_id; break; }
    }
    if (!receiver_id && composers.length) receiver_id = composers[0].id;
    if (!receiver_id) return;
    await api.post('/messages', { receiver_id, message: input.trim() });
    const msgs = await api.get('/messages');
    setMessages(msgs || []);
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
