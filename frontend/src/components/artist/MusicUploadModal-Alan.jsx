import { useState, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/cropImage';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Music, Image as ImageIcon, FileText, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { apiClient, uploadApi } from '../../services/apiClient';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const MusicUploadModal = ({ isOpen, onClose, onSuccess, targetArtist = null }) => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const MAX_AUDIO_BYTES = 150 * 1024 * 1024;

  const activeUser = targetArtist ? { id: targetArtist.id } : user;
  const isProducerMode = !!targetArtist;

  const createEmptyTrack = () => ({
    titulo: '',
    estilo: '',
    isrc: '',
    has_feat: false,
    feat_name: '',
    composer: '',
    producer: '',
    is_beatwap_produced: false,
    producer_id: '',
    beatwap_feat_artist_ids: [],
    is_beatwap_composer_partner: false,
    composer_partner_id: null,
    has_external_composers: false,
    external_composers: [],
    external_composer_input: '',
    audio_file: null,
    authorization_file: null,
    upload_status: 'idle',
    upload_progress: 0,
    audio_url: null,
    authorization_url: null,
    upload_error: null
  });

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    nome_artista: '',
    estilo: '',
    isrc: '',
    release_date: '',
    plataformas: ['Todas'], // Default to all
    plataformas_selecionadas: [], // If not all
    authorization_file: null,
    cover_file: null,
    audio_file: null,
    audio_files: [],
    is_album: false,
    composer: '',
    producer: '',
    is_beatwap_produced: false,
    producer_id: '',
    beatwap_feat_artist_ids: [],
    is_beatwap_composer_partner: false,
    has_external_composers: false,
    external_composers: [],
    external_composer_input: '',
    tracks: [] // [{ titulo, estilo, audio_file, authorization_file, upload_status, upload_progress, audio_url, authorization_url, upload_error }]
  });

  const [previews, setPreviews] = useState({
    cover: null,
    audio: null,
    auth: null
  });

  const [errors, setErrors] = useState({});
  const [artistOptions, setArtistOptions] = useState([]);
  const [composerOptions, setComposerOptions] = useState([]);
  const [producerOptions, setProducerOptions] = useState([]);
  const [activeAlbumTrackIndex, setActiveAlbumTrackIndex] = useState(null);

  useEffect(() => {
    const loadArtists = async () => {
      const data = await apiClient.get('/artists');
      setArtistOptions(data || []);
    };
    loadArtists();
  }, []);
  useEffect(() => {
    const loadComposers = async () => {
      const data = await apiClient.get('/composers');
      setComposerOptions(data || []);
    };
    loadComposers();
  }, []);
  useEffect(() => {
    const loadProducers = async () => {
      const data = await apiClient.get('/producers');
      setProducerOptions(data || []);
    };
    loadProducers();
  }, []);

  useEffect(() => {
    if (targetArtist) {
       setFormData(prev => ({
         ...prev,
         nome_artista: targetArtist.name || targetArtist.nome || prev.nome_artista || ''
       }));
    } else if (profile) {
      setFormData(prev => ({
        ...prev,
        nome_artista: profile.nome || profile.nome_completo_razao_social || prev.nome_artista || ''
      }));
    }
  }, [profile, targetArtist]);

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

  const [coverImageSrc, setCoverImageSrc] = useState(null);
  const [coverCrop, setCoverCrop] = useState({ x: 0, y: 0 });
  const [coverZoom, setCoverZoom] = useState(1);
  const [coverCroppedArea, setCoverCroppedArea] = useState(null);
  const [coverOriginalFile, setCoverOriginalFile] = useState(null);

  useEffect(() => {
    if (!coverImageSrc) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [coverImageSrc]);

  const handleCoverCropComplete = (_, pixels) => {
    setCoverCroppedArea(pixels);
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'cover_file') {
      try {
        await validateImage(file);
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
      if (file.size > MAX_AUDIO_BYTES) {
        setErrors(prev => ({ ...prev, audio: 'Arquivo de áudio muito grande. Máximo 150MB.' }));
        addToast('Arquivo de áudio muito grande. Máximo 150MB.', 'error');
        return;
      }
      setPreviews(prev => ({ ...prev, audio: URL.createObjectURL(file) }));
      setFormData(prev => ({ ...prev, audio_files: [], is_album: false }));
    } else if (type === 'authorization_file') {
      setPreviews(prev => ({ ...prev, auth: file.name }));
    }

    if (type !== 'cover_file') {
      setFormData(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleCoverCropConfirm = async () => {
    if (!coverImageSrc || !coverCroppedArea || !coverOriginalFile) return;
    try {
      const blob = await getCroppedImg(coverImageSrc, coverCroppedArea, 3000, 3000);
      const croppedFile = new File([blob], coverOriginalFile.name, { type: blob.type || coverOriginalFile.type });
      setPreviews(prev => ({ ...prev, cover: URL.createObjectURL(croppedFile) }));
      setFormData(prev => ({ ...prev, cover_file: croppedFile }));
      setCoverImageSrc(null);
      setCoverOriginalFile(null);
    } catch (err) {
      setErrors(prev => ({ ...prev, cover: 'Erro ao recortar imagem.' }));
    }
  };

  const uploadFile = async (file, bucket, onProgress) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${activeUser.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const response = await uploadApi.uploadWithMeta(file, { fileName, bucket, onProgress });
    if (response?.error) throw new Error(response.error);
    if (!response?.url) throw new Error('Falha no upload');
    return response.url;
  };
  
  const addTrack = () => {
    setFormData(prev => ({ 
      ...prev, 
      tracks: [...prev.tracks, createEmptyTrack()] 
    }));
  };
  const removeTrack = (index) => {
    setFormData(prev => ({
      ...prev,
      tracks: prev.tracks.filter((_, i) => i !== index)
    }));
    setActiveAlbumTrackIndex((prev) => {
      if (prev === null || prev === undefined) return prev;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };
  const updateTrackField = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.tracks];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, tracks: next };
    });
  };
  const handleTrackFileChange = (index, e, field) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (field === 'audio_file' && file.size > MAX_AUDIO_BYTES) {
      addToast('Arquivo de áudio da faixa muito grande. Máximo 150MB.', 'error');
      return;
    }
    updateTrackField(index, field, file);
    if (field === 'audio_file') {
      updateTrackField(index, 'upload_status', 'idle');
      updateTrackField(index, 'upload_progress', 0);
      updateTrackField(index, 'audio_url', null);
      updateTrackField(index, 'upload_error', null);
    }
    if (field === 'authorization_file') {
      updateTrackField(index, 'authorization_url', null);
      updateTrackField(index, 'upload_error', null);
    }
  };

  const toggleSingleFeatArtist = (id) => {
    setFormData(prev => {
      const arr = prev.beatwap_feat_artist_ids || [];
      const exists = arr.includes(id);
      const next = exists ? arr.filter(x => x !== id) : [...arr, id];
      return { ...prev, beatwap_feat_artist_ids: next };
    });
  };

  const toggleTrackFeatArtist = (idx, id) => {
    setFormData(prev => {
      const tracks = [...prev.tracks];
      const arr = tracks[idx].beatwap_feat_artist_ids || [];
      const exists = arr.includes(id);
      tracks[idx] = { ...tracks[idx], beatwap_feat_artist_ids: exists ? arr.filter(x => x !== id) : [...arr, id] };
      return { ...prev, tracks };
    });
  };

  const checkQuota = async (needed) => {
    const prof = await apiClient.get(`/users/${activeUser.id}/quota`);
    const plan = String(prof?.plano || 'sem plano')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (plan.includes('vitalicio') || isProducerMode) return true;

    const creditos = Number(prof?.creditos_envio || 0);
    if (creditos < needed) {
      const msg = 'Você não possui créditos de envio. Compre créditos para enviar músicas.';
      setErrors(prev => ({ ...prev, submit: msg }));
      addToast(msg, 'error');
      return false;
    }
    return true;
  };

  const uploadAlbumTrack = async (index) => {
    const t = formData.tracks[index];
    if (!t) return;
    const hasProducer = !!(t.is_beatwap_produced ? String(t.producer_id || '').trim() : String(t.producer || '').trim());
    if (!t.titulo || !t.estilo || !t.audio_file || !t.composer || !hasProducer || (t.has_feat && !t.feat_name)) {
      setErrors(prev => ({ ...prev, submit: 'Preencha título, estilo, áudio, compositor, produtor e feat (se houver) antes de enviar a faixa.' }));
      return;
    }
    if (t.is_beatwap_composer_partner && !t.composer_partner_id) {
      setErrors(prev => ({ ...prev, submit: 'Selecione o compositor parceiro na faixa.' }));
      return;
    }
    if (t.has_external_composers && (!Array.isArray(t.external_composers) || t.external_composers.length === 0)) {
      setErrors(prev => ({ ...prev, submit: 'Adicione pelo menos um compositor fora da BeatWap na faixa (ou desmarque a opção).' }));
      return;
    }

    updateTrackField(index, 'upload_status', 'uploading');
    updateTrackField(index, 'upload_progress', 0);
    updateTrackField(index, 'upload_error', null);

    try {
      const audioUrl = await uploadFile(t.audio_file, 'music_files', (pct) => {
        updateTrackField(index, 'upload_progress', pct);
      });
      const authUrl = t.authorization_file ? await uploadFile(t.authorization_file, 'music_docs') : null;
      updateTrackField(index, 'audio_url', audioUrl);
      updateTrackField(index, 'authorization_url', authUrl);
      updateTrackField(index, 'upload_progress', 100);
      updateTrackField(index, 'upload_status', 'uploaded');
      addToast(`Faixa ${index + 1} enviada`, 'success');
      setActiveAlbumTrackIndex(null);
    } catch (err) {
      updateTrackField(index, 'upload_status', 'error');
      updateTrackField(index, 'upload_error', err?.message || 'Falha ao enviar faixa');
      addToast(err?.message || 'Falha ao enviar faixa', 'error');
    }
  };

  const submitAlbumComplete = async () => {
    const albumTitle = String(formData.titulo || '').trim();
    const artistName = String(formData.nome_artista || '').trim();
    const releaseDate = String(formData.release_date || '').trim();
    if (!albumTitle || !artistName || !releaseDate) {
      setErrors(prev => ({ ...prev, submit: 'Preencha Nome do Álbum, Nome do Artista e Data de lançamento.' }));
      return;
    }
    if (!Array.isArray(formData.tracks) || formData.tracks.length === 0) {
      setErrors(prev => ({ ...prev, submit: 'Adicione pelo menos uma faixa.' }));
      return;
    }
    const notUploaded = formData.tracks.find(t => String(t.upload_status || 'idle') !== 'uploaded' || !t.audio_url);
    if (notUploaded) {
      setErrors(prev => ({ ...prev, submit: 'Envie todas as músicas (faixa por faixa) antes de enviar o álbum completo.' }));
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const needed = formData.tracks.length;
      const okQuota = await checkQuota(needed);
      if (!okQuota) return;

      let coverUrl = null;
      if (formData.cover_file) {
        coverUrl = await uploadFile(formData.cover_file, 'music_covers');
      }
      const albumId = crypto.randomUUID();
      const rows = formData.tracks.map((t, idx) => {
        const partnerId = t.is_beatwap_composer_partner ? String(t.composer_partner_id || '').trim() : '';
        const partnerRow = partnerId ? composerOptions.find((c) => String(c?.id || '') === partnerId) : null;
        const partnerName = partnerRow ? (partnerRow.nome || partnerRow.nome_completo_razao_social || '') : '';
        const list = []
          .concat([String(t.composer || '').trim()])
          .concat(partnerName ? [String(partnerName).trim()] : [])
          .concat(Array.isArray(t.external_composers) ? t.external_composers : [])
          .map((x) => String(x || '').trim())
          .filter((x) => x);
        const uniq = [];
        const seen = new Set();
        for (const name of list) {
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push(name);
        }
        const comp = uniq.join(', ');
        const producerId = t.is_beatwap_produced ? String(t.producer_id || '').trim() : '';
        const producerRow = producerId ? producerOptions.find((p) => String(p?.id || '') === producerId) : null;
        const producerName = t.is_beatwap_produced ? (producerRow ? (producerRow.nome || producerRow.nome_completo_razao_social || '') : t.producer) : t.producer;
        return {
          artista_id: activeUser.id,
          titulo: t.titulo,
          nome_artista: artistName,
          estilo: t.estilo,
          cover_url: coverUrl,
          audio_url: t.audio_url,
          authorization_url: t.authorization_url || null,
          plataformas: formData.plataformas.includes('Todas') ? ['Todas'] : formData.plataformas_selecionadas,
          status: 'pendente',
          isrc: (t.isrc || '').trim() || null,
          has_feat: t.has_feat || false,
          feat_name: t.feat_name || null,
          composer: comp || null,
          producer: String(producerName || '').trim() || null,
          is_beatwap_produced: !!t.is_beatwap_produced,
          producer_id: producerId || null,
          produced_by: producerId || null,
          external_composers: Array.isArray(t.external_composers) ? t.external_composers : [],
          feat_beatwap_artist_ids: t.beatwap_feat_artist_ids || [],
          is_beatwap_composer_partner: !!t.is_beatwap_composer_partner,
          composer_partner_id: t.is_beatwap_composer_partner ? (t.composer_partner_id || null) : null,
          album_id: albumId,
          album_title: albumTitle,
          release_date: releaseDate,
          track_number: idx + 1
        };
      });
      await apiClient.post('/musics/batch', { musics: rows });

      if (onSuccess) onSuccess();
      onClose();
      addToast('Álbum pronto para aprovação!', 'success');
    } catch (err) {
      const isPayloadTooLarge = Number(err?.status) === 413;
      const msg = isPayloadTooLarge ? 'Arquivo muito grande para upload. Reduza para até 150MB.' : (err?.message || 'Erro ao enviar álbum');
      addToast(msg, 'error');
      setErrors(prev => ({ ...prev, submit: msg }));
    } finally {
      setLoading(false);
    }
  };

  const submitSingle = async () => {
    if (!formData.titulo || !formData.nome_artista || !formData.cover_file || !formData.audio_file || !formData.estilo) {
      setErrors(prev => ({ ...prev, submit: 'Preencha todos os campos obrigatórios.' }));
      return;
    }
    if (formData.has_feat && !formData.feat_name) {
      setErrors(prev => ({ ...prev, submit: 'Informe o nome do Feat.' }));
      return;
    }
    const hasProducer = !!(formData.is_beatwap_produced ? String(formData.producer_id || '').trim() : String(formData.producer || '').trim());
    if (!formData.composer || !hasProducer) {
      setErrors(prev => ({ ...prev, submit: 'Informe o Compositor e Produtor.' }));
      return;
    }
    if (formData.is_beatwap_composer_partner && !formData.composer_partner_id) {
      setErrors(prev => ({ ...prev, submit: 'Selecione o compositor parceiro.' }));
      return;
    }
    if (formData.has_external_composers && (!Array.isArray(formData.external_composers) || formData.external_composers.length === 0)) {
      setErrors(prev => ({ ...prev, submit: 'Adicione pelo menos um compositor fora da BeatWap (ou desmarque a opção).' }));
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const okQuota = await checkQuota(1);
      if (!okQuota) return;

      const uploads = [
        uploadFile(formData.cover_file, 'music_covers'),
        uploadFile(formData.audio_file, 'music_files'),
        formData.authorization_file ? uploadFile(formData.authorization_file, 'music_docs') : Promise.resolve(null)
      ];
      const [coverUrl, audioUrl, authUrl] = await Promise.all(uploads);

      const partnerId = formData.is_beatwap_composer_partner ? String(formData.composer_partner_id || '').trim() : '';
      const partnerRow = partnerId ? composerOptions.find((c) => String(c?.id || '') === partnerId) : null;
      const partnerName = partnerRow ? (partnerRow.nome || partnerRow.nome_completo_razao_social || '') : '';
      const list = []
        .concat([String(formData.composer || '').trim()])
        .concat(partnerName ? [String(partnerName).trim()] : [])
        .concat(Array.isArray(formData.external_composers) ? formData.external_composers : [])
        .map((x) => String(x || '').trim())
        .filter((x) => x);
      const uniq = [];
      const seen = new Set();
      for (const name of list) {
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(name);
      }
      const composerString = uniq.join(', ');
      const producerId = formData.is_beatwap_produced ? String(formData.producer_id || '').trim() : '';
      const producerRow = producerId ? producerOptions.find((p) => String(p?.id || '') === producerId) : null;
      const producerName = formData.is_beatwap_produced ? (producerRow ? (producerRow.nome || producerRow.nome_completo_razao_social || '') : formData.producer) : formData.producer;

      await apiClient.post('/musics', {
        artista_id: activeUser.id,
        titulo: formData.titulo,
        nome_artista: formData.nome_artista,
        estilo: formData.estilo,
        cover_url: coverUrl,
        audio_url: audioUrl,
        authorization_url: authUrl,
        plataformas: formData.plataformas.includes('Todas') ? ['Todas'] : formData.plataformas_selecionadas,
        status: 'pendente',
        isrc: (formData.isrc || '').trim() || null,
        has_feat: formData.has_feat || false,
        feat_name: formData.feat_name || null,
        composer: composerString || null,
        producer: String(producerName || '').trim() || null,
        is_beatwap_produced: !!formData.is_beatwap_produced,
        producer_id: producerId || null,
        produced_by: producerId || null,
        external_composers: Array.isArray(formData.external_composers) ? formData.external_composers : [],
        feat_beatwap_artist_ids: formData.beatwap_feat_artist_ids || [],
        is_beatwap_composer_partner: !!formData.is_beatwap_composer_partner,
        composer_partner_id: formData.is_beatwap_composer_partner ? (formData.composer_partner_id || null) : null
      });

      if (onSuccess) onSuccess();
      onClose();
      addToast('Música enviada para análise!', 'success');
    } catch (err) {
      const isPayloadTooLarge = Number(err?.status) === 413;
      const msg = isPayloadTooLarge ? 'Arquivo muito grande para upload. Reduza para até 150MB.' : (err?.message || 'Erro ao enviar música');
      addToast(msg, 'error');
      setErrors(prev => ({ ...prev, submit: msg }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.is_album) {
      await submitAlbumComplete();
      return;
    }
    await submitSingle();
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`bg-[#121212] border border-white/10 rounded-2xl w-full ${formData.is_album ? 'max-w-5xl' : 'max-w-2xl'} overflow-hidden flex flex-col h-[90vh] transition-all duration-300`}
        >
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-beatwap-black">
            <h3 className="text-xl font-bold text-white">{formData.is_album ? 'Novo Álbum' : 'Nova Música'}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 min-h-0 p-6 overflow-y-auto space-y-6">
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
                  label={formData.is_album ? 'Nome do Álbum' : 'Nome da Música'} 
                  value={formData.titulo} 
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                  placeholder={formData.is_album ? 'Ex: Meu Álbum' : 'Ex: Minha Obra Prima'}
                />
                <AnimatedInput 
                  label="Nome do Artista" 
                  value={formData.nome_artista} 
                  onChange={(e) => setFormData({...formData, nome_artista: e.target.value})} 
                  placeholder="Ex: MC Exemplo"
                />
                {!formData.is_album && (
                  <AnimatedInput 
                    label="Estilo / Gênero" 
                    value={formData.estilo} 
                    onChange={(e) => setFormData({...formData, estilo: e.target.value})} 
                    placeholder="Ex: Trap, Funk, Pop"
                  />
                )}
                {formData.is_album && (
                  <AnimatedInput
                    type="date"
                    label="Data de lançamento"
                    value={formData.release_date}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                  />
                )}
                
                {!formData.is_album && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <AnimatedInput 
                        label="Compositor principal" 
                        value={formData.composer || ''} 
                        onChange={(e) => setFormData({...formData, composer: e.target.value})} 
                        placeholder="Nome do compositor"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-400">Produtor BeatWap</label>
                          <input
                            type="checkbox"
                            checked={!!formData.is_beatwap_produced}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                is_beatwap_produced: checked,
                                producer_id: checked ? (prev.producer_id || '') : ''
                              }));
                            }}
                            className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                          />
                        </div>
                        {formData.is_beatwap_produced ? (
                          <select
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            value={formData.producer_id || ''}
                            onChange={(e) => {
                              const id = e.target.value;
                              const row = producerOptions.find((p) => String(p?.id || '') === String(id || '')) || null;
                              const name = row ? (row.nome || row.nome_completo_razao_social || '') : '';
                              setFormData(prev => ({ ...prev, producer_id: id, producer: name || prev.producer || '' }));
                            }}
                          >
                            <option value="">Selecionar produtor</option>
                            {producerOptions.map(p => (
                              <option key={p.id} value={p.id}>{p.nome || p.nome_completo_razao_social || 'Produtor'}</option>
                            ))}
                          </select>
                        ) : (
                          <AnimatedInput
                            label="Produtor"
                            value={formData.producer || ''}
                            onChange={(e) => setFormData({...formData, producer: e.target.value})}
                            placeholder="Nome do Produtor"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={!!formData.is_beatwap_composer_partner}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_beatwap_composer_partner: e.target.checked, composer_partner_id: '' }))}
                        className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                      />
                      <label className="text-sm text-gray-300">Tem compositor parceiro BeatWap</label>
                    </div>
                    {formData.is_beatwap_composer_partner && (
                      <div className="mb-3">
                        <label className="text-sm font-medium text-gray-400">Selecionar compositor parceiro</label>
                        <select
                          className="mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full"
                          value={formData.composer_partner_id || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, composer_partner_id: e.target.value }))}
                        >
                          <option value="">Selecione o compositor parceiro</option>
                          {composerOptions.map(c => (
                            <option key={c.id} value={c.id}>{c.nome || c.nome_completo_razao_social || 'Sem nome'}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="checkbox"
                        checked={!!formData.has_external_composers}
                        onChange={(e) => setFormData(prev => ({ ...prev, has_external_composers: e.target.checked }))}
                        className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                      />
                      <label className="text-sm text-gray-300">Tem compositor fora da BeatWap</label>
                    </div>
                    {formData.has_external_composers && (
                      <div className="mb-3 rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <AnimatedInput
                              label="Nome do compositor (fora da BeatWap)"
                              value={formData.external_composer_input || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, external_composer_input: e.target.value }))}
                              placeholder="Digite um nome"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              className="w-full px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                              onClick={() => {
                                const name = String(formData.external_composer_input || '').trim();
                                if (!name) return;
                                setFormData((prev) => {
                                  const list = Array.isArray(prev.external_composers) ? prev.external_composers : [];
                                  const next = list.some((x) => String(x || '').toLowerCase() === name.toLowerCase()) ? list : list.concat(name);
                                  return { ...prev, external_composers: next, external_composer_input: '' };
                                });
                              }}
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                        {Array.isArray(formData.external_composers) && formData.external_composers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.external_composers.map((n) => (
                              <div key={n} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs text-gray-200">
                                <span className="truncate max-w-[220px]">{n}</span>
                                <button
                                  type="button"
                                  className="text-gray-400 hover:text-white"
                                  onClick={() => setFormData((prev) => ({ ...prev, external_composers: (prev.external_composers || []).filter((x) => x !== n) }))}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-400">Possui Feat?</label>
                        <input 
                          type="checkbox" 
                          checked={formData.has_feat || false} 
                          onChange={(e) => setFormData({...formData, has_feat: e.target.checked})}
                          className="w-5 h-5 accent-beatwap-gold rounded cursor-pointer"
                        />
                      </div>
                      {formData.has_feat && (
                        <>
                          <AnimatedInput 
                            label="Nome do Feat" 
                            value={formData.feat_name || ''} 
                            onChange={(e) => setFormData({...formData, feat_name: e.target.value})} 
                            placeholder="Ex: MC Convidado"
                          />
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-400 mb-1">Selecionar artistas BeatWap</div>
                            <div className="max-h-40 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                              {artistOptions.map(a => {
                                const label = a.nome || a.nome_completo_razao_social || 'Sem nome';
                                const checked = (formData.beatwap_feat_artist_ids || []).includes(a.id);
                                return (
                                  <label key={a.id} className="flex items-center gap-2 text-xs text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleSingleFeatArtist(a.id)}
                                      className="w-4 h-4 accent-beatwap-gold rounded cursor-pointer"
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                              {artistOptions.length === 0 && (
                                <div className="text-xs text-gray-500">Nenhum artista BeatWap encontrado</div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="is-album" 
                    checked={formData.is_album} 
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => {
                        if (checked) {
                          const tracks = Array.isArray(prev.tracks) && prev.tracks.length > 0 ? prev.tracks : [createEmptyTrack()];
                          return { ...prev, is_album: true, tracks, audio_files: [], audio_file: null };
                        }
                        return { ...prev, is_album: false, tracks: [], audio_files: [], audio_file: prev.audio_file };
                      });
                      setActiveAlbumTrackIndex(checked ? 0 : null);
                    }}
                  />
                  <label htmlFor="is-album" className="text-sm text-gray-300">Enviar álbum (várias faixas)</label>
                </div>
              </div>
            </div>

            {/* Audio & Docs */}
            {!formData.is_album ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Arquivo(s) de Áudio (MP3/WAV)</label>
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
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-400">Faixas do Álbum</label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Lista de faixas</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIndex = formData.tracks.length;
                          addTrack();
                          setActiveAlbumTrackIndex(nextIndex);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        Adicionar Faixa
                      </button>
                    </div>
                    {formData.tracks.length === 0 ? (
                      <div className="text-xs text-gray-500">Nenhuma faixa adicionada.</div>
                    ) : (
                      <div className="space-y-2">
                        {formData.tracks.map((t, idx) => {
                          const status = String(t.upload_status || 'idle');
                          const statusLabel =
                            status === 'uploaded'
                              ? 'Enviada'
                              : status === 'uploading'
                                ? 'Enviando'
                                : status === 'error'
                                  ? 'Erro'
                                  : 'Não enviada';
                          const statusClass =
                            status === 'uploaded'
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : status === 'uploading'
                                ? 'border-beatwap-gold/30 bg-beatwap-gold/10 text-beatwap-gold'
                                : status === 'error'
                                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                  : 'border-white/10 bg-white/5 text-gray-300';
                          return (
                            <div
                              key={idx}
                              onClick={() => setActiveAlbumTrackIndex(idx)}
                              className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                                activeAlbumTrackIndex === idx ? 'bg-white/10 border-beatwap-gold/30' : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-gray-500">Faixa #{idx + 1}</div>
                                  <div className="text-sm text-white truncate">{String(t.titulo || '').trim() || 'Sem título'}</div>
                                  <div className="text-xs text-gray-400 truncate">{String(t.estilo || '').trim() || 'Sem gênero'}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-2 py-1 rounded-full border ${statusClass}`}>{statusLabel}</span>
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveAlbumTrackIndex(idx);
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-lg transition-colors"
                                    title="Remover faixa"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTrack(idx);
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    {activeAlbumTrackIndex === null || !formData.tracks[activeAlbumTrackIndex] ? (
                      <div className="text-sm text-gray-400">Selecione uma faixa para editar ou clique em “Adicionar Faixa”.</div>
                    ) : (
                      (() => {
                        const idx = activeAlbumTrackIndex;
                        const t = formData.tracks[idx];
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold text-gray-500">Editando</div>
                                <div className="text-sm font-bold text-white">Faixa #{idx + 1}</div>
                              </div>
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                                onClick={() => setActiveAlbumTrackIndex(null)}
                              >
                                Fechar
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <AnimatedInput
                                label="Título da faixa"
                                value={t.titulo}
                                onChange={(e) => updateTrackField(idx, 'titulo', e.target.value)}
                                placeholder="Ex: Intro (Prod. ...)"
                              />
                              <AnimatedInput
                                label="Estilo / Gênero da faixa"
                                value={t.estilo}
                                onChange={(e) => updateTrackField(idx, 'estilo', e.target.value)}
                                placeholder="Ex: Trap, Funk, Pop"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <AnimatedInput
                                label="Compositor principal"
                                value={t.composer || ''}
                                onChange={(e) => updateTrackField(idx, 'composer', e.target.value)}
                                placeholder="Nome do compositor"
                              />
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-medium text-gray-400">Produtor BeatWap</label>
                                  <input
                                    type="checkbox"
                                    checked={!!t.is_beatwap_produced}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      updateTrackField(idx, 'is_beatwap_produced', checked);
                                      if (!checked) updateTrackField(idx, 'producer_id', '');
                                    }}
                                    className="w-4 h-4 accent-beatwap-gold rounded cursor-pointer"
                                  />
                                </div>
                                {t.is_beatwap_produced ? (
                                  <select
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-white text-sm"
                                    value={t.producer_id || ''}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      const row = producerOptions.find((p) => String(p?.id || '') === String(id || '')) || null;
                                      const name = row ? (row.nome || row.nome_completo_razao_social || '') : '';
                                      updateTrackField(idx, 'producer_id', id);
                                      if (name) updateTrackField(idx, 'producer', name);
                                    }}
                                  >
                                    <option value="">Selecionar produtor</option>
                                    {producerOptions.map(p => (
                                      <option key={p.id} value={p.id}>{p.nome || p.nome_completo_razao_social || 'Produtor'}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <AnimatedInput
                                    label="Produtor"
                                    value={t.producer || ''}
                                    onChange={(e) => updateTrackField(idx, 'producer', e.target.value)}
                                    placeholder="Produtor"
                                  />
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <AnimatedInput
                                label="ISRC (Opcional)"
                                value={t.isrc || ''}
                                onChange={(e) => updateTrackField(idx, 'isrc', e.target.value)}
                                placeholder="ISRC"
                              />
                              <div className="bg-white/5 border border-white/10 rounded-xl p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-medium text-gray-400">Possui Feat?</label>
                                  <input
                                    type="checkbox"
                                    checked={t.has_feat || false}
                                    onChange={(e) => updateTrackField(idx, 'has_feat', e.target.checked)}
                                    className="w-4 h-4 accent-beatwap-gold rounded cursor-pointer"
                                  />
                                </div>
                                {t.has_feat && (
                                  <div className="space-y-2">
                                    <AnimatedInput
                                      label="Nome do Feat"
                                      value={t.feat_name || ''}
                                      onChange={(e) => updateTrackField(idx, 'feat_name', e.target.value)}
                                      placeholder="Nome do Artista"
                                    />
                                    <div>
                                      <div className="text-xs font-medium text-gray-400 mb-1">Selecionar artistas BeatWap</div>
                                      <div className="max-h-32 overflow-auto grid grid-cols-1 md:grid-cols-2 gap-1">
                                        {artistOptions.map((a) => {
                                          const label = a.nome || a.nome_completo_razao_social || 'Sem nome';
                                          const checked = (t.beatwap_feat_artist_ids || []).includes(a.id);
                                          return (
                                            <label key={a.id} className="flex items-center gap-2 text-xs text-gray-300">
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleTrackFeatArtist(idx, a.id)}
                                                className="w-4 h-4 accent-beatwap-gold rounded cursor-pointer"
                                              />
                                              <span>{label}</span>
                                            </label>
                                          );
                                        })}
                                        {artistOptions.length === 0 && (
                                          <div className="text-xs text-gray-500">Nenhum artista BeatWap encontrado</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!t.is_beatwap_composer_partner}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateTrackField(idx, 'is_beatwap_composer_partner', checked);
                                  if (!checked) updateTrackField(idx, 'composer_partner_id', null);
                                }}
                                className="w-4 h-4 accent-beatwap-gold rounded cursor-pointer"
                              />
                              <label className="text-xs text-gray-300">Tem compositor parceiro BeatWap</label>
                            </div>
                            {t.is_beatwap_composer_partner && (
                              <div>
                                <label className="text-xs font-medium text-gray-400">Selecionar compositor parceiro</label>
                                <select
                                  className="mt-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white w-full text-xs"
                                  value={t.composer_partner_id || ''}
                                  onChange={(e) => updateTrackField(idx, 'composer_partner_id', e.target.value)}
                                >
                                  <option value="">Selecione o compositor parceiro</option>
                                  {composerOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nome || c.nome_completo_razao_social || 'Sem nome'}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={!!t.has_external_composers}
                                onChange={(e) => updateTrackField(idx, 'has_external_composers', e.target.checked)}
                                className="w-4 h-4 accent-beatwap-gold rounded cursor-pointer"
                              />
                              <label className="text-xs text-gray-300">Tem compositor fora da BeatWap</label>
                            </div>
                            {t.has_external_composers && (
                              <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div className="sm:col-span-2">
                                    <AnimatedInput
                                      label="Nome do compositor (fora da BeatWap)"
                                      value={t.external_composer_input || ''}
                                      onChange={(e) => updateTrackField(idx, 'external_composer_input', e.target.value)}
                                      placeholder="Digite um nome"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <button
                                      type="button"
                                      className="w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                                      onClick={() => {
                                        const name = String(t.external_composer_input || '').trim();
                                        if (!name) return;
                                        const list = Array.isArray(t.external_composers) ? t.external_composers : [];
                                        const next = list.some((x) => String(x || '').toLowerCase() === name.toLowerCase()) ? list : list.concat(name);
                                        updateTrackField(idx, 'external_composers', next);
                                        updateTrackField(idx, 'external_composer_input', '');
                                      }}
                                    >
                                      Adicionar
                                    </button>
                                  </div>
                                </div>
                                {Array.isArray(t.external_composers) && t.external_composers.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {t.external_composers.map((n) => (
                                      <div key={n} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/30 border border-white/10 text-xs text-gray-200">
                                        <span className="truncate max-w-[220px]">{n}</span>
                                        <button
                                          type="button"
                                          className="text-gray-400 hover:text-white"
                                          onClick={() => updateTrackField(idx, 'external_composers', (t.external_composers || []).filter((x) => x !== n))}
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="flex items-center gap-3 p-3 bg-black/20 border border-white/10 rounded-xl">
                                <div className="p-2 bg-beatwap-gold/20 rounded-lg text-beatwap-gold">
                                  <Music size={20} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-xs text-white truncate">{t.audio_file ? t.audio_file.name : 'Nenhum arquivo'}</p>
                                </div>
                                <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs cursor-pointer transition-colors">
                                  Áudio
                                  <input type="file" accept=".mp3,.wav" className="hidden" onChange={(e) => handleTrackFileChange(idx, e, 'audio_file')} />
                                </label>
                              </div>
                              <div className="flex items-center gap-3 p-3 bg-black/20 border border-white/10 rounded-xl">
                                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                                  <FileText size={20} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-xs text-white truncate">{t.authorization_file ? t.authorization_file.name : 'Nenhum arquivo'}</p>
                                </div>
                                <label className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs cursor-pointer transition-colors">
                                  Autorização (opcional)
                                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden" onChange={(e) => handleTrackFileChange(idx, e, 'authorization_file')} />
                                </label>
                              </div>
                            </div>

                            <div className="pt-2 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-xs text-gray-400">
                                  {t.upload_status === 'uploaded' && 'Status: enviada'}
                                  {t.upload_status === 'uploading' && `Enviando... ${t.upload_progress || 0}%`}
                                  {t.upload_status === 'error' && 'Status: erro no envio'}
                                  {(t.upload_status === 'idle' || !t.upload_status) && 'Status: não enviada'}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => uploadAlbumTrack(idx)}
                                  disabled={loading || t.upload_status === 'uploading'}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                    t.upload_status === 'uploaded'
                                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/20'
                                      : 'bg-white/10 text-white hover:bg-white/20'
                                  } ${loading || t.upload_status === 'uploading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {t.upload_status === 'uploaded' ? 'Reenviar música' : 'Enviar música'}
                                </button>
                              </div>
                              {t.upload_status === 'uploading' && (
                                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-2 bg-beatwap-gold rounded-full transition-all"
                                    style={{ width: `${Math.max(0, Math.min(100, Number(t.upload_progress || 0)))}%` }}
                                  />
                                </div>
                              )}
                              {t.upload_error && (
                                <div className="text-xs text-red-400">{t.upload_error}</div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {!formData.is_album && (
                 <AnimatedInput 
                    label="ISRC (Se houver)" 
                    value={formData.isrc} 
                    onChange={(e) => setFormData({...formData, isrc: e.target.value})} 
                    placeholder="BR-XXX-XX-XXXXX"
                  />
               )}
                
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
          </div>
          <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-[#121212]">
            <button 
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <AnimatedButton onClick={handleSubmit} isLoading={loading} icon={CheckCircle2}>
              {formData.is_album ? 'Enviar álbum completo' : 'Enviar para análise'}
            </AnimatedButton>
          </div>
          {renderCoverCropModal()}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
