import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DURACAO = 5000; // 5s para imagem/texto; video usa a duracao real

const formatarTempo = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

/**
 * Visualizador de Story em tela cheia.
 *
 * Navegacao: clique/toque na esquerda volta, na direita avanca.
 * Teclado: <- anterior, -> proximo, Esc fecha.
 * Pausa: pressionar e segurar (mouse ou toque) congela o progresso.
 */
export const StoryViewer = ({
  open,
  grupos,
  indiceGrupo,
  indiceStory,
  onClose,
  onNavegarGrupo,
  onNavegarStory,
  registrarVisualizacao,
  listarVisualizacoes,
  excluirStory,
  meId
}) => {
  const navigate = useNavigate();
  const [pausado, setPausado] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [menuAberto, setMenuAberto] = useState(false);
  const [vistas, setVistas] = useState({ total: 0, viewers: [] });
  const [confirmar, setConfirmar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [viuContagem, setViuContagem] = useState(false);
  const videoRef = useRef(null);
  const videoDuracaoRef = useRef(null);

  const grupo = grupos[indiceGrupo] || null;
  const story = grupo?.stories?.[indiceStory] || null;
  const storyId = story?.id || null;
  const tipoStory = story?.type || null;
  const userIdGrupo = grupo?.user_id || null;
  const meuStory = String(userIdGrupo) === meId;

  // Duracao real do video, quando disponivel.
  useEffect(() => {
    if (!open || story?.type !== 'video') {
      videoDuracaoRef.current = null;
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      const d = Number(v.duration);
      if (Number.isFinite(d) && d > 0) {
        videoDuracaoRef.current = d * 1000;
      }
    };
    const onTime = () => {
      if (!pausado && videoDuracaoRef.current) {
        setProgresso((Number(v.currentTime) / (videoDuracaoRef.current / 1000)) * 100);
      }
    };
    const onEnd = () => onNavegarStory(1);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnd);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnd);
    };
  }, [open, story?.id, story?.type, pausado, onNavegarStory]);

  // Timer para imagem/texto.
  useEffect(() => {
    if (!open || !storyId) return undefined;
    if (tipoStory === 'video') return undefined;
    setProgresso(0);
    if (pausado) return undefined;

    const inicio = Date.now();
    const t = setInterval(() => {
      const p = ((Date.now() - inicio) / DURACAO) * 100;
      if (p >= 100) { clearInterval(t); onNavegarStory(1); return; }
      setProgresso(p);
    }, 40);
    return () => clearInterval(t);
  }, [open, storyId, tipoStory, pausado, onNavegarStory]);

  // Reseta ao trocar de story.
  useEffect(() => {
    setProgresso(0);
    setMenuAberto(false);
    setConfirmar(false);
    if (storyId) registrarVisualizacao?.(storyId, userIdGrupo);
  }, [storyId, userIdGrupo, registrarVisualizacao]);

  // Visualizacoes: so do proprio story.
  useEffect(() => {
    if (!open || !meuStory || !storyId) { setViuContagem(false); return; }
    let vivo = true;
    (async () => {
      try {
        const r = await listarVisualizacoes?.(storyId);
        if (vivo) { setVistas({ total: r?.total || 0, viewers: r?.viewers || [] }); setViuContagem(true); }
      } catch { void 0; }
    })();
    return () => { vivo = false; };
  }, [open, meuStory, storyId, listarVisualizacoes]);

  // Teclado
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); onNavegarStory(1); }
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (indiceStory > 0) onNavegarStory(-1);
        else onNavegarGrupo(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, onNavegarStory, onNavegarGrupo, indiceStory]);

  const irParaPerfilSocial = useCallback(() => {
    const id = grupo?.user_id;
    onClose();
    if (id) navigate(`/feed/perfil/${id}`);
  }, [grupo?.user_id, navigate, onClose]);

  const apagar = useCallback(async () => {
    if (!story) return;
    setExcluindo(true);
    try {
      await excluirStory?.(story.id);
      onClose();
    } finally {
      setExcluindo(false);
      setConfirmar(false);
    }
  }, [story, excluirStory, onClose]);

  if (!open || !grupo || !story) return null;

  const autor = grupo.autor || {};
  const nome = autor.nome || 'Usuário';
  const criar = story.type === 'text';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="relative flex h-[100dvh] w-full flex-col sm:h-[92dvh] sm:max-w-[420px] sm:rounded-2xl sm:border sm:border-white/10 sm:overflow-hidden"
        >
          {/* Progresso por story */}
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2">
            {grupo.stories.map((s, i) => (
              <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full bg-white"
                  style={{ width: i < indiceStory ? '100%' : (i === indiceStory ? `${progresso}%` : '0%') }}
                />
              </div>
            ))}
          </div>

          {/* Autor + tempo */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 px-3 pt-3">
            <button
              type="button"
              onClick={irParaPerfilSocial}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/30 bg-black/40">
                {autor.avatar_url ? (
                  <img src={autor.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
                    {String(nome).trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">{nome}</span>
                <span className="block truncate text-[10px] text-white/70">
                  {autor.social_username ? `@${autor.social_username}` : (formatarTempo(Date.now() - new Date(story.created_at).getTime()))}
                </span>
              </span>
            </button>

            <div className="relative flex shrink-0 items-center gap-1">
              {meuStory && (
                <button
                  type="button"
                  onClick={() => setViuContagem((v) => !v)}
                  className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[11px] font-bold text-white"
                >
                  <Eye size={12} />
                  {vistas.total}
                </button>
              )}
              {meuStory && (
                <button
                  type="button"
                  onClick={() => setMenuAberto((v) => !v)}
                  className="rounded-full bg-black/40 p-1.5 text-white"
                  aria-label="Menu do Story"
                >
                  <MoreHorizontal size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-black/40 p-1.5 text-white"
                aria-label="Fechar Story"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Menu do dono */}
          {meuStory && menuAberto && (
            <div className="absolute right-3 top-12 z-30 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#151515] py-1 shadow-2xl">
              <button
                type="button"
                onClick={() => { setViuContagem(true); setMenuAberto(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-gray-200 transition hover:bg-white/5"
              >
                <Eye size={13} /> Ver visualizações
              </button>
              <button
                type="button"
                onClick={() => setConfirmar(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-300 transition hover:bg-red-500/10"
              >
                <Trash2 size={13} /> Excluir Story
              </button>
            </div>
          )}

          {/* Conteudo */}
          <div
            className="flex min-h-0 flex-1 items-center justify-center"
            style={{ background: criar ? (story.background || 'linear-gradient(135deg,#F5C542,#b45309)') : '#0b0b0b' }}
          >
            {story.type === 'image' && story.media_url && (
              <img src={story.media_url} alt="Story" className="h-full w-full object-contain" draggable="false" />
            )}
            {story.type === 'video' && story.media_url && (
              <video
                ref={videoRef}
                src={story.media_url}
                className="h-full w-full object-contain"
                autoPlay
                muted
                playsInline
                onPlay={() => setPausado(false)}
              />
            )}
            {criar && (
              <div className="w-full px-6 text-center">
                <p className="whitespace-pre-wrap break-words text-2xl font-bold text-white drop-shadow">
                  {story.text_content}
                </p>
              </div>
            )}
          </div>

          {/* Zonas de navegacao */}
          <button
            type="button"
            aria-label="Story anterior"
            onClick={() => { if (indiceStory > 0) onNavegarStory(-1); else onNavegarGrupo(-1); }}
            className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-pointer"
            onPointerDown={() => setPausado(true)}
            onPointerUp={() => setPausado(false)}
            onPointerLeave={() => setPausado(false)}
          />
          <button
            type="button"
            aria-label="Próximo story"
            onClick={() => onNavegarStory(1)}
            className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-pointer"
            onPointerDown={() => setPausado(true)}
            onPointerUp={() => setPausado(false)}
            onPointerLeave={() => setPausado(false)}
          />

          {/* Visualizacoes */}
          {meuStory && viuContagem && (
            <div className="absolute inset-x-0 bottom-0 z-20 max-h-[50%] overflow-y-auto bg-black/80 p-3">
              <div className="mb-2 text-xs font-bold text-white">Quem viu</div>
              {vistas.viewers.length === 0 ? (
                <p className="text-[11px] text-gray-400">Ainda não viu ninguém.</p>
              ) : vistas.viewers.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { onClose(); navigate(`/feed/perfil/${v.id}`); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-white/5"
                >
                  <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/40">
                    {v.avatar_url ? (
                      <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">
                        {String(v.nome).trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-white">{v.nome}</span>
                    {v.social_username && (
                      <span className="block truncate text-[10px] text-beatwap-gold">@{v.social_username}</span>
                    )}
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-gray-500" />
                </button>
              ))}
            </div>
          )}

          {/* Confirmacao de exclusao */}
          {confirmar && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
              <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-[#151515] p-5 text-center">
                <h3 className="text-base font-bold text-white">Excluir Story?</h3>
                <p className="mt-1.5 text-xs text-gray-400">Essa ação não poderá ser desfeita.</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmar(false)}
                    className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={apagar}
                    disabled={excluindo}
                    className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                  >
                    {excluindo ? 'Excluindo...' : 'Excluir'}
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
