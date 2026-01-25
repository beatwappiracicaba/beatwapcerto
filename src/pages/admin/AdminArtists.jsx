import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, BarChart2, MoreVertical, X, Save, Music, Shield, ShieldOff } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ArtistContentManager } from '../../components/Admin/ArtistContentManager';
import { supabase } from '../../services/supabaseClient';

export const AdminArtists = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { artists, updateArtistMetrics } = useData();
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState(false);
  const [isContentManagerOpen, setIsContentManagerOpen] = useState(false);
  const { addToast } = useToast();

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

  const filteredArtists = artists.filter(artist => 
    // Show all users, but highlight admins. 
    // User requested to "set someone as administrator", so we must list them.
    // However, previously we filtered them out. 
    // Let's bring them back but maybe add a toggle filter or just show them with a badge.
    // The previous instruction was "os cargos de admin nao precisa aparecer em métricas".
    // "metrics" usually refers to AdminMetrics or the metrics modal.
    // In "Manage Artists", it makes sense to see everyone to manage ROLES.
    
    // If the user wants to NOT see admins in the LIST but wants to SET admins, it's a contradiction 
    // unless we assume we only see 'users' and can promote them.
    // But how do we demote an admin if we can't see them?
    // I will show everyone here, but maybe add a visual distinction.
    // Or I will respect "admin nao precisa aparecer" literally and only show non-admins.
    // But then "setar alguem como administrador" implies taking a user and making them admin.
    // So showing users is fine.
    // What if I need to demote? 
    // I will enable showing everyone but maybe filter by default? 
    // Let's stick to showing everyone for now in this management view so we can promote/demote.
    // Wait, the previous task was "os cargos de admin nao precisa aparecer em métricas".
    // This is AdminArtists.
    // User said "O CARGO DE AMDIN N PRECISA APARECER EM GERENCIAR ARTISTAS".
    // So I MUST HIDE admins from here?
    // If I hide admins, I can't demote them.
    // But I can promote non-admins.
    // Okay, I will keep the filter `artist.role !== 'admin'` BUT provide a way to see admins?
    // Or maybe the user only wants to Promote.
    // "tem que ter a opção de setar alguem como adminstrador".
    // I will assume I only list non-admins and give a button to promote them.
    // Once promoted, they disappear from this list (as per "n precisa aparecer").
    // This seems consistent with the user's conflicting instructions.
    
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
      // Force reload or update local state (useData should handle real-time if subscribed, 
      // otherwise we might need to manually update local state or reload)
      window.location.reload(); 
    } catch (error) {
      console.error('Error updating role:', error);
      addToast('Erro ao atualizar permissões.', 'error');
    }
  };


  const openMetricsModal = (artist) => {
    setSelectedArtist(artist);
    setMetricsForm({
      plays: artist.metrics.plays,
      listeners: artist.metrics.listeners,
      revenue: artist.metrics.revenue,
      growth: artist.metrics.growth
    });
    setIsMetricsModalOpen(true);
  };

  const handleSaveMetrics = () => {
    updateArtistMetrics(selectedArtist.id, metricsForm);
    addToast('Métricas atualizadas com sucesso!', 'success');
    setIsMetricsModalOpen(false);
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
                <img src={artist.avatar} alt={artist.name} className="w-12 h-12 rounded-full bg-gray-800" />
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
