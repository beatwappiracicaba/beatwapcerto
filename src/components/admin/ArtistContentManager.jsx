import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Save, Trash2, Edit2, Music, Check, FileAudio, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { AnimatedInput } from '../ui/AnimatedInput';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useData } from '../../context/DataContext';
import { useNotification } from '../../context/NotificationContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../services/supabaseClient';

export const ArtistContentManager = ({ isOpen, onClose, artist }) => {
  const { music, addMusic, editMusic, deleteMusic } = useData();
  const { addNotification } = useNotification();
  const { addToast } = useToast();
  
  const [view, setView] = useState('list'); // 'list', 'add', 'edit'
  const [selectedMusic, setSelectedMusic] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    upc: '',
    internalNote: '',
    songwriter: '',
    hasFeaturing: false,
    featuringArtist: '',
    distributeAll: false,
    isOriginal: false,
    authorizationFile: null,
    audioFile: null,
    coverFile: null
  });

  // Filter music for this artist
  const artistMusic = music.filter(m => m.artistId === artist?.id);

  const resetForm = () => {
    setFormData({
      title: '',
      artist: '',
      genre: '',
      upc: '',
      internalNote: '',
      songwriter: '',
      hasFeaturing: false,
      featuringArtist: '',
      distributeAll: false,
      isOriginal: false,
      authorizationFile: null,
      audioFile: null,
      coverFile: null
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
      artist: musicItem.artist,
      genre: musicItem.genre,
      upc: musicItem.upc || '',
      internalNote: musicItem.internalNote || '',
      songwriter: musicItem.songwriter || '',
      hasFeaturing: !!musicItem.hasFeaturing,
      featuringArtist: musicItem.featuringArtist || '',
      distributeAll: !!musicItem.distributeAll,
      isOriginal: !!musicItem.isOriginal,
      authorizationFile: null,
      audioFile: null,
      coverFile: null
    });
    setView('edit');
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [type]: file }));
      addToast(type === 'audioFile' ? 'Áudio carregado!' : type === 'coverFile' ? 'Capa carregada!' : 'Documento carregado!', 'success');
    }
  };

  const uploadFile = async (file, bucket) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${artist.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const basicMetadata = formData.title && (artist?.name || formData.artist) && formData.genre && formData.songwriter;
    const featuringValid = !formData.hasFeaturing || (formData.hasFeaturing && formData.featuringArtist);
    if (!basicMetadata || !featuringValid) {
      addToast('Preencha título, artista, gênero, compositor e feat (se houver).', 'error');
      return;
    }
    if (formData.isOriginal && !formData.authorizationFile) {
      addToast('Envie o termo de autorização para composições autorais.', 'error');
      return;
    }
    try {
      let audioUrl = '';
      let coverUrl = '';
      let authorizationUrl = '';
      if (formData.audioFile) {
        audioUrl = await uploadFile(formData.audioFile, 'tracks');
      }
      if (formData.coverFile) {
        coverUrl = await uploadFile(formData.coverFile, 'covers');
      }
      if (formData.authorizationFile) {
        try {
          authorizationUrl = await uploadFile(formData.authorizationFile, 'documents');
        } catch {
          authorizationUrl = await uploadFile(formData.authorizationFile, 'covers');
        }
      }
      if (view === 'add') {
        await addMusic({
          artistId: artist.id,
          artist: artist.name,
          title: formData.title,
          genre: formData.genre,
          upc: formData.upc,
          internalNote: formData.internalNote,
          songwriter: formData.songwriter,
          hasFeaturing: formData.hasFeaturing,
          featuringArtist: formData.featuringArtist,
          distributeAll: formData.distributeAll,
          isOriginal: formData.isOriginal,
          audioFile: audioUrl,
          cover: coverUrl,
          authorizationUrl: authorizationUrl,
          status: 'review',
          addedBy: 'admin'
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
        await editMusic(selectedMusic.id, {
          title: formData.title,
          genre: formData.genre,
          upc: formData.upc,
          internalNote: formData.internalNote,
          songwriter: formData.songwriter,
          hasFeaturing: formData.hasFeaturing,
          featuringArtist: formData.featuringArtist,
          distributeAll: formData.distributeAll,
          isOriginal: formData.isOriginal,
          cover: coverUrl || selectedMusic.cover,
          audioFile: audioUrl || selectedMusic.audioFile
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
    } catch (error) {
      addToast('Erro ao processar arquivos ou salvar música.', 'error');
    }
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <AnimatedInput 
                      label="Título da Música" 
                      placeholder="Ex: Minha Canção" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <AnimatedInput 
                        label="Artista Principal" 
                        placeholder={artist?.name || 'Nome Artístico'} 
                        value={artist?.name || formData.artist}
                        onChange={(e) => setFormData({...formData, artist: e.target.value})}
                      />
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-400 ml-1">Gênero Principal</label>
                        <select
                          value={formData.genre}
                          onChange={e => setFormData({...formData, genre: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold focus:ring-1 focus:ring-beatwap-gold transition-all appearance-none"
                        >
                          <option value="" disabled className="bg-[#121212] text-white">Selecione um gênero</option>
                          <option value="Funk" className="bg-[#121212] text-white">Funk</option>
                          <option value="Trap" className="bg-[#121212] text-white">Trap</option>
                          <option value="Rap" className="bg-[#121212] text-white">Rap</option>
                          <option value="Sertanejo" className="bg-[#121212] text-white">Sertanejo</option>
                          <option value="Forró" className="bg-[#121212] text-white">Forró</option>
                          <option value="Piseiro" className="bg-[#121212] text-white">Piseiro</option>
                          <option value="Pagode" className="bg-[#121212] text-white">Pagode</option>
                          <option value="Samba" className="bg-[#121212] text-white">Samba</option>
                          <option value="MPB" className="bg-[#121212] text-white">MPB</option>
                          <option value="Axé" className="bg-[#121212] text-white">Axé</option>
                          <option value="Brega Funk" className="bg-[#121212] text-white">Brega Funk</option>
                          <option value="Hip Hop" className="bg-[#121212] text-white">Hip Hop</option>
                          <option value="Pop" className="bg-[#121212] text-white">Pop</option>
                          <option value="Eletrônica" className="bg-[#121212] text-white">Eletrônica</option>
                          <option value="Rock" className="bg-[#121212] text-white">Rock</option>
                          <option value="Outro" className="bg-[#121212] text-white">Outro</option>
                        </select>
                      </div>
                    </div>
                    <AnimatedInput 
                      label="Compositor" 
                      placeholder="Nome do Compositor" 
                      value={formData.songwriter}
                      onChange={e => setFormData({...formData, songwriter: e.target.value})}
                    />
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-400">Possui participação especial (Feat)?</label>
                        <input 
                          type="checkbox" 
                          checked={formData.hasFeaturing}
                          onChange={e => setFormData({...formData, hasFeaturing: e.target.checked})}
                          className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                        />
                      </div>
                      {formData.hasFeaturing && (
                        <AnimatedInput 
                          label="Artista(s) Participante(s)" 
                          placeholder="Nome do Feat" 
                          value={formData.featuringArtist}
                          onChange={e => setFormData({...formData, featuringArtist: e.target.value})}
                        />
                      )}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">Distribuição Digital</span>
                        <span className="text-xs text-gray-400">Distribuir em todas as plataformas?</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={formData.distributeAll}
                        onChange={e => setFormData({...formData, distributeAll: e.target.checked})}
                        className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                      />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">Composição Autoral?</span>
                          <span className="text-xs text-gray-400">Se sim, enviar autorização.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={formData.isOriginal}
                          onChange={e => setFormData({...formData, isOriginal: e.target.checked})}
                          className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                        />
                      </div>
                      {formData.isOriginal && (
                        <div className="pt-2 border-t border-white/10">
                          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${formData.authorizationFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
                            <input type="file" id="auth-doc-admin" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'authorizationFile')} />
                            <label htmlFor="auth-doc-admin" className="cursor-pointer flex flex-col items-center gap-2">
                              <div className="p-2 bg-gray-800 rounded-full text-white">
                                <AlertTriangle size={20} />
                              </div>
                              <span className="font-bold text-sm">Termo de Autorização</span>
                              <span className="text-xs text-gray-500">PDF ou Imagem</span>
                              {formData.authorizationFile && <span className="text-beatwap-gold text-xs font-bold mt-1">{formData.authorizationFile.name}</span>}
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    <AnimatedInput 
                      label="ISRC (Opcional)" 
                      placeholder="BR-XXX-24-00000" 
                      value={formData.upc}
                      onChange={e => setFormData({...formData, upc: e.target.value})}
                    />
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
                  <Card>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Upload className="text-beatwap-gold" /> Arquivos
                    </h2>
                    <div className="grid grid-cols-1 gap-6">
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${formData.audioFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
                        <input type="file" id="audio-admin" className="hidden" accept="audio/*" onChange={(e) => handleFileChange(e, 'audioFile')} />
                        <label htmlFor="audio-admin" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="p-3 bg-gray-800 rounded-full text-white">
                            <FileAudio size={24} />
                          </div>
                          <span className="font-bold text-sm">Arquivo de Áudio</span>
                          <span className="text-xs text-gray-500">WAV ou MP3 (320kbps)</span>
                          {formData.audioFile && <span className="text-beatwap-gold text-xs font-bold mt-2">{formData.audioFile.name}</span>}
                        </label>
                      </div>
                      <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${formData.coverFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
                        <input type="file" id="cover-admin" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'coverFile')} />
                        <label htmlFor="cover-admin" className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="p-3 bg-gray-800 rounded-full text-white">
                            <ImageIcon size={24} />
                          </div>
                          <span className="font-bold text-sm">Capa do Single</span>
                          <span className="text-xs text-gray-500">3000x3000px JPG/PNG</span>
                          {formData.coverFile && <span className="text-beatwap-gold text-xs font-bold mt-2">{formData.coverFile.name}</span>}
                        </label>
                      </div>
                    </div>
                  </Card>
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
