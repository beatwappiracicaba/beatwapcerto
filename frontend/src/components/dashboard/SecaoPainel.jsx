// Secao do painel. Versao mais leve que ui/PanelSection: sem moldura
// propria, porque o conteudo ja vem em listas e grades com bordas proprias.
// Evita o efeito de caixa dentro de caixa.
export const SecaoPainel = ({ titulo = '', descricao = '', aside, children, className = '' }) => {
  return (
    <section className={className}>
      {titulo || descricao || aside ? (
        <div className="mb-3.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {titulo ? (
              <h2 className="text-lg font-extrabold leading-tight text-white md:text-xl">{titulo}</h2>
            ) : null}
            {descricao ? <p className="mt-1 max-w-3xl text-sm text-gray-400">{descricao}</p> : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
};

// Grade de items do cargo (projetos, musicas, oportunidades). Cada item e
// um link para uma rota existente.
export const GradeItens = ({ itens = [], aoClicar, vazio = 'Nada por aqui ainda.' }) => {
  const lista = Array.isArray(itens) ? itens : [];
  if (!lista.length) {
    return <p className="rounded-2xl border border-white/10 bg-white/[0.03] py-8 text-center text-sm text-gray-500">{vazio}</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {lista.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => aoClicar?.(item)}
            className="group w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-beatwap-gold/35 hover:bg-white/[0.06]"
          >
            {item.topo ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-beatwap-gold">
                {item.topo}
              </div>
            ) : null}
            <div className={`${item.topo ? 'mt-1.5' : ''} truncate text-sm font-bold text-white group-hover:text-beatwap-gold`}>
              {item.titulo}
            </div>
            {item.subtitulo ? (
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{item.subtitulo}</div>
            ) : null}
            {item.rodape ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                {item.rodape}
              </div>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default SecaoPainel;
