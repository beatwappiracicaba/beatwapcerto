import { useMemo, useState } from 'react';
import { Plus, AlertCircle } from 'lucide-react';
import { useStories } from '../../hooks/useStories';
import { StoryCreator } from './StoryCreator';
import { StoryViewer } from './StoryViewer';

const sanitize = (v) => {
  const s = String(v || '').trim();
  if (!s) return '';
  if (s.startsWith('data:')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return s;
};

/**
 * Trilho de Stories do Perfil Social.
 *
 * Primeiro item e sempre o "+ Seu story". Depois, quem tem story ativo.
 * Borda dourada = nao visto; cinza = visto.
 */
export const StoryBar = ({ impulsionados = [] }) => {
  const {
    grupos, meuGrupo, loading, erro, carregar,
    criar, excluir, registrarVisualizacao, listarVisualizacoes, meId
  } = useStories();

  const [criando, setCriando] = useState(false);
  const [aberto, setAberto] = useState(null); // {grupo, story}

  // Impulsionados vem primeiro, mantendo a ordem do restante.
  const idsImpulsionados = useMemo(
    () => new Set((Array.isArray(impulsionados) ? impulsionados : []).map((p) => String(p?.id ?? p))),
    [impulsionados]
  );

  const gruposOrdenados = useMemo(() => {
    const lista = [...grupos];
    return lista.sort((a, b) => {
      const ia = idsImpulsionados.has(String(a.user_id)) ? 0 : 1;
      const ib = idsImpulsionados.has(String(b.user_id)) ? 0 : 1;
      if (ia !== ib) return ia - ib;
      return 0;
    });
  }, [grupos, idsImpulsionados]);

  const abrir = (grupo, idx) => {
    setAberto({ gi: grupos.findIndex((g) => g.user_id === grupo.user_id), si: idx });
  };

  const abrirMeu = () => {
    if (!meuGrupo || !meuGrupo.stories.length) { setCriando(true); return; }
    abrir(meuGrupo, 0);
  };

  const navegarGrupo = (dir) => {
    if (!aberto) return;
    const total = gruposOrdenados.length;
    if (!total) { setAberto(null); return; }
    const next = (aberto.gi + dir + total) % total;
    setAberto({ gi: next, si: 0 });
  };

  const navegarStory = (dir) => {
    if (!aberto) return;
    const g = gruposOrdenados[aberto.gi];
    if (!g) { setAberto(null); return; }
    const next = aberto.si + dir;
    if (next < 0) { navegarGrupo(-1); return; }
    if (next >= g.stories.length) {
      const total = gruposOrdenados.length;
      const prox = (aberto.gi + 1) % total;
      setAberto({ gi: prox, si: 0 });
      return;
    }
    setAberto({ gi: aberto.gi, si: next });
  };

  const naoTemStoryDeNinguem = !loading && !meuGrupo && gruposOrdenados.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-bold text-white">Stories</h2>
        {loading && <span className="text-[11px] text-gray-500">Carregando...</span>}
      </div>

      {erro && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
          <span className="flex items-center gap-1.5 text-[11px] text-red-300">
            <AlertCircle size={12} /> {erro}
          </span>
          <button type="button" onClick={carregar} className="text-[11px] font-bold text-red-300 hover:underline">
            Tentar novamente
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {/* Meu story */}
        <button
          type="button"
          onClick={abrirMeu}
          className="w-[68px] shrink-0 text-center"
          aria-label={meuGrupo?.stories.length ? 'Ver meu story' : 'Criar meu story'}
        >
          <span
            className={`relative mx-auto block h-[62px] w-[62px] rounded-full border-2 p-0.5 transition ${
              meuGrupo?.naoVisto ? 'border-beatwap-gold' : 'border-dashed border-white/25'
            }`}
          >
            <span className="block h-full w-full overflow-hidden rounded-full bg-black/40">
              {meuGrupo?.autor?.avatar_url ? (
                <img src={sanitize(meuGrupo.autor.avatar_url)} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-white/60">
                  <Plus size={20} />
                </span>
              )}
            </span>
          </span>
          <span className="mt-1 block truncate text-[10px] text-gray-300">
            {meuGrupo?.stories.length ? 'Seu story' : 'Seu story'}
          </span>
        </button>

        {/* Stories dos outros (impulsionados ja vem primeiros) */}
        {gruposOrdenados.map((g) => {
          if (String(g.user_id) === meId) return null; // ja aparece como "+"
          const nome = g.autor?.nome || 'Usuário';
          const inicial = String(nome).trim().charAt(0).toUpperCase();
          const impulsionado = idsImpulsionados.has(String(g.user_id));
          return (
            <button
              key={g.user_id}
              type="button"
              onClick={() => abrir(g, 0)}
              className="w-[68px] shrink-0 text-center"
              aria-label={`Ver story de ${nome}`}
            >
              {impulsionado ? (
                // Anel animado de impulsionado (mesma animacao dos destaques)
                <span className="bw-story-ring mx-auto block h-[62px] w-[62px]">
                  <span className="bw-story-avatar block h-full w-full overflow-hidden bg-black/40">
                    {g.autor?.avatar_url ? (
                      <img src={sanitize(g.autor.avatar_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                        {inicial}
                      </span>
                    )}
                  </span>
                </span>
              ) : (
                <span
                  className={`mx-auto block h-[62px] w-[62px] rounded-full border-2 p-0.5 transition ${
                    g.naoVisto ? 'border-beatwap-gold' : 'border-white/20'
                  }`}
                >
                  <span className="block h-full w-full overflow-hidden rounded-full bg-black/40">
                    {g.autor?.avatar_url ? (
                      <img src={sanitize(g.autor.avatar_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                        {inicial}
                      </span>
                    )}
                  </span>
                </span>
              )}
              <span className="mt-1 block truncate text-[10px] text-gray-300">{nome}</span>
            </button>
          );
        })}

        {loading && gruposOrdenados.length === 0 && !meuGrupo && (
          [0, 1, 2].map((i) => (
            <div key={`sk-${i}`} className="w-[68px] shrink-0">
              <div className="mx-auto h-[62px] w-[62px] animate-pulse rounded-full bg-white/5" />
              <div className="mx-auto mt-1 h-2 w-10 animate-pulse rounded bg-white/5" />
            </div>
          ))
        )}
      </div>

      {naoTemStoryDeNinguem && (
        <p className="px-1 text-[11px] text-gray-500">
          Ninguém tem story no momento. Crie o seu no botão acima.
        </p>
      )}

      <StoryCreator
        open={criando}
        onClose={() => setCriando(false)}
        onPublish={async (dados) => {
          await criar(dados);
          setCriando(false);
        }}
      />

      <StoryViewer
        open={!!aberto}
        grupos={gruposOrdenados}
        indiceGrupo={aberto ? aberto.gi : 0}
        indiceStory={aberto ? aberto.si : 0}
        onClose={() => setAberto(null)}
        onNavegarGrupo={navegarGrupo}
        onNavegarStory={navegarStory}
        registrarVisualizacao={registrarVisualizacao}
        listarVisualizacoes={listarVisualizacoes}
        excluirStory={excluir}
        meId={meId}
      />
    </div>
  );
};
