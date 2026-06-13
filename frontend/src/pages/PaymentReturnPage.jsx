import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, ExternalLink, Ticket, XCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

function statusCopy(status) {
  const value = String(status || '').toLowerCase().trim();
  if (value === 'approved') return 'Pagamento aprovado';
  if (value === 'pending' || value === 'in_process' || value === 'preference_created') return 'Pagamento em análise';
  if (value === 'rejected' || value === 'cancelled' || value === 'fraud') return 'Pagamento não aprovado';
  return 'Aguardando confirmação';
}

export default function PaymentReturnPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth() || {};
  const [statusText, setStatusText] = useState('Aguardando confirmação de pagamento...');
  const [order, setOrder] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [kind, setKind] = useState('');

  const extRef = useMemo(() => {
    const params = new URLSearchParams(String(location.search || ''));
    return String(
      params.get('external_reference') ||
      params.get('externalReference') ||
      params.get('external-ref') ||
      ''
    ).trim();
  }, [location.search]);

  useEffect(() => {
    let stopped = false;
    let intervalId = null;

    const run = async () => {
      if (!extRef) {
        setErrorText('Pedido não encontrado.');
        return;
      }

      const poll = async () => {
        try {
          const ticketPayload = await apiClient.get(`/ticketing/orders/${encodeURIComponent(extRef)}`, { cache: false }).catch(() => null);
          if (ticketPayload?.order) {
            if (stopped) return;
            setKind('ticket');
            setOrder(ticketPayload.order);
            setTickets(Array.isArray(ticketPayload.tickets) ? ticketPayload.tickets : []);
            setStatusText(statusCopy(ticketPayload.order.status));
            setErrorText('');
            const approved = String(ticketPayload.order.status || '').toLowerCase() === 'approved';
            if (approved && Array.isArray(ticketPayload.tickets) && ticketPayload.tickets.length) {
              if (intervalId) window.clearInterval(intervalId);
            }
            return;
          }

          if (!profile) {
            if (!stopped) {
              setKind('generic');
              setStatusText('Se esta compra foi de um plano, faça login para acompanhar a liberação.');
            }
            return;
          }

          const data = await apiClient.get(`/payment/orders/${encodeURIComponent(extRef)}`, { cache: false });
          const nextOrder = data?.order || null;
          if (stopped) return;
          setKind('account');
          setOrder(nextOrder);
          setStatusText(statusCopy(nextOrder?.status));
          setErrorText('');

          const approved = String(nextOrder?.status || '').toLowerCase() === 'approved' && nextOrder?.access_granted_at;
          if (approved) {
            try {
              if (refreshProfile) await refreshProfile();
            } catch {
              void 0;
            }
            if (intervalId) window.clearInterval(intervalId);
            navigate('/dashboard/profile', { replace: true });
          }
        } catch (error) {
          if (!stopped) {
            setErrorText(error?.message || 'Nao foi possivel consultar o pagamento agora.');
          }
        }
      };

      await poll();
      intervalId = window.setInterval(poll, 3500);
    };

    run();
    return () => {
      stopped = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [extRef, navigate, profile, refreshProfile]);

  const normalizedStatus = String(order?.status || '').toLowerCase().trim();
  const isApproved = normalizedStatus === 'approved';
  const isRejected = ['rejected', 'cancelled', 'fraud'].includes(normalizedStatus);
  const StatusIcon = isApproved ? CheckCircle2 : isRejected ? XCircle : Clock3;
  const statusColor = isApproved ? 'text-emerald-400' : isRejected ? 'text-red-400' : 'text-yellow-300';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.14),transparent_35%),linear-gradient(180deg,#050505,#0d0d0d)] text-white px-4 py-10 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/25 bg-beatwap-gold/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-beatwap-gold">
                Confirmacao de pagamento
              </div>
              <div className="flex items-center gap-3">
                <StatusIcon size={28} className={statusColor} />
                <h1 className="text-3xl md:text-4xl font-extrabold">{statusText}</h1>
              </div>
              <p className="text-sm md:text-base text-gray-300">
                O BeatWap confirma a compra pelo webhook antes de liberar plano ou emitir ingresso digital.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 px-5 py-4 min-w-[260px]">
              <div className="text-xs uppercase tracking-[0.22em] text-gray-400">Pedido</div>
              <div className="mt-2 text-sm text-white break-all">{extRef || 'Nao informado'}</div>
              {order?.amount_cents ? (
                <div className="mt-3 text-sm text-gray-300">
                  Valor: {(Number(order.amount_cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: order.currency || 'BRL' })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {kind === 'ticket' && (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Ticket size={22} className="text-beatwap-gold" />
              <div>
                <div className="text-xl font-extrabold">{order?.event_title || 'Ingressos emitidos'}</div>
                <div className="text-sm text-gray-400">
                  Assim que o pagamento aprova, cada ingresso ganha QR unico para check-in na portaria.
                </div>
              </div>
            </div>

            {tickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-lg">{ticket.ticket_type_name}</div>
                        <div className="text-sm text-gray-400">Codigo: {ticket.invite_code}</div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-bold ${ticket.status === 'checked_in' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-beatwap-gold/15 text-beatwap-gold'}`}>
                        {ticket.status === 'checked_in' ? 'Usado' : 'Valido'}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Link
                        to={`/ingressos/convite/${ticket.qr_token}`}
                        className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-4 py-2 text-sm font-bold text-black"
                      >
                        Abrir convite
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-black/20 p-5 text-sm text-gray-300">
                O pagamento ainda esta finalizando. Recarregue em alguns segundos se os ingressos nao aparecerem.
              </div>
            )}
          </div>
        )}

        {kind === 'generic' && (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-sm text-gray-300">
            Se esta compra foi de ingressos, aguarde alguns instantes nesta pagina. Se foi uma compra do painel, entre na sua conta para concluir a liberacao.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link to="/ingressos" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Ver eventos com ingressos
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Voltar para Home
          </Link>
          {tickets[0] ? (
            <Link
              to={`/ingressos/convite/${tickets[0].qr_token}`}
              className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black"
            >
              Meu primeiro ingresso
              <ExternalLink size={16} />
            </Link>
          ) : null}
        </div>

        {errorText ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorText}
          </div>
        ) : null}
      </div>
    </div>
  );
}
