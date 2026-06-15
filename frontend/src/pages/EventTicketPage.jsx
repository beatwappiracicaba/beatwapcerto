import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, MapPin, Music, Pause, Play, Smartphone, Ticket, Wallet } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useGlobalAudioPlayer } from '../context/GlobalAudioPlayerContext';

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

export default function EventTicketPage() {
  const { slug } = useParams();
  const { currentTrackId, isPlaying, toggleTrack } = useGlobalAudioPlayer();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderLookup, setOrderLookup] = useState('');
  const [showcaseLoading, setShowcaseLoading] = useState(false);
  const [showcase, setShowcase] = useState([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get(`/ticketing/events/${encodeURIComponent(slug)}`, { cache: false });
        if (!mounted) return;
        setEvent(data || null);
        const firstAvailable = (Array.isArray(data?.ticket_types) ? data.ticket_types : []).find((ticket) => Number(ticket?.available || 0) > 0);
        setSelectedTypeId(firstAvailable?.id || '');
      } catch (error) {
        if (mounted) {
          setEvent(null);
          setErrorText(error?.message || 'Nao foi possivel carregar o evento.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    let alive = true;
    if (!event) return () => { alive = false; };
    (async () => {
      try {
        setShowcaseLoading(true);
        const boosted = await apiClient.get('/boosted-profiles', { cache: true, cacheTtlMs: 15000 });
        const list = Array.isArray(boosted) ? boosted : [];
        const selected = list.slice(0, 3).map((p) => ({
          id: String(p?.id || '').trim(),
          nome: p?.nome || p?.nome_completo_razao_social || p?.email || 'Artista',
          avatar_url: p?.avatar_url || null
        })).filter((p) => p.id);

        const enriched = await Promise.all(selected.map(async (p) => {
          try {
            const musics = await apiClient.get(`/profiles/${encodeURIComponent(p.id)}/musics`, { cache: true, cacheTtlMs: 15000 });
            const list = Array.isArray(musics) ? musics : [];
            const first = list.find((m) => String(m?.status || '') === 'aprovado' && String(m?.preview_url || m?.audio_url || '').trim());
            if (!first) return { ...p, track: null };
            const src = String(first?.preview_url || first?.audio_url || '').trim();
            return {
              ...p,
              track: {
                id: `event-showcase:${p.id}:${first.id}`,
                src,
                title: first?.titulo || 'Música',
                artist: first?.nome_artista || p.nome || 'Artista',
                coverUrl: String(first?.cover_url || '').trim(),
                full: true,
                onPlaybackEvent: ({ durationSeconds }) => {
                  apiClient.post('/analytics', {
                    type: 'music_play',
                    music_id: first?.id,
                    artist_id: p.id,
                    duration_seconds: durationSeconds,
                    ip_hash: 'event_showcase'
                  }).catch(() => void 0);
                }
              }
            };
          } catch {
            return { ...p, track: null };
          }
        }));

        if (!alive) return;
        setShowcase(enriched.filter((p) => p.track));
      } catch {
        if (!alive) return;
        setShowcase([]);
      } finally {
        if (alive) setShowcaseLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [event]);

  const selectedType = useMemo(
    () => (Array.isArray(event?.ticket_types) ? event.ticket_types.find((ticket) => String(ticket.id) === String(selectedTypeId)) : null),
    [event, selectedTypeId]
  );

  const totalAmount = useMemo(
    () => (Number(selectedType?.price_cents || 0) * Number(quantity || 0)) / 100,
    [selectedType, quantity]
  );

  const submitOrder = async () => {
    if (!selectedType) {
      setErrorText('Selecione um lote disponivel.');
      return;
    }
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setErrorText('Informe nome e email para emitir o convite.');
      return;
    }

    try {
      setCreatingOrder(true);
      setErrorText('');
      const payload = await apiClient.post(`/ticketing/events/${encodeURIComponent(slug)}/checkout`, {
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        ticket_type_id: selectedType.id,
        quantity
      });
      if (payload?.checkout_url) {
        window.location.href = payload.checkout_url;
        return;
      }
      setErrorText('Nao foi possivel abrir o checkout.');
    } catch (error) {
      setErrorText(error?.message || 'Erro ao criar pedido.');
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-gray-300">Carregando evento...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white px-6 py-14">
        <div className="max-w-3xl mx-auto rounded-[32px] border border-white/10 bg-white/[0.04] p-8 space-y-4">
          <div className="text-3xl font-extrabold">Evento nao encontrado</div>
          <div className="text-sm text-gray-400">{errorText || 'Este evento pode nao estar publicado.'}</div>
          <Link to="/ingressos" className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
            Voltar para ingressos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,197,66,0.12),transparent_34%),linear-gradient(180deg,#050505,#0b0b0b)] text-white px-4 py-10 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <section className="rounded-[36px] overflow-hidden border border-white/10 bg-white/[0.04]">
          <div className="relative h-[320px] md:h-[380px] bg-[linear-gradient(135deg,rgba(245,197,66,0.18),rgba(255,255,255,0.02),rgba(0,0,0,0.58))]">
            {event.banner_url ? <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
            <div className="absolute left-6 right-6 bottom-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-beatwap-gold/25 bg-beatwap-gold/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-beatwap-gold">
                  Compra publica sem login
                </div>
                <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">{event.title}</h1>
                {event.subtitle ? <p className="text-lg text-gray-300 mt-3">{event.subtitle}</p> : null}
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/45 px-5 py-4 min-w-[280px]">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-400">A partir de</div>
                <div className="mt-2 text-3xl font-extrabold">
                  {(Number(event.min_price_cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {Number(event?.totals?.available || 0)} ingressos disponiveis
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center gap-2 text-gray-400"><CalendarDays size={16} /> Data</div>
                  <div className="mt-2 font-bold">{formatDate(event.starts_at)}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center gap-2 text-gray-400"><MapPin size={16} /> Local</div>
                  <div className="mt-2 font-bold">{event.venue_name}</div>
                  <div className="text-sm text-gray-400 mt-1">{event.venue_address || event.venue_city || 'Endereco a confirmar'}</div>
                </div>
              </div>
              {event.description ? <p className="text-sm text-gray-300 mt-5 whitespace-pre-wrap">{event.description}</p> : null}
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-beatwap-gold">Lotes disponiveis</div>
                <h2 className="text-2xl font-extrabold mt-2">Escolha seu ingresso</h2>
              </div>

              <div className="space-y-3">
                {(event.ticket_types || []).map((ticket) => {
                  const active = String(ticket.id) === String(selectedTypeId);
                  const soldOut = Number(ticket.available || 0) <= 0;
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => setSelectedTypeId(ticket.id)}
                      className={`w-full rounded-[26px] border p-5 text-left transition ${active ? 'border-beatwap-gold bg-beatwap-gold/10' : 'border-white/10 bg-black/25'} ${soldOut ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/25'}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="text-xl font-extrabold">{ticket.name}</div>
                          {ticket.description ? <div className="text-sm text-gray-400 mt-1">{ticket.description}</div> : null}
                          <div className="flex flex-wrap gap-3 mt-3 text-xs">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Disponiveis: {ticket.available}</span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Reservados: {ticket.reserved}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-extrabold">
                            {(Number(ticket.price_cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                          <div className={`text-xs font-bold mt-2 ${soldOut ? 'text-red-300' : 'text-emerald-300'}`}>
                            {soldOut ? 'Esgotado' : 'Pronto para compra'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 space-y-5 sticky top-6">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-beatwap-gold">Checkout</div>
                <h2 className="text-2xl font-extrabold mt-2">Finalize sua compra</h2>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                  placeholder="Nome do comprador"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-beatwap-gold/45"
                />
                <input
                  type="email"
                  value={buyerEmail}
                  onChange={(event) => setBuyerEmail(event.target.value)}
                  placeholder="Email para receber o convite"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-beatwap-gold/45"
                />
                <input
                  type="text"
                  value={buyerPhone}
                  onChange={(event) => setBuyerPhone(event.target.value)}
                  placeholder="WhatsApp (opcional)"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none focus:border-beatwap-gold/45"
                />
              </div>

              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Lote</div>
                  <div className="mt-2 font-bold">{selectedType?.name || 'Selecione um lote'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-400">Qtd</div>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, Number(selectedType?.available || 1))}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Math.min(Number(selectedType?.available || 1), Number(event.target.value || 1))))}
                    className="mt-2 w-full bg-transparent font-bold outline-none"
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/35 p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Ingresso</span>
                  <span>{selectedType ? (Number(selectedType.price_cents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Quantidade</span>
                  <span>{quantity}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-extrabold">
                  <span>Total</span>
                  <span>{totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={submitOrder}
                disabled={creatingOrder || !selectedType}
                className="w-full rounded-full bg-beatwap-gold px-5 py-4 text-sm font-extrabold text-black disabled:opacity-60"
              >
                {creatingOrder ? 'Abrindo checkout...' : 'Ir para pagamento'}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Wallet size={18} className="text-beatwap-gold" />
                  <div className="mt-2 font-bold">Compra rapida</div>
                  <div className="text-gray-400 mt-1">Sem login para o publico.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Ticket size={18} className="text-beatwap-gold" />
                  <div className="mt-2 font-bold">Convite automatico</div>
                  <div className="text-gray-400 mt-1">QR unico apos aprovacao.</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Smartphone size={18} className="text-beatwap-gold" />
                  <div className="mt-2 font-bold">Entrada mobile</div>
                  <div className="text-gray-400 mt-1">Leitura na portaria.</div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/25 p-4 space-y-3">
                <div className="text-sm font-bold">Ja comprou?</div>
                <input
                  type="text"
                  value={orderLookup}
                  onChange={(event) => setOrderLookup(event.target.value)}
                  placeholder="Cole o codigo do pedido ou convite"
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                />
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={orderLookup ? `/pagamento/retorno?external_reference=${encodeURIComponent(orderLookup)}` : '#'}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${orderLookup ? 'bg-white text-black' : 'bg-white/10 text-gray-500 pointer-events-none'}`}
                  >
                    Consultar pedido
                  </Link>
                  <Link
                    to={orderLookup ? `/ingressos/convite/${encodeURIComponent(orderLookup)}` : '#'}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${orderLookup ? 'border border-white/15 text-white' : 'border border-white/10 text-gray-500 pointer-events-none'}`}
                  >
                    Abrir convite
                  </Link>
                </div>
              </div>

              {errorText ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorText}
                </div>
              ) : null}
            </section>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              'Escolha o lote e pague sem precisar criar conta.',
              'Pagamento aprovado emite o convite com QR exclusivo.',
              'Na entrada, a equipe valida pelo celular em tempo real.'
            ].map((step, index) => (
              <div key={step} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-beatwap-gold text-sm font-extrabold text-black">
                  {index + 1}
                </div>
                <div className="mt-4 text-base font-bold">{step}</div>
                <div className="mt-2 text-sm text-gray-400 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-beatwap-gold" />
                  Fluxo pronto para evento real
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-beatwap-gold">Lineup tocável</div>
              <h2 className="text-2xl font-extrabold mt-2">Artistas em alta na BeatWap</h2>
              <div className="text-sm text-gray-400 mt-1">Entre no clima do evento ouvindo agora.</div>
            </div>
          </div>

          {showcaseLoading && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-gray-400">
              Carregando artistas...
            </div>
          )}

          {!showcaseLoading && showcase.length === 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-gray-400">
              Em breve: lineup do evento com músicas para ouvir aqui mesmo.
            </div>
          )}

          {!showcaseLoading && showcase.length > 0 && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {showcase.map((p) => {
                const t = p.track;
                const active = currentTrackId === t.id && isPlaying;
                return (
                  <div key={p.id} className="rounded-3xl border border-white/10 bg-black/25 overflow-hidden">
                    <div className="p-5 flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                        {t.coverUrl ? (
                          <img src={t.coverUrl} alt={t.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music size={18} className="text-beatwap-gold" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-white truncate">{p.nome}</div>
                        <div className="text-xs text-gray-400 truncate">{t.title}</div>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTrack(t)}
                            className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-4 py-2 text-xs font-extrabold text-black hover:bg-white transition"
                          >
                            {active ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                            {active ? 'Pausar' : 'Ouvir'}
                          </button>
                          <Link
                            to={`/profile/${encodeURIComponent(p.id)}`}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
