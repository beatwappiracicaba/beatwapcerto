import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { Checklist } from '../components/ui/Checklist';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { Upload, Image as ImageIcon, Music, ArrowLeft, FileText } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';

const UploadMusic = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { addMusic } = useData();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    genre: '',
    isrc: '',
    songwriter: '',
    hasFeaturing: false,
    featuringArtist: '',
    distributeAll: false,
    isOriginal: false,
    authorizationFile: null,
    audioFile: null,
    coverFile: null
  });

  const [checklist, setChecklist] = useState([
    { label: 'Arquivo de áudio (WAV/MP3 320kbps)', valid: false, error: 'Formato inválido ou bitrate baixo.' },
    { label: 'Capa (3000x3000px, JPG/PNG)', valid: false, error: 'Resolução mínima não atingida.' },
    { label: 'Metadados Obrigatórios', valid: false, error: 'Preencha título, artista, gênero e compositor.' },
    { label: 'Autorização (Se Autoral)', valid: true, error: 'Anexe o termo de autorização.' }
  ]);

  // Real-time validation simulation
  useEffect(() => {
    const newChecklist = [...checklist];
    
    // Audio validation
    newChecklist[0].valid = !!formData.audioFile;
    
    // Cover validation
    newChecklist[1].valid = !!formData.coverFile;
    
    // Metadata validation
    const basicMetadata = formData.title && formData.artist && formData.genre && formData.songwriter;
    const featuringValid = !formData.hasFeaturing || (formData.hasFeaturing && formData.featuringArtist);
    newChecklist[2].valid = !!(basicMetadata && featuringValid);

    // Authorization validation
    if (formData.isOriginal) {
        newChecklist[3].valid = !!formData.authorizationFile;
        newChecklist[3].label = 'Autorização (Obrigatório)';
    } else {
        newChecklist[3].valid = true;
        newChecklist[3].label = 'Autorização (Não necessário)';
    }

    setChecklist(newChecklist);
  }, [formData]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [type]: file }));
      addToast(`${type === 'audioFile' ? 'Áudio' : type === 'coverFile' ? 'Capa' : 'Documento'} carregado com sucesso!`, 'success');
    }
  };

  const uploadFile = async (file, bucket) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleUpload = async () => {
    if (!user) {
      addToast('Você precisa estar logado para enviar música.', 'error');
      return;
    }

    setLoading(true);
    try {
      let audioUrl = '';
      let coverUrl = '';
      let authorizationUrl = '';

      // Upload Audio
      if (formData.audioFile) {
         audioUrl = await uploadFile(formData.audioFile, 'tracks');
      }

      // Upload Cover
      if (formData.coverFile) {
        coverUrl = await uploadFile(formData.coverFile, 'covers');
      }

      // Upload Authorization
      if (formData.authorizationFile) {
        // Using 'documents' bucket or fallback to 'misc' if preferred. 
        // Assuming 'documents' bucket exists or using 'covers' as a safe fallback if not.
        // Let's try 'documents'.
        try {
            authorizationUrl = await uploadFile(formData.authorizationFile, 'documents');
        } catch (e) {
            // Fallback to covers if documents bucket doesn't exist (temporary fix)
            console.warn('Documents bucket might not exist, using covers bucket');
            authorizationUrl = await uploadFile(formData.authorizationFile, 'covers');
        }
      }

      await addMusic({
        ...formData,
        artistId: user.id,
        artist: user.user_metadata?.name || formData.artist || 'Artista Desconhecido',
        audioFile: audioUrl,
        cover: coverUrl,
        authorizationUrl: authorizationUrl,
        status: 'review',
        addedBy: 'artist'
      });
      
      addToast('Música enviada para análise!', 'success');
      navigate('/dashboard/uploads');
    } catch (error) {
      console.error(error);
      addToast('Erro ao enviar música. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = checklist.every(item => item.valid);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Novo Lançamento</h1>
            <p className="text-gray-400">Preencha os dados e envie sua música para o mundo.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Music className="text-beatwap-gold" /> Informações da Faixa
              </h2>
              <div className="space-y-4">
                <AnimatedInput 
                  label="Título da Música" 
                  placeholder="Ex: O Mundo é Nosso" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <AnimatedInput 
                    label="Artista Principal" 
                    placeholder="Nome Artístico" 
                    value={formData.artist}
                    onChange={e => setFormData({...formData, artist: e.target.value})}
                  />
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-400 ml-1">Gênero Principal</label>
                    <select
                      value={formData.genre}
                      onChange={e => setFormData({...formData, genre: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold focus:ring-1 focus:ring-beatwap-gold transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-beatwap-dark text-white">Selecione um gênero</option>
                      <option value="Funk" className="bg-beatwap-dark text-white">Funk</option>
                      <option value="Trap" className="bg-beatwap-dark text-white">Trap</option>
                      <option value="Rap" className="bg-beatwap-dark text-white">Rap</option>
                      <option value="Sertanejo" className="bg-beatwap-dark text-white">Sertanejo</option>
                      <option value="Forró" className="bg-beatwap-dark text-white">Forró</option>
                      <option value="Piseiro" className="bg-beatwap-dark text-white">Piseiro</option>
                      <option value="Pagode" className="bg-beatwap-dark text-white">Pagode</option>
                      <option value="Samba" className="bg-beatwap-dark text-white">Samba</option>
                      <option value="MPB" className="bg-beatwap-dark text-white">MPB</option>
                      <option value="Axé" className="bg-beatwap-dark text-white">Axé</option>
                      <option value="Brega Funk" className="bg-beatwap-dark text-white">Brega Funk</option>
                      <option value="Hip Hop" className="bg-beatwap-dark text-white">Hip Hop</option>
                      <option value="Pop" className="bg-beatwap-dark text-white">Pop</option>
                      <option value="Eletrônica" className="bg-beatwap-dark text-white">Eletrônica</option>
                      <option value="Rock" className="bg-beatwap-dark text-white">Rock</option>
                      <option value="Outro" className="bg-beatwap-dark text-white">Outro</option>
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
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <AnimatedInput 
                          label="Artista(s) Participante(s)" 
                          placeholder="Nome do Feat" 
                          value={formData.featuringArtist}
                          onChange={e => setFormData({...formData, featuringArtist: e.target.value})}
                        />
                      </motion.div>
                    )}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                          <span className="font-medium text-white">Distribuição Digital</span>
                          <span className="text-xs text-gray-400">Distribuir em todas as plataformas (Spotify, Apple Music, etc)?</span>
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
                              <span className="text-xs text-gray-400">Se sim, é necessário enviar a autorização de gravação.</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={formData.isOriginal}
                            onChange={e => setFormData({...formData, isOriginal: e.target.checked})}
                            className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                          />
                      </div>

                      {formData.isOriginal && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-2 border-t border-white/10"
                        >
                          <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${formData.authorizationFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
                            <input type="file" id="auth-doc" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'authorizationFile')} />
                            <label htmlFor="auth-doc" className="cursor-pointer flex flex-col items-center gap-2">
                              <div className="p-2 bg-gray-800 rounded-full text-white">
                                <FileText size={20} />
                              </div>
                              <span className="font-bold text-sm">Termo de Autorização</span>
                              <span className="text-xs text-gray-500">PDF ou Imagem</span>
                              {formData.authorizationFile && <span className="text-beatwap-gold text-xs font-bold mt-1">{formData.authorizationFile.name}</span>}
                            </label>
                          </div>
                        </motion.div>
                      )}
                  </div>

                  <AnimatedInput 
                    label="ISRC (Opcional)" 
                  placeholder="BR-XXX-24-00000" 
                  value={formData.isrc}
                  onChange={e => setFormData({...formData, isrc: e.target.value})}
                />
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Upload className="text-beatwap-gold" /> Arquivos
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Audio Upload */}
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${formData.audioFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
                  <input type="file" id="audio" className="hidden" accept="audio/*" onChange={(e) => handleFileChange(e, 'audioFile')} />
                  <label htmlFor="audio" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="p-3 bg-gray-800 rounded-full text-white">
                      <Music size={24} />
                    </div>
                    <span className="font-bold text-sm">Arquivo de Áudio</span>
                    <span className="text-xs text-gray-500">WAV ou MP3 (320kbps)</span>
                    {formData.audioFile && <span className="text-beatwap-gold text-xs font-bold mt-2">{formData.audioFile.name}</span>}
                  </label>
                </div>

                {/* Cover Upload */}
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${formData.coverFile ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-gray-700 hover:border-gray-500'}`}>
                  <input type="file" id="cover" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'coverFile')} />
                  <label htmlFor="cover" className="cursor-pointer flex flex-col items-center gap-2">
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

          {/* Checklist */}
          <div className="lg:col-span-1">
             <div className="sticky top-8">
                <Checklist items={checklist} />
                
                <AnimatedButton 
                    className="w-full mt-6"
                    onClick={handleUpload}
                    disabled={!isFormValid || loading}
                >
                    {loading ? 'Enviando...' : 'Enviar para Análise'}
                </AnimatedButton>
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UploadMusic;