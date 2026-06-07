import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { ExternalLink, Lock, Music2, Send, X } from 'lucide-react';

function fmtDateTime(v) {
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return String(v || '');
  }
}

export default function ComposerAuditions() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [auditions, setAuditions] = useState([]);
  const [openId, setOpenId] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ nome_musica: '', link_musica: '', observacoes: '' });
  const [whats, setWhats] = useState(null);

  const selected = useMemo(
    () => auditions.find((a) => String(a.id) === String(openId)) || null,
    [auditions, openId]
  );

  const fetchAuditions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/auditions/open', { cache: false });
      setAuditions(Array.isArray(data?.auditions) ? data.auditions : []);
    } catch (e) {
      addToast(e?.message || 'Erro ao carregar audições', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditions();
  }, []);

  const openSubmit = (auditionId) => {
    setOpenId(String(auditionId || ''));
    setForm({ nome_musica: '', link_musica: '', observacoes: '' });
    setWhats(null);
    setSubmitOpen(true);
  };

  const closeSubmit = () => {
    if (submitting) return;
    setSubmitOpen(false);
  };

  const submit = async () => {
    if (!selected?.id) return;
    if (!String(form.nome_musica || '').trim() || !String(form.link_musica || '').trim()) {
      addToast('Preencha Nome da música e Link.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/auditions/${encodeURIComponent(selected.id)}/submissions`, form);
      addToast('Envio registrado com sucesso!', 'success');
      setWhats(res?.whatsapp || null);
      await fetchAuditions();
    } catch (e) {
      const msg = String(e?.message || '');
      addToast(msg || 'Erro ao enviar composição', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selected && Number(selected.remaining_submissions || 0) > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Music2 size={20} className="text-beatwap-gold" />
              Audições
            </div>
            <div className="text-sm text-gray-400">
              Veja as audições abertas e envie até 2 composições por audição.
            </div>
          </div>
          <AnimatedButton onClick={fetchAuditions} className="px-4">
            Atualizar
          </AnimatedButton>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Carregando...</div>
        ) : auditions.length === 0 ? (
          <Card className="text-center py-10 text-gray-400">
            Nenhuma audição aberta no momento.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {auditions.map((a) => (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-black/30 shrink-0">
                      {a.foto_artista_url ? (
                        <img src={a.foto_artista_url} alt={a.nome_artista} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                    <div className="text-lg font-extrabold text-white truncate">{a.nome_artista}</div>
                    <div className="text-sm text-gray-400 truncate">{a.estilo_musical_principal}</div>
                    <div className="text-xs text-gray-500">
                      Prazo: <span className="text-gray-300">{fmtDateTime(a.prazo_envio)}</span>
                    </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">
                    Restantes: <span className="text-white font-bold">{Number(a.remaining_submissions || 0)}</span>/2
                  </div>
                </div>

                <div className="text-sm text-gray-200 whitespace-pre-wrap">
                  {String(a.descricao_detalhada || '').slice(0, 240)}{String(a.descricao_detalhada || '').length > 240 ? '…' : ''}
                </div>
                <div className="text-xs text-gray-400 whitespace-pre-wrap">
                  <span className="text-gray-300 font-bold">Referências:</span> {String(a.referencias_musicais || '').slice(0, 220)}{String(a.referencias_musicais || '').length > 220 ? '…' : ''}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <AnimatedButton
                    onClick={() => openSubmit(a.id)}
                    className="px-4"
                    disabled={Number(a.remaining_submissions || 0) <= 0}
                  >
                    Enviar Composição
                  </AnimatedButton>
                  {Number(a.remaining_submissions || 0) <= 0 && (
                    <div className="text-xs text-red-300 flex items-center gap-2">
                      <Lock size={14} />
                      Você já atingiu o limite de envios para esta audição.
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {submitOpen && selected && (
          <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-[#0b0b0b] border border-white/10 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-white truncate">
                    Enviar composição • {selected.nome_artista}
                  </div>
                  <div className="text-xs text-gray-400">
                    Restantes nesta audição: {Number(selected.remaining_submissions || 0)}/2
                  </div>
                </div>
                <button type="button" onClick={closeSubmit} className="p-2 rounded-lg hover:bg-white/5 text-gray-300">
                  <X size={18} />
                </button>
              </div>

              <AnimatedInput
                label="Nome da música"
                icon={Music2}
                value={form.nome_musica}
                onChange={(e) => setForm({ ...form, nome_musica: e.target.value })}
              />
              <AnimatedInput
                label="Link da música (YouTube, SoundCloud ou MP3)"
                icon={ExternalLink}
                value={form.link_musica}
                onChange={(e) => setForm({ ...form, link_musica: e.target.value })}
              />
              <div className="space-y-2">
                <div className="text-sm text-gray-400 ml-1">Observações</div>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full min-h-[90px] bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <AnimatedButton variant="secondary" onClick={closeSubmit} className="px-4">
                  Cancelar
                </AnimatedButton>
                <AnimatedButton onClick={submit} className="px-4" isLoading={submitting} disabled={!canSubmit}>
                  <Send size={16} />
                  Enviar
                </AnimatedButton>
              </div>

              {Number(selected.remaining_submissions || 0) <= 0 && (
                <div className="text-sm text-red-300 flex items-center gap-2">
                  <Lock size={16} />
                  Você já atingiu o limite de envios para esta audição.
                </div>
              )}

              {whats?.url && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                  <div className="text-sm text-white font-bold">Próximo passo</div>
                  <div className="text-xs text-gray-300 whitespace-pre-wrap">{String(whats.message || '')}</div>
                  <AnimatedButton
                    onClick={() => window.open(String(whats.url), '_blank')}
                    className="w-full justify-center"
                  >
                    Enviar para WhatsApp
                  </AnimatedButton>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
