import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { supabase } from '../services/supabaseClient';
import { MapPin, Music, DollarSign, Phone, Eye, Calendar, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SellerArtists = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cargo', 'Artista')
        .order('nome', { ascending: true });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArtists = artists.filter(artist => 
    (artist.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (artist.genero_musical || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (artist.cidade || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Lista de Artistas</h1>
            <p className="text-gray-400">Base de trabalho para vendas</p>
          </div>
          <div className="relative w-full md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Buscar artista..." 
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtists.map(artist => (
            <Card key={artist.id} className="p-6 hover:border-beatwap-gold/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Music size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{artist.nome || artist.nome_completo_razao_social || 'Artista sem nome'}</h3>
                    <div className="flex items-center gap-1 text-xs text-beatwap-gold">
                      <Music size={12} />
                      <span>{artist.genero_musical || 'Gênero n/d'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <MapPin size={16} className="text-gray-500" />
                  <span>
                    {artist.cidade ? (
                      `${artist.cidade}${artist.estado ? ` - ${artist.estado}` : ''}`
                    ) : (
                      'Localização não informada'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <DollarSign size={16} className="text-green-500" />
                  <span>Cachê Médio: <span className="text-white font-medium">R$ {artist.cache_medio || 'Sob Consulta'}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar size={16} className="text-blue-400" />
                  <span>Disponibilidade: <span className="text-green-400">Consulte Agenda</span></span>
                </div>
              </div>

              <div className="flex gap-2 mt-auto">
                <AnimatedButton 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate(`/profile/${artist.id}`)}
                >
                  <Eye size={16} /> Ver Perfil
                </AnimatedButton>
                <AnimatedButton 
                  size="sm" 
                  variant="secondary"
                  className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"
                  onClick={() => window.open(`https://wa.me/${artist.whatsapp || ''}`, '_blank')}
                >
                  <Phone size={16} /> Contato
                </AnimatedButton>
              </div>
            </Card>
          ))}
          
          {filteredArtists.length === 0 && !loading && (
            <div className="col-span-full text-center py-20 text-gray-500">
              Nenhum artista encontrado.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerArtists;
