import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Star, Music, Shield, Info, Instagram as IgIcon, Globe, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';

const UserCard = ({ user, type, onSelect }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-beatwap-gold/50 transition-colors group"
      onClick={() => onSelect(user)}
    >
      <div className="aspect-square bg-gray-800 relative overflow-hidden">
        {user.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.name || (type === 'producer' ? 'Produtor' : 'Artista')} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <User size={48} className="text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <span className="text-beatwap-gold text-sm font-medium flex items-center gap-2">
            <Info size={16} /> Ver Perfil
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-white truncate">{user.name || (type === 'producer' ? 'Produtor' : 'Artista')}</h3>
        <p className="text-sm text-gray-400 truncate">{type === 'producer' ? 'Produtor' : 'Artista'}</p>
      </div>
    </motion.div>
  );
};

const FeaturedUsers = () => {
  const [artists, setArtists] = useState([]);
  const [producers, setProducers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const normalized = data.map(u => ({ ...u, name: u.nome || u.nome_completo_razao_social || u.name || '' }));
          const admins = normalized.filter(u => u.cargo === 'Produtor');
          const regular = normalized.filter(u => u.cargo !== 'Produtor');
          setProducers(admins);
          setArtists(regular);
          setRecentUsers(normalized.slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const openLink = (url, type) => {
    const valid = (url || '').trim();
    if (!valid) {
      addToast(`Perfil ${type} ainda não possui`, 'info');
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = valid;
      a.target = '_blank';
      a.rel = 'noopener,noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  };

  if (loading) return null;

  return (
    <section className="py-20 bg-beatwap-dark relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-beatwap-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        
        {/* Recent Joins Notification Area */}
        {recentUsers.length > 0 && (
          <div className="mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg text-green-500">
                  <Star size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">Acabaram de Chegar</h2>
              </div>
              <div className="flex flex-wrap gap-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 bg-black/20 pr-4 rounded-full p-1 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="w-full h-full p-1 text-gray-400" />
                      )}
                    </div>
                    <span className="text-sm text-gray-300 font-medium">{user.name || 'Novo Usuário'}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Producers Section */}
        {producers.length > 0 && (
          <div className="mb-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Nossos <span className="text-beatwap-gold">Produtores</span></h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Conheça a equipe responsável por fazer a mágica acontecer.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {producers.map((producer, index) => (
                <motion.div
                  key={producer.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <UserCard user={producer} type="producer" onSelect={(u) => setSelected(u)} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Artists Section */}
        {artists.length > 0 && (
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Artistas da <span className="text-beatwap-gold">Casa</span></h2>
              <p className="text-gray-400 max-w-2xl mx-auto">Talentos incríveis que fazem parte da nossa história.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {artists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <UserCard user={artist} type="artist" onSelect={(u) => setSelected(u)} />
                </motion.div>
              ))}
            </div>
          </div>
        )}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-beatwap-black">
                  <h3 className="text-lg font-bold text-white">Visitar Perfil</h3>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-3">
                  <button
                    onClick={() => openLink(selected.instagram_url, 'do Instagram')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-500">
                      <IgIcon size={20} />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold text-sm">Instagram</div>
                      <div className="text-xs text-gray-400 truncate">{selected.instagram_url || 'Ainda não possui'}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => openLink(selected.site_url, 'do site')}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                      <Globe size={20} />
                    </div>
                    <div className="text-left">
                      <div className="text-white font-bold text-sm">Site</div>
                      <div className="text-xs text-gray-400 truncate">{selected.site_url || 'Ainda não possui'}</div>
                    </div>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default FeaturedUsers;
