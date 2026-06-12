import { Search, Sparkles } from 'lucide-react';

export const PanelHero = ({
  eyebrow,
  title,
  description,
  recommendation,
  badges = [],
  actions,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar no painel...'
}) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(245,197,66,0.10),rgba(255,255,255,0.03),rgba(0,0,0,0.35))] p-5 md:p-6 shadow-[0_0_40px_rgba(245,197,66,0.06)]">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div className="text-[11px] uppercase tracking-[0.28em] text-beatwap-gold/80 font-bold">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">{title}</h1>
          {description ? (
            <p className="text-sm text-gray-300 mt-2 max-w-2xl">{description}</p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap gap-3 xl:justify-end">{actions}</div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.85fr] gap-4 mt-5">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <Sparkles size={16} className="text-beatwap-gold" />
            Recomendacao do dia
          </div>
          <div className="text-sm text-gray-300 mt-2">
            {recommendation || 'Organize suas prioridades e avance no item mais quente do painel.'}
          </div>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-4">
              {badges.map((badge) => (
                <span
                  key={`${badge.label}-${badge.value}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200"
                >
                  <span className="text-gray-400">{badge.label}:</span> {badge.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-400">Busca rapida</div>
          <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <Search size={16} className="text-gray-500" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
            />
          </label>
          <div className="text-xs text-gray-500 mt-3">
            Filtre atividades, oportunidades, alertas e atalhos sem sair do painel.
          </div>
        </div>
      </div>
    </div>
  );
};
