import { useEffect, useState } from 'react';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import FeaturedUsers from '../components/landing/FeaturedUsers';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Transparency from '../components/landing/Transparency';
import Pricing from '../components/landing/Pricing';
import SpecialOffer from '../components/landing/SpecialOffer';
import Contact from '../components/landing/Contact';
import Footer from '../components/landing/Footer';
import { supabase } from '../services/supabaseClient';
import { Play, Pause, BadgeCheck, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Instagram, Globe } from 'lucide-react';
 

const Home = () => {
  const [latestReleases, setLatestReleases] = useState([]);
  const [latestCompositions, setLatestCompositions] = useState([]);
  const [latestProjects, setLatestProjects] = useState([]);
  const [composers, setComposers] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [activeSponsorMenu, setActiveSponsorMenu] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [ipHash, setIpHash] = useState(null);
  const [playStartTS, setPlayStartTS] = useState(null);
  

  // Reset scroll on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    fetchLatestReleases();
    fetchLatestCompositions();
    fetchLatestProjects();
    fetchComposers();
    fetchSponsors();
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
        .select('id,titulo,nome_artista,estilo,cover_url,preview_url,audio_url,presave_link,release_date,created_at,artista_id,is_beatwap_produced,show_on_home')
        .eq('status', 'aprovado')
        .eq('show_on_home', true)
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) throw error;
      const today = new Date();
      const parsed = (data || []).map(r => {
        const rd = r.release_date ? new Date(r.release_date) : null;
        const isUpcoming = rd ? rd >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) : false;
        return { ...r, _rd: rd, _isUpcoming: isUpcoming };
      });
      const upcoming = parsed.filter(r => r._isUpcoming).sort((a, b) => (a._rd - b._rd));
      const pastOrNoDate = parsed.filter(r => !r._isUpcoming).sort((a, b) => {
        if (a._rd && b._rd) return b._rd - a._rd;
        if (a._rd && !b._rd) return -1;
        if (!a._rd && b._rd) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      const combined = [...upcoming, ...pastOrNoDate].slice(0, 8).map(({ _rd, _isUpcoming, ...rest }) => rest);
      setLatestReleases(combined);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  };
 
  const fetchLatestCompositions = async () => {
    try {
      const { data, error } = await supabase
        .from('compositions')
        .select('id, title, genre, cover_url, audio_url, created_at, composer_id, status, profiles:composer_id(nome, nome_completo_razao_social)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      
      const mapped = (data || []).map(c => ({
        ...c,
        composer_name: c.profiles?.nome || c.profiles?.nome_completo_razao_social || 'Compositor'
      }));
      setLatestCompositions(mapped);
    } catch (error) {
      console.error('Error fetching compositions:', error);
    }
  };

  const recordEvent = async (payload) => {
    try {
      await supabase.from('analytics_events').insert([{ ...payload, ip_hash: ipHash || 'unknown' }]);
    } catch (e) { void 0; }
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
        setPlayStartTS(Date.now());
      } else {
        audioElement.pause();
        setIsPaused(true);
        if (playStartTS) {
          const duration = Math.max(0, Math.round((Date.now() - playStartTS) / 1000));
          const rel = latestReleases.find(r => r.id === trackId);
          if (rel) recordEvent({ type: 'music_play', music_id: rel.id, artist_id: rel.artista_id, duration_seconds: duration });
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
        const rel = latestReleases.find(r => r.id === trackId);
        if (rel) recordEvent({ type: 'music_play', music_id: rel.id, artist_id: rel.artista_id, duration_seconds: duration });
        setPlayStartTS(null);
      }
      setPlayingTrack(null);
      setAudioElement(null);
      setIsPaused(false);
    };
    audio.play().catch(() => {});
    setPlayStartTS(Date.now());
    setAudioElement(audio);
    setPlayingTrack(trackId);
    setIsPaused(false);
  };

  const fetchComposers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social, avatar_url')
        .eq('cargo', 'Compositor')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      const mapped = (data || []).map(s => ({ ...s, name: s.nome || s.nome_completo_razao_social || '' }));
      setComposers(mapped);
    } catch (error) {
      console.error('Error fetching composers:', error);
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
                      {release.release_date && (() => {
                        const [y, m, d] = release.release_date.split('-');
                        const rDate = new Date(y, m - 1, d);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isReleased = rDate <= today;
                        return (
                          <div className={`absolute top-2 left-2 text-black text-xs font-bold px-2 py-1 rounded ${isReleased ? 'bg-white' : 'bg-beatwap-gold'}`}>
                            {isReleased ? 'Lançado em' : 'Lança em'} {rDate.toLocaleDateString('pt-BR')}
                          </div>
                        );
                      })()}
                      {release.is_beatwap_produced && (
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full border border-beatwap-gold/50 z-10" title="Produzido, Mixado e Masterizado pela BeatWap">
                          <BadgeCheck className="text-beatwap-gold w-5 h-5" />
                        </div>
                      )}
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
                    <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                      {release.is_beatwap_produced ? (
                        <>
                          <BadgeCheck size={12} className="text-beatwap-gold" />
                          <span className="text-beatwap-gold font-medium">Produzido por BeatWap</span>
                        </>
                      ) : (
                        'Não produzido pela BeatWap'
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Lançamento: {release.release_date ? new Date(release.release_date).toLocaleDateString('pt-BR') : 'Em breve'}
                    </p>
                    {release.presave_link && (
                      <div className="mt-2">
                        <AnimatedButton onClick={() => { 
                          recordEvent({ type: 'music_click_presave', music_id: release.id, artist_id: release.artista_id });
                          window.open(release.presave_link, '_blank');
                        }}>
                          {(() => {
                             const [y, m, d] = (release.release_date || '').split('-');
                             const rDate = release.release_date ? new Date(y, m - 1, d) : new Date(8640000000000000);
                             const today = new Date();
                             today.setHours(0, 0, 0, 0);
                             return rDate <= today ? 'SmartLink' : 'Pré-save';
                          })()}
                        </AnimatedButton>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Latest Compositions Section */}
        {latestCompositions.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Últimas Composições Lançadas</h2>
                <p className="text-gray-400">Obras exclusivas de nossos compositores parceiros</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {latestCompositions.map((comp, index) => (
                  <motion.div 
                    key={comp.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative"
                  >
                    <div 
                      className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg cursor-pointer bg-gray-800"
                      onClick={() => togglePlay(comp.id, comp.audio_url)}
                    >
                      {comp.cover_url ? (
                        <img 
                          src={comp.cover_url} 
                          alt={comp.title} 
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
                            togglePlay(comp.id, comp.audio_url);
                          }}
                        >
                          {playingTrack === comp.id && !isPaused
                            ? <Pause fill="currentColor" className="ml-1" />
                            : <Play fill="currentColor" className="ml-1" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg truncate">{comp.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{comp.composer_name}</p>
                    <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider">{comp.genre || 'Gênero'}</p>
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

        {/* Composers Section */}
        {composers.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Compositores Parceiros</h2>
                <p className="text-gray-400">Profissionais disponíveis para suas produções</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {composers.map((composer, index) => (
                  <motion.div
                    key={composer.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group p-4 rounded-2xl bg-white/5 border border-white/10"
                  >
                    <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 bg-gray-700 border-2 border-black">
                      {composer.avatar_url ? (
                        <img src={composer.avatar_url} alt={composer.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-white font-bold">
                          {composer.name?.charAt(0) || 'C'}
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-center">{composer.name || 'Compositor'}</h3>
                    <p className="text-sm text-gray-400 text-center line-clamp-2 mt-1">{composer.bio || 'Compositor parceiro'}</p>
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
                              onClick={(e) => { e.stopPropagation(); recordEvent({ type: 'sponsor_click', sponsor_id: s.id }); window.open(s.instagram_url, '_blank'); }}
                              aria-label="Instagram"
                            >
                              <Instagram size={18} />
                            </button>
                          )}
                          {s.site_url && (
                            <button
                              className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                              onClick={(e) => { e.stopPropagation(); recordEvent({ type: 'sponsor_click', sponsor_id: s.id }); window.open(s.site_url, '_blank'); }}
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
        <SpecialOffer />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
