import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/landing/Header';
import Footer from '../components/landing/Footer';
import { apiClient } from '../services/apiClient';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Play, Pause, Music, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { decryptData } from '../utils/security';

// Helper functions
const buildWhatsAppHref = (rawPhone, title) => {
  const raw = decryptData(rawPhone);
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return null;
  const phone = digits.startsWith('55') ? digits : `55${digits}`;
  const text = encodeURIComponent(`Olá, vi sua composição "${title}" na BeatWap e gostaria de saber mais.`);
  return `https://wa.me/${phone}?text=${text}`;
};

const formatWhatsAppPhone = (rawPhone) => {
  const raw = decryptData(rawPhone);
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

const AllCompositions = () => {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [playingTrack, setPlayingTrack] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchAll();
    return () => {
      if (audioElement) audioElement.pause();
    };
  }, []);

  const fetchAll = async () => {
    try {
      const data = await apiClient.get('/compositions');
      const mapped = (data || []).map(c => ({
        ...c,
        composer_id: c?.composer_id || c?.composerId || c?.user_id || c?.userId || c?.profile_id || c?.profileId,
        composer_name: decryptData(c?.composer_name || c?.author_name || c?.nome_autor || c?.nome_compositor || c?.nome || '') || 'Autor',
        composer_phone: c?.composer_phone || c?.celular || c?.whatsapp || c?.phone || null
      })).sort((a, b) => {
        const da = new Date(a.created_at || a.createdAt || 0).getTime();
        const db = new Date(b.created_at || b.createdAt || 0).getTime();
        return db - da;
      });
      setList(mapped);
    } catch {
      setList([]);
    }
  };

  const togglePlay = (id, url) => {
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
    audio.play().catch(() => {});
    setAudioElement(audio);
    setIsPaused(false);
    setPlayingTrack(id);
  };

  return (
    <div className="min-h-screen bg-beatwap-black text-white flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="py-12 px-6 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Todas as Composições</h1>
                <p className="text-gray-400">Obras listadas da mais recente para a mais antiga</p>
              </div>
              <div className="hidden sm:block">
                <AnimatedButton onClick={() => navigate('/')}>Voltar para Home</AnimatedButton>
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
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {list.map((comp, index) => (
                <div key={comp.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group relative"
                  >
                    <div
                      className="aspect-square rounded-2xl overflow-hidden mb-4 relative shadow-lg cursor-pointer bg-gray-800"
                      onClick={() => togglePlay(comp.id, sanitizeUrl(comp.audio_url))}
                    >
                      {comp.cover_url ? (
                        <img
                          src={sanitizeUrl(comp.cover_url)}
                          alt={comp.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Music size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          className="w-12 h-12 bg-beatwap-gold rounded-full flex items-center justify-center text-black"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay(comp.id, sanitizeUrl(comp.audio_url));
                          }}
                        >
                          {playingTrack === comp.id && !isPaused
                            ? <Pause fill="currentColor" className="ml-1" />
                            : <Play fill="currentColor" className="ml-1" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg truncate">{comp.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{comp.composer_name || 'Autor'}</p>
                    {Number.isFinite(Number(comp.price)) && (
                      <div className="text-xs text-beatwap-gold mt-1 font-bold">R$ {comp.price}</div>
                    )}
                    {comp.composer_phone ? (
                      <button
                        onClick={() => {
                          const href = buildWhatsAppHref(comp.composer_phone, comp.title);
                          if (!href) return;
                          window.open(href, '_blank');
                        }}
                        className="mt-3 flex items-center gap-2 text-xs font-bold text-green-400 bg-green-400/10 px-3 py-2 rounded-lg hover:bg-green-400/20 transition-colors w-full justify-center"
                      >
                        <MessageCircle size={14} />
                        Chamar no WhatsApp
                      </button>
                    ) : (
                      <div className="mt-3 text-xs text-gray-500">WhatsApp não informado</div>
                    )}
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AllCompositions;
