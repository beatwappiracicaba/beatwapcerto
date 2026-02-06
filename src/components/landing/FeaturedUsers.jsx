import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Star, Music, Shield, Info, Instagram as IgIcon, Globe, X, Briefcase } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';

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
        <h3 className="font-bold text-lg text-white truncate">
          <span>{user.name || roleLabel}</span>
        </h3>
        <p className="text-sm text-gray-400 truncate">
          <span>{roleLabel}</span>
          {user.genero_musical && <span> • {user.genero_musical}</span>}
        </p>
      </div>
    </motion.div>
  );
};

const FeaturedUsers = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [producers, setProducers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { addToast } = useToast();
  const [ipHash, setIpHash] = useState(null);

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
          const vendors = normalized.filter(u => (u.cargo || '').toLowerCase().includes('vendedor'));
          const regular = normalized.filter(u => {
            const cargo = (u.cargo || '').toLowerCase();
            return cargo !== 'produtor' && cargo !== 'compositor' && !cargo.includes('vendedor');
          });
          setProducers(admins);
          setSellers(vendors);
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

  const handleUserClick = (user) => {
    navigate(`/profile/${user.id}`);
  };

  if (loading) return null;

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

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {producers.map((user) => (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  type="producer" 
                  onSelect={handleUserClick} 
                />
              ))}
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

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {sellers.map((user) => (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  type="seller" 
                  onSelect={handleUserClick} 
                />
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
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Star className="text-beatwap-gold" />
                Artistas da Casa
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {artists.map((user) => (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  type="artist" 
                  onSelect={handleUserClick} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedUsers;
