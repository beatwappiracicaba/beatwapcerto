export const PanelSection = ({
  eyebrow,
  title,
  description,
  aside,
  children,
  className = ''
}) => {
  return (
    <section className={`rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${className}`}>
      {(eyebrow || title || description || aside) ? (
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-5">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[11px] uppercase tracking-[0.28em] text-beatwap-gold/75 font-bold">{eyebrow}</div>
            ) : null}
            {title ? (
              <h3 className="text-xl md:text-2xl font-extrabold text-white mt-2">{title}</h3>
            ) : null}
            {description ? (
              <p className="text-sm text-gray-400 mt-2 max-w-3xl">{description}</p>
            ) : null}
          </div>
          {aside ? (
            <div className="shrink-0">{aside}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
};
