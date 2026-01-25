import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, BarChart2, MoreVertical, X, Save, Music, Shield, ShieldOff, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ArtistContentManager } from '../../components/admin/ArtistContentManager';
import { supabase } from '../../services/supabaseClient';

export const AdminArtists = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { artists, updateArtistMetrics, deleteArtist, getArtistById } = useData(); // Assuming deleteArtist exists or needs to be added
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isContentManagerOpen, setIsContentManagerOpen] = useState(false);
  const { addToast } = useToast();
  const [localArtists, setLocalArtists] = useState([]);

  // Sync with DataContext
  useEffect(() => {
    setLocalArtists(artists);
  }, [artists]);

  // Metrics Form State
  const [metricsForm, setMetricsForm] = useState({
    plays: '',
    listeners: '',
    revenue: '',
    growth: ''
  });

  const openContentManager = (artist) => {
    setSelectedArtist(artist);
    setIsContentManagerOpen(true);
  };

  const filteredArtists = localArtists.filter(artist => 
    artist.role !== 'admin' && 
    ((artist.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (artist.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleAdminRole = async (artist) => {
    if (!window.confirm(`Tem certeza que deseja tornar ${artist.name} um administrador?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', artist.id);

      if (error) throw error;

      addToast(`${artist.name} agora é um administrador!`, 'success');
      // Update local state to remove from list immediately
      setLocalArtists(prev => prev.filter(a => a.id !== artist.id));
    } catch (error) {
      console.error('Error updating role:', error);
      addToast('Erro ao atualizar permissões.', 'error');
    }
  };

  const openMetricsModal = (artist) => {
    setSelectedArtist(artist);
    // Ensure metrics exist, fallback to 0 if undefined
    const metrics = artist.metrics || {};
    setMetricsForm({
      plays: metrics.plays || '0',
      listeners: metrics.listeners || '0',
      revenue: metrics.revenue || 'R$ 0,00',
      growth: metrics.growth || '0%'
    });
    setIsMetricsModalOpen(true);
  };

  const handleSaveMetrics = async () => {
    try {
        await updateArtistMetrics(selectedArtist.id, metricsForm);
        addToast('Métricas atualizadas com sucesso!', 'success');
        setIsMetricsModalOpen(false);
    } catch (error) {
        addToast('Erro ao salvar métricas.', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Artistas</h1>
          <p className="text-gray-400">Visualize e edite informações dos artistas.</p>
        </div>
        <div className="w-full md:w-64">
          <AnimatedInput 
            icon={Search} 
            placeholder="Buscar artista..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredArtists.map((artist) => (
          <motion.div 
            key={artist.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center">
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-bold text-lg">{artist.name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{artist.name}</h3>
                  <p className="text-sm text-gray-400">{artist.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <span className={`px-3 py-1 rounded-full text-xs font-medium 
                  ${artist.status === 'active' ? 'bg-green-500/20 text-green-500' : 
                    artist.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 
                    'bg-red-500/20 text-red-500'}`}>
                  {artist.status === 'active' ? 'Ativo' : artist.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                </span>

                <div className="flex gap-2">
                  <button 
                    onClick={() => toggleAdminRole(artist)}
                    className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors tooltip"
                    title="Tornar Administrador"
                  >
                    <Shield size={20} />
                  </button>
                  <button 
                    onClick={() => openContentManager(artist)}
                    className="p-2 text-beatwap-gold hover:bg-beatwap-gold/10 rounded-lg transition-colors tooltip"
                    title="Gerenciar Conteúdo"
                  >
                    <Music size={20} />
                  </button>
                  <button 
                    onClick={() => openMetricsModal(artist)}
                    className="p-2 text-gray-400 hover:bg-white/10 rounded-lg transition-colors tooltip"
                    title="Editar Métricas"
                  >
                    <BarChart2 size={20} />
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <ArtistContentManager 
        isOpen={isContentManagerOpen}
        onClose={() => setIsContentManagerOpen(false)}
        artist={selectedArtist}
      />

      {/* Edit Metrics Modal */}
      <AnimatePresence>
        {isMetricsModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-beatwap-black border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Editar Métricas: {selectedArtist?.name}</h2>
                <button onClick={() => setIsMetricsModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Total de Plays</label>
                  <AnimatedInput 
                    value={metricsForm.plays}
                    onChange={(e) => setMetricsForm({...metricsForm, plays: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Ouvintes Mensais</label>
                  <AnimatedInput 
                    value={metricsForm.listeners}
                    onChange={(e) => setMetricsForm({...metricsForm, listeners: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Receita Estimada</label>
                  <AnimatedInput 
                    value={metricsForm.revenue}
                    onChange={(e) => setMetricsForm({...metricsForm, revenue: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Crescimento (%)</label>
                  <AnimatedInput 
                    value={metricsForm.growth}
                    onChange={(e) => setMetricsForm({...metricsForm, growth: e.target.value})}
                  />
                </div>
                
                <div className="pt-4">
                  <AnimatedButton onClick={handleSaveMetrics} className="w-full flex justify-center gap-2">
                    <Save size={20} />
                    Salvar Métricas
                  </AnimatedButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
