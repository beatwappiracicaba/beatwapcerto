import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ExternalLink, Plus, QrCode, Save, Ticket, Users } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PanelHero } from '../components/ui/PanelHero';
import { PanelSection } from '../components/ui/PanelSection';
import { PremiumMetricCard } from '../components/ui/PremiumMetricCard';
import { apiClient } from '../services/apiClient';
import { useToast } from '../context/ToastContext';

const emptyTicketType = () => ({
  id: '',
  name: '',
  description: '',
  price: '',
  quantity: ''
});

const emptyForm = () => ({
  id: '',
  title: '',
  subtitle: '',
  description: '',
  banner_url: '',
  venue_name: '',
  venue_city: '',
  venue_address: '',
  starts_at: '',
  sales_ends_at: '',
  contact_phone: '',
  published: true,
  ticket_types: [emptyTicketType()]
});

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function prepareFormFromEvent(event) {
  return {
    id: event?.id || '',
    title: event?.title || '',
    subtitle: event?.subtitle || '',
    description: event?.description || '',
    banner_url: event?.banner_url || '',
    venue_name: event?.venue_name || '',
    venue_city: event?.venue_city || '',
    venue_address: event?.venue_address || '',
    starts_at: formatDateTime(event?.starts_at),
    sales_ends_at: formatDateTime(event?.sales_ends_at),
    contact_phone: event?.contact_phone || '',
    published: event?.published !== false,
    ticket_types: Array.isArray(event?.ticket_types) && event.ticket_types.length
      ? event.ticket_types.map((ticket) => ({
          id: ticket.id || '',
          name: ticket.name || '',
          description: ticket.description || '',
          price: Number(ticket.price_cents || 0) / 100,
          quantity: ticket.quantity || ''
        }))
      : [emptyTicketType()]
  };
}

export default function AdminEvents() {
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/ticketing/manage/events', { cache: false });
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(error?.message || 'Falha ao carregar eventos', 'error');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const term = String(search || '').trim().toLowerCase();
    if (!term) return events;
    return events.filter((event) => {
      const haystack = [event?.title, event?.venue_name, event?.venue_city].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [events, search]);

  const metrics = useMemo(() => ({
    events: events.length,
    published: events.filter((event) => event.published).length,
    sold: events.reduce((acc, event) => acc + Number(event?.totals?.sold || 0), 0),
    available: events.reduce((acc, event) => acc + Number(event?.totals?.available || 0), 0)
  }), [events]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(false);
  };

  const updateTicketType = (index, key, value) => {
    setForm((prev) => {
      const next = Array.isArray(prev.ticket_types) ? [...prev.ticket_types] : [];
      next[index] = { ...(next[index] || emptyTicketType()), [key]: value };
      return { ...prev, ticket_types: next };
    });
  };

  const addTicketType = () => {
    setForm((prev) => ({ ...prev, ticket_types: [...prev.ticket_types, emptyTicketType()] }));
  };

  const removeTicketType = (index) => {
    setForm((prev) => ({
      ...prev,
      ticket_types: prev.ticket_types.filter((_, currentIndex) => currentIndex !== index)
    }));
  };

  const submitForm = async () => {
    const payload = {
      ...form,
      starts_at: form.starts_at,
      sales_ends_at: form.sales_ends_at || null,
      ticket_types: form.ticket_types.map((ticket) => ({
        id: ticket.id,
        name: ticket.name,
        description: ticket.description,
        price: Number(ticket.price || 0),
        quantity: Number(ticket.quantity || 0)
      }))
    };

    try {
      setSaving(true);
      if (editing && form.id) {
        await apiClient.put(`/ticketing/events/${encodeURIComponent(form.id)}`, payload);
        addToast('Evento atualizado com sucesso', 'success');
      } else {
        await apiClient.post('/ticketing/events', payload);
        addToast('Evento criado com sucesso', 'success');
      }
      resetForm();
      await loadEvents();
    } catch (error) {
      addToast(error?.message || 'Falha ao salvar evento', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PanelHero
          eyebrow="Ticketing"
          title="Eventos, lotes e check-in mobile"
          description="Cadastre shows com compra publica sem login, emita convites com QR apos aprovacao e valide tudo na portaria pelo celular."
          recommendation="Crie os lotes com quantidade real, publique o evento e use a tela da portaria no dia do show."
          badges={[
            { label: 'Eventos', value: metrics.events },
            { label: 'Emitidos', value: metrics.sold },
            { label: 'Disponiveis', value: metrics.available }
          ]}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar evento, cidade ou local"
          actions={(
            <>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                <Plus size={16} />
                Novo evento
              </button>
              <Link
                to="/admin/eventos/portaria"
                className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black"
              >
                <QrCode size={16} />
                Abrir portaria
              </Link>
            </>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <PremiumMetricCard title="Eventos criados" value={metrics.events} helper="Total de eventos no seu painel" icon={CalendarDays} />
          <PremiumMetricCard title="Eventos publicados" value={metrics.published} helper="Shows visiveis na vitrine publica" icon={Ticket} />
          <PremiumMetricCard title="Ingressos emitidos" value={metrics.sold} helper="Tickets ja aprovados pelo pagamento" icon={Users} />
          <PremiumMetricCard title="Ingressos disponiveis" value={metrics.available} helper="Estoque atual somando todos os lotes" icon={QrCode} />
        </div>

        <PanelSection
          eyebrow={editing ? 'Editar evento' : 'Novo evento'}
          title={editing ? 'Atualize os detalhes do show' : 'Cadastre um novo evento'}
          description="Defina os dados do evento e os lotes. Cada lote vira uma opcao de compra na pagina publica."
          aside={(
            <button
              type="button"
              onClick={submitForm}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar evento'}
            </button>
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['title', 'Titulo do evento'],
              ['subtitle', 'Subtitulo'],
              ['venue_name', 'Nome do local'],
              ['venue_city', 'Cidade'],
              ['venue_address', 'Endereco'],
              ['contact_phone', 'WhatsApp de contato'],
              ['banner_url', 'URL do banner'],
              ['starts_at', 'Data e hora']
            ].map(([key, label]) => (
              <label key={key} className="space-y-2 text-sm">
                <span className="text-gray-300">{label}</span>
                <input
                  type={key === 'starts_at' ? 'datetime-local' : 'text'}
                  value={form[key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                />
              </label>
            ))}

            <label className="space-y-2 text-sm">
              <span className="text-gray-300">Fim das vendas (opcional)</span>
              <input
                type="datetime-local"
                value={form.sales_ends_at}
                onChange={(event) => setForm((prev) => ({ ...prev, sales_ends_at: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
              />
              <span className="text-gray-300">Publicar este evento na vitrine de ingressos</span>
            </label>
          </div>

          <label className="block mt-4 space-y-2 text-sm">
            <span className="text-gray-300">Descricao</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
            />
          </label>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-white">Lotes de ingresso</div>
                <div className="text-sm text-gray-400">Crie lote, preco e quantidade disponivel.</div>
              </div>
              <button
                type="button"
                onClick={addTicketType}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                <Plus size={16} />
                Adicionar lote
              </button>
            </div>

            <div className="space-y-4">
              {form.ticket_types.map((ticket, index) => (
                <div key={`${ticket.id}-${index}`} className="rounded-3xl border border-white/10 bg-black/25 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={(event) => updateTicketType(index, 'name', event.target.value)}
                      placeholder="Nome do lote"
                      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={ticket.price}
                      onChange={(event) => updateTicketType(index, 'price', event.target.value)}
                      placeholder="Preco em reais"
                      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                    />
                    <input
                      type="number"
                      min={1}
                      value={ticket.quantity}
                      onChange={(event) => updateTicketType(index, 'quantity', event.target.value)}
                      placeholder="Quantidade"
                      className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeTicketType(index)}
                      disabled={form.ticket_types.length === 1}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-40"
                    >
                      Remover lote
                    </button>
                  </div>
                  <textarea
                    value={ticket.description}
                    onChange={(event) => updateTicketType(index, 'description', event.target.value)}
                    rows={2}
                    placeholder="Descricao curta do lote"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </PanelSection>

        <PanelSection
          eyebrow="Seus eventos"
          title="Catalogo de shows publicados e rascunhos"
          description="Abra a pagina publica para vender, ou a portaria para validar entradas no dia do evento."
        >
          {loading ? (
            <div className="text-center py-10 text-gray-400">Carregando eventos...</div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-black/25 p-8 text-center text-gray-400">
              Nenhum evento criado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
                <article key={event.id} className="rounded-[28px] border border-white/10 bg-black/25 overflow-hidden">
                  <div className="h-44 bg-[linear-gradient(135deg,rgba(245,197,66,0.14),rgba(255,255,255,0.02),rgba(0,0,0,0.45))] relative">
                    {event.banner_url ? <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" /> : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute left-5 right-5 bottom-5 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-beatwap-gold">{event.published ? 'Publicado' : 'Rascunho'}</div>
                        <div className="text-2xl font-extrabold">{event.title}</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/45 px-4 py-2 text-xs font-bold">
                        {event.totals?.available || 0} disponiveis
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        Emitidos: <span className="font-bold text-white">{event.totals?.sold || 0}</span>
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        Reservados: <span className="font-bold text-white">{event.totals?.reserved || 0}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setForm(prepareFormFromEvent(event));
                          setEditing(true);
                        }}
                        className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                      >
                        Editar evento
                      </button>
                      <Link
                        to={`/ingressos/evento/${event.slug}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                      >
                        Pagina publica
                        <ExternalLink size={14} />
                      </Link>
                      <Link
                        to={`/admin/eventos/portaria?evento=${encodeURIComponent(event.title)}`}
                        className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-4 py-2 text-sm font-bold text-black"
                      >
                        Portaria
                        <QrCode size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </PanelSection>
      </div>
    </AdminLayout>
  );
}
