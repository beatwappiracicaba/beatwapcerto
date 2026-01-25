import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Save, Trash2, Edit2, Music, Check, FileAudio, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { AnimatedInput } from '../ui/AnimatedInput';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';

export const ArtistContentManager = ({ isOpen, onClose, artist }) => {
  const { music, addMusic, editMusic, deleteMusic } = useData();
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  
  const [view, setView] = useState('list'); // 'list', 'add', 'edit'
  const [selectedMusic, setSelectedMusic] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    upc: '',
    internalNote: '',
    cover: null,
    audio: null
  });

  // Filter music for this artist
  const artistMusic = music.filter(m => m.artistId === artist?.id);

  const resetForm = () => {
    setFormData({
      title: '',
      genre: '',
      upc: '',
      internalNote: '',
      cover: null,
      audio: null
    });
  };

  const handleAddClick = () => {
    resetForm();
    setView('add');
  };

  const handleEditClick = (musicItem) => {
    setSelectedMusic(musicItem);
    setFormData({
      title: musicItem.title,
      genre: musicItem.genre,
      upc: musicItem.upc || '',
      internalNote: musicItem.internalNote || '',
      cover: musicItem.cover,
      audio: musicItem.audioFile
    });
    setView('edit');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.genre) {
      addToast('Título e Gênero são obrigatórios.', 'error');
      return;
    }

    if (view === 'add') {
      addMusic({
        artistId: artist.id,
        artist: artist.name,
        title: formData.title,
        genre: formData.genre,
        upc: formData.upc,
        internalNote: formData.internalNote,
        cover: formData.cover || 'https://picsum.photos/200/200?random=' + Date.now(),
        audioFile: formData.audio || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      });

      addNotification({
        recipientId: artist.id,
        title: 'Nova Música Adicionada! 🎵',
        message: `A música "${formData.title}" foi adicionada ao seu perfil pela equipe BeatWap.`,
        type: 'success',
        link: '/dashboard'
      });

      addToast('Música adicionada com sucesso!', 'success');
    } else if (view === 'edit') {
      editMusic(selectedMusic.id, {
        title: formData.title,
        genre: formData.genre,
        upc: formData.upc,
        internalNote: formData.internalNote,
        cover: formData.cover || selectedMusic.cover,
        audioFile: formData.audio || selectedMusic.audioFile
      });

      addNotification({
        recipientId: artist.id,
        title: 'Música Atualizada 🔄',
        message: `As informações da música "${formData.title}" foram atualizadas pela equipe.`,
        type: 'info',
        link: `/dashboard/music/${selectedMusic.id}`
      });

      addToast('Música atualizada com sucesso!', 'success');
    }

    setView('list');
  };

  const handleDelete = (musicItem) => {
    if (window.confirm(`Tem certeza que deseja remover "${musicItem.title}"?`)) {
      deleteMusic(musicItem.id);
      
      addNotification({
        recipientId: artist.id,
        title: 'Música Removida 🗑️',
        message: `A música "${musicItem.title}" foi removida do seu perfil.`,
        type: 'warning',
        link: '/dashboard'
      });

      addToast('Música removida.', 'success');
    }
  };

  if (!isOpen || !artist) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Music className="text-beatwap-gold" />
                Gerenciar Conteúdo: {artist.name}
              </h2>
              <p className="text-sm text-gray-400">Adicione ou edite músicas manualmente.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {view === 'list' ? (
              <div className="space-y-4">
                <AnimatedButton onClick={handleAddClick} className="w-full mb-6">
                  <Upload size={18} />
                  Adicionar Nova Música Manualmente
                </AnimatedButton>

                {artistMusic.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                    <Music size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Este artista não possui músicas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {artistMusic.map(item => (
                      <div key={item.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                        <div className="flex items-center gap-4">
                          <img src={item.cover} alt={item.title} className="w-12 h-12 rounded bg-gray-800 object-cover" />
                          <div>
                            <h4 className="font-bold text-white">{item.title}</h4>
                            <p className="text-xs text-gray-400">{item.genre} • {item.upc || 'Sem UPC'}</p>
                            {item.addedBy === 'admin' && (
                              <span className="text-[10px] text-beatwap-gold bg-beatwap-gold/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                                Adicionado pela Equipe
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item)}
                            className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Uploads */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Capa da Música</label>
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-beatwap-gold/50 transition-colors cursor-pointer bg-white/5">
                        <ImageIcon className="mx-auto mb-2 text-gray-400" size={24} />
                        <span className="text-sm text-gray-400">Clique para upload (Mock)</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Arquivo de Áudio</label>
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-beatwap-gold/50 transition-colors cursor-pointer bg-white/5">
                        <FileAudio className="mx-auto mb-2 text-gray-400" size={24} />
                        <span className="text-sm text-gray-400">Clique para upload (Mock)</span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Título da Música</label>
                      <AnimatedInput 
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Ex: Minha Canção"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Gênero</label>
                      <select 
                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-beatwap-gold focus:outline-none"
                        value={formData.genre}
                        onChange={(e) => setFormData({...formData, genre: e.target.value})}
                      >
                        <option value="">Selecione...</option>
                        <option value="Trap">Trap</option>
                        <option value="Rap">Rap</option>
                        <option value="Funk">Funk</option>
                        <option value="R&B">R&B</option>
                        <option value="Pop">Pop</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">UPC (Opcional)</label>
                      <AnimatedInput 
                        value={formData.upc}
                        onChange={(e) => setFormData({...formData, upc: e.target.value})}
                        placeholder="789XXXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Observação Interna (Admin)</label>
                      <textarea 
                        className="w-full bg-black border border-white/10 rounded-xl p-3 text-white focus:border-beatwap-gold focus:outline-none h-24 resize-none"
                        value={formData.internalNote}
                        onChange={(e) => setFormData({...formData, internalNote: e.target.value})}
                        placeholder="Ex: Material enviado via WhatsApp..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4 border-t border-white/10">
                  <button 
                    type="button"
                    onClick={() => setView('list')}
                    className="px-6 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <AnimatedButton type="submit">
                    <Save size={18} />
                    {view === 'add' ? 'Adicionar Música' : 'Salvar Alterações'}
                  </AnimatedButton>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
