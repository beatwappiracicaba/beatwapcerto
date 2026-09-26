import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Inbox, AlertTriangle, Clock } from 'lucide-react';

const ICONE_KIND = {
  Notificacao: Bell,
  Chat: Clock,
  Fila: Inbox,
  Composicao: CheckCircle2,
  Projeto: CheckCircle2,
  Lead: Inbox,
  Proposta: AlertTriangle
};

const tempoRelativo = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
};

// Atividades recentes: uma lista unica com divisores, em vez de varios
// blocos. Os itens vem prontos dos paineis (titulo/descricao/kind/timestamp).
export const AtividadeRecente = ({
  itens = [],
  titulo = 'Atividades recentes',
  descricao = '',
  vazio = 'Nada por aqui ainda.',
  maximo = 6
}) => {
  const lista = (Array.isArray(itens) ? itens : []).slice(0, maximo);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{titulo}</h2>
        {descricao ? <p className="mt-1 text-xs text-gray-500">{descricao}</p> : null}
      </div>

      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{vazio}</p>
      ) : (
        <ul className="divide-y divide-white/[0.07]">
          {lista.map((item) => {
            const Icon = ICONE_KIND[item?.kind] || Inbox;
            return (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 shrink-0 rounded-lg border border-white/10 bg-black/25 p-1.5 text-gray-400">
                  <Icon size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-white">{item.title}</span>
                    <span className="shrink-0 text-[11px] text-gray-500">{tempoRelativo(item.timestamp)}</span>
                  </div>
                  {item.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-400">{item.description}</p>
                  ) : null}
                </div>
                {item.kind ? (
                  <span className="hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-400 sm:block">
                    {item.kind}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// Pendencias e notificacoes. Os numeros vem de cada painel (nada e inventado
// aqui); quando o item tem `para`, vira atalho para uma rota existente.
export const PendenciasPainel = ({
  itens = [],
  notificacoes = [],
  titulo = 'Pendências e avisos',
  descricao = '',
  maximo = 4
}) => {
  const navigate = useNavigate();
  const lista = (Array.isArray(itens) ? itens : []).filter((i) => Number(i.valor) > 0);
  const avisos = (Array.isArray(notificacoes) ? notificacoes : [])
    .filter((n) => !n?.read)
    .slice(0, maximo);

  if (!lista.length && !avisos.length) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{titulo}</h2>
        <p className="mt-3 text-sm text-gray-500">Nada pendente no momento. Bom trabalho.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gray-300">{titulo}</h2>
        {descricao ? <p className="mt-1 text-xs text-gray-500">{descricao}</p> : null}
      </div>

      {lista.length ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {lista.map((item) => {
            const urgente = Number(item.valor) > 0 && item.tom !== 'neutro';
            const conteudo = (
              <>
                <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.12em] text-gray-400">
                  {item.rotulo}
                </span>
                <span
                  className={`mt-1 block text-xl font-extrabold leading-none ${
                    urgente ? 'text-beatwap-gold' : 'text-white'
                  }`}
                >
                  {item.valor}
                </span>
                {item.dica ? <span className="mt-1 block text-[11px] leading-snug text-gray-500">{item.dica}</span> : null}
              </>
            );
            return item.para ? (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.para)}
                className="rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-beatwap-gold/35 hover:bg-beatwap-gold/[0.06]"
              >
                {conteudo}
              </button>
            ) : (
              <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                {conteudo}
              </div>
            );
          })}
        </div>
      ) : null}

      {avisos.length ? (
        <ul className="mt-4 divide-y divide-white/[0.07] border-t border-white/[0.07]">
          {avisos.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 shrink-0 rounded-lg border border-beatwap-gold/25 bg-beatwap-gold/10 p-1.5 text-beatwap-gold">
                <Bell size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {n.title || 'Notificação'}
                </span>
                {n.message ? (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-400">{n.message}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[11px] text-gray-500">
                {tempoRelativo(n.created_at || n.date)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};

export default AtividadeRecente;
