import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../services/apiClient';
import { connectRealtime, subscribe, unsubscribe } from '../services/realtime';
import Header from '../components/landing/Header';
import Footer from '../components/landing/Footer';
import { User, Music, Instagram, Globe, MessageCircle, Play, Pause, ArrowLeft, Youtube, Target, DollarSign, Image, Video, MapPin, Calendar, X } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { decryptData } from '../utils/security';
import { useAuth } from '../context/AuthContext';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: me } = useAuth();
  const canFollow = me?.id && id && String(me.id) !== String(id);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [producerTab, setProducerTab] = useState('producoes');
  const [restricted, setRestricted] = useState(false);
  const [producerProductions, setProducerProductions] = useState([]);
  const [producerCompositions, setProducerCompositions] = useState([]);
  const [recordedMusics, setRecordedMusics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [ipHash, setIpHash] = useState(null);
  const [playStartTS, setPlayStartTS] = useState(null);
  const [sellerStats, setSellerStats] = useState(null);
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [descOpen, setDescOpen] = useState({});
  const [videoModalPost, setVideoModalPost] = useState(null);
  const [galleryTab, setGalleryTab] = useState('all');
  const albumGroups = useMemo(() => {
    const map = new Map();
    (items || []).forEach(m => {
      const aid = String(m.album_id || '').trim();
      if (!aid) return;
      const cur = map.get(aid) || { id: aid, title: m.album_title || 'Álbum', cover_url: m.cover_url || null, release_date: m.release_date || null, count: 0 };
      if (!cur.cover_url && m.cover_url) cur.cover_url = m.cover_url;
      cur.count += 1;
      map.set(aid, cur);
    });
    return Array.from(map.values()).sort((a, b) => {
      const da = a.release_date ? new Date(a.release_date).getTime() : 0;
      const db = b.release_date ? new Date(b.release_date).getTime() : 0;
      return db - da;
    });
  }, [items]);

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

  useEffect(() => {
    if (id) {
      fetchGalleryPosts();
    }
  }, [id]);

  useEffect(() => {
    if (!canFollow) return;
    let alive = true;
    (async () => {
      try {
        const data = await apiClient.get(`/follow/status/${id}`);
        if (!alive) return;
        setIsFollowing(data?.target?.following === true);
      } catch {
        if (!alive) return;
        setIsFollowing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [canFollow, id]);

  const toggleFollow = async () => {
    if (!canFollow || followLoading) return;
    setFollowLoading(true);
    try {
      const action = isFollowing ? 'unfollow' : 'follow';
      const data = await apiClient.post(`/follow/${id}`, { action });
      setIsFollowing(data?.following === true);
    } catch {
      void 0;
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const socket = connectRealtime('https://api.beatwap.com.br');
    const room = `profile:${id}`;
    subscribe(room);
    const onPostCreated = (item) => {
      if (!item) return;
      if (String(item.user_id || '') === String(id)) {
        const scope = String(item?.scope || 'public').toLowerCase().trim();
        const mediaType = String(item?.media_type || '').toLowerCase().trim();
        if (scope === 'feed') return;
        if (mediaType === 'text') return;
        setGalleryPosts(prev => [item, ...prev]);
      }
    };
    const onPostDeleted = (payload) => {
      if (!payload?.id) return;
      setGalleryPosts(prev => prev.filter(p => p.id !== payload.id));
    };
    const onPostLikes = (payload) => {
      if (!payload?.id) return;
      setGalleryPosts(prev => prev.map(p => p.id === payload.id ? { ...p, likes_count: Number(payload.likes || 0) } : p));
    };
    const onEventCreated = (ev) => {
      if (ev && String(ev.artista_id || '') === String(id)) {
        setEvents(prev => [ev, ...prev]);
      }
    };
    const onEventUpdated = (ev) => {
      if (!ev?.id) return;
      setEvents(prev => prev.map(e => e.id === ev.id ? ev : e));
    };
    const onEventDeleted = (payload) => {
      if (!payload?.id) return;
      setEvents(prev => prev.filter(e => e.id !== payload.id));
    };
    const onMusicLikes = (payload) => {
      if (!payload?.id) return;
      setItems(prev => prev.map(m => m.id === payload.id ? { ...m, likes_count: Number(payload.likes || 0) } : m));
    };
    socket.on('posts.created', onPostCreated);
    socket.on('posts.deleted', onPostDeleted);
    socket.on('posts.likes.updated', onPostLikes);
    socket.on('events.created', onEventCreated);
    socket.on('events.updated', onEventUpdated);
    socket.on('events.deleted', onEventDeleted);
    socket.on('musics.likes.updated', onMusicLikes);
    return () => {
      unsubscribe(room);
      socket.off('posts.created', onPostCreated);
      socket.off('posts.deleted', onPostDeleted);
      socket.off('posts.likes.updated', onPostLikes);
      socket.off('events.created', onEventCreated);
      socket.off('events.updated', onEventUpdated);
      socket.off('events.deleted', onEventDeleted);
      socket.off('musics.likes.updated', onMusicLikes);
    };
  }, [id]);

  const fetchGalleryPosts = async () => {
    try {
      const data = await apiClient.get(`/profiles/${id}/posts`);
      setGalleryPosts(data || []);
    } catch (err) {
      console.error('Error fetching gallery:', err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const json = await res.json();
        setIpHash(json?.ip || null);
      } catch {
        setIpHash(null);
      }
    })();
  }, []);

  const recordEvent = async (payload) => {
    try {
      await apiClient.post('/analytics', { ...payload, ip_hash: ipHash || 'unknown' });
    } catch (e) { console.error('Analytics Error:', e); }
  };

  const handleSocialClick = (network) => {
    recordEvent({ type: `artist_click_${network}`, artist_id: profile.id });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchProfileData();
  }, [id]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const fetchProfileData = async () => {
    try {
      // Validate UUID to prevent 400 errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        console.warn('Invalid profile ID:', id);
        return;
      }

      setLoading(true);
      
      // Fetch Profile
      const profileData = await apiClient.get(`/profiles/${id}`, { cache: false });
      setProfile(profileData);

      // Block public profile view for Avulso plans (artists/composers)
      const cargoRaw = String(profileData?.cargo || '').toLowerCase().trim();
      const planRaw = String(profileData?.plano || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if ((cargoRaw === 'artista' || cargoRaw === 'compositor') && planRaw.includes('avulso')) {
        setRestricted(true);
        setItems([]);
        setProducerProductions([]);
        setProducerCompositions([]);
        setRecordedMusics([]);
        setLoading(false);
        return;
      }

      // Determine what to fetch based on role
      const cargo = (profileData.cargo || '').toLowerCase().trim();

      if (cargo === 'vendedor') {
        try {
          const stats = await apiClient.get(`/sellers/${id}/stats`);
          if (stats) setSellerStats(stats);
        } catch (err) {
          console.error('Error fetching seller stats:', err);
        }
      } else if (cargo === 'artista') {
        const ownMusics = await apiClient.get(`/profiles/${id}/musics`);
        const featMusics = await apiClient.get(`/profiles/${id}/feats`);
        const map = {};
        (ownMusics || []).forEach(m => { map[m.id] = m; });
        (featMusics || []).forEach(m => { map[m.id] = m; });
        const merged = Object.values(map).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setItems(merged);
        try {
          const ev = await apiClient.get(`/profiles/${id}/events`, { cache: true, cacheTtlMs: 15000 });
          setEvents(Array.isArray(ev) ? ev : []);
        } catch (err) {
          console.error('Error fetching events:', err);
          setEvents([]);
        }
      } else if (cargo === 'produtor') {
        const producedData = await apiClient.get(`/profiles/${id}/produced-musics`);
        const compositionsData = await apiClient.get(`/profiles/${id}/compositions`);
        setProducerProductions(producedData || []);
        setProducerCompositions(compositionsData || []);
      } else {
        const musicData = await apiClient.get(`/profiles/${id}/compositions`);
        const recorded = await apiClient.get(`/profiles/${id}/recorded-musics`);
        setItems(musicData || []);
        setRecordedMusics(recorded || []);
      }

    } catch (error) {
      console.error('Error fetching profile:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  if (restricted) {
    return (
      <div className="bg-beatwap-dark min-h-screen text-white">
        <Header />
        <main className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 flex items-center justify-center">
                <User size={28} className="text-beatwap-gold" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold mb-2">Perfil indisponível</h1>
              <p className="text-gray-400 mb-6">
                Este perfil não possui página pública no plano atual. Assinaturas Mensal e Anual liberam o perfil na Home.
              </p>
              <div className="flex items-center justify-center gap-3">
                <AnimatedButton onClick={() => navigate('/#planos')}>Upgrade de Plano</AnimatedButton>
                <AnimatedButton onClick={() => navigate('/')}>Voltar para Home</AnimatedButton>
                <AnimatedButton
                  variant="outline"
                  onClick={() => window.open('https://wa.me/5519981083497?text=Quero%20liberar%20meu%20perfil%20p%C3%BAblico%20na%20BeatWap', '_blank')}
                >
                  Falar no WhatsApp
                </AnimatedButton>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const togglePlay = (trackId, url, trackOwnerId) => {
    const safe = sanitizeUrl(url);
    if (!safe) return;
    
    if (playingTrack === trackId && audioElement) {
      if (audioElement.paused) {
        audioElement.play().catch(() => {});
        setPlayStartTS(Date.now());
      } else {
        audioElement.pause();
        if (playStartTS) {
           const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
           recordEvent({ type: 'music_play', music_id: trackId, artist_id: trackOwnerId || profile.id, duration_seconds: duration });
           setPlayStartTS(null);
        }
      }
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(safe);
    audio.onended = () => {
      if (playStartTS) {
         const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
         recordEvent({ type: 'music_play', music_id: trackId, artist_id: trackOwnerId || profile.id, duration_seconds: duration });
         setPlayStartTS(null);
      }
      setPlayingTrack(null);
      setAudioElement(null);
    };
    audio.play().catch(() => {});
    setPlayStartTS(Date.now());
    setAudioElement(audio);
    setPlayingTrack(trackId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-beatwap-dark flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-beatwap-gold"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-beatwap-dark text-white flex flex-col items-center justify-center gap-4">
        <h2 className="text-2xl font-bold">Perfil não encontrado</h2>
        <AnimatedButton onClick={() => navigate('/')} icon={ArrowLeft}>Voltar ao Início</AnimatedButton>
      </div>
    );
  }

  const displayName = profile.nome || profile.nome_completo_razao_social || 'Compositor';
  const cargoLower = String(profile.cargo || '').toLowerCase().trim();
  const itemsToRender = cargoLower === 'produtor'
    ? (producerTab === 'composicoes' ? producerCompositions : producerProductions)
    : items;
  const phoneDigits = profile.celular ? String(decryptData(profile.celular) || '').replace(/\D/g, '') : '';
  

  const sanitizeUrl = (s) => String(s || '').replace(/[`"'<>]/g, '').trim();
  const getYoutubeVideoId = (url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return null;
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = safe.match(regExp);
    return (match && match[2] && match[2].length === 11) ? match[2] : null;
  };

  const videoId = profile ? getYoutubeVideoId(profile.youtube_url) : null;
  const getYoutubeThumb = (url) => {
    const id = getYoutubeVideoId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
  };
  const formatTicketPrice = (cents) => {
    if (cents == null || !Number.isFinite(Number(cents))) return null;
    const n = Number(cents) / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  const formatEventDate = (iso) => {
    const d = new Date(String(iso || ''));
    if (Number.isNaN(d.getTime())) return '';
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return d.toLocaleDateString('pt-BR');
    return d.toLocaleString('pt-BR');
  };
  const toBuyHref = (raw) => {
    const v = String(raw || '').trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 10) return `https://wa.me/55${digits}?text=${encodeURIComponent('Olá! Tenho interesse no ingresso.')}`;
    return null;
  };
  const getEmbedUrl = (url) => {
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
  };

  return (
    <div className="min-h-screen bg-beatwap-dark text-white font-sans selection:bg-beatwap-gold selection:text-black">
      <Header />
      
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <AnimatedButton onClick={() => navigate('/')} icon={ArrowLeft} variant="secondary" className="mb-8">
            Voltar
          </AnimatedButton>

          {/* Profile Header */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800 shrink-0">
                {profile.avatar_url ? (
                  <img src={sanitizeUrl(profile.avatar_url)} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <User size={64} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 w-full text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{displayName}</h1>
                  <p className="text-xl text-beatwap-gold font-medium">{profile.cargo || 'Compositor'}</p>
                </div>
                
                {profile.genero_musical && (
                  <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm text-gray-300">
                    {profile.genero_musical}
                  </div>
                )}

                {profile.bio && (
                  <div className="text-gray-300 leading-relaxed max-w-2xl mx-auto md:mx-0 whitespace-pre-line">
                    {profile.bio}
                  </div>
                )}

                {canFollow && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <AnimatedButton
                      onClick={toggleFollow}
                      className={`justify-center ${isFollowing ? 'bg-white/10 hover:bg-white/15' : ''}`}
                    >
                      {followLoading ? 'Aguarde...' : (isFollowing ? 'Seguindo' : 'Seguir')}
                    </AnimatedButton>
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard/feed')}
                      className="text-sm text-gray-300 hover:text-beatwap-gold underline"
                    >
                      Ver Feed
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                  {profile.instagram_url && (
                    <a 
                      href={profile.instagram_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-pink-500/20 hover:text-pink-500 transition-colors"
                      title="Instagram"
                      onClick={() => handleSocialClick('instagram')}
                    >
                      <Instagram size={24} />
                    </a>
                  )}
                  {profile.youtube_url && (
                    <a 
                      href={profile.youtube_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-red-600/20 hover:text-red-600 transition-colors"
                      title="YouTube"
                      onClick={() => handleSocialClick('youtube')}
                    >
                      <Youtube size={24} />
                    </a>
                  )}
                  {profile.tiktok_url && (
                    <a 
                      href={profile.tiktok_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-black hover:text-white transition-colors border border-transparent hover:border-white/20"
                      title="TikTok"
                      onClick={() => handleSocialClick('tiktok')}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    </a>
                  )}
                  {profile.spotify_url && (
                    <a 
                      href={profile.spotify_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-[#1DB954]/20 hover:text-[#1DB954] transition-colors"
                      title="Spotify"
                      onClick={() => handleSocialClick('spotify')}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  )}
                  {profile.deezer_url && (
                    <a 
                      href={profile.deezer_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-[#A238FF]/20 hover:text-[#A238FF] transition-colors"
                      title="Deezer"
                      onClick={() => handleSocialClick('deezer')}
                    >
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2 6h4v12H2V6zm6 5h4v7H8v-7zm6-4h4v11h-4V7zm6-4h4v15h-4V3z"/>
                      </svg>
                    </a>
                  )}
                  {profile.site_url && (
                    <a 
                      href={profile.site_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-blue-500/20 hover:text-blue-500 transition-colors"
                      title="Site"
                      onClick={() => handleSocialClick('site')}
                    >
                      <Globe size={24} />
                    </a>
                  )}
                  {phoneDigits && (
                    <a 
                      href={`https://wa.me/55${phoneDigits}?text=${encodeURIComponent('Olá, vi seu perfil na BeatWap.')}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-green-500 text-black font-bold rounded-xl hover:bg-white transition-colors"
                      onClick={() => handleSocialClick('whatsapp')}
                    >
                      <MessageCircle size={20} />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Featured Video Section */}
          {videoId && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Youtube className="text-red-600" />
                Vídeo Destaque
              </h3>
              <div className="w-full max-w-4xl mx-auto bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {cargoLower === 'artista' && events.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Calendar className="text-beatwap-gold" />
                Próximos Shows
              </h3>
              <div className="overflow-x-auto scroll-smooth whitespace-nowrap -mx-6 pl-14 pr-14 md:pl-16 md:pr-16 pb-2">
                <div className="flex gap-6 justify-start">
                {[...events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)).map((ev) => {
                  const v = String(ev.purchase_contact || '').trim();
                  const isUrl = /^https?:\/\//i.test(v);
                  const digits = v.replace(/\D/g, '');
                  const isPhone = !isUrl && digits.length >= 10;
                  const waHref = isPhone ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : null;
                  const linkHref = isUrl ? v : null;
                  const ticket = formatTicketPrice(ev.ticket_price_cents);
                  return (
                    <div key={ev.id} className="flex-none w-[280px] sm:w-[320px] md:w-[440px] bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                      <div className="aspect-square bg-gray-800 border-b border-white/10">
                        {ev.flyer_url ? (
                          <img src={ev.flyer_url} alt="Flyer do show" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="flex items-center gap-3 text-gray-400">
                              <Calendar />
                              <span>Show</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                        <div className="text-white font-bold">
                          {formatEventDate(ev.event_date)}
                        </div>
                        <div className="flex items-start gap-3 text-gray-300 text-sm md:text-base leading-relaxed break-words">
                          <MapPin size={18} className="mt-0.5 text-gray-400 flex-shrink-0" />
                          <div
                            className="flex-1 whitespace-normal break-words overflow-visible"
                            style={{ overflowWrap: 'anywhere' }}
                          >
                            {ev.location || ev.event_name || 'Local a definir'}
                          </div>
                        </div>
                        {ticket && (
                          <div className="text-sm text-gray-300">
                            <span className="text-gray-400">Ingresso:</span> {ticket}
                          </div>
                        )}
                        {(waHref || linkHref) && (
                          <div className="pt-2">
                            {waHref ? (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors w-full"
                              >
                                WhatsApp
                              </a>
                            ) : (
                              <a
                                href={linkHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors w-full"
                              >
                                Abrir link
                              </a>
                            )}
                          </div>
                        )}
                        {ev.description && (
                          <div className="pt-2">
                            <button
                              onClick={() => setDescOpen((prev) => ({ ...prev, [ev.id]: !prev[ev.id] }))}
                              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors w-full"
                            >
                              {descOpen[ev.id] ? 'Ocultar descrição' : 'Ver descrição'}
                            </button>
                            {descOpen[ev.id] && (
                              <div className="mt-2 p-3 rounded-xl bg-black/30 border border-white/10 text-sm text-gray-300 whitespace-pre-line">
                                {ev.description}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          )}

          {cargoLower === 'artista' && albumGroups.length > 0 && (
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Music className="text-beatwap-gold" />
                  Álbuns
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {albumGroups.map(a => (
                    <button
                      key={a.id}
                      onClick={() => navigate(`/album/${a.id}`)}
                      className="text-left bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors"
                    >
                      <div className="aspect-square bg-gray-800">
                        {a.cover_url ? (
                          <img src={a.cover_url} alt={a.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <Music size={40} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="font-bold text-white truncate">{a.title}</div>
                        <div className="text-xs text-gray-400">{a.count} faixas</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Gallery / Moments Section */}
          {galleryPosts.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Image className="text-blue-400" />
                Galeria & Momentos
              </h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {['all','video','image','link'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setGalleryTab(tab)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      galleryTab === tab
                        ? 'bg-beatwap-gold text-beatwap-black'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {tab === 'all' ? 'Últimos Posts' : tab === 'video' ? 'Vídeos' : tab === 'image' ? 'Fotos' : 'Outros'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-[10px]">
                {(galleryTab === 'all' ? galleryPosts : galleryPosts.filter(p => ((p.media_type === 'image') ? 'image' : (p.media_type === 'video' ? 'video' : 'link')) === galleryTab)).map((post) => (
                  <div key={post.id} className="group relative overflow-hidden bg-black/40 border-2 border-beatwap-gold rounded-xl">
                    {galleryTab === 'all' ? (
                      <div
                        className="relative w-full aspect-square bg-black cursor-pointer"
                        onClick={() => {
                          const nextTab = post.media_type === 'image' ? 'image' : (post.media_type === 'video' ? 'video' : 'link');
                          setGalleryTab(nextTab);
                          setVideoModalPost(post);
                        }}
                      >
                        {post.media_type === 'link' ? (
                          (() => {
                            const embed = getEmbedUrl(post.link_url);
                            if (embed) {
                              return (
                                <iframe
                                  className="absolute inset-0 w-full h-full"
                                  src={embed}
                                  title="Link"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              );
                            } else {
                              const id = getYoutubeVideoId(post.link_url);
                              const primary = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : (post.media_url || '');
                              const fallback = id ? `https://img.youtube.com/vi/${id}/0.jpg` : (post.media_url || '');
                              const placeholder = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2232%22 font-family=%22Arial%22>Prévia indisponível</text></svg>';
                              return (
                                <img
                                  src={primary}
                                  alt={post.caption || 'Link'}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  onError={(e) => { try { if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback; else e.currentTarget.src = placeholder; } catch { void 0; } }}
                                />
                              );
                            }
                          })()
                        ) : post.media_type === 'video' ? (
                          <video
                            src={post.media_url}
                            muted
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={post.media_url}
                            alt={post.caption || 'Post'}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              try {
                                const placeholder = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2236%22 font-family=%22Arial%22>Imagem indisponível</text></svg>';
                                if (e.currentTarget.src !== placeholder) e.currentTarget.src = placeholder;
                              } catch { void 0; }
                            }}
                          />
                        )}
                      </div>
                    ) : post.media_type === 'video' ? (
                      <div className="relative w-full aspect-[9/16] bg-black cursor-pointer" onClick={() => setVideoModalPost(post)}>
                        <video
                          src={post.media_url}
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover"
                          controls
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Play className="text-white" />
                        </div>
                      </div>
                    ) : post.media_type === 'link' && post.link_url ? (
                      <div className="relative w-full aspect-video bg-black cursor-pointer" onClick={() => setVideoModalPost(post)}>
                        {getEmbedUrl(post.link_url) ? (
                          <iframe
                            className="absolute inset-0 w-full h-full"
                            src={getEmbedUrl(post.link_url)}
                            title="Link"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : (
                          (() => {
                            const id = getYoutubeVideoId(post.link_url);
                            const primary = id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : (post.media_url || '');
                            const fallback = id ? `https://img.youtube.com/vi/${id}/0.jpg` : (post.media_url || '');
                            const placeholder = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%22675%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2232%22 font-family=%22Arial%22>Prévia indisponível</text></svg>';
                            return (
                              <img
                                src={primary}
                                alt={post.caption || 'Link'}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => { try { if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback; else e.currentTarget.src = placeholder; } catch { void 0; } }}
                              />
                            );
                          })()
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Play className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-square bg-black cursor-pointer" onClick={() => setVideoModalPost(post)}>
                        <img
                          src={post.media_url}
                          alt={post.caption || 'Post'}
                          className="absolute inset-0 w-full h-full object-cover"
                          onClick={() => setVideoModalPost(post)}
                          onError={(e) => {
                            try {
                              const placeholder = 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%221200%22 height=%221200%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231a1a1a%22/><text x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2236%22 font-family=%22Arial%22>Imagem indisponível</text></svg>';
                              if (e.currentTarget.src !== placeholder) e.currentTarget.src = placeholder;
                            } catch { void 0; }
                          }}
                        />
                      </div>
                    )}
                    <div className="p-3">
                      {post.caption && <div className="text-sm text-white">{post.caption}</div>}
                    </div>
                    <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      {post.media_type === 'video' ? (
                        <Video className="text-white" />
                      ) : (
                        <Image className="text-white" />
                      )}
                    </div>
                    <div className="px-3 py-2 border-t border-white/10 bg-black/30 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const res = await apiClient.post(`/posts/${post.id}/like`, { ip_hash: ipHash || 'unknown' });
                            const likes = Number(res?.likes || 0);
                            setGalleryPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: likes } : p));
                          } catch (e2) {
                            console.error(e2);
                            try { await fetchGalleryPosts(); } catch { void 0; }
                          }
                        }}
                        className="flex items-center gap-2 text-beatwap-gold hover:text-white transition-colors"
                      >
                        <span>❤️</span>
                        <span className="text-sm font-bold">{post.likes_count || 0}</span>
                      </button>
                      {post.link_url && (
                        <a
                          href={post.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-gray-300 hover:text-beatwap-gold underline"
                        >
                          Abrir link
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {videoModalPost && (
            <div className="fixed inset-0 z-[100] bg-black/95" onClick={() => setVideoModalPost(null)}>
              <button
                onClick={() => setVideoModalPost(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
              >
                <X size={18} className="text-gray-300" />
              </button>
              <div className="w-screen h-screen flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {getEmbedUrl(videoModalPost.link_url || videoModalPost.media_url) ? (
                  <div className="relative w-[90vw] max-w-[90vw] max-h-[85vh] aspect-video border-2 border-beatwap-gold rounded-xl overflow-hidden bg-black">
                    <iframe
                      width="100%"
                      height="100%"
                      src={getEmbedUrl(videoModalPost.link_url || videoModalPost.media_url)}
                      title="Vídeo"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : videoModalPost.media_type === 'image' ? (
                  <img
                    src={videoModalPost.media_url}
                    alt={videoModalPost.caption || 'Imagem'}
                    className="max-w-[90vw] max-h-[85vh] w-auto h-auto border-2 border-beatwap-gold rounded-xl"
                  />
                ) : (
                  <video
                    src={videoModalPost.media_url}
                    className="max-w-[90vw] max-h-[85vh] w-auto h-auto border-2 border-beatwap-gold rounded-xl"
                    controls
                    autoPlay
                  />
                )}
              </div>
            </div>
          )}

          

          {/* Compositions Grid */}
          <div className="space-y-8">
            {profile.cargo?.toLowerCase() === 'vendedor' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                  <div className="p-4 rounded-full bg-green-500/20 text-green-500">
                    <Target size={32} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Vendas Realizadas</p>
                    <p className="text-3xl font-bold text-white">{sellerStats?.sales_count || 0}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                  <div className="p-4 rounded-full bg-beatwap-gold/20 text-beatwap-gold">
                    <DollarSign size={32} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Volume de Vendas</p>
                    <p className="text-3xl font-bold text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sellerStats?.total_revenue || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
            {cargoLower === 'produtor' && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setProducerTab('producoes')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    producerTab === 'producoes'
                      ? 'bg-beatwap-gold text-beatwap-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  Produções
                </button>
                <button
                  onClick={() => setProducerTab('composicoes')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    producerTab === 'composicoes'
                      ? 'bg-beatwap-gold text-beatwap-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  Composições
                </button>
              </div>
            )}
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 mb-4">
              <Music className="text-beatwap-gold" />
              {cargoLower === 'artista'
                ? 'Músicas Lançadas'
                : (cargoLower === 'produtor'
                  ? (producerTab === 'composicoes' ? 'Composições' : 'Produções')
                  : 'Composições')} ({itemsToRender.length})
            </h2>

            {itemsToRender.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Music size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-gray-400">
                  Nenhuma {cargoLower === 'artista' ? 'música' : (cargoLower === 'produtor' ? (producerTab === 'composicoes' ? 'composição' : 'produção') : 'composição')} encontrada.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {itemsToRender.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors group"
                  >
                    <div className="aspect-square relative group cursor-pointer" onClick={() => togglePlay(item.id, item.audio_url || item.file_url)}>
                      {item.cover_url || item.image_url ? (
                        <img src={sanitizeUrl(item.cover_url || item.image_url)} alt={item.title || item.titulo || 'Capa'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                          <Music size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                          {playingTrack === item.id && audioElement && !audioElement.paused ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-base md:text-lg mb-1 whitespace-normal break-words">{item.title || item.titulo}</h3>
                      <p className="text-sm text-beatwap-gold uppercase font-bold tracking-wider mb-3">{item.genre || item.estilo || item.style || 'Gênero'}</p>
                      
                      {(cargoLower === 'compositor' || (cargoLower === 'produtor' && producerTab === 'composicoes')) && phoneDigits && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const title = item.title || item.titulo || '';
                            const text = encodeURIComponent(`Olá, vi sua composição "${title}" na BeatWap e gostaria de saber mais.`);
                            window.open(`https://wa.me/55${phoneDigits}?text=${text}`, '_blank');
                          }}
                          className="w-full py-2 rounded-lg bg-green-500/10 text-green-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-500/20 transition-colors"
                        >
                          <MessageCircle size={14} />
                          Negociar Obra
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
            {(cargoLower === 'compositor' || cargoLower === 'produtor' || cargoLower === 'artista') && (
              <div className="mt-10">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 mb-4">
                  <Music className="text-beatwap-gold" />
                  Composições Gravadas ({recordedMusics.length})
                </h2>
                {recordedMusics.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-gray-400">Nenhuma composição gravada encontrada.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {recordedMusics.map((item) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors group"
                      >
                        <div className="aspect-square relative group cursor-pointer" onClick={() => togglePlay(item.id, item.audio_url, item.artista_id)}>
                          {item.cover_url ? (
                            <img src={sanitizeUrl(item.cover_url)} alt={item.titulo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                              <Music size={40} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                              {playingTrack === item.id && audioElement && !audioElement.paused ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-base md:text-lg mb-1 whitespace-normal break-words">{item.titulo}</h3>
                          <p className="text-sm text-beatwap-gold uppercase font-bold tracking-wider mb-3">{item.estilo || 'Gênero'}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicProfile;
