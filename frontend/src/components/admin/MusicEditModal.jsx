import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Check, Calendar, Link as LinkIcon, Barcode } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { useToast } from '../../context/ToastContext';

export const MusicEditModal = ({ isOpen, onClose, music, onSuccess }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [producers, setProducers] = useState([]);
  const [formData, setFormData] = useState({
    upc: '',
    isrc: '',
    presave_link: '',
    release_date: '',
    is_beatwap_produced: false,
    show_on_home: false,
    produced_by: ''
  });

  useEffect(() => {
    const fetchProducers = async () => {
      const data = await apiClient.get('/producers');
      setProducers(data || []);
    };
    fetchProducers();
  }, []);

  useEffect(() => {
    if (music) {
      setFormData({
        upc: music.upc || '',
        isrc: music.isrc || '',
        presave_link: music.presave_link || '',
        release_date: music.release_date || '',
        is_beatwap_produced: music.is_beatwap_produced || false,
        show_on_home: music.show_on_home || false,
        produced_by: music.produced_by || ''
      });
    }
  }, [music]);

  const handleSave = async () => {
    if (!formData.upc) {
      addToast('O campo UPC é obrigatório', 'error');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put(`/musics/${music.id}`, {
        upc: formData.upc,
        isrc: formData.isrc || null,
        presave_link: formData.presave_link || null,
        release_date: formData.release_date || null,
        is_beatwap_produced: formData.is_beatwap_produced,
        show_on_home: formData.show_on_home,
        produced_by: formData.produced_by || null
      });

      addToast('Informações atualizadas com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating music:', error);
      addToast('Erro ao atualizar informações', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Editar Informações</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">UPC (Obrigatório)</label>
              <div className="relative">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={formData.upc}
                  onChange={(e) => setFormData(prev => ({ ...prev, upc: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-beatwap-gold/50"
                  placeholder="Código UPC"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">ISRC</label>
              <input
                type="text"
                value={formData.isrc}
                onChange={(e) => setFormData(prev => ({ ...prev, isrc: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-beatwap-gold/50"
                placeholder="Código ISRC"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Link Pre-save</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={formData.presave_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, presave_link: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-beatwap-gold/50"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Data de Lançamento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:outline-none focus:border-beatwap-gold/50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Produtor Responsável</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-beatwap-gold/50 appearance-none"
                value={formData.produced_by}
                onChange={(e) => setFormData(prev => ({ ...prev, produced_by: e.target.value }))}
              >
                <option value="" className="bg-black">Selecione o Produtor</option>
                {producers.map(p => (
                  <option key={p.id} value={p.id} className="bg-black">
                    {p.nome || p.nome_completo_razao_social || 'Produtor'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div 
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${formData.is_beatwap_produced ? 'bg-beatwap-gold/10 border-beatwap-gold text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                onClick={() => setFormData(prev => ({ ...prev, is_beatwap_produced: !prev.is_beatwap_produced }))}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.is_beatwap_produced ? 'bg-beatwap-gold border-beatwap-gold text-black' : 'border-white/20 bg-transparent'}`}>
                  {formData.is_beatwap_produced && <Check size={14} strokeWidth={4} />}
                </div>
                <span className="text-xs font-medium">Produzido pela BeatWap</span>
              </div>

              <div 
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${formData.show_on_home ? 'bg-beatwap-gold/10 border-beatwap-gold text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                onClick={() => setFormData(prev => ({ ...prev, show_on_home: !prev.show_on_home }))}
              >
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.show_on_home ? 'bg-beatwap-gold border-beatwap-gold text-black' : 'border-white/20 bg-transparent'}`}>
                  {formData.show_on_home && <Check size={14} strokeWidth={4} />}
                </div>
                <span className="text-xs font-medium">Mostrar na Home</span>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-white/10 flex justify-end gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <AnimatedButton 
              onClick={handleSave} 
              disabled={loading}
              className="bg-beatwap-gold text-black hover:bg-white"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </AnimatedButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
