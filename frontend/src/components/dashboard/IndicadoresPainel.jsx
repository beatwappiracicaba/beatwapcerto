import { motion } from 'framer-motion';

const TONS = {
  gold: 'border-beatwap-gold/25 bg-beatwap-gold/[0.08] text-beatwap-gold',
  blue: 'border-blue-500/25 bg-blue-500/[0.08] text-blue-300',
  green: 'border-green-500/25 bg-green-500/[0.08] text-green-300',
  purple: 'border-purple-500/25 bg-purple-500/[0.08] text-purple-300',
  red: 'border-red-500/25 bg-red-500/[0.08] text-red-300',
  slate: 'border-white/10 bg-white/[0.05] text-gray-300'
};

// Indicadores principais. Versao compacta do PremiumMetricCard: mesma
// informacao, altura menor e sem caixa interna, para a faixa de KPIs nao
// virar mais uma fileira de blocos pesados.
export const IndicadorCompacto = ({ icon: Icon, title, value, hint, tone = 'gold', delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-beatwap-gold/30"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.14em] text-gray-400">
          {title}
        </span>
        {Icon ? (
          <span className={`shrink-0 rounded-lg border p-1.5 ${TONS[tone] || TONS.gold}`}>
            <Icon size={14} />
          </span>
        ) : null}
      </div>
      <div className="mt-2 break-words text-2xl font-extrabold leading-none text-white md:text-[28px]">
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-[11px] leading-snug text-gray-500">{hint}</div> : null}
    </motion.div>
  );
};

export const IndicadoresPainel = ({ itens = [] }) => {
  if (!itens.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {itens.map((item, i) => (
        <IndicadorCompacto
          key={item.title}
          icon={item.icon}
          title={item.title}
          value={item.value}
          hint={item.hint}
          tone={item.tone}
          delay={i * 0.04}
        />
      ))}
    </div>
  );
};

export default IndicadoresPainel;
