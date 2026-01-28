import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Music, Image as ImageIcon, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const MusicUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    nome_artista: '',
    estilo: '',
    isrc: '',
    plataformas: ['Todas'], // Default to all
    plataformas_selecionadas: [], // If not all
    authorization_file: null,
    cover_file: null,
    audio_file: null
  });

  const [previews, setPreviews] = useState({
    cover: null,
    audio: null,
    auth: null
  });

  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        nome_artista: profile.nome || profile.nome_completo_razao_social || prev.nome_artista || ''
      }));
    }
  }, [profile]);

  const validateImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 3000 || img.height < 3000) {
          reject('A imagem deve ter no mínimo 3000x3000px.');
        } else {
          resolve(true);
        }
      };
      img.onerror = () => reject('Arquivo de imagem inválido.');
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'cover_file') {
      try {
        await validateImage(file);
        setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(file) }));
        setErrors(prev => ({ ...prev, cover: null }));
      } catch (err) {
        setErrors(prev => ({ ...prev, cover: err }));
        return;
      }
    } else if (type === 'audio_file') {
      setPreviews(prev => ({ ...prev, audio: URL.createObjectURL(file) }));
    } else if (type === 'authorization_file') {
      setPreviews(prev => ({ ...prev, auth: file.name }));
    }

    setFormData(prev => ({ ...prev, [type]: file }));
  };

  const uploadFile = async (file, bucket) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.nome_artista || !formData.cover_file || !formData.audio_file || !formData.estilo) {
      setErrors(prev => ({ ...prev, submit: 'Preencha todos os campos obrigatórios.' }));
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Upload Files
      const coverUrl = await uploadFile(formData.cover_file, 'music_covers');
      const audioUrl = await uploadFile(formData.audio_file, 'music_files');
      let authUrl = null;
      if (formData.authorization_file) {
        authUrl = await uploadFile(formData.authorization_file, 'music_docs');
      }

      // Insert into DB
      const { error } = await supabase.from('musics').insert({
        artista_id: user.id,
        titulo: formData.titulo,
        nome_artista: formData.nome_artista,
        estilo: formData.estilo,
        isrc: (formData.isrc || '').trim() || null,
        cover_url: coverUrl,
        audio_url: audioUrl,
        plataformas: formData.plataformas.includes('Todas') ? ['Todas'] : formData.plataformas_selecionadas,
        status: 'em_analise'
      });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
      addToast('Música enviada para análise!', 'success');
    } catch (err) {
      console.error('Erro ao enviar música:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
      setErrors(prev => ({ ...prev, submit: 'Erro ao enviar música. Tente novamente.' }));
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
          className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-beatwap-black">
            <h3 className="text-xl font-bold text-white">Nova Música</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cover Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Capa (3000x3000px)</label>
                <div 
                  className={`relative aspect-square rounded-xl border-2 border-dashed ${errors.cover ? 'border-red-500 bg-red-500/10' : 'border-white/20 bg-white/5'} flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors overflow-hidden group`}
                  onClick={() => document.getElementById('cover-upload').click()}
                >
                  {previews.cover ? (
                    <>
                      <img src={previews.cover} alt="Cover Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="text-white" size={32} />
                      </div>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="text-gray-500 mb-2" size={40} />
                      <span className="text-xs text-gray-500 text-center px-4">Clique para upload</span>
                    </>
                  )}
                  <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover_file')} />
                </div>
                {errors.cover && <p className="text-xs text-red-500">{errors.cover}</p>}
              </div>

              {/* Basic Info */}
              <div className="space-y-4">
                <AnimatedInput 
                  label="Nome da Música" 
                  value={formData.titulo} 
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                  placeholder="Ex: Minha Obra Prima"
                />
                <AnimatedInput 
                  label="Nome do Artista" 
                  value={formData.nome_artista} 
                  onChange={(e) => setFormData({...formData, nome_artista: e.target.value})} 
                  placeholder="Ex: MC Exemplo"
                />
                <AnimatedInput 
                  label="Estilo / Gênero" 
                  value={formData.estilo} 
                  onChange={(e) => setFormData({...formData, estilo: e.target.value})} 
                  placeholder="Ex: Trap, Funk, Pop"
                />
              </div>
            </div>

            {/* Audio & Docs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Arquivo de Áudio (MP3/WAV)</label>
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="p-2 bg-beatwap-gold/20 rounded-lg text-beatwap-gold">
                    <Music size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-white truncate">{formData.audio_file ? formData.audio_file.name : 'Nenhum arquivo'}</p>
                  </div>
                  <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs cursor-pointer transition-colors">
                    Escolher
                    <input type="file" accept=".mp3,.wav" className="hidden" onChange={(e) => handleFileChange(e, 'audio_file')} />
                  </label>
                </div>
                {previews.audio && (
                   <audio controls src={previews.audio} className="w-full h-8 mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Autorização (Opcional)</label>
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-white truncate">{formData.authorization_file ? formData.authorization_file.name : 'Nenhum arquivo'}</p>
                  </div>
                  <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs cursor-pointer transition-colors">
                    Upload
                    <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={(e) => handleFileChange(e, 'authorization_file')} />
                  </label>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <AnimatedInput 
                  label="ISRC (Se houver)" 
                  value={formData.isrc} 
                  onChange={(e) => setFormData({...formData, isrc: e.target.value})} 
                  placeholder="BR-XXX-XX-XXXXX"
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Plataformas</label>
                  <select 
                    className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors appearance-none"
                    value={formData.plataformas.includes('Todas') ? 'Todas' : 'Selecionar'}
                    onChange={(e) => {
                      if (e.target.value === 'Todas') setFormData({...formData, plataformas: ['Todas']});
                      else setFormData({...formData, plataformas: []});
                    }}
                  >
                    <option value="Todas">Todas as Plataformas</option>
                    <option value="Selecionar">Selecionar (Em breve)</option>
                  </select>
                </div>
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                <span>{errors.submit}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <AnimatedButton onClick={handleSubmit} isLoading={loading} icon={CheckCircle2}>
                Enviar para Análise
              </AnimatedButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
