export const PremiumMetricCard = ({
  icon: Icon,
  title,
  value,
  description,
  tone = 'gold',
  footer
}) => {
  const toneMap = {
    gold: 'bg-beatwap-gold/12 text-beatwap-gold border-beatwap-gold/20',
    blue: 'bg-blue-500/12 text-blue-300 border-blue-500/20',
    green: 'bg-green-500/12 text-green-300 border-green-500/20',
    purple: 'bg-purple-500/12 text-purple-300 border-purple-500/20',
    red: 'bg-red-500/12 text-red-300 border-red-500/20'
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.2em] text-gray-500">{title}</div>
          <div className="text-3xl md:text-4xl font-extrabold text-white mt-3 break-words">{value}</div>
          {description ? (
            <div className="text-sm text-gray-400 mt-3">{description}</div>
          ) : null}
        </div>
        {Icon ? (
          <div className={`shrink-0 rounded-2xl border p-3 ${toneMap[tone] || toneMap.gold}`}>
            <Icon size={20} />
          </div>
        ) : null}
      </div>
      {footer ? (
        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">{footer}</div>
      ) : null}
    </div>
  );
};
