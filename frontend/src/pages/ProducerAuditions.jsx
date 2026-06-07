import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { useToast } from '../context/ToastContext';
import { apiClient, uploadApi } from '../services/apiClient';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { Calendar, ClipboardList, Image as ImageIcon, Lock, RefreshCw, Save, X } from 'lucide-react';

const emptyForm = {
  nome_artista: '',
  nome_produtor: '',
  foto_artista_url: '',
  estilo_musical_principal: '',
  estilos_semelhantes: '',
  referencias_musicais: '',
  descricao_detalhada: '',
  tema: '',
  faixa_etaria_publico: '',
  cidade_estado: '',
  valor_negociacao: '',
  prazo_envio: '',
  whatsapp_recebimento: '',
  observacoes_adicionais: '',
  status: 'Aberta'
};

function fmtDateTime(v) {
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return String(v || '');
  }
}

export default function ProducerAuditions() {
  const { addToast } = useToast();
  const [auditions, setAuditions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAuditionId, setSelectedAuditionId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [updatingStatusId, setUpdatingStatusId] = useState('');
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState('');
  const [deletingAuditionId, setDeletingAuditionId] = useState('');
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [logoBlob, setLogoBlob] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);

  const selectedAudition = useMemo(
    () => auditions.find((a) => String(a.id) === String(selectedAuditionId)) || null,
    [auditions, selectedAuditionId]
  );

  const fetchAuditions = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/auditions/producer', { cache: false });
      setAuditions(Array.isArray(data?.auditions) ? data.auditions : []);
    } catch (e) {
      addToast(e?.message || 'Erro ao carregar audições', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (auditionId) => {
    const id = String(auditionId || '').trim();
    if (!id) return;
    setSubmissionsLoading(true);
    try {
      const data = await apiClient.get(`/auditions/${encodeURIComponent(id)}/submissions`, { cache: false });
      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch (e) {
      addToast(e?.message || 'Erro ao carregar envios', 'error');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditions();
  }, []);

  useEffect(() => {
    if (!selectedAuditionId) {
      setSubmissions([]);
      return;
    }
    fetchSubmissions(selectedAuditionId);
  }, [selectedAuditionId]);

  const openCreate = () => {
    setForm({ ...emptyForm });
    setImageSrc('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setLogoBlob(null);
    try {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    } catch { /* ignore */ }
    setLogoPreviewUrl('');
    setLogoUploading(false);
    setLogoUploadProgress(0);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (saving || logoUploading) return;
    setCreateOpen(false);
  };

  const createAudition = async () => {
    let foto_artista_url = String(form.foto_artista_url || '').trim();
    if (!foto_artista_url && logoBlob) {
      setLogoUploading(true);
      setLogoUploadProgress(0);
      try {
        const fileName = `${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
        const file = new File([logoBlob], fileName, { type: 'image/jpeg' });
        const res = await uploadApi.uploadWithMeta(file, {
          fileName,
          bucket: 'auditions',
          onProgress: (pct) => setLogoUploadProgress(Number(pct || 0))
        });
        foto_artista_url = String(res?.url || '').trim();
        setForm((prev) => ({ ...prev, foto_artista_url }));
      } catch (e) {
        addToast(e?.message || 'Falha ao enviar a foto/logo.', 'error');
        setLogoUploading(false);
        return;
      } finally {
        setLogoUploading(false);
      }
    }

    const payload = {
      ...form,
      foto_artista_url,
      prazo_envio: form.prazo_envio ? new Date(form.prazo_envio) : null
    };
    const required = [
      payload.nome_artista,
      payload.nome_produtor,
      payload.foto_artista_url,
      payload.estilo_musical_principal,
      payload.estilos_semelhantes,
      payload.referencias_musicais,
      payload.descricao_detalhada,
      payload.tema,
      payload.faixa_etaria_publico,
      payload.cidade_estado,
      payload.prazo_envio,
      payload.whatsapp_recebimento
    ];
    if (required.some((v) => !String(v || '').trim())) {
      addToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/auditions', payload);
      addToast('Audição criada com sucesso!', 'success');
      setCreateOpen(false);
      await fetchAuditions();
    } catch (e) {
      addToast(e?.message || 'Erro ao criar audição', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateAuditionStatus = async (auditionId, status) => {
    const id = String(auditionId || '').trim();
    if (!id) return;
    setUpdatingStatusId(id);
    try {
      await apiClient.patch(`/auditions/${encodeURIComponent(id)}`, { status });
      addToast('Status atualizado.', 'success');
      await fetchAuditions();
    } catch (e) {
      addToast(e?.message || 'Erro ao atualizar status', 'error');
    } finally {
      setUpdatingStatusId('');
    }
  };

  const updateSubmissionStatus = async (submissionId, status) => {
    const id = String(submissionId || '').trim();
    if (!id) return;
    setUpdatingSubmissionId(id);
    try {
      await apiClient.patch(`/auditions/submissions/${encodeURIComponent(id)}/status`, { status });
      addToast('Status da composição atualizado.', 'success');
      if (selectedAuditionId) await fetchSubmissions(selectedAuditionId);
    } catch (e) {
      addToast(e?.message || 'Erro ao atualizar status', 'error');
    } finally {
      setUpdatingSubmissionId('');
    }
  };

  const deleteAudition = async (auditionId) => {
    const id = String(auditionId || '').trim();
    if (!id) return;
    const ok = window.confirm('Tem certeza que deseja apagar esta audição? Isso apaga também as composições recebidas.');
    if (!ok) return;
    setDeletingAuditionId(id);
    try {
      await apiClient.del(`/auditions/${encodeURIComponent(id)}`);
      addToast('Audição apagada.', 'success');
      if (String(selectedAuditionId) === id) setSelectedAuditionId('');
      await fetchAuditions();
    } catch (e) {
      addToast(e?.message || 'Erro ao apagar audição', 'error');
    } finally {
      setDeletingAuditionId('');
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-extrabold text-white flex items-center gap-2">
            <ClipboardList size={20} className="text-beatwap-gold" />
            Audições
          </div>
          <div className="text-sm text-gray-400">
            Crie oportunidades para compositores enviarem músicas e gerencie os envios recebidos.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedButton onClick={fetchAuditions} className="px-4">
            <RefreshCw size={16} />
            Recarregar
          </AnimatedButton>
          <AnimatedButton onClick={openCreate} className="px-4">
            Nova Audição
          </AnimatedButton>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="text-sm text-gray-300">Selecione uma audição</div>
            <select
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
              value={selectedAuditionId}
              onChange={(e) => setSelectedAuditionId(e.target.value)}
            >
              <option value="" className="bg-[#121212]">—</option>
              {auditions.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#121212]">
                  {a.nome_artista} • {a.estilo_musical_principal} • {String(a.status || '')}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-300">Ações</div>
            <div className="flex flex-wrap gap-2">
              <AnimatedButton
                onClick={() => selectedAuditionId && fetchSubmissions(selectedAuditionId)}
                className="px-4"
              >
                Ver envios
              </AnimatedButton>
              <AnimatedButton
                onClick={() => selectedAuditionId && updateAuditionStatus(selectedAuditionId, 'Aberta')}
                className="px-4"
                isLoading={updatingStatusId === selectedAuditionId}
              >
                Abrir
              </AnimatedButton>
              <AnimatedButton
                onClick={() => selectedAuditionId && updateAuditionStatus(selectedAuditionId, 'Encerrada')}
                className="px-4"
                isLoading={updatingStatusId === selectedAuditionId}
              >
                Encerrar
              </AnimatedButton>
              <AnimatedButton
                onClick={() => selectedAuditionId && deleteAudition(selectedAuditionId)}
                className="px-4"
                variant="secondary"
                isLoading={deletingAuditionId === selectedAuditionId}
              >
                Apagar
              </AnimatedButton>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-400">Carregando...</div>
        ) : auditions.length === 0 ? (
          <div className="text-center py-6 text-gray-400">Nenhuma audição cadastrada.</div>
        ) : null}
      </Card>

      {selectedAudition && (
        <Card className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-white truncate">{selectedAudition.nome_artista}</div>
              <div className="text-sm text-gray-400 truncate">
                {selectedAudition.estilo_musical_principal} • Prazo: {fmtDateTime(selectedAudition.prazo_envio)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Total envios: <span className="text-white font-bold">{Number(selectedAudition.total_submissions || 0)}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Participantes: <span className="text-white font-bold">{Number(selectedAudition.total_composers || 0)}</span>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                Status: <span className="text-white font-bold">{String(selectedAudition.status || '')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-black/20 border border-white/10 p-3 space-y-1">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Descrição</div>
              <div className="text-gray-200 whitespace-pre-wrap">{selectedAudition.descricao_detalhada}</div>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-3 space-y-1">
              <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Referências</div>
              <div className="text-gray-200 whitespace-pre-wrap">{selectedAudition.referencias_musicais}</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-lg font-extrabold text-white">Composições Recebidas</div>
          {selectedAuditionId ? (
            <AnimatedButton onClick={() => fetchSubmissions(selectedAuditionId)} className="px-4" isLoading={submissionsLoading}>
              <RefreshCw size={16} />
              Atualizar
            </AnimatedButton>
          ) : null}
        </div>

        {!selectedAuditionId ? (
          <div className="text-sm text-gray-400">Selecione uma audição acima para ver os envios.</div>
        ) : submissionsLoading ? (
          <div className="text-center py-6 text-gray-400">Carregando envios...</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-6 text-gray-400">Nenhuma composição enviada ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-300">
                  <th className="py-2 pr-4">Compositor</th>
                  <th className="py-2 pr-4">Música</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Link</th>
                  <th className="py-2 pr-4">WhatsApp</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-white/10">
                    <td className="py-2 pr-4 text-white">
                      {s?.compositor?.nome || '—'}
                      <div className="text-xs text-gray-400">{s?.compositor?.email || ''}</div>
                    </td>
                    <td className="py-2 pr-4 text-white">{s.nome_musica}</td>
                    <td className="py-2 pr-4 text-gray-300">{fmtDateTime(s.createdAt)}</td>
                    <td className="py-2 pr-4">
                      <a href={s.link_musica} target="_blank" rel="noreferrer" className="text-beatwap-gold hover:underline break-all">
                        Abrir
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-gray-300">{s?.compositor?.whatsapp || '—'}</td>
                    <td className="py-2 pr-4">
                      <select
                        className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                        value={String(s.status || 'Pendente')}
                        onChange={(e) => updateSubmissionStatus(s.id, e.target.value)}
                        disabled={updatingSubmissionId === s.id}
                      >
                        {['Pendente', 'Avaliada', 'Selecionada', 'Rejeitada'].map((opt) => (
                          <option key={opt} value={opt} className="bg-[#121212]">{opt}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {createOpen && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-[#0b0b0b] border border-white/10 p-5 md:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-extrabold text-white flex items-center gap-2">
                <Calendar size={18} className="text-beatwap-gold" />
                Nova Audição
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatedInput label="Nome do artista" value={form.nome_artista} onChange={(e) => setForm({ ...form, nome_artista: e.target.value })} />
              <AnimatedInput label="Nome do produtor" value={form.nome_produtor} onChange={(e) => setForm({ ...form, nome_produtor: e.target.value })} />
              <AnimatedInput label="Estilo musical principal" value={form.estilo_musical_principal} onChange={(e) => setForm({ ...form, estilo_musical_principal: e.target.value })} />
              <AnimatedInput label="Tema da música" value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} />
              <AnimatedInput label="Faixa etária do público" value={form.faixa_etaria_publico} onChange={(e) => setForm({ ...form, faixa_etaria_publico: e.target.value })} />
              <AnimatedInput label="Cidade/Estado" value={form.cidade_estado} onChange={(e) => setForm({ ...form, cidade_estado: e.target.value })} />
              <AnimatedInput label="Valor disponível (opcional)" value={form.valor_negociacao} onChange={(e) => setForm({ ...form, valor_negociacao: e.target.value })} />
              <AnimatedInput label="WhatsApp para recebimento" value={form.whatsapp_recebimento} onChange={(e) => setForm({ ...form, whatsapp_recebimento: e.target.value })} />
            </div>

            <div className="space-y-3">
              <div className="text-sm text-gray-300">Foto do artista / Logo</div>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-[260px]">
                  <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="Foto do artista" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center gap-2 text-sm">
                        <ImageIcon size={22} />
                        <span>Sem foto</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-3">
                    <label className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-100 hover:border-beatwap-gold hover:text-beatwap-gold transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files && e.target.files[0];
                          if (!file) return;
                          try { if (imageSrc) URL.revokeObjectURL(imageSrc); } catch { /* ignore */ }
                          const url = URL.createObjectURL(file);
                          setImageSrc(url);
                          setCrop({ x: 0, y: 0 });
                          setZoom(1);
                          setCroppedAreaPixels(null);
                          setLogoBlob(null);
                          try { if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); } catch { /* ignore */ }
                          setLogoPreviewUrl('');
                          setForm((prev) => ({ ...prev, foto_artista_url: '' }));
                          e.target.value = '';
                        }}
                      />
                      Selecionar foto
                    </label>
                    {logoPreviewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoBlob(null);
                          try { if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); } catch { /* ignore */ }
                          setLogoPreviewUrl('');
                          setForm((prev) => ({ ...prev, foto_artista_url: '' }));
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-300 hover:bg-white/5 transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  {logoUploading && (
                    <div className="text-xs text-gray-400 pt-2">
                      Enviando foto... {Math.max(0, Math.min(100, Math.round(logoUploadProgress)))}%
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  {imageSrc ? (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                        <Cropper
                          image={imageSrc}
                          crop={crop}
                          zoom={zoom}
                          aspect={1}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={1}
                          max={3}
                          step={0.05}
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full"
                        />
                        <AnimatedButton
                          onClick={async () => {
                            try {
                              if (!croppedAreaPixels) {
                                addToast('Ajuste o recorte antes de aplicar.', 'warning');
                                return;
                              }
                              const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 800, 800);
                              setLogoBlob(blob);
                              try { if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl); } catch { /* ignore */ }
                              const preview = URL.createObjectURL(blob);
                              setLogoPreviewUrl(preview);
                              try { URL.revokeObjectURL(imageSrc); } catch { /* ignore */ }
                              setImageSrc('');
                            } catch (e) {
                              addToast(e?.message || 'Falha ao recortar imagem.', 'error');
                            }
                          }}
                          className="px-4"
                        >
                          Aplicar
                        </AnimatedButton>
                      </div>
                      <div className="text-xs text-gray-500">
                        A foto será recortada em formato quadrado.
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">
                      Selecione uma imagem para recortar e usar como foto/logo da audição.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300">Estilos semelhantes desejados</div>
              <textarea
                value={form.estilos_semelhantes}
                onChange={(e) => setForm({ ...form, estilos_semelhantes: e.target.value })}
                className="w-full min-h-[90px] bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300">Referências musicais</div>
              <textarea
                value={form.referencias_musicais}
                onChange={(e) => setForm({ ...form, referencias_musicais: e.target.value })}
                className="w-full min-h-[90px] bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300">Descrição detalhada do que está procurando</div>
              <textarea
                value={form.descricao_detalhada}
                onChange={(e) => setForm({ ...form, descricao_detalhada: e.target.value })}
                className="w-full min-h-[110px] bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-gray-300">Prazo para envio</div>
                <input
                  type="datetime-local"
                  value={form.prazo_envio}
                  onChange={(e) => setForm({ ...form, prazo_envio: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm text-gray-300">Status</div>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
                >
                  <option value="Aberta" className="bg-[#121212]">Aberta</option>
                  <option value="Encerrada" className="bg-[#121212]">Encerrada</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-gray-300">Observações adicionais</div>
              <textarea
                value={form.observacoes_adicionais}
                onChange={(e) => setForm({ ...form, observacoes_adicionais: e.target.value })}
                className="w-full min-h-[90px] bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-beatwap-gold/50 outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <AnimatedButton onClick={closeCreate} className="px-4" variant="secondary">
                <X size={16} />
                Cancelar
              </AnimatedButton>
              <AnimatedButton onClick={createAudition} className="px-4" isLoading={saving}>
                <Save size={16} />
                Salvar
              </AnimatedButton>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Lock size={14} />
              Apenas Produtores podem criar audições. Ao salvar, ela fica visível para todos os compositores.
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      {content}
    </AdminLayout>
  );
}
