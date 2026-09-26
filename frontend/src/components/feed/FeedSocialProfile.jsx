import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Heart, Video, AlertCircle, Pencil, ExternalLink, RefreshCw, Compass } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

// Mesmo criterio do Feed: aceita http(s) e data:, nao inventa esquema novo.
const sanitizeUrl = (raw) => {
  const v = String(raw || '').trim();
  if (!v) return '';
  if (v.startsWith('data:')) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return v;
};

/**
 * Perfil Social do Feed.
 *
 * Tela propria, separada do Perfil Publico profissional. Usa a identidade
 * global do usuario (foto, nome e cargo vindos do mesmo Profile) e lista as
 * publicacoes reais do Feed, sem copiar nada para uma segunda tabela.
 * O Perfil Publico so e alcancavel pelo link explicito no final da pagina.
 */
export const FeedSocialProfile = ({ onBack }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isMe = !!user && !!id && String(user.id) === String(id);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/feed/users/${id}/posts`);
      setData(res);
      setError('');
    } catch (e) {
      setError(e?.message || 'Falha ao carregar o perfil');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Fica sendo o contexto social ao voltar.
  const goBack = () => {
    if (typeof onBack === 'function') { onBack(); return; }
    if (window.history.length > 1) navigate(-1);
    else navigate('/dashboard/feed');
  };

  const info = data?.profile;
  const posts = Array.isArray(data?.items) ? data.items : [];
  const nome = info?.nome || 'Usuário';
  const cargo = String(info?.cargo || '').trim();
  const cargoLabel = cargo.charAt(0).toUpperCase() + cargo.slice(1);
  const avatar = info?.avatar_url ? sanitizeUrl(info.avatar_url) : null;

  const totalLikes = posts.reduce((sum, p) => sum + (Number(p?.likes_count) || 0), 0);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:border-beatwap-gold/50 hover:bg-white/10 hover:text-beatwap-gold"
        >
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>

        <button
          type="button"
          onClick={load}
          className="rounded-full p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Atualizar perfil"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <header className="rounded-2xl bg-white/[0.03] p-5 text-center sm:p-6">
        <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-beatwap-gold/40 bg-white/5 sm:h-28 sm:w-28">
          {avatar ? (
            <img src={avatar} alt={nome} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
              {nome.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-lg font-extrabold text-white sm:text-xl">{nome}</h1>
        {cargoLabel && (
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-beatwap-gold">{cargoLabel}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-500">@{String(nome).trim().toLowerCase().replace(/\s+/g, '_')}</p>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div>
            <div className="font-bold text-white">{posts.length}</div>
            <div className="text-[11px] text-gray-400">Publicações</div>
          </div>
          <div>
            <div className="font-bold text-white">{totalLikes}</div>
            <div className="text-[11px] text-gray-400">Curtidas</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {isMe ? (
            <button
              type="button"
              onClick={() => navigate('/dashboard/profile')}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-gray-200 transition hover:border-beatwap-gold/50 hover:text-beatwap-gold"
            >
              <Pencil size={14} />
              <span>Editar perfil</span>
            </button>
          ) : (
            <button
              type="button"
              // Devolve ao Feed pedindo a abertura do Chat Social com essa
              // pessoa. O chat vive no Feed entao o pedido viaja por state.
              onClick={() => navigate('/dashboard/feed', { state: { socialChatWith: String(id) } })}
              className="inline-flex items-center gap-1.5 rounded-full bg-beatwap-gold px-4 py-2 text-xs font-bold text-black transition hover:brightness-95"
            >
              <MessageCircle size={14} />
              <span>Mensagem</span>
            </button>
          )}

          {/* Saida explicita para o Perfil Publico profissional. */}
          <button
            type="button"
            onClick={() => navigate(`/profile/${id}`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-gray-300 transition hover:border-white/25 hover:text-white"
          >
            <ExternalLink size={14} />
            <span>Ver Perfil Público</span>
          </button>
        </div>
      </header>

      <div className="flex items-center gap-2">
        <Compass size={15} className="text-beatwap-gold" />
        <h2 className="text-sm font-bold text-white">Publicações no Feed</h2>
      </div>

      {error ? (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-12 text-center">
          <AlertCircle size={30} className="mx-auto mb-2 text-red-400" />
          <div className="text-sm text-gray-300">{error}</div>
          <button
            type="button"
            onClick={load}
            className="mt-3 text-xs font-bold text-beatwap-gold hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={`sp-skel-${i}`} className="aspect-square animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.03] px-6 py-14 text-center">
          <Compass size={32} className="mx-auto mb-3 opacity-20" />
          <div className="text-sm font-bold text-gray-300">Nenhuma publicação ainda</div>
          <p className="mt-1 text-xs text-gray-500">
            {isMe ? 'Suas publicações no Feed aparecem aqui.' : 'Esta pessoa ainda não publicou no Feed.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {posts.map((p) => (
            <article
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40"
            >
              {p.media_url && String(p.media_type || '') === 'image' ? (
                <img
                  src={sanitizeUrl(p.media_url)}
                  alt={p.caption || 'Publicação'}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : p.media_url && String(p.media_type || '') === 'video' ? (
                <>
                  <video
                    src={sanitizeUrl(p.media_url)}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white">
                    <Video size={12} />
                  </span>
                </>
              ) : (
                <div className="flex h-full w-full flex-col justify-between p-3">
                  <p className="line-clamp-4 text-xs text-gray-300">
                    {String(p.caption || p.text || 'Publicação de texto')}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-400">
                    {Number(p.likes_count) > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Heart size={11} />{p.likes_count}
                      </span>
                    )}
                    {Number(p.comments_count) > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle size={11} />{p.comments_count}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {p.media_url && String(p.media_type || '') !== 'text' && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-6 text-[11px] text-white/90">
                  {Number(p.likes_count) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Heart size={11} fill="currentColor" />{p.likes_count}
                    </span>
                  )}
                  {Number(p.comments_count) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle size={11} />{p.comments_count}
                    </span>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedSocialProfile;
