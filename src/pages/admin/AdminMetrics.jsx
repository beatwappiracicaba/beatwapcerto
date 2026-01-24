import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, DollarSign, Users, Edit2, Save, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';

export const AdminMetrics = () => {
  const { artists, updateArtistMetrics } = useData();
  const { addToast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ plays: '', listeners: '' });

  const handleEdit = (artist) => {
    setEditingId(artist.id);
    setEditForm({ plays: artist.metrics.plays, listeners: artist.metrics.listeners });
  };

  const handleSave = () => {
    updateArtistMetrics(editingId, editForm);
    setEditingId(null);
    addToast('Métricas atualizadas com sucesso!', 'success');
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Métricas da Plataforma</h1>
        <p className="text-gray-400">Gerencie manualmente as métricas dos artistas.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="text-beatwap-gold" />
            Gerenciamento de Métricas (Atualização Semanal)
          </h3>
          <p className="text-sm text-gray-400 mb-6">
            Edite manualmente as visualizações e ouvintes. Os artistas verão um aviso de que os dados são atualizados semanalmente.
          </p>
          
          <div className="space-y-4">
            {artists.map((artist) => (
              <div key={artist.id} className="bg-white/5 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <img src={artist.avatar} alt={artist.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="font-bold text-white">{artist.name}</div>
                    <div className="text-xs text-gray-400">{artist.email}</div>
                  </div>
                </div>

                {editingId === artist.id ? (
                  <div className="flex items-center gap-2 w-full md:w-auto flex-1 justify-end">
                    <div className="w-32">
                      <AnimatedInput
                        placeholder="Plays"
                        value={editForm.plays}
                        onChange={(e) => setEditForm({ ...editForm, plays: e.target.value })}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <AnimatedInput
                        placeholder="Ouvintes"
                        value={editForm.listeners}
                        onChange={(e) => setEditForm({ ...editForm, listeners: e.target.value })}
                        className="h-10 text-sm"
                      />
                    </div>
                    <AnimatedButton onClick={handleSave} variant="primary" className="p-2">
                      <Save size={16} />
                    </AnimatedButton>
                    <AnimatedButton onClick={handleCancel} variant="secondary" className="p-2">
                      <X size={16} />
                    </AnimatedButton>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end flex-1">
                    <div className="flex gap-6">
                      <div className="text-center">
                        <div className="text-xs text-gray-400">Plays</div>
                        <div className="font-mono text-beatwap-gold">{artist.metrics.plays}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-400">Ouvintes</div>
                        <div className="font-mono text-blue-400">{artist.metrics.listeners}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleEdit(artist)}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
