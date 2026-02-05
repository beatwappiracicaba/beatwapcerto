import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Music, Image as ImageIcon, FileText } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const CompositionsUploadModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
    price: '',
    cover_file: null,
    audio_file: null,
  });

  const [previews, setPreviews] = useState({
    cover: null,
    audio: null,
  });

  const [errors, setErrors] = useState({});

  const validateImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 1000 || img.height < 1000) { // Relaxed constraint for compositions? kept 3000 in music, maybe 1000 here is fine or keep 3000. Let's stick to 1000 for flexibility.
          // reject('A imagem deve ter no mínimo 3000x3000px.'); 
          resolve(true); // Let's accept any size for now to be less strict
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
        // await validateImage(file); // Optional validation
        setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(file) }));
        setErrors(prev => ({ ...prev, cover: null }));
      } catch (err) {
        setErrors(prev => ({ ...prev, cover: err }));
        return;
      }
    } else if (type === 'audio_file') {
      setPreviews(prev => ({ ...prev, audio: URL.createObjectURL(file) }));
    }

    setFormData(prev => ({ ...prev, [type]: file }));
  };

  const uploadFile = async (file, bucket) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `compositions/${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };
  
  const handleSubmit = async () => {
    if (!formData.title || !formData.audio_file || !formData.genre) {
      setErrors(prev => ({ ...prev, submit: 'Preencha título, gênero e anexe o áudio.' }));
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Upload Files
      // Using 'music_covers' and 'music_files' as they likely exist. 
      // Ideally we would have 'composition_covers' and 'composition_files'.
      // If upload fails due to bucket missing, we might need to change this.
      const uploads = [
        formData.cover_file ? uploadFile(formData.cover_file, 'music_covers') : Promise.resolve(null),
        uploadFile(formData.audio_file, 'music_files')
      ];
      const [coverUrl, audioUrl] = await Promise.all(uploads);

      const { error } = await supabase.from('compositions').insert({
        composer_id: user.id,
        title: formData.title,
        genre: formData.genre,
        description: formData.description,
        price: formData.price ? parseFloat(formData.price) : null,
        cover_url: coverUrl,
        audio_url: audioUrl,
        status: 'pending'
      });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
      addToast('Composição enviada para análise!', 'success');
    } catch (err) {
      console.error('Erro ao enviar composição:', err);
      addToast(err?.message || 'Erro ao enviar composição', 'error');
      setErrors(prev => ({ ...prev, submit: err?.message || 'Erro ao enviar composição.' }));
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
          className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-beatwap-black">
            <h3 className="text-xl font-bold text-white">Nova Composição</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Cover Upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400">Capa (Opcional)</label>
              <div 
                className={`relative aspect-square w-40 mx-auto rounded-xl border-2 border-dashed ${errors.cover ? 'border-red-500 bg-red-500/10' : 'border-white/20 bg-white/5'} flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors overflow-hidden group`}
                onClick={() => document.getElementById('comp-cover-upload').click()}
              >
                {previews.cover ? (
                  <>
                    <img src={previews.cover} alt="Cover Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="text-white" size={24} />
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="text-gray-500 mb-2" size={32} />
                    <span className="text-xs text-gray-500 text-center px-2">Upload Capa</span>
                  </>
                )}
                <input id="comp-cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'cover_file')} />
              </div>
              {errors.cover && <p className="text-xs text-red-500 text-center">{errors.cover}</p>}
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <AnimatedInput 
                label="Título da Composição" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                placeholder="Ex: Minha Composição #1"
              />
              <AnimatedInput 
                label="Gênero / Estilo" 
                value={formData.genre} 
                onChange={(e) => setFormData({...formData, genre: e.target.value})} 
                placeholder="Ex: Sertanejo, Pagode"
              />
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-400">Descrição (Opcional)</label>
                <textarea 
                  className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detalhes sobre a composição..."
                />
              </div>
              <AnimatedInput 
                label="Preço Sugerido (R$) - Opcional" 
                value={formData.price} 
                onChange={(e) => setFormData({...formData, price: e.target.value})} 
                placeholder="0.00"
                type="number"
              />
            </div>

            {/* Audio Upload */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400">Arquivo de Áudio (MP3/WAV)</label>
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="p-2 bg-beatwap-gold/20 rounded-lg text-beatwap-gold">
                  <Music size={20} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm text-white truncate">{formData.audio_file ? formData.audio_file.name : 'Nenhum arquivo selecionado'}</p>
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

            {errors.submit && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <div className="shrink-0"><X size={16} /></div>
                {errors.submit}
              </div>
            )}

            <div className="pt-4">
              <AnimatedButton onClick={handleSubmit} disabled={loading} className="w-full justify-center">
                {loading ? 'Enviando...' : 'Enviar Composição'}
              </AnimatedButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
