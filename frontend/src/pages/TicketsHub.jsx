import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronRight, MapPin, Search, Sparkles, Ticket } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Header from '../components/landing/Header';

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

function formatShortDate(value) {
  try {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  } catch {
    return String(value || '');
  }
}

function formatCurrencyFromCents(value) {
  return (Number(value || 0) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function TicketsHub() {
  const { profile } = useAuth() || {};
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCity, setActiveCity] = useState('all');

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

  const cityOptions = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const city = String(event?.venue_city || '').trim();
      if (!city) return;
      map.set(city, (map.get(city) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 6)
      .map(([city, count]) => ({ city, count }));
  }, [events]);

  const filterDefinitions = useMemo(() => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const tomorrowStart = todayStart + (24 * 60 * 60 * 1000);
    const weekEnd = todayStart + (7 * 24 * 60 * 60 * 1000);
    return [
      { id: 'all', label: 'Todos', count: events.length },
      {
        id: 'trending',
        label: 'Em alta',
        count: events.filter((event) => Number(event?.totals?.sold || 0) > 0).length
      },
      {
        id: 'today',
        label: 'Hoje',
        count: events.filter((event) => {
          const time = new Date(event?.starts_at || 0).getTime();
          return Number.isFinite(time) && time >= todayStart && time < tomorrowStart;
        }).length
      },
      {
        id: 'week',
        label: 'Esta semana',
        count: events.filter((event) => {
          const time = new Date(event?.starts_at || 0).getTime();
          return Number.isFinite(time) && time >= todayStart && time < weekEnd;
        }).length
      },
      {
        id: 'last_tickets',
        label: 'Ultimos ingressos',
        count: events.filter((event) => {
          const available = Number(event?.totals?.available || 0);
          return available > 0 && available <= 20;
        }).length
      }
    ];
  }, [events]);

  const filtered = useMemo(() => {
    const term = String(search || '').trim().toLowerCase();
    const normalizedTerm = normalizeText(term);
    const now = Date.now();
    const todayStart = startOfDay(now);
    const tomorrowStart = todayStart + (24 * 60 * 60 * 1000);
    const weekEnd = todayStart + (7 * 24 * 60 * 60 * 1000);

    return events
      .filter((event) => {
        if (!normalizedTerm) return true;
        const haystack = normalizeText([
          event?.title,
          event?.subtitle,
          event?.venue_name,
          event?.venue_city
        ].join(' '));
        return haystack.includes(normalizedTerm);
      })
      .filter((event) => {
        if (activeCity === 'all') return true;
        return normalizeText(event?.venue_city) === normalizeText(activeCity);
      })
      .filter((event) => {
        if (activeFilter === 'all') return true;
        const time = new Date(event?.starts_at || 0).getTime();
        const available = Number(event?.totals?.available || 0);
        const sold = Number(event?.totals?.sold || 0);
        if (activeFilter === 'trending') return sold > 0;
        if (activeFilter === 'today') return Number.isFinite(time) && time >= todayStart && time < tomorrowStart;
        if (activeFilter === 'week') return Number.isFinite(time) && time >= todayStart && time < weekEnd;
        if (activeFilter === 'last_tickets') return available > 0 && available <= 20;
        return true;
      })
      .sort((a, b) => {
        const aTime = new Date(a?.starts_at || 0).getTime();
        const bTime = new Date(b?.starts_at || 0).getTime();
        const aScore = Number(a?.totals?.sold || 0) * 10 + Number(a?.totals?.available || 0);
        const bScore = Number(b?.totals?.sold || 0) * 10 + Number(b?.totals?.available || 0);
        if (aScore !== bScore) return bScore - aScore;
        return aTime - bTime;
      });
  }, [activeCity, activeFilter, events, search]);

  const featuredEvent = useMemo(() => filtered[0] || events[0] || null, [events, filtered]);

  const spotlightEvents = useMemo(
    () => filtered.slice(0, 10),
    [filtered]
  );

  const upcomingEvents = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(a?.starts_at || 0).getTime() - new Date(b?.starts_at || 0).getTime())
      .slice(0, 8);
  }, [filtered]);

  const canManage = String(profile?.cargo || '') === 'Produtor';
  const totalAvailable = useMemo(
    () => events.reduce((acc, event) => acc + Number(event?.totals?.available || 0), 0),
    [events]
  );
  const activeCitiesCount = cityOptions.length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.16),transparent_24%),linear-gradient(180deg,#050505,#090909_24%,#0d0d0d_100%)] text-white">
      <Header />
      <div className="px-4 pb-12 pt-28 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="rounded-[38px] border border-white/10 bg-[linear-gradient(135deg,rgba(245,197,66,0.12),rgba(255,255,255,0.04),rgba(0,0,0,0.48))] p-6 md:p-8 shadow-[0_25px_120px_rgba(0,0,0,0.4)]">
            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/25 bg-beatwap-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-beatwap-gold">
                  <Sparkles size={14} />
                  Descubra eventos
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
                    A vitrine de ingressos da BeatWap com cara de marketplace profissional
                  </h1>
                  <p className="max-w-3xl text-base text-gray-300 md:text-lg">
                    Busque shows, festas e experiencias em uma tela de descoberta mais forte, com destaque visual, filtros rapidos e compra publica sem login.
                  </p>
                </div>

                <div className="rounded-[30px] border border-white/10 bg-black/35 p-3 sm:p-4 md:p-5">
                  <div className="flex flex-col gap-3 md:gap-4 xl:flex-row xl:items-center">
                    <label className="flex min-h-[56px] w-full flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <Search size={18} className="text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Busque por nome do evento, cidade ou local"
                        className="w-full min-w-0 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                      />
                    </label>
                    {canManage ? (
                      <Link to="/admin/eventos" className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-beatwap-gold px-5 py-3 text-sm font-extrabold text-black md:w-auto md:self-start xl:self-auto">
                        Gerenciar meus eventos
                        <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <Link to="/" className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5 md:w-auto md:self-start xl:self-auto">
                        Voltar para Home
                      </Link>
                    )}
                  </div>

                  <div className="mt-4 -mx-1 overflow-x-auto pb-1 no-scrollbar sm:mx-0">
                    <div className="flex min-w-max gap-2 px-1 sm:flex-wrap sm:px-0">
                      {filterDefinitions.map((filter) => {
                      const active = activeFilter === filter.id;
                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setActiveFilter(filter.id)}
                          className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                            active
                              ? 'bg-beatwap-gold text-black'
                              : 'border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                          }`}
                        >
                          {filter.label} <span className={`${active ? 'text-black/70' : 'text-gray-400'}`}>({filter.count})</span>
                        </button>
                      );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Eventos</div>
                    <div className="mt-2 text-3xl font-extrabold">{events.length}</div>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Ingressos</div>
                    <div className="mt-2 text-3xl font-extrabold">{totalAvailable}</div>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Cidades</div>
                    <div className="mt-2 text-3xl font-extrabold">{activeCitiesCount}</div>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Em alta</div>
                    <div className="mt-2 text-3xl font-extrabold">{filterDefinitions.find((filter) => filter.id === 'trending')?.count || 0}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {featuredEvent ? (
                  <article className="overflow-hidden rounded-[34px] border border-white/10 bg-black/35 shadow-[0_16px_70px_rgba(0,0,0,0.35)]">
                    <div className="relative h-[260px] bg-[linear-gradient(135deg,rgba(245,197,66,0.18),rgba(255,255,255,0.02),rgba(0,0,0,0.45))]">
                      {featuredEvent.banner_url ? (
                        <img src={featuredEvent.banner_url} alt={featuredEvent.title} className="h-full w-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
                      <div className="absolute left-5 right-5 top-5 flex items-start justify-between gap-3">
                        <div className="rounded-full border border-beatwap-gold/25 bg-black/50 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-beatwap-gold">
                          Evento em destaque
                        </div>
                        <div className="rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-bold">
                          {formatCurrencyFromCents(featuredEvent.min_price_cents)}
                        </div>
                      </div>
                      <div className="absolute bottom-5 left-5 right-5">
                        <h2 className="text-2xl font-extrabold md:text-3xl">{featuredEvent.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-200">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5">
                            <CalendarDays size={14} />
                            {formatDate(featuredEvent.starts_at)}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5">
                            <MapPin size={14} />
                            {featuredEvent.venue_city || featuredEvent.venue_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-gray-300">
                        {featuredEvent.subtitle || featuredEvent.description || 'Evento pronto para compra publica com convite digital e check-in mobile.'}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-400">
                          {Number(featuredEvent?.totals?.available || 0)} ingressos disponiveis
                        </div>
                        <Link
                          to={`/ingressos/evento/${featuredEvent.slug}`}
                          className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-extrabold text-black"
                        >
                          Ver evento
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ) : (
                  <div className="rounded-[34px] border border-dashed border-white/15 bg-black/30 p-8 text-center text-gray-400">
                    Assim que os produtores publicarem eventos, a vitrine aparece aqui.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-beatwap-gold">Explore por cidade</div>
                <h2 className="mt-2 text-2xl font-extrabold">Encontre o que está rolando perto de você</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveCity('all')}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCity === 'all'
                    ? 'bg-beatwap-gold text-black'
                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                Todas as cidades
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {cityOptions.map(({ city, count }) => {
                const active = activeCity === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setActiveCity(city)}
                    className={`rounded-[24px] border px-4 py-3 text-left transition ${
                      active
                        ? 'border-beatwap-gold bg-beatwap-gold/10 text-white'
                        : 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold">{city}</div>
                    <div className="mt-1 text-xs text-gray-400">{count} evento{count > 1 ? 's' : ''}</div>
                  </button>
                );
              })}
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
              <div className="text-2xl font-extrabold">Nenhum evento encontrado com esse filtro</div>
              <p className="text-sm text-gray-400 max-w-xl mx-auto">
                Tente mudar a busca, escolher outra cidade ou voltar para todos os eventos publicados.
              </p>
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-beatwap-gold">Em destaque</div>
                    <h2 className="mt-2 text-2xl font-extrabold">Vitrine principal da BeatWap</h2>
                  </div>
                  <div className="text-sm text-gray-400">{filtered.length} resultados</div>
                </div>

                <div className="relative -mx-4 sm:-mx-6">
                  <div className="overflow-x-auto scroll-smooth whitespace-nowrap px-4 pb-3 no-scrollbar sm:px-6 snap-x snap-mandatory">
                    <div className="flex gap-4 sm:gap-5">
                      {spotlightEvents.map((event, index) => (
                        <article
                          key={event.id}
                          className={`group inline-flex snap-center whitespace-normal align-top transition-transform duration-300 ${
                            index === 0
                              ? 'w-[84vw] sm:w-[72vw] lg:w-[56vw] xl:w-[48vw]'
                              : 'w-[78vw] sm:w-[52vw] lg:w-[34vw] xl:w-[28vw]'
                          }`}
                        >
                          <div className="w-full overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.04] shadow-[0_20px_90px_rgba(0,0,0,0.28)]">
                            <div className="relative h-[320px] sm:h-[380px] lg:h-[440px] bg-[linear-gradient(135deg,rgba(245,197,66,0.18),rgba(255,255,255,0.02),rgba(0,0,0,0.45))]">
                              {event.banner_url ? <img src={event.banner_url} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : null}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                              <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                                <div className="rounded-2xl border border-white/10 bg-black/55 px-3 py-2 text-center backdrop-blur-sm">
                                  <div className="text-[10px] uppercase tracking-[0.18em] text-gray-400">Data</div>
                                  <div className="mt-1 text-base font-extrabold text-white sm:text-lg">{formatShortDate(event.starts_at)}</div>
                                </div>
                                <div className="rounded-full border border-beatwap-gold/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-beatwap-gold backdrop-blur-sm">
                                  Em destaque
                                </div>
                              </div>

                              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                                <div className="rounded-[28px] border border-white/10 bg-black/45 p-4 backdrop-blur-md sm:p-5">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <h3 className="line-clamp-2 text-xl font-extrabold sm:text-2xl">{event.title}</h3>
                                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                                        <MapPin size={15} className="shrink-0" />
                                        <span className="line-clamp-1">
                                          {event.venue_name}{event.venue_city ? `, ${event.venue_city}` : ''}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="shrink-0 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-sm font-bold text-beatwap-gold">
                                      {formatCurrencyFromCents(event.min_price_cents)}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                      {Number(event?.totals?.available || 0)} disponiveis
                                    </span>
                                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                      {Number(event?.totals?.sold || 0)} emitidos
                                    </span>
                                  </div>

                                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-gray-400">
                                      {event.subtitle || 'Compra publica, convite digital automatico e check-in mobile.'}
                                    </div>
                                    <Link
                                      to={`/ingressos/evento/${event.slug}`}
                                      className="inline-flex items-center justify-center gap-2 rounded-full bg-beatwap-gold px-4 py-2.5 text-sm font-bold text-black"
                                    >
                                      Comprar
                                      <ArrowRight size={15} />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-beatwap-gold">Agenda</div>
                  <h2 className="mt-2 text-2xl font-extrabold">Todos os eventos publicados</h2>
                </div>

                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <article key={event.id} className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_12px_50px_rgba(0,0,0,0.22)]">
                      <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
                        <div className="relative min-h-[220px] bg-[linear-gradient(135deg,rgba(245,197,66,0.18),rgba(255,255,255,0.02),rgba(0,0,0,0.45))]">
                          {event.banner_url ? <img src={event.banner_url} alt={event.title} className="h-full w-full object-cover" /> : null}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                          <div className="absolute left-4 top-4 rounded-[22px] border border-white/10 bg-black/50 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.16em] text-gray-400">Quando</div>
                            <div className="mt-1 text-lg font-extrabold">{formatShortDate(event.starts_at)}</div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-5 p-5 md:p-6">
                          <div className="space-y-4">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                              <div className="space-y-2">
                                <h3 className="text-2xl font-extrabold">{event.title}</h3>
                                {event.subtitle ? <p className="text-sm text-gray-300">{event.subtitle}</p> : null}
                              </div>
                              <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm font-bold text-beatwap-gold">
                                {formatCurrencyFromCents(event.min_price_cents)}
                              </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 text-sm">
                              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <CalendarDays size={16} />
                                  Data
                                </div>
                                <div className="mt-2 font-semibold text-white">{formatDate(event.starts_at)}</div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                <div className="flex items-center gap-2 text-gray-400">
                                  <MapPin size={16} />
                                  Local
                                </div>
                                <div className="mt-2 font-semibold text-white">{event.venue_name}</div>
                                <div className="mt-1 text-xs text-gray-400">{event.venue_city || 'Cidade a confirmar'}</div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                                <div className="text-gray-400">Disponibilidade</div>
                                <div className="mt-2 font-semibold text-white">{Number(event?.totals?.available || 0)} ingressos livres</div>
                                <div className="mt-1 text-xs text-gray-400">{Number(event?.totals?.sold || 0)} convites emitidos</div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-gray-400">
                              {event.description || 'Compra pública, emissão automática do convite e leitura por QR na entrada.'}
                            </div>
                            <Link
                              to={`/ingressos/evento/${event.slug}`}
                              className="inline-flex items-center justify-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-extrabold text-black"
                            >
                              Ver evento e comprar
                              <ArrowRight size={16} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:p-7">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Descoberta mais forte',
                  helper: 'A home de ingressos agora funciona como uma vitrine de descoberta, com busca, filtros e eventos em destaque.'
                },
                {
                  title: 'Compra pública',
                  helper: 'O público entra, escolhe o lote e compra sem depender de login, no mesmo fluxo do ticketing BeatWap.'
                },
                {
                  title: 'Identidade BeatWap',
                  helper: 'Mantive o preto, dourado e o clima premium do site, sem descaracterizar a plataforma.'
                }
              ].map((item) => (
                <div key={item.title} className="rounded-[28px] border border-white/10 bg-black/25 p-5">
                  <div className="text-lg font-extrabold">{item.title}</div>
                  <div className="mt-2 text-sm text-gray-400">{item.helper}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
