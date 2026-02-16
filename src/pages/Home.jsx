import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/landing/Header';
import Hero from '../components/landing/Hero';
import FeaturedUsers from '../components/landing/FeaturedUsers';
import HowItWorks from '../components/landing/HowItWorks';
import Benefits from '../components/landing/Benefits';
import Transparency from '../components/landing/Transparency';
import Pricing from '../components/landing/Pricing';
import ShowProduction from '../components/landing/ShowProduction';
import SpecialOffer from '../components/landing/SpecialOffer';
import Contact from '../components/landing/Contact';
import Footer from '../components/landing/Footer';
import { supabase } from '../services/supabaseClient';
import { Play, Pause, BadgeCheck, Music, MessageCircle, ChevronLeft, ChevronRight, User, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Instagram, Globe, Youtube, Video } from 'lucide-react';
 

const Home = () => {
  const navigate = useNavigate();
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
  const upcomingRef = useRef(null);
  const releasedRef = useRef(null);
  const compositionsRef = useRef(null);
  const composersRef = useRef(null);
  const sponsorsRef = useRef(null);
  const makeScroll = (ref, dir) => () => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

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
        .select('id,titulo,nome_artista,estilo,cover_url,preview_url,audio_url,presave_link,release_date,created_at,artista_id,is_beatwap_produced,show_on_home,produced_by,producer:profiles!produced_by(nome,nome_completo_razao_social)')
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
      const combined = [...upcoming, ...pastOrNoDate].slice(0, 8).map(r => {
        const o = { ...r };
        delete o._rd;
        delete o._isUpcoming;
        return o;
      });
      setLatestReleases(combined);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  };
 
  const fetchLatestCompositions = async () => {
    try {
      const { data, error } = await supabase
        .from('compositions')
        .select('id, title, genre, cover_url, audio_url, created_at, composer_id, status, profiles:composer_id(nome, nome_completo_razao_social, celular)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;
      
      const mapped = (data || []).map(c => ({
        ...c,
        composer_name: c.profiles?.nome || c.profiles?.nome_completo_razao_social || 'Compositor',
        composer_phone: c.profiles?.celular
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
        {latestReleases.length > 0 && (() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const upcoming = latestReleases.filter(r => {
            if (!r.release_date) return true;
            const [y, m, d] = r.release_date.split('-'); const date = new Date(y, m - 1, d);
            return date > today;
          });
          const released = latestReleases.filter(r => {
            if (!r.release_date) return false;
            const [y, m, d] = r.release_date.split('-'); const date = new Date(y, m - 1, d);
            return date <= today;
          });
          return (
            <>
              {upcoming.length > 0 && (
                <section className="py-16 px-4 sm:px-6 bg-black/30">
                  <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"><span>Em Breve</span></h2>
                      <p className="text-gray-400"><span>Pré-saves e lançamentos agendados</span></p>
                    </div>
                    <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                      Arraste para o lado e veja todos
                    </div>
                    <div className="relative">
                      <div
                        ref={upcomingRef}
                        className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2"
                      >
                        <div className="flex gap-6">
                        {upcoming.map((release, index) => (
                          <div key={release.id} className="flex-none w-[280px]">
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="h-full flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold transition-colors group"
                            >
                              <div 
                                className="aspect-square bg-gray-800 relative overflow-hidden"
                                onClick={() => {
                                  const url = release.preview_url || release.audio_url;
                                  togglePlay(release.id, url);
                                }}
                              >
                                <img 
                                  src={release.cover_url} 
                                  alt={release.titulo || 'Capa'} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                                {release.release_date && (() => {
                                  const [y, m, d] = release.release_date.split('-');
                                  const rDate = new Date(y, m - 1, d);
                                  return (
                                    <div className="absolute top-2 left-2 text-black text-xs font-bold px-2 py-1 rounded bg-beatwap-gold">
                                      <span>Lança em {rDate.toLocaleDateString('pt-BR')}</span>
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
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                                  <div className="text-white text-sm font-bold truncate">{release.titulo || 'Lançamento'}</div>
                                  <div className="text-[11px] text-gray-300 truncate">{release.nome_artista || 'Artista'}</div>
                                </div>
                              </div>
                              <div className="hidden sm:flex p-4 flex-1 flex-col justify-between min-h-[120px]">
                                <div>
                                  <h3 className="font-bold text-lg text-white truncate"><span>{release.titulo || 'Lançamento'}</span></h3>
                                  <p className="text-sm text-gray-400 truncate"><span>{release.nome_artista || 'Artista'}</span></p>
                                  <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider"><span>{release.estilo || ''}</span></p>
                                </div>
                                <div className="mt-2">
                                  {release.presave_link ? (
                                    <AnimatedButton onClick={() => { 
                                      recordEvent({ type: 'music_click_presave', music_id: release.id, artist_id: release.artista_id });
                                      window.open(release.presave_link, '_blank');
                                    }}>
                                      <span>Pré-save</span>
                                    </AnimatedButton>
                                  ) : (
                                    <div className="h-9" />
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                        </div>
                      </div>
                      <button
                        aria-label="Anterior"
                        className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(upcomingRef, -1)}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        aria-label="Próximo"
                        className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(upcomingRef, 1)}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
              {released.length > 0 && (
                <section className="py-14 px-4 sm:px-6 bg-black/20">
                  <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"><span>Já Lançadas</span></h2>
                      <p className="text-gray-400"><span>Ouça agora os lançamentos disponíveis</span></p>
                    </div>
                    <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                      Arraste para o lado e veja todos
                    </div>
                    <div className="relative">
                      <div
                        ref={releasedRef}
                        className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2"
                      >
                        <div className="flex gap-6">
                        {released.map((release, index) => (
                          <div key={release.id} className="flex-none w-[280px]">
                            <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="h-full flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold transition-colors group"
                            >
                              <div 
                                className="aspect-square bg-gray-800 relative overflow-hidden"
                                onClick={() => {
                                  const url = release.preview_url || release.audio_url;
                                  togglePlay(release.id, url);
                                }}
                              >
                                <img 
                                  src={release.cover_url} 
                                  alt={release.titulo || 'Capa'} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                                {release.release_date && (() => {
                                  const [y, m, d] = release.release_date.split('-');
                                  const rDate = new Date(y, m - 1, d);
                                  return (
                                    <div className="absolute top-2 left-2 text-black text-xs font-bold px-2 py-1 rounded bg-white">
                                      <span>Lançado em {rDate.toLocaleDateString('pt-BR')}</span>
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
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                                  <div className="text-white text-sm font-bold truncate">{release.titulo || 'Lançamento'}</div>
                                  <div className="text-[11px] text-gray-300 truncate">{release.nome_artista || 'Artista'}</div>
                                </div>
                              </div>
                              <div className="hidden sm:flex p-4 flex-1 flex-col justify-between min-h-[120px]">
                                <div>
                                  <h3 className="font-bold text-lg text-white truncate"><span>{release.titulo || 'Lançamento'}</span></h3>
                                  <p className="text-sm text-gray-400 truncate"><span>{release.nome_artista || 'Artista'}</span></p>
                                  <p className="text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider"><span>{release.estilo || ''}</span></p>
                                </div>
                                <div className="mt-2">
                                  <AnimatedButton onClick={() => { 
                                    if (release.presave_link) {
                                      recordEvent({ type: 'music_click_presave', music_id: release.id, artist_id: release.artista_id });
                                      window.open(release.presave_link, '_blank');
                                    } else {
                                      const url = release.preview_url || release.audio_url;
                                      togglePlay(release.id, url);
                                    }
                                  }}>
                                    <span>{release.presave_link ? 'Pré-save' : (playingTrack === release.id && !isPaused ? 'Pausar' : 'Reproduzir')}</span>
                                  </AnimatedButton>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                        </div>
                      </div>
                      <button
                        aria-label="Anterior"
                        className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(releasedRef, -1)}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        aria-label="Próximo"
                        className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                        onClick={makeScroll(releasedRef, 1)}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </section>
              )}
            </>
          );
        })()}

        {/* Latest Compositions Section */}
        {latestCompositions.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto relative">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4"><span>Últimas Composições Lançadas</span></h2>
                <p className="text-gray-400"><span>Obras exclusivas de nossos compositores parceiros</span></p>
              </div>

              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                Arraste para o lado e veja todas
              </div>

              <div ref={compositionsRef} className="overflow-x-auto scroll-smooth whitespace-nowrap -mx-6 pl-14 pr-14 md:pl-16 md:pr-16 pb-2">
                <div className="flex gap-6 justify-center md:justify-start">
                  {latestCompositions.map((comp, index) => (
                    <div key={comp.id} className="flex-none w-[280px]">
                      <motion.div 
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
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                            <div className="text-white text-sm font-bold truncate">{comp.title}</div>
                            <div className="text-[11px] text-gray-300 truncate">{comp.composer_name}</div>
                          </div>
                        </div>
                        <h3 className="hidden sm:block font-bold text-lg truncate"><span>{comp.title}</span></h3>
                        <p className="hidden sm:block text-sm text-gray-400 truncate"><span>{comp.composer_name}</span></p>
                        <p className="hidden sm:block text-xs text-beatwap-gold mt-1 uppercase font-bold tracking-wider"><span>{comp.genre || 'Gênero'}</span></p>
                        {comp.composer_phone && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const num = comp.composer_phone.replace(/\D/g, '');
                              window.open(`https://wa.me/55${num}?text=Olá, vi sua composição "${comp.title}" na BeatWap e gostaria de saber mais.`, '_blank');
                            }}
                            className="mt-3 flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-2 rounded-lg hover:bg-green-400/20 transition-colors w-full justify-center"
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp do Compositor</span>
                          </button>
                        )}
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                aria-label="Anterior"
                className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -ml-1 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(compositionsRef, -1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Próximo"
                className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 -mr-1 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(compositionsRef, 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </section>
        )}

        {/* Latest Producer Video Projects */}
        {latestProjects.length > 0 && (
          <section className="py-16 px-4 sm:px-6 bg-black/25">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4"><span>Últimos Projetos de Vídeos Feitos</span></h2>
                <p className="text-gray-400"><span>Conteúdos recentes publicados pela produtora</span></p>
              </div>
              <div className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2">
                <div className="flex gap-6 justify-center md:justify-start">
                  {latestProjects.map((p, index) => (
                    <div key={p.id} className="flex-none w-[280px]">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                      >
                        <div className="aspect-video bg-gray-800 relative overflow-hidden">
                          {(() => {
                            const url = p.url || '';
                            const isYT = (p.platform || '').toLowerCase() === 'youtube';
                            let vid = null;
                            if (isYT) {
                              const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
                              vid = m ? m[1] : null;
                            }
                            const thumb = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null;
                            return thumb
                              ? <img src={thumb} alt={p.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm"><span>{p.platform || 'Projeto'}</span></div>;
                          })()}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              className="px-4 py-2 bg-beatwap-gold rounded-full text-black font-bold hover:bg-white"
                              onClick={() => window.open(p.url, '_blank')}
                            >
                              <span>Abrir</span>
                            </button>
                          </div>
                          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent block sm:hidden">
                            <div className="text-white text-sm font-bold truncate">{p.title}</div>
                            <div className="text-[11px] text-gray-300 truncate">{p.platform || 'Projeto'}</div>
                          </div>
                        </div>
                        <div className="hidden sm:block p-4">
                          <h3 className="font-bold text-lg truncate"><span>{p.title}</span></h3>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Composers Section */}
        {composers.length > 0 && (
          <section className="py-20 px-6 bg-black/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4"><span>Compositores Parceiros</span></h2>
                <p className="text-gray-400"><span>Profissionais disponíveis para suas produções</span></p>
              </div>
              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
                Arraste para o lado e veja todos
              </div>
              <div className="relative -mx-6">
                <div ref={composersRef} className="overflow-x-auto scroll-smooth whitespace-nowrap px-6 pb-2">
                  <div className="flex gap-6 justify-center md:justify-start">
                  {composers.map((composer, index) => (
                    <div key={composer.id} className="flex-none w-[280px]">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold transition-colors"
                        onClick={() => navigate(`/profile/${composer.id}`)}
                      >
                        <div className="aspect-square bg-gray-800 relative overflow-hidden">
                          {composer.avatar_url ? (
                            <img 
                              src={composer.avatar_url} 
                              alt={composer.name || 'Compositor'} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                              <User size={64} className="text-white/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4">
                            <div className="w-full">
                              <div className="text-white text-base sm:text-sm font-bold leading-snug">{composer.name || 'Compositor'}</div>
                              <div className="text-xs sm:text-[11px] text-gray-300 flex items-center gap-2">
                                <span>Compositor</span>
                                <span className="hidden sm:flex items-center gap-1 text-beatwap-gold">
                                  <Info size={14} /> <span>Ver Perfil</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                  </div>
                </div>
                <button
                  aria-label="Anterior"
                  className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(composersRef, -1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  aria-label="Próximo"
                  className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(composersRef, 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Duplicate removed */}

        {/* Sellers Section moved to FeaturedUsers */}

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
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 break-words leading-snug">Patrocinadores/Parcerias</h2>
                <p className="text-gray-400">Marcas que apoiam nossos artistas e projetos</p>
              </div>
              <div className="text-xs text-gray-400 mb-2 px-4 md:hidden text-center">
                Arraste para o lado e veja todas as marcas
              </div>
              <div className="relative -mx-6">
                <div ref={sponsorsRef} className="overflow-x-auto scroll-smooth whitespace-nowrap px-6 pb-2">
                  <div className="flex gap-6 justify-center md:justify-start">
                    {sponsors.map((s, index) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-none w-[280px]"
                      >
                        <div
                          className="group relative w-full aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 border-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-lg"
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
                <button
                  aria-label="Anterior"
                  className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(sponsorsRef, -1)}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  aria-label="Próximo"
                  className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                  onClick={makeScroll(sponsorsRef, 1)}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </section>
        )}

        <FeaturedUsers />
        <HowItWorks />
        <Benefits />
        <ShowProduction />
        <Transparency />
        <Pricing />
        <SpecialOffer />
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h4 className="text-beatwap-gold font-extrabold text-3xl md:text-4xl mb-8 text-center animate-gold-fade">Redes Sociais</h4>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://www.instagram.com/beatwap?igsh=eDZ4a3lvN3ZqOWNy"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-beatwap-gold hover:text-black transition-all"
                title="Instagram"
                aria-label="Instagram BeatWap"
              >
                <Instagram size={22} />
              </a>
              <a
                href="https://www.youtube.com/@beatwap019"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all"
                title="YouTube"
                aria-label="YouTube BeatWap"
              >
                <Youtube size={22} />
              </a>
              <a
                href="https://www.tiktok.com/@beatmusichits?_r=1&_t=ZS-92pn4DAMEw1"
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-[#00f2ea] hover:text-black transition-all"
                title="TikTok"
                aria-label="TikTok BeatWap"
              >
                <Video size={22} />
              </a>
            </div>
          </div>
        </section>
        <Contact />
        {sponsors.length > 0 && (
          <section className="bg-black border-t border-white/10 py-4">
            <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {sponsors.map((s) => (
                  <div
                    key={s.id}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden"
                    title={s.name}
                  >
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        className="max-w-[80%] max-h-[80%] object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400">Marca</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Home;
