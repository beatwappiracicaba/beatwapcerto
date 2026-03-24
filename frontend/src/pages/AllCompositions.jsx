import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/landing/Footer';
import { apiClient } from '../services/apiClient';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Play, Pause, Music, MessageCircle, ArrowLeft, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { decryptData } from '../utils/security';

const buildWhatsAppHref = (rawPhone, title) => {
  const dec = decryptData(rawPhone);
  const raw = dec || rawPhone;
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  const text = encodeURIComponent(`Olá, vi sua composição "${title}" na BeatWap e gostaria de saber mais.`);
  return `https://wa.me/${phone}?text=${text}`;
};

const formatWhatsAppPhone = (rawPhone) => {
  const dec = decryptData(rawPhone);
  const raw = dec || rawPhone;
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
  const ddd = national.slice(0, 2);
  const rest = national.slice(2);
  if (rest.length === 8) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  if (rest.length === 9) return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  return `+${normalized}`;
};

const sanitizeUrl = (u) => String(u || '').trim().replace(/^[`'"]+|[`'"]+$/g, '');

const canonicalizeHashtag = (raw) => {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!s.startsWith('#')) s = `#${s}`;
  s = `#${s.slice(1).replace(/\s+/g, '')}`;
  s = `#${s.slice(1).replace(/[^\p{L}\p{N}_]/gu, '')}`;
  if (s.length < 2) return null;
  return s;
};

const hashtagKey = (canonical) => {
  const s = String(canonical || '').trim();
  if (!s || !s.startsWith('#')) return '';
  const body = s
    .slice(1)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (!body) return '';
  return `#${body}`;
};

const AllCompositions = () => {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [globalHashtags, setGlobalHashtags] = useState([]);
  const [activeHashtags, setActiveHashtags] = useState([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [artistModalOpen, setArtistModalOpen] = useState(false);
  const [likesMap, setLikesMap] = useState({});
  const [artistsQuick, setArtistsQuick] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAll();
    fetchHashtags();
    fetchLikesSnapshot();
    return () => {
      if (audioElement) audioElement.pause();
    };
  }, []);

  const fetchHashtags = async () => {
    try {
      const data = await apiClient.get('/hashtags', { cache: true, cacheTtlMs: 15000 });
      setGlobalHashtags(Array.isArray(data) ? data : []);
    } catch {
      setGlobalHashtags([]);
    }
  };

  const fetchLikesSnapshot = async () => {
    try {
      const home = await apiClient.get('/home', { cache: true, cacheTtlMs: 15000 });
      const arr = Array.isArray(home?.compositionsApproved) ? home.compositionsApproved : [];
      const map = {};
      for (const c of arr) {
        const id = String(c?.id || '').trim();
        if (!id) continue;
        map[id] = Number(c?.likes_count || 0) || 0;
      }
      setLikesMap(map);
    } catch {
      setLikesMap({});
    }
  };

  const fetchAll = async () => {
    try {
      const data = await apiClient.get('/compositions');
      const mapped = (data || []).map(c => {
        const rawName = c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || c?.nome || '';
        const decName = decryptData(rawName);
        return {
          ...c,
          composer_id: c?.composer_id || c?.composerId || c?.user_id || c?.userId || c?.profile_id || c?.profileId,
          composer_name: decName || rawName || 'Autor',
          composer_phone: c?.composer_phone || c?.celular || c?.whatsapp || c?.phone || null
        };
      }).sort((a, b) => {
        const da = new Date(a.created_at || a.createdAt || 0).getTime();
        const db = new Date(b.created_at || b.createdAt || 0).getTime();
        return db - da;
      });
      const enriched = await enrichFromProfiles(mapped);
      setList(enriched || mapped);
      try {
        const artists = await apiClient.get('/profiles/artists/all', { cache: true, cacheTtlMs: 30000 });
        const names = (artists || []).map(a => ({ id: String(a?.id || ''), name: decryptData(a?.nome) || a?.nome || 'Artista', avatar: a?.avatar_url || a?.avatar || null }));
        setArtistsQuick(names.filter(a => a.id));
      } catch {
        setArtistsQuick([]);
      }
    } catch {
      setList([]);
    }
  };

  const enrichFromProfiles = async (comps) => {
    const missing = new Set();
    (comps || []).forEach((c) => {
      const id = c?.composer_id;
      if (!id) return;
      const hasName = !!(c?.composer_name && c.composer_name !== 'Autor');
      const hasPhone = !!formatWhatsAppPhone(c?.composer_phone);
      if (!hasName || !hasPhone) missing.add(String(id));
    });
    const ids = Array.from(missing);
    if (!ids.length) return comps;
    const results = await Promise.allSettled(ids.map((id) => apiClient.get(`/profiles/${id}`, { cache: true, cacheTtlMs: 15000 })));
    const byId = new Map();
    results.forEach((r) => {
      if (r.status !== 'fulfilled') return;
      const p = r.value;
      if (!p?.id) return;
      byId.set(String(p.id), p);
    });
    return (comps || []).map((c) => {
      const id = c?.composer_id;
      const p = id ? byId.get(String(id)) : null;
      if (!p) return c;
      const name = (c?.composer_name && c.composer_name !== 'Autor')
        ? c.composer_name
        : ((decryptData(p.nome) || decryptData(p.nome_completo_razao_social)) || (p.nome || p.nome_completo_razao_social) || 'Autor');
      const phone = c?.composer_phone || p.celular || p.phone || null;
      const avatar = p.avatar_url || p.avatar || null;
      return { ...c, composer_name: name, composer_phone: phone, composer_avatar: avatar };
    });
  };

  const [previewTimer, setPreviewTimer] = useState(null);
  const togglePlay = (id, url, opts = {}) => {
    if (!url) return;
    if (playingTrack === id && audioElement) {
      if (isPaused) {
        audioElement.play();
        setIsPaused(false);
      } else {
        audioElement.pause();
        setIsPaused(true);
      }
      return;
    }
    if (audioElement) {
      audioElement.pause();
    }
    const audio = new Audio(url);
    const start = Math.max(0, Number(opts.startSeconds ?? 0));
    const endOpt = opts.endSeconds;
    let segLen = 30;
    if (Number.isFinite(Number(endOpt))) {
      const diff = Number(endOpt) - start;
      if (diff > 0) segLen = diff;
    }
    const durationLimit = Math.min(30, Math.max(20, segLen));
    audio.addEventListener('loadedmetadata', () => {
      try { audio.currentTime = start; } catch (e) { void e; }
    }, { once: true });
    audio.onended = () => {
      setPlayingTrack(null);
      setAudioElement(null);
      setIsPaused(false);
    };
    audio.play().catch(() => {});
    setAudioElement(audio);
    setIsPaused(false);
    setPlayingTrack(id);
    if (previewTimer) {
      clearTimeout(previewTimer);
      setPreviewTimer(null);
    }
    const t = setTimeout(() => {
      try { audio.pause(); } catch (e) { void e; }
      setPlayingTrack(null);
      setAudioElement(null);
      setIsPaused(false);
    }, durationLimit * 1000);
    setPreviewTimer(t);
  };

  const folders = (() => {
    const byComposer = new Map();
    (list || []).forEach((c) => {
      const key = String(c.composer_id || 'unknown');
      if (!byComposer.has(key)) {
        byComposer.set(key, {
          id: key,
          name: c.composer_name || 'Compositor',
          phone: c.composer_phone || null,
          avatar: c.composer_avatar || null,
          items: [],
        });
      }
      const g = byComposer.get(key);
      if (!g.name && c.composer_name) g.name = c.composer_name;
      if (!g.phone && c.composer_phone) g.phone = c.composer_phone;
      if (!g.avatar && c.composer_avatar) g.avatar = c.composer_avatar;
      g.items.push(c);
    });
    const arr = Array.from(byComposer.values());
    arr.forEach(g => g.items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    arr.sort((a, b) => {
      const da = new Date(a.items[0]?.created_at || 0).getTime();
      const db = new Date(b.items[0]?.created_at || 0).getTime();
      return db - da;
    });
    return arr;
  })();

  const selectedFolder = selectedFolderId ? folders.find((f) => String(f.id) === String(selectedFolderId)) : null;
  const topSix = (() => {
    const items = selectedFolder?.items || [];
    return items
      .slice()
      .map(c => ({ ...c, _likes: Number(likesMap[String(c.id)] || 0) }))
      .sort((a, b) => (b._likes - a._likes))
      .slice(0, 6);
  })();
  const availableHashtags = (() => {
    const counts = new Map();
    const display = new Map();
    const add = (raw, inc) => {
      const t = canonicalizeHashtag(raw);
      if (!t) return;
      const key = hashtagKey(t);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + inc);
      if (!display.has(key)) display.set(key, t);
    };
    if (selectedFolder?.items) {
      for (const comp of selectedFolder.items) {
        const tags = Array.isArray(comp?.hashtags) ? comp.hashtags : [];
        for (const t of tags) add(t, 2);
      }
    }
    for (const t of globalHashtags) add(t, 1);
    return Array.from(counts.keys())
      .sort((a, b) => {
        const ca = counts.get(a) || 0;
        const cb = counts.get(b) || 0;
        if (ca !== cb) return cb - ca;
        return a.localeCompare(b);
      })
      .map((k) => display.get(k))
      .filter(Boolean);
  })();
  const activeHashtagKeys = new Set((activeHashtags || []).map(hashtagKey).filter(Boolean));
  const toggleHashtag = (raw) => {
    const t = canonicalizeHashtag(raw);
    if (!t) return;
    const key = hashtagKey(t);
    if (!key) return;
    setActiveHashtags((prev) => {
      const has = prev.some((x) => hashtagKey(x) === key);
      if (has) return prev.filter((x) => hashtagKey(x) !== key);
      return [...prev, t];
    });
  };

  return (
    <div className="min-h-screen bg-beatwap-black text-white flex flex-col">
      <main className="flex-1">
        <section className="py-12 px-6 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Todas as Composições</h1>
                <p className="text-gray-400">Obras listadas da mais recente para a mais antiga</p>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <AnimatedButton onClick={() => setArtistModalOpen(true)}><span className="inline-flex items-center gap-2"><Users size={16} /> Selecionar Artista</span></AnimatedButton>
                  <AnimatedButton onClick={() => navigate('/')}>Voltar para Home</AnimatedButton>
                </div>
              </div>
            </div>
            <div className="sm:hidden mb-6">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>
              <div className="mt-3">
                <button
                  onClick={() => setArtistModalOpen(true)}
                  className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors w-full justify-center"
                >
                  <Users size={16} />
                  Selecionar Artista
                </button>
              </div>
            </div>
            {selectedFolder ? (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedFolderId(null)}
                        className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
                      >
                        <ArrowLeft size={16} />
                        Voltar para pastas
                      </button>
                      <div className="min-w-0">
                        <h2 className="text-xl sm:text-2xl font-bold truncate">{selectedFolder.name || 'Compositor'}</h2>
                        <div className="text-sm text-gray-400">
                          {selectedFolder.items.length} {selectedFolder.items.length === 1 ? 'faixa' : 'faixas'}
                        </div>
                      </div>
                    </div>
                    {selectedFolder.phone ? (
                      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="text-sm text-gray-300">{formatWhatsAppPhone(selectedFolder.phone) || 'WhatsApp não informado'}</div>
                        <button
                          onClick={() => {
                            const href = buildWhatsAppHref(selectedFolder.phone, `Obras de ${selectedFolder.name || 'Compositor'}`);
                            if (!href) return;
                            window.open(href, '_blank');
                          }}
                          className="inline-flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-2 rounded-lg hover:bg-green-400/20 transition-colors w-full sm:w-auto justify-center"
                        >
                          <MessageCircle size={14} />
                          Chamar no WhatsApp
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-gray-500">WhatsApp não informado</div>
                    )}
                  </div>
                </div>
                {topSix.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-bold text-white">Top 6 por curtidas</div>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {topSix.map((comp) => {
                        const ccover = sanitizeUrl(comp.cover_url);
                        const caudio = sanitizeUrl(comp.audio_url);
                        const isPlayingThis = playingTrack === comp.id && !isPaused;
                        return (
                          <div key={`top_${comp.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <div
                              className="w-12 h-12 rounded-lg overflow-hidden bg-gray-800 shrink-0 cursor-pointer relative"
                              onClick={() => togglePlay(comp.id, caudio, { startSeconds: Number(comp.chorus_start_seconds ?? 0), endSeconds: Number(comp.chorus_end_seconds ?? NaN) })}
                            >
                              {ccover ? (
                                <img src={ccover} alt={comp.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                  <Music size={18} />
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                <div className="w-8 h-8 bg-beatwap-gold rounded-full flex items-center justify-center text-black">
                                  {isPlayingThis ? <Pause fill="currentColor" className="ml-0.5" /> : <Play fill="currentColor" className="ml-0.5" />}
                                </div>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-white truncate">{comp.title}</div>
                              <div className="text-[11px] text-gray-400">Curtidas: {Number(likesMap[String(comp.id)] || 0)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <label className="text-sm font-bold text-gray-400">Filtrar por hashtags</label>
                  <div className="flex flex-wrap gap-2">
                    {availableHashtags.slice(0, 24).map((tag) => {
                      const active = activeHashtagKeys.has(hashtagKey(tag));
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleHashtag(tag)}
                          className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                            active ? 'bg-beatwap-gold/20 text-beatwap-gold border border-beatwap-gold/30' : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const t = canonicalizeHashtag(hashtagInput);
                      if (!t) return;
                      toggleHashtag(t);
                      setHashtagInput('');
                    }}
                    placeholder="#EstiloGusttavoLima"
                    className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-beatwap-gold/50 transition-colors"
                  />
                </div>

                <div className="space-y-3">
                  {selectedFolder.items
                    .filter((comp) => {
                      if (activeHashtagKeys.size === 0) return true;
                      const tags = Array.isArray(comp?.hashtags) ? comp.hashtags : [];
                      const keys = new Set(tags.map(hashtagKey).filter(Boolean));
                      for (const k of activeHashtagKeys) {
                        if (!keys.has(k)) return false;
                      }
                      return true;
                    })
                    .map((comp) => {
                    const ccover = sanitizeUrl(comp.cover_url);
                    const caudio = sanitizeUrl(comp.audio_url);
                    const isPlayingThis = playingTrack === comp.id && !isPaused;
                    return (
                      <div key={comp.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                        <div
                          className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800 shrink-0 cursor-pointer relative"
                          onClick={() => togglePlay(comp.id, caudio, { startSeconds: Number(comp.chorus_start_seconds ?? 0), endSeconds: Number(comp.chorus_end_seconds ?? NaN) })}
                        >
                          {ccover ? (
                            <img src={ccover} alt={comp.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                              <Music size={20} />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-9 h-9 bg-beatwap-gold rounded-full flex items-center justify-center text-black">
                              {isPlayingThis ? <Pause fill="currentColor" className="ml-0.5" /> : <Play fill="currentColor" className="ml-0.5" />}
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-white truncate">{comp.title}</div>
                          {Number.isFinite(Number(comp.price)) && (
                            <div className="text-xs text-beatwap-gold mt-0.5 font-bold">R$ {comp.price}</div>
                          )}
                          {Array.isArray(comp.hashtags) && comp.hashtags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {comp.hashtags.slice(0, 6).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleHashtag(tag); }}
                                  className="text-[11px] text-gray-400 hover:text-white transition-colors"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {folders.map((folder, idx) => {
                  const cover = sanitizeUrl(folder.avatar);
                  const count = folder.items.length;
                  return (
                    <div key={folder.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="relative"
                      >
                        <div
                          className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg cursor-pointer bg-gray-800"
                          onClick={() => setSelectedFolderId(folder.id)}
                        >
                          {cover ? (
                            <img src={cover} alt={folder.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black bg-gradient-to-br from-beatwap-gold to-yellow-600 text-2xl font-extrabold">
                              {(folder.name || 'C').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute right-2 top-2 text-xs font-bold px-2 py-1 rounded-lg bg-black/60 text-white border border-white/10">
                            {count} {count === 1 ? 'faixa' : 'faixas'}
                          </div>
                        </div>
                        <h3 className="font-bold text-lg truncate">{folder.name || 'Compositor'}</h3>
                        {folder.phone ? (
                          <>
                            <div className="text-xs text-gray-400 mt-1">{formatWhatsAppPhone(folder.phone) || 'WhatsApp não informado'}</div>
                            <button
                              onClick={() => {
                                const href = buildWhatsAppHref(folder.phone, `Obras de ${folder.name || 'Compositor'}`);
                                if (!href) return;
                                window.open(href, '_blank');
                              }}
                              className="mt-2 flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-2 rounded-lg hover:bg-green-400/20 transition-colors w-full justify-center"
                            >
                              <MessageCircle size={14} />
                              Chamar no WhatsApp
                            </button>
                          </>
                        ) : (
                          <div className="mt-2 text-xs text-gray-500">WhatsApp não informado</div>
                        )}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        {artistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={() => setArtistModalOpen(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-[90%] max-w-2xl rounded-2xl bg-beatwap-graphite border border-white/10 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white">Selecionar Artista</div>
                <button onClick={() => setArtistModalOpen(false)} className="text-xs font-bold px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Fechar</button>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
                {(artistsQuick.length ? artistsQuick : folders.map(f => ({ id: f.id, name: f.name, avatar: f.avatar }))).map((a) => (
                    <button
                      key={`artist_${a.id}`}
                      type="button"
                      onClick={() => { setSelectedFolderId(a.id); setArtistModalOpen(false); }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 text-left"
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                        {a.avatar ? <img src={sanitizeUrl(a.avatar)} alt={a.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-black bg-gradient-to-br from-beatwap-gold to-yellow-600">{String(a.name || 'A').slice(0,1).toUpperCase()}</div>}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{a.name || 'Artista'}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AllCompositions;
