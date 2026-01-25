import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { Checklist } from '../components/ui/Checklist';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { Upload, Image as ImageIcon, Music, ArrowLeft } from 'lucide-react';
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
    audioFile: null,
    coverFile: null
  });

  const [checklist, setChecklist] = useState([
    { label: 'Arquivo de áudio (WAV/MP3 320kbps)', valid: false, error: 'Formato inválido ou bitrate baixo.' },
    { label: 'Capa (3000x3000px, JPG/PNG)', valid: false, error: 'Resolução mínima não atingida.' },
    { label: 'Metadados Obrigatórios', valid: false, error: 'Preencha título, artista e gênero.' }
  ]);

  // Real-time validation simulation
  useEffect(() => {
    const newChecklist = [...checklist];
    
    // Audio validation
    newChecklist[0].valid = !!formData.audioFile;
    
    // Cover validation
    newChecklist[1].valid = !!formData.coverFile;
    
    // Metadata validation
    newChecklist[2].valid = !!(formData.title && formData.artist && formData.genre);

    setChecklist(newChecklist);
  }, [formData]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, [type]: file }));
      addToast(`${type === 'audioFile' ? 'Áudio' : 'Capa'} carregado com sucesso!`, 'success');
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

      // Upload Audio
      if (formData.audioFile) {
         audioUrl = await uploadFile(formData.audioFile, 'tracks');
      }

      // Upload Cover
      if (formData.coverFile) {
        coverUrl = await uploadFile(formData.coverFile, 'covers');
      }

      await addMusic({
        ...formData,
        artistId: user.id,
        artist: user.user_metadata?.name || formData.artist || 'Artista Desconhecido',
        audioFile: audioUrl,
        cover: coverUrl,
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
                  <AnimatedInput 
                    label="Gênero Principal" 
                    placeholder="Ex: Trap, Funk, Pop" 
                    value={formData.genre}
                    onChange={e => setFormData({...formData, genre: e.target.value})}
                  />
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