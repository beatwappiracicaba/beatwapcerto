import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { supabase } from '../services/supabaseClient';
import { MapPin, Music, DollarSign, Phone, Eye, Calendar, Search, Edit2, Check, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SellerArtists = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Cache Editing State
  const [editingCache, setEditingCache] = useState({ id: null, value: '' });

  // Agenda Modal State
  const [agendaModal, setAgendaModal] = useState({ 
    isOpen: false, 
    artist: null, 
    events: [], 
    currentDate: new Date() 
  });

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

  const handleEditCache = (artist) => {
    setEditingCache({ id: artist.id, value: artist.cache_medio || '' });
  };

  const handleSaveCache = async () => {
    if (!editingCache.id) return;
    try {
      // Try RPC first (safer for Vendedores)
      let { error } = await supabase
        .rpc('update_artist_cache', { 
          artist_id: editingCache.id, 
          new_cache: editingCache.value 
        });

      // Fallback to direct update if RPC not found/fails (e.g. for Admins/Producers who have RLS permission)
      if (error && (error.code === '42883' || error.message?.includes('function'))) {
         const direct = await supabase
          .from('profiles')
          .update({ cache_medio: editingCache.value })
          .eq('id', editingCache.id);
         error = direct.error;
      }

      if (error) throw error;

      setArtists(artists.map(a => 
        a.id === editingCache.id ? { ...a, cache_medio: editingCache.value } : a
      ));
      setEditingCache({ id: null, value: '' });
    } catch (error) {
      console.error('Error updating cache:', error);
      alert('Erro ao atualizar cachê. Verifique se a função update_artist_cache existe no banco.');
    }
  };

  const handleOpenAgenda = (artist) => {
    const date = new Date();
    setAgendaModal({ 
      isOpen: true, 
      artist, 
      events: [], 
      currentDate: date 
    });
    fetchArtistEvents(artist.id, date);
  };

  const fetchArtistEvents = async (artistId, date) => {
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('artist_id', artistId)
        .eq('status', 'fechado')
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfMonth);

      if (error) throw error;
      setAgendaModal(prev => ({ ...prev, events: data || [] }));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const changeMonth = (delta) => {
    const newDate = new Date(agendaModal.currentDate.getFullYear(), agendaModal.currentDate.getMonth() + delta, 1);
    setAgendaModal(prev => ({ ...prev, currentDate: newDate }));
    if (agendaModal.artist) {
      fetchArtistEvents(agendaModal.artist.id, newDate);
    }
  };

  const renderCalendar = () => {
    if (!agendaModal.currentDate) return null;
    
    const year = agendaModal.currentDate.getFullYear();
    const month = agendaModal.currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Empty cells
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-16 md:h-24 bg-white/[0.02] border border-white/5 rounded-lg opacity-50"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0];
      const dayEvents = agendaModal.events.filter(e => e.event_date.startsWith(dateStr));
      const hasEvent = dayEvents.length > 0;

      days.push(
        <div key={day} className={`h-16 md:h-24 border rounded-lg p-1 relative ${hasEvent ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
          <div className={`text-xs font-bold ${hasEvent ? 'text-red-400' : 'text-gray-400'}`}>{day}</div>
          {hasEvent && (
            <div className="mt-1">
                <div className="text-[10px] bg-red-500/20 text-red-300 px-1 rounded truncate">
                    Ocupado
                </div>
            </div>
          )}
        </div>
      );
    }
    return days;
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
                  <div className="flex items-center gap-2 flex-1">
                    <span>Cachê Médio:</span>
                    {editingCache.id === artist.id ? (
                        <div className="flex items-center gap-1">
                            <input 
                                type="text" 
                                value={editingCache.value}
                                onChange={(e) => setEditingCache({ ...editingCache, value: e.target.value })}
                                className="bg-black/50 border border-white/20 rounded px-2 py-1 text-white w-32 text-xs"
                                placeholder="Ex: 5000"
                                autoFocus
                            />
                            <button onClick={handleSaveCache} className="p-1 hover:text-green-400"><Check size={14} /></button>
                            <button onClick={() => setEditingCache({ id: null, value: '' })} className="p-1 hover:text-red-400"><X size={14} /></button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/edit cursor-pointer" onClick={() => handleEditCache(artist)}>
                            <span className="text-white font-medium">
                                {artist.cache_medio ? `R$ ${artist.cache_medio}` : 'Sob Consulta'}
                            </span>
                            <Edit2 size={12} className="opacity-0 group-hover/edit:opacity-100 transition-opacity text-gray-400" />
                        </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Calendar size={16} className="text-blue-400" />
                  <span>Disponibilidade: 
                    <button 
                        onClick={() => handleOpenAgenda(artist)}
                        className="ml-1 text-green-400 hover:text-green-300 hover:underline cursor-pointer font-medium"
                    >
                        Consulte Agenda
                    </button>
                  </span>
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

      {/* Agenda Modal */}
      {agendaModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#121214] z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Agenda: {agendaModal.artist?.nome}</h2>
                        <p className="text-gray-400 text-sm">Datas ocupadas (shows confirmados)</p>
                    </div>
                    <button onClick={() => setAgendaModal({ ...agendaModal, isOpen: false })} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronLeft size={20} /></button>
                        <div className="font-bold text-lg text-white">
                            {agendaModal.currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </div>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-lg text-white"><ChevronRight size={20} /></button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4 text-center text-gray-400 text-sm font-medium">
                        <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
                    </div>
                    <div className="grid grid-cols-7 gap-2 md:gap-4">
                        {renderCalendar()}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-white/5 border border-white/10 rounded"></div>
                            <span>Livre</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500/20 border border-red-500/30 rounded"></div>
                            <span>Ocupado (Show Confirmado)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SellerArtists;
