import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import Header from '../components/landing/Header';
import Footer from '../components/landing/Footer';
import { User, Music, Instagram, Globe, MessageCircle, Play, Pause, ArrowLeft } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';

const PublicProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

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
      setLoading(true);
      
      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch Compositions
      const { data: musicData, error: musicError } = await supabase
        .from('compositions')
        .select('*')
        .eq('composer_id', id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (musicError) throw musicError;
      setCompositions(musicData || []);

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (trackId, url) => {
    if (!url) return;
    
    if (playingTrack === trackId && audioElement) {
      if (audioElement.paused) {
        audioElement.play();
      } else {
        audioElement.pause();
      }
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingTrack(null);
      setAudioElement(null);
    };
    audio.play();
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
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800 shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <User size={64} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{displayName}</h1>
                  <p className="text-xl text-beatwap-gold font-medium">{profile.cargo || 'Compositor'}</p>
                </div>
                
                {profile.genero_musical && (
                  <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm text-gray-300">
                    {profile.genero_musical}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                  {profile.instagram_url && (
                    <a 
                      href={profile.instagram_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-pink-500/20 hover:text-pink-500 transition-colors"
                      title="Instagram"
                    >
                      <Instagram size={24} />
                    </a>
                  )}
                  {profile.tiktok_url && (
                    <a 
                      href={profile.tiktok_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white/5 rounded-xl hover:bg-black hover:text-white transition-colors border border-transparent hover:border-white/20"
                      title="TikTok"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
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
                    >
                      <MessageCircle size={20} />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compositions Grid */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Music className="text-beatwap-gold" />
              Composições ({compositions.length})
            </h2>

            {compositions.length === 0 ? (
              <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                <Music size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-gray-400">Nenhuma composição publicada ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {compositions.map((comp) => (
                  <motion.div 
                    key={comp.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors group"
                  >
                    <div className="aspect-square relative group cursor-pointer" onClick={() => togglePlay(comp.id, comp.audio_url)}>
                      {comp.cover_url ? (
                        <img src={comp.cover_url} alt={comp.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                          <Music size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform">
                          {playingTrack === comp.id && audioElement && !audioElement.paused ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg truncate mb-1">{comp.title}</h3>
                      <p className="text-sm text-beatwap-gold uppercase font-bold tracking-wider mb-3">{comp.genre || 'Gênero'}</p>
                      {profile.celular && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const num = profile.celular.replace(/\D/g, '');
                            window.open(`https://wa.me/55${num}?text=Olá, vi sua composição "${comp.title}" na BeatWap e gostaria de saber mais.`, '_blank');
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
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PublicProfile;
