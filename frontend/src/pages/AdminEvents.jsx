import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { CalendarDays, ExternalLink, Image as ImageIcon, Plus, QrCode, Save, Ticket, Trash2, Upload, Users } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { PanelHero } from '../components/ui/PanelHero';
import { PanelSection } from '../components/ui/PanelSection';
import { PremiumMetricCard } from '../components/ui/PremiumMetricCard';
import { apiClient, uploadApi } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { getCroppedImg } from '../utils/cropImage';

const BANNER_MIN_SIZE = 1400;
const BANNER_MAX_SIZE = 3000;
const BANNER_SIZE_OPTIONS = [1400, 1600, 2000, 2400, 3000];

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
  event_date: '',
  event_time: '',
  sales_mode: 'event_start',
  sales_end_date: '',
  sales_end_time: '',
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

function splitDateTime(value) {
  const iso = formatDateTime(value);
  if (!iso) return { date: '', time: '' };
  const [date, time] = iso.split('T');
  return {
    date: date || '',
    time: time || ''
  };
}

function joinDateTime(date, time) {
  const d = String(date || '').trim();
  const t = String(time || '').trim();
  if (!d || !t) return '';
  return `${d}T${t}`;
}

function prepareFormFromEvent(event) {
  const startsAt = splitDateTime(event?.starts_at);
  const salesEndsAt = splitDateTime(event?.sales_ends_at);
  const automaticSalesEnd = !salesEndsAt.date || formatDateTime(event?.sales_ends_at) === formatDateTime(event?.starts_at);
  return {
    id: event?.id || '',
    title: event?.title || '',
    subtitle: event?.subtitle || '',
    description: event?.description || '',
    banner_url: event?.banner_url || '',
    venue_name: event?.venue_name || '',
    venue_city: event?.venue_city || '',
    venue_address: event?.venue_address || '',
    event_date: startsAt.date,
    event_time: startsAt.time,
    sales_mode: automaticSalesEnd ? 'event_start' : 'custom',
    sales_end_date: automaticSalesEnd ? '' : salesEndsAt.date,
    sales_end_time: automaticSalesEnd ? '' : salesEndsAt.time,
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
  const bannerInputRef = useRef(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);
  const [bannerImageSrc, setBannerImageSrc] = useState('');
  const [bannerCrop, setBannerCrop] = useState({ x: 0, y: 0 });
  const [bannerZoom, setBannerZoom] = useState(1);
  const [bannerCroppedAreaPixels, setBannerCroppedAreaPixels] = useState(null);
  const [bannerBlob, setBannerBlob] = useState(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('');
  const [bannerNaturalSize, setBannerNaturalSize] = useState({ width: 0, height: 0 });
  const [bannerOutputSize, setBannerOutputSize] = useState(BANNER_MIN_SIZE);

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

  const updateBannerPreview = useCallback((nextUrl) => {
    setBannerPreviewUrl((previous) => {
      try {
        if (previous && previous.startsWith('blob:')) URL.revokeObjectURL(previous);
      } catch {
        void 0;
      }
      return nextUrl || '';
    });
  }, []);

  const clearBannerEditor = useCallback((previewUrl = '') => {
    setBannerImageSrc('');
    setBannerCrop({ x: 0, y: 0 });
    setBannerZoom(1);
    setBannerCroppedAreaPixels(null);
    setBannerBlob(null);
    setBannerNaturalSize({ width: 0, height: 0 });
    setBannerOutputSize(BANNER_MIN_SIZE);
    updateBannerPreview(previewUrl);
  }, [updateBannerPreview]);

  useEffect(() => () => {
    try {
      if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(bannerPreviewUrl);
    } catch {
      void 0;
    }
  }, [bannerPreviewUrl]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(false);
    clearBannerEditor('');
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

  const loadImageDimensions = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({
      width: Number(image.naturalWidth || image.width || 0),
      height: Number(image.naturalHeight || image.height || 0)
    });
    image.onerror = reject;
    image.src = src;
  });

  const handleBannerFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!String(file.type || '').toLowerCase().startsWith('image/')) {
      addToast('Selecione uma imagem valida para a capa do evento.', 'error');
      return;
    }

    const src = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }).catch(() => '');

    if (!src) {
      addToast('Nao foi possivel ler a imagem enviada.', 'error');
      return;
    }

    try {
      const dims = await loadImageDimensions(src);
      const shortestSide = Math.min(Number(dims.width || 0), Number(dims.height || 0));
      if (shortestSide < BANNER_MIN_SIZE) {
        addToast('A imagem precisa ter pelo menos 1400px em largura e altura para a capa.', 'warning');
        return;
      }

      const allowedSizes = BANNER_SIZE_OPTIONS.filter((size) => size <= Math.min(shortestSide, BANNER_MAX_SIZE));
      const defaultSize = allowedSizes.includes(2000) ? 2000 : (allowedSizes[allowedSizes.length - 1] || BANNER_MIN_SIZE);

      setBannerImageSrc(src);
      setBannerNaturalSize(dims);
      setBannerOutputSize(defaultSize);
      setBannerCrop({ x: 0, y: 0 });
      setBannerZoom(1);
      setBannerCroppedAreaPixels(null);
      setBannerBlob(null);
    } catch {
      addToast('Nao foi possivel processar a imagem enviada.', 'error');
    }
  };

  const applyBannerCrop = async () => {
    try {
      if (!bannerImageSrc || !bannerCroppedAreaPixels) {
        addToast('Ajuste o recorte da imagem antes de aplicar.', 'warning');
        return;
      }
      const shortestSide = Math.min(Number(bannerNaturalSize.width || 0), Number(bannerNaturalSize.height || 0));
      const maxExport = Math.min(shortestSide || BANNER_MIN_SIZE, BANNER_MAX_SIZE);
      const targetSize = Math.max(BANNER_MIN_SIZE, Math.min(Number(bannerOutputSize || BANNER_MIN_SIZE), maxExport));
      const blob = await getCroppedImg(bannerImageSrc, bannerCroppedAreaPixels, targetSize, targetSize);
      const blobUrl = URL.createObjectURL(blob);
      setBannerBlob(blob);
      updateBannerPreview(blobUrl);
      setBannerImageSrc('');
      addToast(`Capa pronta em ${targetSize}x${targetSize}. Salve o evento para enviar a imagem.`, 'success');
    } catch {
      addToast('Nao foi possivel aplicar o recorte da capa.', 'error');
    }
  };

  const handleDeleteEvent = async (event) => {
    const sold = Number(event?.totals?.sold || 0);
    const reserved = Number(event?.totals?.reserved || 0);
    if (sold > 0 || reserved > 0) {
      addToast('Esse evento tem ingressos emitidos ou reservas ativas e nao pode ser apagado.', 'warning');
      return;
    }
    const confirmed = window.confirm(`Deseja apagar o evento "${event?.title || 'Sem titulo'}"?`);
    if (!confirmed) return;

    try {
      setDeletingEventId(String(event.id || ''));
      await apiClient.del(`/ticketing/events/${encodeURIComponent(event.id)}`);
      if (editing && String(form.id || '') === String(event.id || '')) resetForm();
      addToast('Evento apagado com sucesso.', 'success');
      await loadEvents();
    } catch (error) {
      addToast(error?.message || 'Falha ao apagar evento', 'error');
    } finally {
      setDeletingEventId('');
    }
  };

  const submitForm = async () => {
    const startsAt = joinDateTime(form.event_date, form.event_time);
    const salesEndsAt = form.sales_mode === 'custom'
      ? joinDateTime(form.sales_end_date, form.sales_end_time)
      : startsAt;

    if (!startsAt) {
      addToast('Informe a data e a hora do evento.', 'warning');
      return;
    }
    if (form.sales_mode === 'custom' && !salesEndsAt) {
      addToast('Informe a data e a hora do fim das vendas.', 'warning');
      return;
    }
    if (salesEndsAt && new Date(salesEndsAt).getTime() > new Date(startsAt).getTime()) {
      addToast('O fim das vendas nao pode ficar depois do inicio do evento.', 'warning');
      return;
    }

    try {
      setSaving(true);
      let bannerUrl = String(form.banner_url || '').trim();
      if (bannerBlob) {
        setUploadingBanner(true);
        const fileName = `${editing && form.id ? form.id : 'evento'}-${Date.now()}.jpg`;
        const fileToUpload = new File([bannerBlob], fileName, { type: bannerBlob.type || 'image/jpeg' });
        const uploaded = await uploadApi.uploadWithMeta(fileToUpload, { fileName });
        bannerUrl = String(uploaded?.url || '').trim() || bannerUrl;
      }

      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        banner_url: bannerUrl || null,
        venue_name: form.venue_name,
        venue_city: form.venue_city,
        venue_address: form.venue_address,
        starts_at: startsAt,
        sales_ends_at: salesEndsAt || null,
        contact_phone: form.contact_phone,
        published: form.published,
        ticket_types: form.ticket_types.map((ticket) => ({
          id: ticket.id,
          name: ticket.name,
          description: ticket.description,
          price: Number(ticket.price || 0),
          quantity: Number(ticket.quantity || 0)
        }))
      };

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
      setUploadingBanner(false);
      setSaving(false);
    }
  };

  const bannerAllowedSizes = useMemo(() => {
    const shortestSide = Math.min(Number(bannerNaturalSize.width || 0), Number(bannerNaturalSize.height || 0));
    if (!shortestSide) return [];
    return BANNER_SIZE_OPTIONS.filter((size) => size <= Math.min(shortestSide, BANNER_MAX_SIZE));
  }, [bannerNaturalSize]);

  const bannerDisplayUrl = bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')
    ? bannerPreviewUrl
    : (form.banner_url || bannerPreviewUrl || '');

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
              disabled={saving || uploadingBanner}
              className="inline-flex items-center gap-2 rounded-full bg-beatwap-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-60"
            >
              <Save size={16} />
              {saving || uploadingBanner ? 'Salvando...' : editing ? 'Salvar alteracoes' : 'Criar evento'}
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
              ['contact_phone', 'WhatsApp de contato']
            ].map(([key, label]) => (
              <label key={key} className="space-y-2 text-sm">
                <span className="text-gray-300">{label}</span>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                />
              </label>
            ))}

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
              />
              <span className="text-gray-300">Publicar este evento na vitrine de ingressos</span>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
            <div className="rounded-3xl border border-white/10 bg-black/25 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold text-white">Capa do evento</div>
                  <div className="text-sm text-gray-400">Envie a foto, recorte em quadrado e escolha uma saida entre 1400px e 3000px.</div>
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                >
                  <Upload size={16} />
                  Enviar foto
                </button>
              </div>

              {bannerImageSrc ? (
                <div className="space-y-4">
                  <div className="relative h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-black">
                    <Cropper
                      image={bannerImageSrc}
                      crop={bannerCrop}
                      zoom={bannerZoom}
                      aspect={1}
                      cropShape="rect"
                      showGrid={true}
                      objectFit="cover"
                      onCropChange={setBannerCrop}
                      onZoomChange={setBannerZoom}
                      onCropComplete={(_, croppedPixels) => setBannerCroppedAreaPixels(croppedPixels)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-2 text-sm">
                      <span className="text-gray-300">Zoom do recorte</span>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={bannerZoom}
                        onChange={(event) => setBannerZoom(Number(event.target.value))}
                        className="w-full"
                      />
                    </label>
                    <div className="space-y-2 text-sm">
                      <span className="text-gray-300">Tamanho de saida</span>
                      <div className="flex flex-wrap gap-2">
                        {bannerAllowedSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setBannerOutputSize(size)}
                            className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                              bannerOutputSize === size
                                ? 'bg-beatwap-gold text-black'
                                : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                            }`}
                          >
                            {size}x{size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={applyBannerCrop}
                      className="rounded-full bg-beatwap-gold px-4 py-2 text-sm font-bold text-black"
                    >
                      Aplicar recorte
                    </button>
                    <button
                      type="button"
                      onClick={() => setBannerImageSrc('')}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
                    >
                      Cancelar recorte
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start">
                  <div className="aspect-square overflow-hidden rounded-[28px] border border-dashed border-white/15 bg-black/30">
                    {bannerDisplayUrl ? (
                      <img src={bannerDisplayUrl} alt="Preview da capa do evento" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-500">
                        <ImageIcon size={36} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                      Use foto quadrada para o evento. O sistema recorta e prepara a capa antes de salvar.
                    </div>
                    <label className="block space-y-2 text-sm">
                      <span className="text-gray-300">Ou cole uma URL manual do banner</span>
                      <input
                        type="text"
                        value={form.banner_url}
                        onChange={(event) => setForm((prev) => ({ ...prev, banner_url: event.target.value }))}
                        placeholder="https://..."
                        className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white placeholder:text-gray-500 outline-none"
                      />
                    </label>
                    {(bannerDisplayUrl || form.banner_url) ? (
                      <button
                        type="button"
                        onClick={() => {
                          clearBannerEditor('');
                          setForm((prev) => ({ ...prev, banner_url: '' }));
                        }}
                        className="rounded-full border border-red-500/25 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Remover capa
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-4 space-y-4">
              <div>
                <div className="text-lg font-extrabold text-white">Data e hora do evento</div>
                <div className="text-sm text-gray-400">Preencha a data do show e marque como as vendas devem encerrar.</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">Data do show</span>
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(event) => setForm((prev) => ({ ...prev, event_date: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-gray-300">Hora do show</span>
                  <input
                    type="time"
                    step="900"
                    value={form.event_time}
                    onChange={(event) => setForm((prev) => ({ ...prev, event_time: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>
              <div className="space-y-2 text-sm">
                <span className="text-gray-300">Encerramento das vendas</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'event_start', label: 'Fechar no inicio do evento', helper: 'Nao precisa preencher outro horario.' },
                    { id: 'custom', label: 'Escolher outro horario', helper: 'Defina um fechamento antes do show.' }
                  ].map((option) => {
                    const active = form.sales_mode === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, sales_mode: option.id }))}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-beatwap-gold bg-beatwap-gold/10 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-bold">{option.label}</div>
                        <div className="mt-1 text-xs text-gray-400">{option.helper}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              {form.sales_mode === 'custom' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="space-y-2 text-sm">
                    <span className="text-gray-300">Data do fim das vendas</span>
                    <input
                      type="date"
                      value={form.sales_end_date}
                      onChange={(event) => setForm((prev) => ({ ...prev, sales_end_date: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-gray-300">Hora do fim das vendas</span>
                    <input
                      type="time"
                      step="900"
                      value={form.sales_end_time}
                      onChange={(event) => setForm((prev) => ({ ...prev, sales_end_time: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  As vendas vao fechar automaticamente no mesmo horario do inicio do evento.
                </div>
              )}
            </div>
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
                          const nextForm = prepareFormFromEvent(event);
                          setForm(nextForm);
                          setEditing(true);
                          clearBannerEditor(nextForm.banner_url || '');
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
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event)}
                        disabled={deletingEventId === String(event.id || '') || Number(event?.totals?.sold || 0) > 0 || Number(event?.totals?.reserved || 0) > 0}
                        className="inline-flex items-center gap-2 rounded-full border border-red-500/25 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        {deletingEventId === String(event.id || '') ? 'Apagando...' : 'Apagar'}
                      </button>
                    </div>
                    {Number(event?.totals?.sold || 0) > 0 || Number(event?.totals?.reserved || 0) > 0 ? (
                      <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                        Esse evento nao pode ser apagado porque ja possui ingressos emitidos ou reservas em aberto.
                      </div>
                    ) : null}
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
