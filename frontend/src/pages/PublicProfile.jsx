import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../services/apiClient';
import Header from '../components/landing/Header';
import Footer from '../components/landing/Footer';
import { User, Music, Instagram, Globe, MessageCircle, Play, Pause, ArrowLeft, Youtube, Target, DollarSign, Image, Link as LinkIcon, Video } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [ipHash, setIpHash] = useState(null);
  const [playStartTS, setPlayStartTS] = useState(null);
  const [sellerStats, setSellerStats] = useState(null);
  const [galleryPosts, setGalleryPosts] = useState([]);

  useEffect(() => {
    if (id) {
      fetchGalleryPosts();
    }
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
      const profileData = await apiClient.get(`/profiles/${id}`);
      setProfile(profileData);

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
      } else if (cargo === 'produtor') {
        const producedData = await apiClient.get(`/profiles/${id}/produced-musics`);
        setItems(producedData || []);
      } else {
        const musicData = await apiClient.get(`/profiles/${id}/compositions`);
        setItems(musicData || []);
      }

    } catch (error) {
      console.error('Error fetching profile:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (trackId, url, trackOwnerId) => {
    if (!url) return;
    
    if (playingTrack === trackId && audioElement) {
      if (audioElement.paused) {
        audioElement.play();
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

    const audio = new Audio(url);
    audio.onended = () => {
      if (playStartTS) {
         const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
         recordEvent({ type: 'music_play', music_id: trackId, artist_id: trackOwnerId || profile.id, duration_seconds: duration });
         setPlayStartTS(null);
      }
      setPlayingTrack(null);
      setAudioElement(null);
    };
    audio.play();
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

  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = profile ? getYoutubeVideoId(profile.youtube_url) : null;

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
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
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
                  {profile.celular && (
                    <a 
                      href={`https://wa.me/55${profile.celular.replace(/\D/g, '')}?text=Olá, vi seu perfil na BeatWap.`}
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

          {/* Gallery / Moments Section */}
          {galleryPosts.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Image className="text-blue-400" />
                Galeria & Momentos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {galleryPosts.map(post => (
                  <div key={post.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group">
                    <div className="aspect-square relative bg-black">
                      {post.media_type === 'video' ? (
                        <video src={post.media_url} controls className="w-full h-full object-contain" />
                      ) : (
                        <img src={post.media_url} alt={post.caption} className="w-full h-full object-cover" />
                      )}
                    </div>
                    {(post.caption || post.link_url) && (
                      <div className="p-4">
                        {post.caption && <p className="text-gray-300 text-sm mb-2">{post.caption}</p>}
                        {post.link_url && (
                          <a 
                            href={post.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-beatwap-gold text-xs font-bold flex items-center gap-1 hover:underline"
                          >
                            <LinkIcon size={12} />
                            Acessar Link
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
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
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Music className="text-beatwap-gold" />
              {profile.cargo === 'Artista' ? 'Músicas Lançadas' : (profile.cargo === 'Produtor' ? 'Produções' : 'Composições')} ({items.length})
            </h2>

            {items.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Music size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-gray-400">Nenhuma {profile.cargo === 'Artista' ? 'música' : (profile.cargo === 'Produtor' ? 'produção' : 'composição')} encontrada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {items.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors group"
                  >
                    <div className="aspect-square relative group cursor-pointer" onClick={() => togglePlay(item.id, item.audio_url || item.file_url)}>
                      {item.cover_url || item.image_url ? (
                        <img src={item.cover_url || item.image_url} alt={item.title} className="w-full h-full object-cover" />
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
                      <h3 className="font-bold text-lg truncate mb-1">{item.title || item.titulo}</h3>
                      <p className="text-sm text-beatwap-gold uppercase font-bold tracking-wider mb-3">{item.genre || item.estilo || item.style || 'Gênero'}</p>
                      
                      {/* Show WhatsApp Button only for Compositors or specific cases */}
                      {profile.cargo === 'Compositor' && profile.celular && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const num = profile.celular.replace(/\D/g, '');
                            window.open(`https://wa.me/55${num}?text=Olá, vi sua composição "${item.title}" na BeatWap e gostaria de saber mais.`, '_blank');
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
