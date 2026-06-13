import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Search, Ticket, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(value || '');
  }
}

export default function TicketsHub() {
  const { profile } = useAuth() || {};
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get('/ticketing/events', { cache: false });
        if (mounted) setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = String(search || '').trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => {
      const haystack = [
        event?.title,
        event?.subtitle,
        event?.venue_name,
        event?.venue_city
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [events, search]);

  const canManage = String(profile?.cargo || '') === 'Produtor';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.14),transparent_35%),linear-gradient(180deg,#050505,#0b0b0b)] text-white px-4 py-10 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 md:p-10 shadow-[0_18px_100px_rgba(0,0,0,0.38)]">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/25 bg-beatwap-gold/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-beatwap-gold">
                Ticketing BeatWap
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                  Eventos com compra publica, convite digital e check-in mobile
                </h1>
                <p className="text-base text-gray-300 mt-4 max-w-3xl">
                  O produtor cria o evento, o publico compra sem login e cada ingresso aprovado vira um convite com QR unico para leitura na portaria.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {canManage ? (
                  <Link to="/admin/eventos" className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black">
                    Gerenciar meus eventos
                    <ArrowRight size={16} />
                  </Link>
                ) : null}
                <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
                  Voltar para Home
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-black/35 p-5 md:p-6 space-y-4">
              <div className="text-xs uppercase tracking-[0.22em] text-gray-400">Buscar evento</div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome do show, local ou cidade"
                  className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Eventos</div>
                  <div className="mt-2 text-2xl font-extrabold">{events.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Ingressos</div>
                  <div className="mt-2 text-2xl font-extrabold">{events.reduce((acc, event) => acc + Number(event?.totals?.available || 0), 0)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Ativos</div>
                  <div className="mt-2 text-2xl font-extrabold">{events.filter((event) => Number(event?.totals?.available || 0) > 0).length}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-gray-300">
            Carregando eventos...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-beatwap-gold/10 text-beatwap-gold">
              <Ticket size={28} />
            </div>
            <div className="text-2xl font-extrabold">Nenhum evento publicado no momento</div>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              Assim que um produtor publicar o primeiro evento, ele aparece aqui com lotes, compra e convite digital.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((event) => (
              <article key={event.id} className="rounded-[32px] overflow-hidden border border-white/10 bg-white/[0.04] shadow-[0_18px_80px_rgba(0,0,0,0.28)]">
                <div className="h-56 bg-[linear-gradient(135deg,rgba(245,197,66,0.18),rgba(255,255,255,0.02),rgba(0,0,0,0.45))] relative">
                  {event.banner_url ? (
                    <img src={event.banner_url} alt={event.title} className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                  <div className="absolute left-5 right-5 bottom-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-beatwap-gold">Evento publicado</div>
                      <div className="text-2xl font-extrabold">{event.title}</div>
                      {event.subtitle ? <div className="text-sm text-gray-300 mt-1">{event.subtitle}</div> : null}
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs font-bold">
                      A partir de {(Number(event.min_price_cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <CalendarDays size={16} />
                        Data
                      </div>
                      <div className="mt-2 font-semibold">{formatDate(event.starts_at)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <MapPin size={16} />
                        Local
                      </div>
                      <div className="mt-2 font-semibold">{event.venue_name}{event.venue_city ? ` - ${event.venue_city}` : ''}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                      Disponiveis: <span className="font-bold text-white">{Number(event?.totals?.available || 0)}</span>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                      Emitidos: <span className="font-bold text-white">{Number(event?.totals?.sold || 0)}</span>
                    </div>
                  </div>

                  <Link
                    to={`/ingressos/evento/${event.slug}`}
                    className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black"
                  >
                    Ver evento e comprar
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
