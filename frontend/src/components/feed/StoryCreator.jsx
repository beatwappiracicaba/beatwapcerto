import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image as ImageIcon, Video, Type as TypeIcon, Upload, Loader, Check } from 'lucide-react';

const FUNDOS = [
  { id: 'beatwap', css: 'linear-gradient(135deg,#F5C542 0%,#b45309 100%)' },
  { id: 'roxo', css: 'linear-gradient(135deg,#7c3aed 0%,#1e1b4b 100%)' },
  { id: 'noite', css: 'linear-gradient(135deg,#1f2937 0%,#0b0b0b 100%)' },
  { id: 'rosa', css: 'linear-gradient(135deg,#ec4899 0%,#4c1d95 100%)' },
  { id: 'verde', css: 'linear-gradient(135deg,#10b981 0%,#064e3b 100%)' }
];

const ACEITA = { image: 'image/*', video: 'video/*' };

/**
 * Criador de Story do Feed. Reaproveita o mesmo upload do Feed
 * (bucket feed_stories) e nao inventa armazenamento novo.
 */
export const StoryCreator = ({ open, onClose, onPublish }) => {
  const [tipo, setTipo] = useState('text');
  const [texto, setTexto] = useState('');
  const [fundo, setFundo] = useState('beatwap');
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState('');
  const [progresso, setProgresso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setTipo('text'); setTexto(''); setFundo('beatwap');
    setArquivo(null); setPreview(''); setProgresso(0);
    setEnviando(false); setErro('');
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!preview) return undefined;
    return () => { try { URL.revokeObjectURL(preview); } catch { void 0; } };
  }, [preview]);

  if (!open) return null;

  const escolherArquivo = (e) => {
    const f = e.target?.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (preview) { try { URL.revokeObjectURL(preview); } catch { void 0; } }
    setArquivo(f);
    setPreview(URL.createObjectURL(f));
  };

  const podePublicar = tipo === 'text'
    ? texto.trim().length > 0
    : !!arquivo;

  const publicar = async () => {
    if (!podePublicar || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      await onPublish({
        type: tipo,
        text_content: texto.trim(),
        media: arquivo ? { file: arquivo, onProgress: (p) => setProgresso(Math.round(Number(p) || 0)) } : null,
        background: tipo === 'text' ? (FUNDOS.find((f) => f.id === fundo)?.css || null) : null
      });
    } catch (e) {
      setErro(e?.message || 'Não foi possível publicar o Story');
      setEnviando(false);
    }
  };

  const fundoAtual = FUNDOS.find((f) => f.id === fundo)?.css;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-end justify-center sm:items-center">
        <motion.button
          type="button"
          aria-label="Fechar"
          className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Criar Story"
          className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#101010] sm:max-w-md sm:rounded-2xl"
          initial={{ y: '100%', opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0.7 }}
          transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white" aria-label="Fechar">
              <X size={18} />
            </button>
            <h2 className="text-sm font-bold text-white">Criar Story</h2>
            <button
              type="button"
              onClick={publicar}
              disabled={!podePublicar || enviando}
              className="rounded-full bg-beatwap-gold px-3.5 py-1.5 text-xs font-bold text-black transition disabled:opacity-40"
            >
              {enviando ? <Loader size={14} className="animate-spin" /> : 'Publicar'}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div
              className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl border border-white/10"
              style={{ background: tipo === 'text' ? fundoAtual : '#0b0b0b' }}
            >
              {tipo === 'image' && preview && (
                <img src={preview} alt="Prévia" className="h-full w-full object-cover" />
              )}
              {tipo === 'video' && preview && (
                <video src={preview} className="h-full w-full object-cover" muted playsInline controls />
              )}
              {tipo === 'text' && (
                <div className="flex h-full w-full items-center justify-center p-4">
                  <p className="whitespace-pre-wrap break-words text-center text-lg font-bold text-white drop-shadow">
                    {texto || 'Escreva seu Story...'}
                  </p>
                </div>
              )}

              {enviando && progresso > 0 && (
                <div className="absolute inset-x-3 bottom-3">
                  <div className="h-1 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full bg-beatwap-gold transition-all" style={{ width: `${progresso}%` }} />
                  </div>
                </div>
              )}
            </div>

            {tipo === 'text' && (
              <>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="O que você quer compartilhar?"
                  className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/50"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FUNDOS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFundo(f.id)}
                      aria-label={`Fundo ${f.id}`}
                      aria-pressed={fundo === f.id}
                      className="h-7 w-7 rounded-full border-2 transition"
                      style={{ background: f.css, borderColor: fundo === f.id ? '#fff' : 'transparent' }}
                    />
                  ))}
                </div>
              </>
            )}

            {tipo !== 'text' && !preview && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-6 text-sm font-bold text-gray-300 transition hover:border-beatwap-gold/50"
              >
                <Upload size={16} />
                Selecionar {tipo === 'video' ? 'vídeo' : 'imagem'}
              </button>
            )}

            {preview && tipo !== 'text' && (
              <p className="mt-2 truncate text-center text-xs text-gray-400">{arquivo?.name}</p>
            )}

            {erro && <p className="mt-2 text-center text-xs text-red-400">{erro}</p>}
          </div>

          <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {[
              { key: 'text', label: 'Texto', icon: TypeIcon },
              { key: 'image', label: 'Imagem', icon: ImageIcon },
              { key: 'video', label: 'Vídeo', icon: Video }
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setTipo(t.key); setArquivo(null); setPreview(''); }}
                aria-pressed={tipo === t.key}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                  tipo === t.key
                    ? 'border-beatwap-gold/50 bg-beatwap-gold/10 text-beatwap-gold'
                    : 'border-white/10 bg-white/5 text-gray-300'
                }`}
              >
                {tipo === t.key ? <Check size={13} /> : <t.icon size={13} />}
                {t.label}
              </button>
            ))}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ACEITA[tipo] || 'image/*'}
            className="sr-only"
            onChange={escolherArquivo}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
