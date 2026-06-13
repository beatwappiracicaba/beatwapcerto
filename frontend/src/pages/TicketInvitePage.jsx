import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Copy, MapPin, QrCode, Ticket, XCircle } from 'lucide-react';
import { apiClient } from '../services/apiClient';

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value || '');
  }
}

export default function TicketInvitePage() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get(`/ticketing/invites/${encodeURIComponent(token)}`, { cache: false });
        if (mounted) {
          setInvite(data || null);
          setErrorText('');
        }
      } catch (error) {
        if (mounted) {
          setInvite(null);
          setErrorText(error?.message || 'Nao foi possivel carregar o convite.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const qrImageUrl = useMemo(() => {
    const value = String(invite?.qr_value || '').trim();
    if (!value) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(value)}`;
  }, [invite?.qr_value]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(String(invite?.invite_code || invite?.qr_token || ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-gray-300">Carregando convite...</div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-14">
        <div className="max-w-3xl mx-auto rounded-[32px] border border-white/10 bg-white/[0.04] p-8 space-y-4">
          <div className="text-3xl font-extrabold">Convite nao encontrado</div>
          <div className="text-sm text-gray-400">{errorText || 'Verifique o codigo informado.'}</div>
          <Link to="/ingressos" className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Voltar para ingressos
          </Link>
        </div>
      </div>
    );
  }

  const used = String(invite.status || '').toLowerCase() === 'checked_in';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.12),transparent_34%),linear-gradient(180deg,#050505,#0d0d0d)] text-white px-4 py-10 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="rounded-[38px] border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="relative h-48 bg-[linear-gradient(135deg,rgba(245,197,66,0.22),rgba(255,255,255,0.02),rgba(0,0,0,0.52))]">
            {invite?.event?.banner_url ? (
              <img src={invite.event.banner_url} alt={invite.event.title} className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <div className="absolute left-6 right-6 bottom-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-beatwap-gold">Convite digital</div>
                <div className="text-3xl font-extrabold mt-2">{invite.event?.title || 'Evento BeatWap'}</div>
                {invite.event?.subtitle ? <div className="text-sm text-gray-300 mt-1">{invite.event.subtitle}</div> : null}
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-bold ${used ? 'bg-red-500/15 text-red-200' : 'bg-emerald-500/15 text-emerald-200'}`}>
                {used ? 'Ingresso ja utilizado' : 'Ingresso valido'}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-0">
            <div className="border-r border-white/10 bg-black/35 p-6 flex flex-col items-center justify-center gap-4">
              <div className="rounded-[32px] bg-white p-4">
                {qrImageUrl ? (
                  <img src={qrImageUrl} alt="QR Code do ingresso" className="w-64 h-64 object-contain" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-black">
                    <QrCode size={64} />
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 text-center max-w-xs">
                Apresente este QR Code na entrada. Se o celular estiver sem internet, use o codigo abaixo.
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                <Copy size={16} />
                {copied ? 'Codigo copiado' : 'Copiar codigo'}
              </button>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center gap-2 text-gray-400"><Ticket size={16} /> Lote</div>
                  <div className="mt-2 font-bold">{invite.ticket_type_name}</div>
                  <div className="text-sm text-gray-400 mt-1">Codigo: {invite.invite_code}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center gap-2 text-gray-400"><CalendarDays size={16} /> Data</div>
                  <div className="mt-2 font-bold">{formatDate(invite.event?.starts_at)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4 md:col-span-2">
                  <div className="flex items-center gap-2 text-gray-400"><MapPin size={16} /> Local</div>
                  <div className="mt-2 font-bold">{invite.event?.venue_name}</div>
                  <div className="text-sm text-gray-400 mt-1">{invite.event?.venue_address || invite.event?.venue_city || 'Endereco a confirmar'}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-gray-400">Titular do convite</div>
                <div className="mt-2 text-2xl font-extrabold">{invite.buyer_name}</div>
                <div className="text-sm text-gray-400 mt-1">{invite.buyer_email}</div>
                {invite.buyer_phone ? <div className="text-sm text-gray-500 mt-1">{invite.buyer_phone}</div> : null}
              </div>

              <div className={`rounded-3xl border p-5 ${used ? 'border-red-500/20 bg-red-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
                <div className="flex items-start gap-3">
                  {used ? <XCircle size={20} className="text-red-300 mt-0.5" /> : <CheckCircle2 size={20} className="text-emerald-300 mt-0.5" />}
                  <div>
                    <div className="font-extrabold">{used ? 'Check-in ja realizado' : 'Convite pronto para uso'}</div>
                    <div className="text-sm mt-1 text-gray-200">
                      {used
                        ? `Este ingresso ja passou pela portaria em ${formatDate(invite.checked_in_at)}.`
                        : 'Na entrada, a equipe do evento pode validar este QR Code pelo celular em tempo real.'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/ingressos" className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
                  Ver outros eventos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
