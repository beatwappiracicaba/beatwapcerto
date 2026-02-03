import React, { useEffect, useState } from 'react';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import FeaturedUsers from '../components/landing/FeaturedUsers';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Transparency from '../components/landing/Transparency';
import Pricing from '../components/landing/Pricing';
import Contact from '../components/landing/Contact';
import FAQ from '../components/landing/FAQ';
import Footer from '../components/landing/Footer';
import { supabase } from '../services/supabaseClient';
import { Card } from '../components/ui/Card';
import { Play, Pause } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Instagram, Globe } from 'lucide-react';
 

const Home = () => {
  const [latestReleases, setLatestReleases] = useState([]);
  const [latestProjects, setLatestProjects] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [activeSponsorMenu, setActiveSponsorMenu] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  

  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchLatestReleases();
    fetchLatestProjects();
    fetchSellers();
    fetchSponsors();
  }, []);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const fetchLatestReleases = async () => {
    try {
      const { data, error } = await supabase
        .from('musics')
        .select('id,titulo,nome_artista,estilo,cover_url,preview_url,audio_url,presave_link')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      setLatestReleases(data || []);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  };

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('id,name,logo_url,instagram_url,site_url,created_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
    }
  };

  const fetchLatestProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('producer_projects')
        .select('id,title,url,platform,created_at')
        .eq('platform', 'YouTube')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      setLatestProjects(data || []);
    } catch (error) {
      console.error('Error fetching producer projects:', error);
    }
  };

  const togglePlay = (trackId, url) => {
    if (!url) return;
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
    const audio = new Audio(url);
    audio.onended = () => {
      setPlayingTrack(null);
      setAudioElement(null);
      setIsPaused(false);
    };
    audio.play().catch(() => {});
    setAudioElement(audio);
    setPlayingTrack(trackId);
    setIsPaused(false);
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social, avatar_url')
        .eq('cargo', 'Vendedor')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      const mapped = (data || []).map(s => ({ ...s, name: s.nome || s.nome_completo_razao_social || '' }));
      setSellers(mapped);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  return (
    <div className="bg-beatwap-dark min-h-screen text-white font-sans selection:bg-beatwap-gold selection:text-black">
      <Header />
      <main>
        <Hero />
        
        {/* Latest Releases Section */}
        {latestReleases.length > 0 && (
          <section className="py-20 px-6 bg-black/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Lançamentos Recentes</h2>
                <p className="text-gray-400">Ouça o que os nossos artistas estão produzindo</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {latestReleases.map((release, index) => (
                  <motion.div 
                    key={release.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative"
                  >
                  <div 
                    className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg cursor-pointer"
                    onClick={() => {
                      const url = release.preview_url || release.audio_url;
                      togglePlay(release.id, url);
                    }}
                  >
                      <img 
                        src={release.cover_url} 
                        alt={release.titulo || 'Capa'} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = release.preview_url || release.audio_url;
                            togglePlay(release.id, url);
                          }}
                        >
                          {playingTrack === release.id && !isPaused
                            ? <Pause fill="currentColor" className="ml-1" />
                            : <Play fill="currentColor" className="ml-1" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg truncate">{release.titulo || 'Lançamento'}</h3>
                    <p className="text-sm text-gray-400 truncate">{release.nome_artista || 'Artista'}</p>
                    <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider">{release.estilo || ''}</p>
                    {release.presave_link && (
                      <div className="mt-2">
                        <AnimatedButton onClick={() => window.open(release.presave_link, '_blank')}>
                          Pré-save
                        </AnimatedButton>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Latest Producer Video Projects */}
        {latestProjects.length > 0 && (
          <section className="py-20 px-6 bg-black/25">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Últimos Projetos de Vídeos Feitos</h2>
                <p className="text-gray-400">Conteúdos recentes publicados pela produtora</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {latestProjects.map((p, index) => (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-800 relative">
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">YouTube</div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          className="px-4 py-2 bg-beatwap-gold rounded-full text-black font-bold hover:bg-white"
                          onClick={() => window.open(p.url, '_blank')}
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg truncate">{p.title}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sellers Section */}
        {sellers.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Vendedores de Shows</h2>
                <p className="text-gray-400">Profissionais disponíveis para fechar shows</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {sellers.map((seller, index) => (
                  <motion.div
                    key={seller.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 bg-gray-700 border-2 border-black">
                      {seller.avatar_url ? (
                        <img src={seller.avatar_url} alt={seller.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-white font-bold">
                          {seller.name?.charAt(0) || 'V'}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-center">{seller.name || 'Vendedor'}</h3>
                    <p className="text-sm text-gray-400 text-center line-clamp-2 mt-1">{seller.bio || 'Vendedor de shows'}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Sponsors CTA */}
        <section className="py-12 px-6 bg-black/20">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <AnimatedButton onClick={() => window.open('https://wa.me/?text=Quero%20ser%20patrocinador%20BeatWap', '_blank')}>
              Seja nosso patrocinador
            </AnimatedButton>
          </div>
        </section>

        {/* Sponsors Section */}
        {sponsors.length > 0 && (
          <section className="py-20 px-6 bg-black/25">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Patrocinadores/Parcerias</h2>
                <p className="text-gray-400">Marcas que apoiam nossos artistas e projetos</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {sponsors.map((s, index) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="inline-block"
                  >
                    <div
                      className="group relative w-24 h-24 rounded-xl overflow-hidden mx-auto bg-gray-800 border-2 border-black flex items-center justify-center cursor-pointer"
                      onClick={() => setActiveSponsorMenu(activeSponsorMenu === s.id ? null : s.id)}
                    >
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm">Sem logo</div>
                      )}
                      <div className={`absolute inset-0 rounded-xl bg-black/40 opacity-0 transition-opacity flex items-center justify-center ${activeSponsorMenu === s.id ? 'opacity-100' : 'group-hover:opacity-100'}`}>
                        <div className="flex items-center gap-4">
                          {s.instagram_url && (
                            <button
                              className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                              onClick={(e) => { e.stopPropagation(); window.open(s.instagram_url, '_blank'); }}
                              aria-label="Instagram"
                            >
                              <Instagram size={18} />
                            </button>
                          )}
                          {s.site_url && (
                            <button
                              className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                              onClick={(e) => { e.stopPropagation(); window.open(s.site_url, '_blank'); }}
                              aria-label="Site"
                            >
                              <Globe size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        <FeaturedUsers />
        <HowItWorks />
        <Benefits />
        <Transparency />
        <Pricing />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
