import { Search } from 'lucide-react';

// Cabecalho do painel: saudacao, cargo e busca. Substitui o PanelHero antigo,
// que trazia recomendacao, badges e busca dentro de tres caixas empilhadas e
// repetia numeros que ja aparecem nos indicadores.
export const PainelCabecalho = ({
  saudacao = '',
  cargo = '',
  resumo = '',
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar no painel...',
  children
}) => {
  return (
    <header className="rounded-3xl border border-white/10 bg-[linear-gradient(120deg,rgba(245,197,66,0.12),rgba(255,255,255,0.03)_45%,rgba(0,0,0,0.3))] p-5 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-full border border-beatwap-gold/35 bg-beatwap-gold/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-beatwap-gold">
              {cargo || 'Painel'}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-white md:text-3xl">
            {saudacao}
          </h1>
          {resumo ? (
            <p className="mt-2 max-w-2xl text-sm text-gray-400">{resumo}</p>
          ) : null}
        </div>

        {children ? (
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">{children}</div>
        ) : null}
      </div>

      {onSearchChange ? (
        <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 lg:max-w-md">
          <Search size={16} className="shrink-0 text-gray-500" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
          />
        </label>
      ) : null}
    </header>
  );
};

export default PainelCabecalho;
