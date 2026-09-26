import { useNavigate } from 'react-router-dom';

// Area de acoes rapidas. Sao botoes dentro do painel, nao um menu: apenas
// levam para rotas que ja existem. A lista vem de atalhosDoCargo(), que ja
// respeita o que cada cargo pode acessar.
export const AcoesRapidas = ({ atalhos = [], rotulo = 'Ações rápidas', descricao = '' }) => {
  const navigate = useNavigate();
  if (!atalhos.length) return null;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{rotulo}</h2>
        {descricao ? <p className="text-xs text-gray-500">{descricao}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
        {atalhos.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(a.to)}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-beatwap-gold/40 hover:bg-beatwap-gold/[0.07] focus:outline-none focus-visible:border-beatwap-gold/60"
            >
              {Icon ? (
                <span className="shrink-0 rounded-xl border border-white/10 bg-black/25 p-2 text-gray-300 transition group-hover:border-beatwap-gold/30 group-hover:text-beatwap-gold">
                  <Icon size={16} />
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{a.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default AcoesRapidas;
