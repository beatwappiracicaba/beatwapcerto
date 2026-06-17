import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, CalendarDays, Trash2, Upload, Video, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { apiClient, uploadApi } from '../services/apiClient';

const toISOFromLocalInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const d = new Date(raw);
  const ts = d.getTime();
  if (!Number.isFinite(ts)) return '';
  return new Date(ts).toISOString();
};

const splitTags = (value) => {
  const raw = String(value || '');
  return raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 10);
};

export default function AdminPodcasts() {
  const [tab, setTab] = useState('clips');
  const [loading, setLoading] = useState(false);
  const [clips, setClips] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const uploadAbortRef = useRef(false);

  const [clipForm, setClipForm] = useState({
    title: '',
    caption: '',
    guest: '',
    tags: '',
    publish_at: '',
    video_file: null,
    cover_file: null,
    video_url: '',
    cover_url: ''
  });

  const [agendaForm, setAgendaForm] = useState({
    title: '',
    description: '',
    starts_at: '',
    duration_minutes: '60',
    link_url: '',
    guests: '',
    cover_file: null,
    cover_url: ''
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/podcasts', { cache: false });
      setClips(Array.isArray(res?.clips) ? res.clips : []);
      setSchedule(Array.isArray(res?.schedule) ? res.schedule : []);
    } catch {
      setClips([]);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const uploadFile = useCallback(async (file, bucket, prefix) => {
    const name = String(file?.name || '').trim();
    const mime = String(file?.type || '').toLowerCase().trim();
    const mimeToExt = () => {
      if (mime.includes('jpeg')) return 'jpg';
      if (mime.includes('png')) return 'png';
      if (mime.includes('webp')) return 'webp';
      if (mime.includes('mp4')) return 'mp4';
      if (mime.includes('quicktime')) return 'mov';
      if (mime.includes('webm')) return 'webm';
      return 'bin';
    };
    const ext = name ? (name.split('.').pop() || mimeToExt()) : mimeToExt();
    const fileName = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await uploadApi.uploadWithMeta(file, {
      bucket,
      fileName,
      onProgress: (pct) => setUploadPct(Number(pct) || 0)
    });
    return String(res?.url || '').trim();
  }, []);

  const createClip = useCallback(async () => {
    if (saving || uploading) return;
    const title = String(clipForm.title || '').trim();
    const caption = String(clipForm.caption || '').trim();
    const guest = String(clipForm.guest || '').trim();
    const tags = splitTags(clipForm.tags);
    const publish_at = toISOFromLocalInput(clipForm.publish_at) || null;

    if (!title) return;

    setSaving(true);
    try {
      let video_url = String(clipForm.video_url || '').trim();
      let cover_url = String(clipForm.cover_url || '').trim();

      if (!video_url && clipForm.video_file) {
        setUploading(true);
        setUploadPct(0);
        uploadAbortRef.current = false;
        video_url = await uploadFile(clipForm.video_file, 'podcast_media', 'podcasts/clips');
        setUploadPct(100);
      }

      if (!cover_url && clipForm.cover_file) {
        setUploading(true);
        setUploadPct(0);
        cover_url = await uploadFile(clipForm.cover_file, 'podcast_media', 'podcasts/covers');
        setUploadPct(100);
      }

      await apiClient.post('/admin/podcasts/clip', {
        title,
        caption: caption || null,
        guest: guest || null,
        tags,
        publish_at,
        video_url,
        cover_url: cover_url || null
      });

      setClipForm({
        title: '',
        caption: '',
        guest: '',
        tags: '',
        publish_at: '',
        video_file: null,
        cover_file: null,
        video_url: '',
        cover_url: ''
      });
      await loadAll();
    } catch {
      void 0;
    } finally {
      setSaving(false);
      setUploading(false);
      setUploadPct(0);
    }
  }, [clipForm, loadAll, saving, uploadFile, uploading]);

  const deleteClip = useCallback(async (id) => {
    const clipId = String(id || '').trim();
    if (!clipId) return;
    if (!window.confirm('Apagar este corte?')) return;
    try {
      await apiClient.del(`/admin/podcasts/clip/${encodeURIComponent(clipId)}`);
      await loadAll();
    } catch {
      void 0;
    }
  }, [loadAll]);

  const createSchedule = useCallback(async () => {
    if (saving || uploading) return;
    const title = String(agendaForm.title || '').trim();
    const starts_at = toISOFromLocalInput(agendaForm.starts_at);
    if (!title || !starts_at) return;

    setSaving(true);
    try {
      let cover_url = String(agendaForm.cover_url || '').trim();
      if (!cover_url && agendaForm.cover_file) {
        setUploading(true);
        setUploadPct(0);
        cover_url = await uploadFile(agendaForm.cover_file, 'podcast_media', 'podcasts/agendas');
        setUploadPct(100);
      }

      await apiClient.post('/admin/podcasts/schedule', {
        title,
        description: String(agendaForm.description || '').trim() || null,
        starts_at,
        duration_minutes: Number(agendaForm.duration_minutes || 0) || 0,
        link_url: String(agendaForm.link_url || '').trim() || null,
        cover_url: cover_url || null,
        guests: splitTags(agendaForm.guests)
      });

      setAgendaForm({
        title: '',
        description: '',
        starts_at: '',
        duration_minutes: '60',
        link_url: '',
        guests: '',
        cover_file: null,
        cover_url: ''
      });
      await loadAll();
    } catch {
      void 0;
    } finally {
      setSaving(false);
      setUploading(false);
      setUploadPct(0);
    }
  }, [agendaForm, loadAll, saving, uploadFile, uploading]);

  const deleteSchedule = useCallback(async (id) => {
    const sid = String(id || '').trim();
    if (!sid) return;
    if (!window.confirm('Apagar este agendamento?')) return;
    try {
      await apiClient.del(`/admin/podcasts/schedule/${encodeURIComponent(sid)}`);
      await loadAll();
    } catch {
      void 0;
    }
  }, [loadAll]);

  const now = Date.now();
  const upcoming = useMemo(() => (
    (Array.isArray(schedule) ? schedule : [])
      .slice()
      .filter((s) => {
        const ts = new Date(String(s?.starts_at || '')).getTime();
        return Number.isFinite(ts) && ts >= now - 10 * 60 * 1000;
      })
      .sort((a, b) => (new Date(String(a?.starts_at || '')).getTime() - new Date(String(b?.starts_at || '')).getTime()))
  ), [now, schedule]);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Mic className="text-beatwap-gold" />
              Podcasts
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Publique cortes em vídeo estilo Reels e agende o próximo podcast para aparecer na Home.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('clips')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                tab === 'clips' ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
              }`}
            >
              Cortes (Reels)
            </button>
            <button
              type="button"
              onClick={() => setTab('agenda')}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                tab === 'agenda' ? 'bg-beatwap-gold text-black border-beatwap-gold' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
              }`}
            >
              Agenda
            </button>
          </div>
        </div>

        {(uploading || saving) && (
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-gray-300">
                {uploading ? 'Enviando mídia...' : 'Salvando...'}
              </div>
              {uploading && (
                <div className="text-xs font-bold text-beatwap-gold">{uploadPct}%</div>
              )}
            </div>
            {uploading && (
              <div className="mt-3 h-2 rounded-full bg-black/40 border border-white/10 overflow-hidden">
                <div className="h-full bg-beatwap-gold" style={{ width: `${Math.max(0, Math.min(100, uploadPct))}%` }} />
              </div>
            )}
          </Card>
        )}

        {tab === 'clips' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <Video size={18} className="text-beatwap-gold" />
                Novo corte
              </div>
              <div className="mt-4 space-y-3">
                <AnimatedInput value={clipForm.title} onChange={(e) => setClipForm((p) => ({ ...p, title: e.target.value }))} placeholder="Título do corte" />
                <AnimatedInput value={clipForm.guest} onChange={(e) => setClipForm((p) => ({ ...p, guest: e.target.value }))} placeholder="Convidado (opcional)" />
                <textarea
                  value={clipForm.caption}
                  onChange={(e) => setClipForm((p) => ({ ...p, caption: e.target.value }))}
                  placeholder="Legenda (opcional)"
                  rows={4}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-4 py-3 outline-none focus:border-beatwap-gold resize-none"
                />
                <AnimatedInput value={clipForm.tags} onChange={(e) => setClipForm((p) => ({ ...p, tags: e.target.value }))} placeholder="Tags (separe por vírgula)" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Publicar em (opcional)</div>
                    <input
                      type="datetime-local"
                      value={clipForm.publish_at}
                      onChange={(e) => setClipForm((p) => ({ ...p, publish_at: e.target.value }))}
                      className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-4 py-3 outline-none focus:border-beatwap-gold"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Capa (opcional)</div>
                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer">
                      <ImageIcon size={16} className="text-gray-200" />
                      <span className="text-xs font-bold text-gray-200">Selecionar imagem</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setClipForm((p) => ({ ...p, cover_file: e.target.files?.[0] || null }))}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <Upload size={14} />
                    Enviar vídeo (vertical recomendado)
                  </div>
                  <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer">
                    <Video size={16} className="text-gray-200" />
                    <span className="text-xs font-bold text-gray-200">Selecionar vídeo</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={(e) => setClipForm((p) => ({ ...p, video_file: e.target.files?.[0] || null }))}
                    />
                  </label>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <LinkIcon size={14} />
                    Ou cole um link direto do vídeo (opcional)
                  </div>
                  <AnimatedInput value={clipForm.video_url} onChange={(e) => setClipForm((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://..." />
                  <AnimatedInput value={clipForm.cover_url} onChange={(e) => setClipForm((p) => ({ ...p, cover_url: e.target.value }))} placeholder="URL da capa (opcional)" />
                </div>
                <div className="pt-2">
                  <AnimatedButton
                    onClick={createClip}
                    disabled={saving || uploading || !String(clipForm.title || '').trim() || (!String(clipForm.video_url || '').trim() && !clipForm.video_file)}
                    className="w-full justify-center"
                  >
                    Publicar corte
                  </AnimatedButton>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold text-white">Cortes publicados</div>
                <button
                  type="button"
                  onClick={loadAll}
                  className="px-3 py-2 rounded-xl text-xs font-bold border bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 transition"
                >
                  Atualizar
                </button>
              </div>
              {loading ? (
                <div className="py-10 text-center text-gray-500">Carregando...</div>
              ) : clips.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Nenhum corte ainda.</div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4">
                  {clips.slice(0, 20).map((c) => (
                    <div key={c.id} className="rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
                      <div className="aspect-[9/16] bg-black">
                        <video
                          src={String(c.video_url || '')}
                          className="w-full h-full object-cover"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-white font-extrabold truncate">{c.title}</div>
                            {c.guest ? <div className="text-xs text-gray-400 truncate">Convidado: {c.guest}</div> : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteClip(c.id)}
                            className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 transition"
                            title="Apagar"
                          >
                            <Trash2 size={16} className="text-gray-200" />
                          </button>
                        </div>
                        {c.caption ? (
                          <div className="text-sm text-gray-300 whitespace-pre-wrap">{String(c.caption)}</div>
                        ) : null}
                        {Array.isArray(c.tags) && c.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {c.tags.slice(0, 8).map((t) => (
                              <span key={t} className="px-2 py-1 rounded-full text-[11px] font-bold border bg-black/20 border-white/10 text-gray-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 sm:p-6">
              <div className="text-sm font-extrabold text-white flex items-center gap-2">
                <CalendarDays size={18} className="text-beatwap-gold" />
                Agendar próximo podcast
              </div>
              <div className="mt-4 space-y-3">
                <AnimatedInput value={agendaForm.title} onChange={(e) => setAgendaForm((p) => ({ ...p, title: e.target.value }))} placeholder="Título do episódio" />
                <textarea
                  value={agendaForm.description}
                  onChange={(e) => setAgendaForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descrição (tema, pauta, etc)"
                  rows={4}
                  className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-4 py-3 outline-none focus:border-beatwap-gold resize-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Data e horário</div>
                    <input
                      type="datetime-local"
                      value={agendaForm.starts_at}
                      onChange={(e) => setAgendaForm((p) => ({ ...p, starts_at: e.target.value }))}
                      className="w-full rounded-xl bg-white/5 border border-white/10 text-white px-4 py-3 outline-none focus:border-beatwap-gold"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400">Duração (min)</div>
                    <AnimatedInput
                      value={agendaForm.duration_minutes}
                      onChange={(e) => setAgendaForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                      placeholder="60"
                    />
                  </div>
                </div>
                <AnimatedInput value={agendaForm.link_url} onChange={(e) => setAgendaForm((p) => ({ ...p, link_url: e.target.value }))} placeholder="Link (YouTube/Instagram) opcional" />
                <AnimatedInput value={agendaForm.guests} onChange={(e) => setAgendaForm((p) => ({ ...p, guests: e.target.value }))} placeholder="Convidados (separe por vírgula)" />
                <div className="space-y-1">
                  <div className="text-xs text-gray-400">Capa (opcional)</div>
                  <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer">
                    <ImageIcon size={16} className="text-gray-200" />
                    <span className="text-xs font-bold text-gray-200">Selecionar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAgendaForm((p) => ({ ...p, cover_file: e.target.files?.[0] || null }))}
                    />
                  </label>
                  <AnimatedInput value={agendaForm.cover_url} onChange={(e) => setAgendaForm((p) => ({ ...p, cover_url: e.target.value }))} placeholder="URL da capa (opcional)" />
                </div>
                <div className="pt-2">
                  <AnimatedButton
                    onClick={createSchedule}
                    disabled={saving || uploading || !String(agendaForm.title || '').trim() || !String(agendaForm.starts_at || '').trim()}
                    className="w-full justify-center"
                  >
                    Publicar agendamento
                  </AnimatedButton>
                </div>
              </div>
            </Card>

            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold text-white">Agenda publicada</div>
                <button
                  type="button"
                  onClick={loadAll}
                  className="px-3 py-2 rounded-xl text-xs font-bold border bg-white/5 border-white/10 text-gray-200 hover:bg-white/10 transition"
                >
                  Atualizar
                </button>
              </div>
              {loading ? (
                <div className="py-10 text-center text-gray-500">Carregando...</div>
              ) : upcoming.length === 0 ? (
                <div className="py-10 text-center text-gray-500">Nenhum agendamento ainda.</div>
              ) : (
                <div className="mt-4 space-y-3">
                  {upcoming.slice(0, 12).map((s) => (
                    <div key={s.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-white font-extrabold truncate">{s.title}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {(() => { try { return new Date(s.starts_at).toLocaleString('pt-BR'); } catch { return String(s.starts_at || ''); } })()}
                          {s.duration_minutes ? ` • ${s.duration_minutes} min` : ''}
                        </div>
                        {Array.isArray(s.guests) && s.guests.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.guests.slice(0, 6).map((g) => (
                              <span key={g} className="px-2 py-1 rounded-full text-[11px] font-bold border bg-black/20 border-white/10 text-gray-200">
                                {g}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {s.link_url ? (
                          <a
                            href={String(s.link_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex mt-3 text-xs font-bold text-beatwap-gold hover:text-white"
                          >
                            Abrir link
                          </a>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSchedule(s.id)}
                        className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-red-500/20 hover:border-red-500/30 transition"
                        title="Apagar"
                      >
                        <Trash2 size={16} className="text-gray-200" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

