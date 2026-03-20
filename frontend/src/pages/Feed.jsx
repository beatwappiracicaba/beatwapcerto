import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Music, Image, Video, ExternalLink } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { connectRealtime, subscribe, unsubscribe } from '../services/realtime';

const Feed = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isProdutor = String(profile?.cargo || '').toLowerCase() === 'produtor';
  const meId = String(profile?.id || '').trim();
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [followingCount, setFollowingCount] = useState(null);
  const [followingIds, setFollowingIds] = useState([]);
  const [followLoadingById, setFollowLoadingById] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [audioElement, setAudioElement] = useState(null);
  const [videoModalPost, setVideoModalPost] = useState(null);
  const sentinelRef = useRef(null);
  const subscribedRoomsRef = useRef([]);
  const refreshTimerRef = useRef(null);

  const sanitizeUrl = useCallback((raw) => {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (v.startsWith('data:')) return v;
    if (/^https?:\/\//i.test(v)) return v;
    return v;
  }, []);

  const displayName = useCallback((p) => {
    return p?.nome || p?.nome_completo_razao_social || 'Usuário';
  }, []);

  const roleLabel = useCallback((p) => {
    const v = String(p?.cargo || '').trim();
    return v || 'Perfil';
  }, []);

  const timeAgo = useCallback((iso) => {
    const d = new Date(String(iso || ''));
    const t = d.getTime();
    if (!Number.isFinite(t)) return '';
    const diff = Math.max(0, Date.now() - t);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `há ${days} dias`;
    return d.toLocaleDateString('pt-BR');
  }, []);

  const buildWhatsAppHref = useCallback((rawPhone, title) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const text = encodeURIComponent(`Olá, tenho interesse na composição: ${String(title || '').trim() || 'Sem título'}.`);
    return `https://wa.me/${withCountry}?text=${text}`;
  }, []);

  const isFollowing = useCallback((targetId) => {
    const tid = String(targetId || '').trim();
    if (!tid) return false;
    return (followingIds || []).some((x) => String(x || '').trim() === tid);
  }, [followingIds]);

  const toggleFollow = useCallback(async (targetId) => {
    const tid = String(targetId || '').trim();
    if (!tid) return;
    if (!meId) return;
    if (tid === meId) return;
    setFollowLoadingById((prev) => ({ ...prev, [tid]: true }));
    try {
      const action = isFollowing(tid) ? 'unfollow' : 'follow';
      const data = await apiClient.post(`/follow/${tid}`, { action });
      const nowFollowing = data?.following === true;
      setFollowingIds((prev) => {
        const arr = Array.isArray(prev) ? prev.slice() : [];
        const has = arr.some((x) => String(x || '').trim() === tid);
        if (nowFollowing) {
          if (!has) return [tid, ...arr];
          return arr;
        }
        return arr.filter((x) => String(x || '').trim() !== tid);
      });
      setFollowingCount((prev) => {
        const n = Number(prev);
        if (!Number.isFinite(n)) return prev;
        return nowFollowing ? n + 1 : Math.max(0, n - 1);
      });
    } catch {
      void 0;
    } finally {
      setFollowLoadingById((prev) => ({ ...prev, [tid]: false }));
    }
  }, [isFollowing, meId]);

  const togglePlay = useCallback((trackId, url) => {
    const src = sanitizeUrl(url);
    if (!src) return;
    if (playingTrack === trackId && audioElement) {
      if (isPaused) {
        audioElement.play().catch(() => {});
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
    const audio = new Audio(src);
    audio.onended = () => {
      setPlayingTrack(null);
      setIsPaused(false);
    };
    audio.play().catch(() => {});
    setAudioElement(audio);
    setPlayingTrack(trackId);
    setIsPaused(false);
  }, [audioElement, isPaused, playingTrack, sanitizeUrl]);

  useEffect(() => {
    return () => {
      try {
        if (audioElement) audioElement.pause();
      } catch {
        void 0;
      }
    };
  }, [audioElement]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (videoModalPost) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prev || '';
    }
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [videoModalPost]);

  const loadPage = useCallback(async ({ cursor, replace } = { cursor: null, replace: false }) => {
    if (replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '15');
      if (cursor) qs.set('cursor', cursor);
      const data = await apiClient.get(`/feed?${qs.toString()}`);
      const nextItems = Array.isArray(data?.items) ? data.items : [];
      setNextCursor(data?.nextCursor || null);
      setFollowingCount(Number.isFinite(Number(data?.followingCount)) ? Number(data.followingCount) : 0);
      setFollowingIds(Array.isArray(data?.followingIds) ? data.followingIds : []);
      setItems((prev) => (replace ? nextItems : prev.concat(nextItems)));
    } catch {
      if (replace) {
        setItems([]);
        setNextCursor(null);
        setFollowingCount(0);
        setFollowingIds([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const refresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      loadPage({ cursor: null, replace: true });
    }, 250);
  }, [loadPage]);

  useEffect(() => {
    refresh();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      const first = entries && entries[0];
      if (!first?.isIntersecting) return;
      if (loadingMore || loading) return;
      if (!nextCursor) return;
      loadPage({ cursor: nextCursor, replace: false });
    }, { root: null, rootMargin: '1200px 0px', threshold: 0.01 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadPage, loading, loadingMore, nextCursor]);

  useEffect(() => {
    const socket = connectRealtime('https://api.beatwap.com.br');
    const rooms = (followingIds || []).map((id) => `profile:${id}`);
    const prevRooms = subscribedRoomsRef.current || [];
    for (const r of prevRooms) {
      if (!rooms.includes(r)) unsubscribe(r);
    }
    for (const r of rooms) {
      if (!prevRooms.includes(r)) subscribe(r);
    }
    subscribedRoomsRef.current = rooms;

    const onAnyUpdate = () => refresh();
    socket.on('posts.created', onAnyUpdate);
    socket.on('posts.deleted', onAnyUpdate);
    socket.on('compositions.created', onAnyUpdate);
    socket.on('compositions.updated', onAnyUpdate);
    socket.on('musics.created', onAnyUpdate);
    socket.on('musics.updated', onAnyUpdate);
    return () => {
      for (const r of rooms) unsubscribe(r);
      socket.off('posts.created', onAnyUpdate);
      socket.off('posts.deleted', onAnyUpdate);
      socket.off('compositions.created', onAnyUpdate);
      socket.off('compositions.updated', onAnyUpdate);
      socket.off('musics.created', onAnyUpdate);
      socket.off('musics.updated', onAnyUpdate);
    };
  }, [followingIds, refresh]);

  const getEmbedUrl = useCallback((url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.hostname.includes('youtu.be')) {
        const id = u.pathname.replace('/', '');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const content = useMemo(() => {
    if (loading && items.length === 0) {
      return (
        <Card className="p-6">
          <div className="text-gray-400">Carregando...</div>
        </Card>
      );
    }

    if ((followingCount === 0 || followingCount === null) && !loading) {
      return (
        <Card className="p-6">
          <div className="text-gray-300 font-bold">Você ainda não segue ninguém. Comece a seguir para ver novidades.</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <AnimatedButton onClick={() => navigate('/')}>
              Explorar perfis
            </AnimatedButton>
          </div>
        </Card>
      );
    }

    if (!loading && items.length === 0) {
      return (
        <Card className="p-6">
          <div className="text-gray-400">Nenhuma novidade ainda.</div>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((it) => {
          const owner = it?.owner || {};
          const ownerName = displayName(owner);
          const ownerRole = roleLabel(owner);
          const at = timeAgo(it?.created_at);
          const ownerHref = owner?.id ? `/profile/${owner.id}` : null;
          const ownerId = String(owner?.id || '').trim();
          const canFollow = !!meId && !!ownerId && ownerId !== meId;
          const following = canFollow ? isFollowing(ownerId) : false;
          const followLoading = canFollow ? followLoadingById?.[ownerId] === true : false;

          return (
            <Card key={`${it.type}-${it.id}-${owner?.id || 'x'}`} className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => { if (ownerHref) navigate(ownerHref); }}
                  className="min-w-0 text-left"
                >
                  <div className="font-bold text-white truncate">{ownerName}</div>
                  <div className="text-xs text-gray-400 truncate">{ownerRole}</div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-xs text-gray-400">{at}</div>
                  {canFollow && (
                    <button
                      type="button"
                      disabled={followLoading}
                      onClick={() => toggleFollow(ownerId)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        following
                          ? 'bg-white/10 border-white/10 text-gray-200 hover:bg-white/15'
                          : 'bg-beatwap-gold text-black border-beatwap-gold hover:bg-white hover:border-white'
                      } ${followLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {followLoading ? '...' : (following ? 'Seguindo' : 'Seguir')}
                    </button>
                  )}
                </div>
              </div>

              {it.type === 'composition' && (() => {
                const c = it.data || {};
                const title = c.title || c.titulo || 'Sem título';
                const href = c.composer_phone ? buildWhatsAppHref(c.composer_phone, title) : null;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
                    <div
                      className="group relative cursor-pointer"
                      onClick={() => togglePlay(`composition:${it.id}`, c.audio_url)}
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden relative shadow-lg bg-gray-800">
                        {c.cover_url ? (
                          <img
                            src={sanitizeUrl(c.cover_url)}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Music size={40} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlay(`composition:${it.id}`, c.audio_url);
                            }}
                          >
                            {playingTrack === `composition:${it.id}` && !isPaused
                              ? <Pause fill="currentColor" className="ml-1" />
                              : <Play fill="currentColor" className="ml-1" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-xl text-white">{title}</div>
                      <div className="text-sm text-gray-400">{c.composer_name || 'Autor'}</div>
                      {c.genre && <div className="text-xs text-beatwap-gold uppercase font-bold tracking-wider">{c.genre}</div>}
                      {Number.isFinite(Number(c.price)) && <div className="text-sm text-beatwap-gold font-bold">R$ {c.price}</div>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <AnimatedButton onClick={() => togglePlay(`composition:${it.id}`, c.audio_url)}>
                          <span>{playingTrack === `composition:${it.id}` && !isPaused ? 'Pausar' : 'Reproduzir'}</span>
                        </AnimatedButton>
                        {href && (
                          <AnimatedButton onClick={() => window.open(href, '_blank')}>
                            <span>WhatsApp</span>
                          </AnimatedButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {it.type === 'music' && (() => {
                const m = it.data || {};
                const title = m.titulo || m.title || 'Lançamento';
                const cover = m.cover_url ? sanitizeUrl(m.cover_url) : '';
                const artistName = m.nome_artista || m.artist_name || ownerName;
                const url = m.preview_url || m.audio_url;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
                    <div
                      className="group relative cursor-pointer"
                      onClick={() => {
                        if (m.album_id) {
                          navigate(`/album/${m.album_id}`);
                        } else {
                          togglePlay(`music:${it.id}`, url);
                        }
                      }}
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden relative shadow-lg bg-gray-800">
                        {cover ? (
                          <img
                            src={cover}
                            alt={title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Music size={40} />
                          </div>
                        )}
                        {!m.album_id && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlay(`music:${it.id}`, url);
                              }}
                            >
                              {playingTrack === `music:${it.id}` && !isPaused
                                ? <Pause fill="currentColor" className="ml-1" />
                                : <Play fill="currentColor" className="ml-1" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-xl text-white">{title}</div>
                      <div className="text-sm text-gray-400">{artistName || 'Artista'}</div>
                      {m.estilo && <div className="text-xs text-beatwap-gold uppercase font-bold tracking-wider">{m.estilo}</div>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {m.album_id ? (
                          <AnimatedButton onClick={() => navigate(`/album/${m.album_id}`)}>
                            <span>Ver Álbum</span>
                          </AnimatedButton>
                        ) : (
                          <AnimatedButton onClick={() => togglePlay(`music:${it.id}`, url)}>
                            <span>{playingTrack === `music:${it.id}` && !isPaused ? 'Pausar' : 'Reproduzir'}</span>
                          </AnimatedButton>
                        )}
                        {m.presave_link && (
                          <AnimatedButton onClick={() => window.open(m.presave_link, '_blank')}>
                            <span>Smartlink</span>
                          </AnimatedButton>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {it.type === 'post' && (() => {
                const p = it.data || {};
                const caption = p.caption || '';
                const mediaType = String(p.media_type || '').toLowerCase();
                const mediaUrl = sanitizeUrl(p.media_url);
                const linkUrl = String(p.link_url || '').trim();
                const embed = linkUrl ? getEmbedUrl(linkUrl) : null;
                const open = () => setVideoModalPost({ ...p, media_url: mediaUrl, link_url: linkUrl });
                return (
                  <div className="group relative overflow-hidden bg-black/40 border border-white/10 rounded-xl">
                    <div className="relative w-full aspect-[9/16] sm:aspect-video bg-black cursor-pointer" onClick={open}>
                      {embed ? (
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={embed}
                          title="Link"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : mediaType === 'video' ? (
                        <video
                          src={mediaUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={mediaUrl || 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22675%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2232%22 font-family=%22Arial%22>Prévia indisponível</text></svg>'}
                          alt={caption || 'Post'}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 border border-white/10 flex items-center gap-2">
                        {mediaType === 'video' ? <Video className="text-white" size={18} /> : <Image className="text-white" size={18} />}
                        <span className="text-xs text-white font-bold">Post</span>
                      </div>
                    </div>
                    {(caption || linkUrl) && (
                      <div className="p-4 space-y-3">
                        {caption && <div className="text-sm text-white whitespace-pre-line">{caption}</div>}
                        {linkUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(linkUrl, '_blank')}
                            className="inline-flex items-center gap-2 text-xs text-gray-300 hover:text-beatwap-gold underline"
                          >
                            <ExternalLink size={14} />
                            <span>Abrir link</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
        })}
        <div ref={sentinelRef} />
        {loadingMore && (
          <Card className="p-4">
            <div className="text-gray-400 text-sm">Carregando mais...</div>
          </Card>
        )}
      </div>
    );
  }, [buildWhatsAppHref, displayName, followLoadingById, followingCount, getEmbedUrl, isFollowing, isPaused, items, loading, loadingMore, meId, navigate, playingTrack, roleLabel, sanitizeUrl, timeAgo, toggleFollow, togglePlay]);

  const Layout = isProdutor ? AdminLayout : DashboardLayout;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-bold text-white truncate">🔥 Feed</div>
            <div className="text-sm text-gray-400 truncate">Novidades de quem você segue</div>
          </div>
          <AnimatedButton onClick={refresh}>
            Atualizar
          </AnimatedButton>
        </div>
        {content}
      </div>

      {videoModalPost && (
        <div className="fixed inset-0 z-[100] bg-black/95" onClick={() => setVideoModalPost(null)}>
          <button
            onClick={() => setVideoModalPost(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
          >
            <span className="text-gray-300 text-sm font-bold">Fechar</span>
          </button>
          <div className="w-screen h-screen flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {getEmbedUrl(videoModalPost.link_url || videoModalPost.media_url) ? (
              <div className="relative w-[90vw] max-w-[90vw] max-h-[85vh] aspect-video border border-white/10 rounded-xl overflow-hidden bg-black">
                <iframe
                  width="100%"
                  height="100%"
                  src={getEmbedUrl(videoModalPost.link_url || videoModalPost.media_url)}
                  title="Link"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : String(videoModalPost.media_type || '').toLowerCase() === 'image' ? (
              <img
                src={sanitizeUrl(videoModalPost.media_url)}
                alt={videoModalPost.caption || 'Imagem'}
                className="max-w-[92vw] max-h-[85vh] object-contain rounded-xl border border-white/10"
              />
            ) : (
              <video
                src={sanitizeUrl(videoModalPost.media_url)}
                className="max-w-[92vw] max-h-[85vh] rounded-xl border border-white/10"
                controls
                autoPlay
              />
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Feed;
