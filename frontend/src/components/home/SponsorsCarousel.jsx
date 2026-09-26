import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Globe, Instagram } from 'lucide-react';

// Carrossel dos patrocinadores da Home.
//
// Os cards passam sozinhos, um de cada vez, e voltam ao inicio ao chegar no
// fim. A rolagem para quando o ponteiro entra na area, quando o dedo toca na
// tela e enquanto o menu do card esta aberto, para nao andar embaixo de quem
// esta clicando. Quem prefere menos movimento nao ve a passagem automatica.

const INTERVALO_MS = 3800;
const TOLERANCIA = 2;
const ESPACO = 24;

export const SponsorsCarousel = ({ sponsors = [], onRegistrarClique }) => {
  const [menuAberto, setMenuAberto] = useState(null);
  const trilhoRef = useRef(null);
  const timerRef = useRef(null);
  const pausadoRef = useRef(false);

  const lista = Array.isArray(sponsors) ? sponsors : [];

  const avancar = useCallback(() => {
    const el = trilhoRef.current;
    if (!el) return;
    const maximo = el.scrollWidth - el.clientWidth;
    // Sem transbordo nao ha o que passar: pode ter 1, 2 ou 3 patrocinios.
    if (maximo <= TOLERANCIA) return;
    if (el.scrollLeft >= maximo - TOLERANCIA) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    const card = el.querySelector('[data-sponsor-card]');
    const passo = card
      ? card.getBoundingClientRect().width + ESPACO
      : Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: passo, behavior: 'smooth' });
  }, []);

  const parar = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const iniciar = useCallback(() => {
    parar();
    if (pausadoRef.current) return;
    timerRef.current = setInterval(avancar, INTERVALO_MS);
  }, [avancar, parar]);

  useEffect(() => {
    const preferencia = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (preferencia && preferencia.matches) return undefined;
    iniciar();
    return parar;
  }, [iniciar, parar]);

  // Se a lista mudar (ou entrar/sair), o ciclo recomeca no primeiro card.
  const total = lista.length;
  useEffect(() => {
    const el = trilhoRef.current;
    if (el) el.scrollLeft = 0;
    parar();
    iniciar();
  }, [total, iniciar, parar]);

  const pausar = useCallback(() => {
    pausadoRef.current = true;
    parar();
  }, [parar]);

  const retomar = useCallback(() => {
    pausadoRef.current = false;
    iniciar();
  }, [iniciar]);

  const alternarMenu = useCallback((id) => {
    setMenuAberto((atual) => {
      if (atual === id) {
        retomar();
        return null;
      }
      pausar();
      return id;
    });
  }, [pausar, retomar]);

  const rolar = useCallback((direcao) => {
    const el = trilhoRef.current;
    if (!el) return;
    const delta = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: direcao * delta, behavior: 'smooth' });
    // Zera a contagem para o proximo movimento automatico nao vir em cima.
    iniciar();
  }, [iniciar]);

  const registrar = useCallback((sponsor) => {
    if (onRegistrarClique) onRegistrarClique(sponsor);
  }, [onRegistrarClique]);

  if (!lista.length) return null;

  return (
    <section className="py-12 px-6 bg-black/25 border-b border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 break-words leading-snug">
            Patrocinadores/Parcerias
          </h2>
          <p className="text-gray-400">Marcas que apoiam nossos artistas e projetos</p>
        </div>

        <div className="relative -mx-6">
          <div
            ref={trilhoRef}
            onMouseEnter={pausar}
            onMouseLeave={retomar}
            onFocus={pausar}
            onBlur={retomar}
            onTouchStart={pausar}
            onTouchEnd={retomar}
            className="overflow-x-auto scroll-smooth whitespace-nowrap px-6 pb-2"
          >
            <div className="flex gap-6 justify-start">
              {lista.map((s, index) => (
                <motion.div
                  key={s.id}
                  data-sponsor-card
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.1, 0.4) }}
                  className="flex-none w-[280px]"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver contatos de ${s.name || 'patrocinador'}`}
                    className="group relative w-full aspect-square rounded-xl overflow-hidden bg-gray-800 border-2 border-black flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-lg"
                    onClick={() => alternarMenu(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        alternarMenu(s.id);
                      }
                    }}
                  >
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm">Sem logo</div>
                    )}

                    <div
                      className={`absolute inset-0 rounded-xl bg-black/40 opacity-0 transition-opacity flex items-center justify-center ${
                        menuAberto === s.id ? 'opacity-100' : 'group-hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {s.instagram_url && (
                          <button
                            className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              registrar(s);
                              window.open(s.instagram_url, '_blank', 'noopener,noreferrer');
                            }}
                            aria-label={`Instagram de ${s.name}`}
                          >
                            <Instagram size={18} />
                          </button>
                        )}
                        {s.site_url && (
                          <button
                            className="p-2 rounded-full bg-beatwap-gold text-black hover:bg-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              registrar(s);
                              window.open(s.site_url, '_blank', 'noopener,noreferrer');
                            }}
                            aria-label={`Site de ${s.name}`}
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
            type="button"
            aria-label="Anterior"
            className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
            onClick={() => rolar(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
            onClick={() => rolar(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default SponsorsCarousel;
