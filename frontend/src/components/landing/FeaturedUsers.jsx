import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Star, Shield, Info, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { homeApi } from '../../services/apiClient';

const UserCard = ({ user, type, onSelect }) => {
  const getRoleLabel = () => {
    if (type === 'producer') return 'Produtor';
    if (type === 'seller') return 'Vendedor';
    return 'Artista';
  };

  const roleLabel = getRoleLabel();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold transition-colors group"
      onClick={() => onSelect(user)}
    >
      <div className="aspect-square bg-gray-800 relative overflow-hidden">
        {user.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.name || roleLabel} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <User size={64} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 sm:p-4">
          <div className="w-full">
            <div className="text-white text-base sm:text-sm font-bold leading-snug">{user.name || roleLabel}</div>
            <div className="text-xs sm:text-[11px] text-gray-300 flex items-center gap-2">
              <span>{roleLabel}</span>
              <span className="hidden sm:flex items-center gap-1 text-beatwap-gold">
                <Info size={14} /> <span>Ver Perfil</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FeaturedUsers = ({ artists, producers, sellers }) => {
  const navigate = useNavigate();
  const producersRef = useRef(null);
  const sellersRef = useRef(null);
  const artistsRef = useRef(null);
  const makeScroll = (ref, dir) => () => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.max(240, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: dir * delta, behavior: 'smooth' });
  };

  const handleUserClick = (user) => {
    navigate(`/profile/${user.id}`);
  };

  if (!artists?.length && !producers?.length && !sellers?.length) return null;

  return (
    <section className="py-20 px-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-beatwap-gold/5 rounded-full blur-[100px]" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Producers Section */}
        {producers.length > 0 && (
          <div className="mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="text-beatwap-gold" />
                Produtores
              </h2>
            </motion.div>

            <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
              Arraste para o lado e veja todos
            </div>

            <div className="relative">
              <div
                ref={producersRef}
                className="flex gap-6 overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2 no-scrollbar"
              >
                {producers.map((user) => (
                  <div key={user.id} className="flex-none w-[280px] aspect-square rounded-xl overflow-hidden">
                    <div className="h-full">
                      <UserCard 
                        user={user} 
                        type="producer" 
                        onSelect={handleUserClick} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                aria-label="Anterior"
                className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(producersRef, -1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Próximo"
                className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(producersRef, 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Sellers Section */}
        {sellers.length > 0 && (
          <div className="mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Briefcase className="text-beatwap-gold" />
                Vendedores Parceiros
              </h2>
            </motion.div>

            <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
              Arraste para o lado e veja todos
            </div>

            <div className="relative">
              <div
                ref={sellersRef}
                className="flex gap-6 overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2 no-scrollbar"
              >
                {sellers.map((user) => (
                  <div key={user.id} className="flex-none w-[280px] aspect-square rounded-xl overflow-hidden">
                    <div className="h-full">
                      <UserCard 
                        user={user} 
                        type="seller" 
                        onSelect={handleUserClick} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                aria-label="Anterior"
                className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(sellersRef, -1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Próximo"
                className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(sellersRef, 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Artists Section */}
        {artists.length > 0 && (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Star className="text-beatwap-gold" />
                Artistas da Casa
              </h2>
            </motion.div>

            <div className="text-xs text-gray-400 mb-2 px-4 md:hidden">
              Arraste para o lado e veja todos
            </div>

            <div className="relative">
              <div
                ref={artistsRef}
                className="flex gap-6 overflow-x-auto scroll-smooth whitespace-nowrap px-4 sm:-mx-6 sm:pl-14 sm:pr-14 md:pl-16 md:pr-16 pb-2 no-scrollbar"
              >
                {artists.map((user) => (
                  <div key={user.id} className="flex-none w-[280px] aspect-square rounded-xl overflow-hidden">
                    <div className="h-full">
                      <UserCard 
                        user={user} 
                        type="artist" 
                        onSelect={handleUserClick} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                aria-label="Anterior"
                className="hidden md:flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 ml-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(artistsRef, -1)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Próximo"
                className="hidden md:flex items-center justify-center absolute right-0 top-1/2 -translate-y-1/2 mr-2 w-10 h-10 rounded-full bg-black/60 text-white border border-white/10 hover:bg-beatwap-gold hover:text-black transition"
                onClick={makeScroll(artistsRef, 1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedUsers;
