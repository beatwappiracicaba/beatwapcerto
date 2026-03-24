import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Music, Image as ImageIcon } from 'lucide-react';
import { apiClient, uploadApi } from '../../services/apiClient';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DEFAULT_HASHTAGS = [
  '#HenriqueeJuliano',
  '#JorgeeMateus',
  '#Sofrência',
  '#Romântica',
  '#Pisadinha',
  '#Modão',
  '#Arrocha',
  '#HitComercial'
];

const canonicalizeHashtag = (raw) => {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (!s.startsWith('#')) s = `#${s}`;
  s = `#${s.slice(1).replace(/\s+/g, '')}`;
  s = `#${s.slice(1).replace(/[^\p{L}\p{N}_]/gu, '')}`;
  if (s.length < 2) return null;
  return s;
};

const hashtagKey = (canonical) => {
  const s = String(canonical || '').trim();
  if (!s || !s.startsWith('#')) return '';
  const body = s
    .slice(1)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (!body) return '';
  return `#${body}`;
};

export const CompositionsUploadModal = ({ isOpen, onClose, onSuccess, composerId = null }) => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    description: '',
    price: '',
    hasPrice: false,
    cover_file: null,
    audio_file: null,
    chorus_start_seconds: '',
    chorus_end_seconds: ''
  });

  const [previews, setPreviews] = useState({
    cover: null,
    audio: null,
  });

  const [errors, setErrors] = useState({});

  const [coverImageSrc, setCoverImageSrc] = useState(null);
  const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 });
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverCroppedArea, setCoverCroppedArea] = useState(null);
  const [coverOriginalFile, setCoverOriginalFile] = useState(null);
  const audioRef = useRef(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [suggestedHashtags, setSuggestedHashtags] = useState(DEFAULT_HASHTAGS);
  const [selectedHashtags, setSelectedHashtags] = useState([]);
  const [customHashtag, setCustomHashtag] = useState('');

  useEffect(() => {
    if (!coverImageSrc) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [coverImageSrc]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setSelectedHashtags([]);
    setCustomHashtag('');
    const load = async () => {
      try {
        const data = await apiClient.get('/hashtags', { cache: true, cacheTtlMs: 15000 });
        const remote = Array.isArray(data) ? data : [];
        const merged = [];
        const seen = new Set();
        for (const raw of [...DEFAULT_HASHTAGS, ...remote]) {
          const tag = canonicalizeHashtag(raw);
          if (!tag) continue;
          const key = hashtagKey(tag);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(tag);
        }
        if (!cancelled) setSuggestedHashtags(merged);
      } catch {
        if (!cancelled) setSuggestedHashtags(DEFAULT_HASHTAGS);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen]);

  const toggleHashtag = (raw) => {
    const tag = canonicalizeHashtag(raw);
    if (!tag) return;
    const key = hashtagKey(tag);
    if (!key) return;
    setSelectedHashtags((prev) => {
      const has = prev.some((t) => hashtagKey(t) === key);
      if (has) return prev.filter((t) => hashtagKey(t) !== key);
      return [...prev, tag];
    });
  };

  const addCustomHashtag = async () => {
    const tag = canonicalizeHashtag(customHashtag);
    if (!tag) return;
    try {
      const resp = await apiClient.post('/hashtags', { tag });
      const saved = canonicalizeHashtag(resp?.tag || tag) || tag;
      setSuggestedHashtags((prev) => {
        const merged = [];
        const seen = new Set();
        for (const raw of [saved, ...prev]) {
          const t = canonicalizeHashtag(raw);
          if (!t) continue;
          const key = hashtagKey(t);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(t);
        }
        return merged;
      });
      toggleHashtag(saved);
      setCustomHashtag('');
    } catch {
      toggleHashtag(tag);
      setCustomHashtag('');
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'cover_file') {
      try {
        // await validateImage(file);
        setErrors(prev => ({ ...prev, cover: null }));
        const reader = new FileReader();
        reader.onload = () => {
          setCoverImageSrc(reader.result);
          setCoverOriginalFile(file);
          setCoverCrop({ x: 0, y: 0 });
          setCoverZoom(1);
          setCoverCroppedArea(null);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        setErrors(prev => ({ ...prev, cover: err }));
        return;
      }
    } else if (type === 'audio_file') {
      setPreviews(prev => ({ ...prev, audio: URL.createObjectURL(file) }));
    }

    if (type !== 'cover_file') {
      if (type === 'audio_file') {
        setFormData(prev => ({
          ...prev,
          audio_file: file,
          chorus_start_seconds: prev.chorus_start_seconds === '' ? '0' : prev.chorus_start_seconds
        }));
      } else {
        setFormData(prev => ({ ...prev, [type]: file }));
      }
    }
  };

  const handleCoverCropComplete = (_, pixels) => {
    setCoverCroppedArea(pixels);
  };

  const handleCoverCropConfirm = async () => {
    if (!coverImageSrc || !coverCroppedArea || !coverOriginalFile) return;
    try {
      const blob = await getCroppedImg(coverImageSrc, coverCroppedArea, 1500, 1500);
      const croppedFile = new File([blob], coverOriginalFile.name, { type: blob.type || coverOriginalFile.type });
      setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(croppedFile) }));
      setFormData(prev => ({ ...prev, cover_file: croppedFile }));
      setCoverImageSrc(null);
      setCoverOriginalFile(null);
    } catch (err) {
      setErrors(prev => ({ ...prev, cover: 'Erro ao recortar imagem.' }));
    }
  };

  const renderCoverCropModal = () => {
    if (!coverImageSrc) return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 pointer-events-auto">
        <div className="bg-[#121212] rounded-2xl border border-white/10 w-full max-w-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-white font-bold text-lg">Ajustar capa</h3>
            <button
              onClick={() => {
                setCoverImageSrc(null);
                setCoverOriginalFile(null);
              }}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          <div className="p-4 space-y-4">
            <div
              className="relative w-full max-w-sm aspect-square bg-transparent rounded-lg overflow-hidden pointer-events-auto mx-auto"
              style={{ touchAction: 'none' }}
            >
              <Cropper
                image={coverImageSrc}
                crop={coverCrop}
                zoom={coverZoom}
                aspect={1}
                onCropChange={setCoverCrop}
                onZoomChange={setCoverZoom}
                onCropComplete={handleCoverCropComplete}
                cropShape="rect"
                showGrid={true}
                objectFit="cover"
                restrictPosition={false}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={coverZoom}
                onChange={(e) => setCoverZoom(parseFloat(e.target.value))}
                className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCoverImageSrc(null);
                  setCoverOriginalFile(null);
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCoverCropConfirm}
                className="px-4 py-2 text-sm font-bold bg-beatwap-gold text-black rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Confirmar recorte
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const uploadFile = async (file, bucket) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${(composerId || user.id)}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const response = await uploadApi.uploadWithMeta(file, { fileName, bucket });
    if (response?.error) throw new Error(response.error);
    if (!response?.url) throw new Error('Falha no upload');
    return response.url;
  };
  
  const handleSubmit = async () => {
    if (!formData.title || !formData.audio_file || !formData.genre) {
      setErrors(prev => ({ ...prev, submit: 'Preencha título, gênero e anexe o áudio.' }));
      return;
    }
    if (formData.audio_file) {
      const start = Number(formData.chorus_start_seconds);
      if (!Number.isFinite(start) || start < 0) {
        setErrors(prev => ({ ...prev, submit: 'Defina o início do refrão (em segundos).' }));
        return;
      }
      const endRaw = formData.chorus_end_seconds;
      if (endRaw !== '' && endRaw !== null && endRaw !== undefined) {
        const end = Number(endRaw);
        if (!Number.isFinite(end) || end <= start) {
          setErrors(prev => ({ ...prev, submit: 'O fim do refrão deve ser maior que o início.' }));
          return;
        }
      }
    }

    setLoading(true);
    setErrors({});

    try {
      const ownerId = composerId || user.id;
      const cargo = String(profile?.cargo || user?.cargo || '').toLowerCase();
      const isProducer = cargo === 'produtor';
      if (!isProducer) {
        const quota = await apiClient.get(`/users/${ownerId}/quota`);
        const creditos = Number(quota?.creditos_envio || 0);
        if (creditos < 1) {
          const msg = 'Você não possui créditos de envio. Compre créditos para enviar composições.';
          addToast(msg, 'error');
          setErrors(prev => ({ ...prev, submit: msg }));
          return;
        }
      }

      // Upload Files
      // Using 'music_covers' and 'music_files' as they likely exist. 
      // Ideally we would have 'composition_covers' and 'composition_files'.
      // If upload fails due to bucket missing, we might need to change this.
      const uploads = [
        formData.cover_file ? uploadFile(formData.cover_file, 'music_covers') : Promise.resolve(null),
        uploadFile(formData.audio_file, 'music_files')
      ];
      const [coverUrl, audioUrl] = await Promise.all(uploads);

      await apiClient.post('/compositions', {
        composer_id: ownerId,
        title: formData.title,
        genre: formData.genre,
        description: formData.description,
        price: formData.hasPrice && formData.price ? parseFloat(formData.price) : null,
        cover_url: coverUrl,
        audio_url: audioUrl,
        chorus_start_seconds: formData.chorus_start_seconds !== '' ? Number(formData.chorus_start_seconds) : null,
        chorus_end_seconds: formData.chorus_end_seconds !== '' ? Number(formData.chorus_end_seconds) : null,
        hashtags: selectedHashtags,
        status: 'pending'
      });

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
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Hashtags de estilo</label>
                <div className="flex flex-wrap gap-2">
                  {suggestedHashtags.map((tag) => {
                    const active = selectedHashtags.some((t) => hashtagKey(t) === hashtagKey(tag));
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleHashtag(tag)}
                        className={`text-xs font-bold px-3 py-2 rounded-lg transition-colors ${
                          active ? 'bg-beatwap-gold/20 text-beatwap-gold border border-beatwap-gold/30' : 'bg-white/10 hover:bg-white/20 text-gray-200 border border-white/10'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <AnimatedInput
                  label="Criar hashtag"
                  value={customHashtag}
                  onChange={(e) => setCustomHashtag(e.target.value)}
                  placeholder="#EstiloGusttavoLima"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    addCustomHashtag();
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-400">Descrição (Opcional)</label>
                <textarea 
                  className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors min-h-[100px]"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Detalhes sobre a composição..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="comp-has-price"
                  type="checkbox"
                  className="accent-beatwap-gold"
                  checked={formData.hasPrice}
                  onChange={(e) => setFormData({ ...formData, hasPrice: e.target.checked })}
                />
                <label htmlFor="comp-has-price" className="text-sm font-bold text-gray-400">Exibir preço sugerido</label>
              </div>
              {formData.hasPrice && (
                <AnimatedInput 
                  label="Preço Sugerido (R$)" 
                  value={formData.price} 
                  onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  placeholder="0.00"
                  type="number"
                />
              )}
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
                <audio
                  ref={audioRef}
                  controls
                  src={previews.audio}
                  className="w-full h-8 mt-2"
                  onLoadedMetadata={(e) => setAudioDuration(Number(e?.currentTarget?.duration || 0))}
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-bold text-gray-400">Início do refrão (arraste)</label>
                    <div className="text-xs text-gray-400">{Number(formData.chorus_start_seconds || 0)}s</div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, Math.floor(Number(audioDuration || 0)))}
                    step={1}
                    value={Number(formData.chorus_start_seconds || 0)}
                    onChange={(e) => {
                      const next = String(e.target.value);
                      setFormData({ ...formData, chorus_start_seconds: next });
                      const audio = audioRef.current;
                      if (audio) {
                        try { audio.currentTime = Number(next) || 0; } catch (e) { void e; }
                      }
                    }}
                    className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <AnimatedInput
                  label="Fim do refrão (segundos) (opcional)"
                  value={formData.chorus_end_seconds}
                  onChange={(e) => setFormData({ ...formData, chorus_end_seconds: e.target.value })}
                  placeholder="Ex: 75"
                  type="number"
                />
              </div>
              <div className="text-[11px] text-gray-400">
                Dica: duração recomendada 20–30s. Sem fim definido, usa 30s.
              </div>
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
          {renderCoverCropModal()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
