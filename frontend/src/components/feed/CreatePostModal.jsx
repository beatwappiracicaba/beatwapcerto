import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import {
  X, Image as ImageIcon, Video, Link as LinkIcon, Type as TypeIcon,
  MapPin, AtSign, Music, Trash2, Loader
} from 'lucide-react';
import { getCroppedImg } from '../../utils/cropImage';
import { apiClient, uploadApi } from '../../services/apiClient';

const MAX_CHARS = 2200;
const MAX_IMAGES = 4;

const PRIVACY = [
  { key: 'publico', label: 'Público' },
  { key: 'amigos', label: 'Amigos' },
  { key: 'seguidores', label: 'Seguidores' },
  { key: 'privado', label: 'Privado' }
];

const ACCEPT = {
  image: 'image/*',
  video: 'video/*',
  link: 'text/*',
  text: 'text/*'
};

/**
 * Compositor de nova publicacao.
 *
 * Roda sobre o Feed (nao navega). Reaproveita o storage e o corte de imagem ja
 * existentes no projeto: o recorte e enviado como arquivo final, sem reprocessar
 * a imagem depois do corte.
 */
export const CreatePostModal = ({ open, onClose, profile, meId, onPublished }) => {
  const [type, setType] = useState('text');
  const [caption, setCaption] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [visibility, setVisibility] = useState('publico');
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState(null);
  const [cropBusy, setCropBusy] = useState(false);

  const taRef = useRef(null);
  const dialogRef = useRef(null);
  const wasOpen = useRef(false);

  const reset = useCallback(() => {
    setType('text');
    setCaption('');
    setLinkUrl('');
    setVisibility('publico');
    setFiles([]);
    setPosting(false);
    setProgress(0);
    setError('');
    setConfirmDiscard(false);
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
  }, []);

  // Foca o texto ao abrir, sem roubar o foco do botao que abriu o modal.
  useEffect(() => {
    if (open && !wasOpen.current) {
      const t = setTimeout(() => taRef.current?.focus(), 220);
      wasOpen.current = true;
      return () => clearTimeout(t);
    }
    if (!open) wasOpen.current = false;
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !cropSrc) {
        e.stopPropagation();
        pedirFechar();
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const temConteudo = useCallback(
    () => caption.trim().length > 0 || files.length > 0 || (type === 'link' && linkUrl.trim().length > 0),
    [caption, files.length, linkUrl, type]
  );

  const podePublicar = temConteudo() && !posting && !cropBusy;

  function pedirFechar() {
    if (posting) return;
    if (temConteudo()) setConfirmDiscard(true);
    else fechar();
  }

  function fechar() {
    reset();
    onClose?.();
  }

  // --- midia ---------------------------------------------------------------
  const aoEscolherArquivos = useCallback((e) => {
    const picked = Array.from(e.target?.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setError('');
    const primeiro = picked[0];

    if (primeiro.type?.startsWith('image/') && !files.length) {
      // Imagem abre o recorte herdado do projeto; o recorte final e enviado
      // como esta, sem reprocessar depois.
      const leitor = new FileReader();
      leitor.onload = () => setCropSrc(String(leitor.result || ''));
      leitor.readAsDataURL(primeiro);
      return;
    }

    const espaco = type === 'video' ? 1 : MAX_IMAGES;
    setFiles((prev) => {
      const prox = [...prev];
      for (const f of picked) {
        if (prox.length >= espaco) break;
        prox.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, file: f });
      }
      return prox;
    });
  }, [files.length, type]);

  const confirmarCorte = useCallback(async () => {
    if (!cropSrc) return;
    setCropBusy(true);
    try {
      const blob = await getCroppedImg(cropSrc, areaPixels, 1600, 1600);
      const arquivo = new File([blob], `recorte-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFiles((prev) => [...prev, { id: `crop_${Date.now()}`, file: arquivo, recortado: true }]);
      setCropSrc(null);
    } catch {
      setError('Não foi possível aplicar o recorte. Tente outra imagem.');
    } finally {
      setCropBusy(false);
    }
  }, [areaPixels, cropSrc]);

  const removerArquivo = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const previews = useMemo(
    () => files.map((f) => ({ ...f, url: URL.createObjectURL(f.file) })),
    [files]
  );

  useEffect(() => () => { previews.forEach((p) => URL.revokeObjectURL(p.url)); }, [previews]);

  // --- envio ---------------------------------------------------------------
  const enviar = useCallback(async () => {
    if (!podePublicar) return;
    setPosting(true);
    setError('');
    setProgress(0);
    try {
      const urls = [];
      for (let i = 0; i < files.length; i += 1) {
        const f = files[i].file;
        const mime = String(f?.type || '').toLowerCase();
        const ext = mime.includes('png') ? 'png'
          : mime.includes('webp') ? 'webp'
            : mime.includes('mp4') ? 'mp4'
              : mime.includes('webm') ? 'webm'
                : mime.includes('quicktime') ? 'mov'
                  : 'jpg';
        const up = await uploadApi.uploadWithMeta(f, {
          bucket: 'feed_media',
          fileName: `feed/${meId}/${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}.${ext}`,
          onProgress: (pct) => setProgress(Math.round(((i + 1) * Number(pct || 0)) / files.length))
        });
        if (up?.url) urls.push(up.url);
      }
      setProgress(100);

      const mediaType = files.length ? (files[0].file?.type?.startsWith('video') ? 'video' : 'image') : (type === 'link' && linkUrl.trim() ? 'link' : 'text');

      const created = await apiClient.post('/feed/posts', {
        media_type: mediaType,
        caption: caption.trim(),
        link_url: type === 'link' ? linkUrl.trim() : null,
        media_url: urls[0] || null,
        media_urls: urls.slice(1),
        visibility,
      });

      onPublished?.(created);
      reset();
      onClose?.();
    } catch (e) {
      setError(e?.message || 'Não foi possível publicar. Tente novamente.');
    } finally {
      setPosting(false);
    }
  }, [caption, files, linkUrl, meId, onClose, onPublished, podePublicar, reset, type, visibility]);

  if (!open) return null;

  const nome = profile?.nome || profile?.nome_completo_razao_social || 'Usuário';
  const acoes = [
    { key: 'image', label: 'Galeria', icon: ImageIcon, accept: ACCEPT.image },
    { key: 'video', label: 'Vídeo', icon: Video, accept: ACCEPT.video },
    { key: 'link', label: 'Link', icon: LinkIcon, accept: ACCEPT.link },
    { key: 'text', label: 'Só texto', icon: TypeIcon, accept: ACCEPT.text }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
        <motion.button
          type="button"
          aria-label="Fechar"
          className="absolute inset-0 h-full w-full cursor-default bg-black/75 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={pedirFechar}
        />

        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Nova publicação"
          className="relative flex w-full flex-col rounded-t-2xl border border-white/10 bg-[#101010]
                     sm:max-w-[720px] sm:rounded-2xl
                     max-h-[100dvh] sm:max-h-[90dvh] sm:my-6"
          initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0.6 }}
          transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={pedirFechar}
              aria-label="Fechar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/5 hover:text-white"
            >
              <X size={19} />
            </button>
            <h2 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-white sm:text-base">
              Nova publicação
            </h2>
            <button
              type="button"
              onClick={enviar}
              disabled={!podePublicar}
              className="shrink-0 rounded-full bg-beatwap-gold px-3.5 py-1.5 text-xs font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:text-sm"
            >
              {posting ? <Loader size={15} className="animate-spin" /> : 'Publicar'}
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-white">{nome.trim().charAt(0).toUpperCase()}</span>
                )}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{nome}</div>
                {profile?.cargo && (
                  <div className="truncate text-[11px] uppercase tracking-wide text-beatwap-gold">
                    {String(profile.cargo)}
                  </div>
                )}
              </div>
            </div>

            <textarea
              ref={taRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CHARS))}
              placeholder="O que você está pensando?"
              rows={4}
              className="mt-3 w-full resize-none bg-transparent text-base text-white placeholder:text-gray-600 outline-none sm:text-[17px]"
            />

            {type === 'link' && (
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/50"
              />
            )}

            {previews.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {previews.map((p) => (
                  <div key={p.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {p.file?.type?.startsWith('video/') ? (
                      <video src={p.url} className="aspect-square w-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      <img src={p.url} alt="Prévia" className="aspect-square w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removerArquivo(p.id)}
                      aria-label="Remover midia"
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-500/80"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[
                { icon: Music, label: 'Música' },
                { icon: AtSign, label: 'Marcar' },
                { icon: MapPin, label: 'Localização' }
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  disabled
                  title="Em breve"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-400 opacity-70"
                >
                  <o.icon size={13} />
                  {o.label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {acoes.map((a) => (
                <label
                  key={a.key}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    type === a.key
                      ? 'border-beatwap-gold/50 bg-beatwap-gold/10 text-beatwap-gold'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <a.icon size={13} />
                  {a.label}
                  <input
                    type="file"
                    accept={a.accept}
                    className="sr-only"
                    onChange={(e) => { setType(a.key); aoEscolherArquivos(e); }}
                  />
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <span className="text-xs text-gray-500">Quem pode ver</span>
              {PRIVACY.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setVisibility(p.key)}
                  aria-pressed={visibility === p.key}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                    visibility === p.key
                      ? 'border-beatwap-gold bg-beatwap-gold text-black'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4">
            <span className="text-[11px] tabular-nums text-gray-500">
              {caption.length}/{MAX_CHARS}
            </span>
            {progress > 0 && posting && (
              <span className="text-[11px] font-semibold text-beatwap-gold">Enviando {progress}%</span>
            )}
            {error && <span className="text-[11px] text-red-400">{error}</span>}
          </footer>

          {cropSrc && (
            <div className="absolute inset-0 z-10 flex flex-col bg-[#0b0b0b]">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                <button type="button" onClick={() => setCropSrc(null)} className="rounded-full px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5">Cancelar</button>
                <span className="text-sm font-bold text-white">Ajustar recorte</span>
                <button
                  type="button"
                  onClick={confirmarCorte}
                  disabled={cropBusy}
                  className="rounded-full bg-beatwap-gold px-3.5 py-1.5 text-xs font-bold text-black disabled:opacity-50"
                >
                  {cropBusy ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, area) => setAreaPixels(area)}
                />
              </div>
              <input
                type="range"
                min={1} max={3} step={0.01} value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="mx-4 my-3 accent-[#F5C542]"
              />
            </div>
          )}

          {confirmDiscard && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
              <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#151515] p-5 text-center">
                <h3 className="text-base font-bold text-white">Descartar publicação?</h3>
                <p className="mt-1.5 text-xs text-gray-400">O que você escreveu será perdido.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDiscard(false)}
                    className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/5"
                  >
                    Continuar editando
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmDiscard(false); fechar(); }}
                    className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white hover:bg-red-600"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreatePostModal;
