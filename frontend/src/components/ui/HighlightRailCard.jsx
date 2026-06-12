export const HighlightRailCard = ({ title, description, children, badge }) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-white">{title}</div>
          {description ? (
            <div className="text-sm text-gray-400 mt-2">{description}</div>
          ) : null}
        </div>
        {badge ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};
