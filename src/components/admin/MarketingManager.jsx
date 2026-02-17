import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { Card } from '../ui/Card';
import { Plus, Trash, Save, Loader, X, Check, ChevronDown, ChevronUp, Instagram, Music, Youtube } from 'lucide-react';

export const MarketingManager = ({ isOpen, onClose, artistId, artistName, artistRole = 'Artista' }) => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    instagram_metrics: { followers: '', frequency: '', engagement: '', growth: '', interpretation: '' },
    tiktok_metrics: { followers: '', views_avg: '', top_content: '', interpretation: '' },
    youtube_metrics: { subs: '', top_video: '', freq_ideal: '', interpretation: '' },
    diagnosis: { reach: '', presence: '', strategy: '', ready_for_shows: false },
    action_plan: [],
    suggestions: [],
    mentorship_content: [],
    // Composer specific fields
    composer_diagnosis: { level: '', style: '', strengths: '', improvements: '', interpretation: '' },
    composer_catalog: { registered: '', unpublished: '', recorded: '', negotiating: '', highlights: [] },
    composer_positioning: { target_audience: '', differential: '', bio: '' },
    composer_pitch: { audio_url: '', presentation_text: '', common_errors: '' },
    composer_opportunities: [],
    composer_rights: { registered: 'Não', coauthors: '', percentages: '', observations: '' },
    composer_plan: []
  });

  const isComposer = ['Compositor', 'Produtor', 'compositor', 'produtor'].includes(artistRole);

  useEffect(() => {
    if (isOpen && artistId) loadData();
  }, [isOpen, artistId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: existingData, error } = await supabase
        .from('artist_marketing')
        .select('*')
        .eq('artist_id', artistId)
        .maybeSingle();

      if (error) throw error;

      if (existingData) {
        setData({
          instagram_metrics: existingData.instagram_metrics || {},
          tiktok_metrics: existingData.tiktok_metrics || {},
          youtube_metrics: existingData.youtube_metrics || {},
          diagnosis: existingData.diagnosis || {},
          action_plan: existingData.action_plan || [],
          suggestions: existingData.suggestions || [],
          mentorship_content: existingData.mentorship_content || [],
          composer_diagnosis: existingData.composer_diagnosis || { level: '', style: '', strengths: '', improvements: '', interpretation: '' },
          composer_catalog: existingData.composer_catalog || { registered: '', unpublished: '', recorded: '', negotiating: '', highlights: [] },
          composer_positioning: existingData.composer_positioning || { target_audience: '', differential: '', bio: '' },
          composer_pitch: existingData.composer_pitch || { audio_url: '', presentation_text: '', common_errors: '' },
          composer_opportunities: existingData.composer_opportunities || [],
          composer_rights: existingData.composer_rights || { registered: 'Não', coauthors: '', percentages: '', observations: '' },
          composer_plan: existingData.composer_plan || []
        });
      } else {
        // Defaults
        const defaultMentorship = isComposer ? [
          { title: "Como um artista escolhe uma música", duration: "5 min", type: "Vídeo Aula" },
          { title: "O que faz uma letra ser gravável", duration: "5 min", type: "Vídeo Aula" },
          { title: "Erro que faz compositor ser ignorado", duration: "5 min", type: "Vídeo Aula" },
          { title: "Quando cobrar e quando ceder", duration: "5 min", type: "Vídeo Aula" }
        ] : [
          { title: "Como crescer no Instagram sem gastar", duration: "5 min", type: "Vídeo Aula" },
          { title: "O que postar quando não tem show", duration: "5 min", type: "Vídeo Aula" },
          { title: "Quando impulsionar ou não", duration: "5 min", type: "Vídeo Aula" },
          { title: "Como transformar seguidor em público", duration: "5 min", type: "Vídeo Aula" }
        ];

        setData(prev => ({ ...prev, mentorship_content: defaultMentorship }));
      }
    } catch (error) {
      console.error('Error loading marketing data:', error);
      addToast('Erro ao carregar dados de marketing', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('artist_marketing')
        .upsert({
          artist_id: artistId,
          ...data,
          updated_at: new Date()
        }, { onConflict: 'artist_id' });

      if (error) throw error;
      addToast('Dados salvos com sucesso!', 'success');
      onClose();
    } catch (error) {
      console.error('Error saving marketing data:', error);
      addToast(`Erro ao salvar dados: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateMetric = (platform, field, value) => {
    setData(prev => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: value }
    }));
  };

  // Helper to manage arrays
  const addItem = (field, item) => {
    setData(prev => ({ ...prev, [field]: [...prev[field], item] }));
  };
  
  const updateItem = (field, index, key, value) => {
    const newList = [...data[field]];
    if (key) newList[index] = { ...newList[index], [key]: value };
    else newList[index] = value; // for simple arrays
    setData(prev => ({ ...prev, [field]: newList }));
  };

  const removeItem = (field, index) => {
    const newList = data[field].filter((_, i) => i !== index);
    setData(prev => ({ ...prev, [field]: newList }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center sm:justify-between bg-beatwap-black">
            <h3 className="text-lg sm:text-xl font-bold text-white text-center sm:text-left">
              Gerenciar {isComposer ? 'Carreira & Negócios' : 'Marketing'} - {artistName}
            </h3>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4">
                <AnimatedButton onClick={handleSave} disabled={saving}>
                    {saving ? <Loader className="animate-spin" size={20} /> : <Save size={20} />}
                    <span className="ml-2">Salvar</span>
                </AnimatedButton>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X size={24} />
                </button>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader className="animate-spin text-beatwap-gold" size={48} />
              </div>
            ) : isComposer ? (
              // COMPOSER VIEW
              <div className="space-y-6">
                {/* 1. Diagnóstico */}
                <Card className="space-y-4">
                  <div className="font-bold text-beatwap-gold text-lg">1. Diagnóstico do Compositor</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400">Nível</label>
                        <select 
                            className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white"
                            value={data.composer_diagnosis.level}
                            onChange={(e) => updateMetric('composer_diagnosis', 'level', e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            <option value="Iniciante">Iniciante</option>
                            <option value="Catálogo em crescimento">Catálogo em crescimento</option>
                            <option value="Profissional">Profissional</option>
                        </select>
                    </div>
                    <AnimatedInput label="Estilo Forte" placeholder="Ex: Piseiro, Sertanejo" value={data.composer_diagnosis.style} onChange={(e) => updateMetric('composer_diagnosis', 'style', e.target.value)} />
                    <AnimatedInput label="Pontos Fortes" placeholder="Ex: Letra, Melodia" value={data.composer_diagnosis.strengths} onChange={(e) => updateMetric('composer_diagnosis', 'strengths', e.target.value)} />
                    <AnimatedInput label="Pontos a Melhorar" placeholder="Ex: Networking, Pitch" value={data.composer_diagnosis.improvements} onChange={(e) => updateMetric('composer_diagnosis', 'improvements', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-gray-400">Interpretação (Feedback)</label>
                      <textarea 
                        className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        rows={2}
                        placeholder="Ex: Seu talento está pronto, falta posicionamento."
                        value={data.composer_diagnosis.interpretation}
                        onChange={(e) => updateMetric('composer_diagnosis', 'interpretation', e.target.value)}
                      />
                  </div>
                </Card>

                {/* 2. Catálogo */}
                <Card className="space-y-4">
                  <div className="font-bold text-beatwap-gold text-lg">2. Catálogo de Composições</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnimatedInput label="Cadastradas" type="number" value={data.composer_catalog.registered} onChange={(e) => updateMetric('composer_catalog', 'registered', e.target.value)} />
                    <AnimatedInput label="Inéditas" type="number" value={data.composer_catalog.unpublished} onChange={(e) => updateMetric('composer_catalog', 'unpublished', e.target.value)} />
                    <AnimatedInput label="Gravadas" type="number" value={data.composer_catalog.recorded} onChange={(e) => updateMetric('composer_catalog', 'recorded', e.target.value)} />
                    <AnimatedInput label="Em Negociação" type="number" value={data.composer_catalog.negotiating} onChange={(e) => updateMetric('composer_catalog', 'negotiating', e.target.value)} />
                  </div>
                  {/* Highlights list can be added here if needed, keeping it simple for now as per "Numbers" priority */}
                </Card>

                {/* 3. Posicionamento */}
                <Card className="space-y-4">
                    <div className="font-bold text-beatwap-gold text-lg">3. Posicionamento no Mercado</div>
                    <AnimatedInput label="Escreve para (Público/Artistas)" placeholder="Ex: Artista local, Nacional, Gravadora" value={data.composer_positioning.target_audience} onChange={(e) => updateMetric('composer_positioning', 'target_audience', e.target.value)} />
                    <AnimatedInput label="Diferencial" placeholder="Ex: Letras chiclete, Sofrência" value={data.composer_positioning.differential} onChange={(e) => updateMetric('composer_positioning', 'differential', e.target.value)} />
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Bio Profissional</label>
                      <textarea 
                        className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        rows={3}
                        value={data.composer_positioning.bio}
                        onChange={(e) => updateMetric('composer_positioning', 'bio', e.target.value)}
                      />
                    </div>
                </Card>

                {/* 4. Pitch */}
                <Card className="space-y-4">
                    <div className="font-bold text-beatwap-gold text-lg">4. Pitch de Músicas</div>
                    <AnimatedInput label="Modelo de Áudio (URL Exemplo)" placeholder="Link para um áudio referência" value={data.composer_pitch.audio_url} onChange={(e) => updateMetric('composer_pitch', 'audio_url', e.target.value)} />
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Texto de Apresentação Ideal</label>
                      <textarea 
                        className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        rows={3}
                        placeholder="Modelo de texto para envio"
                        value={data.composer_pitch.presentation_text}
                        onChange={(e) => updateMetric('composer_pitch', 'presentation_text', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Erros Comuns</label>
                      <textarea 
                        className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        rows={2}
                        placeholder="O que não fazer"
                        value={data.composer_pitch.common_errors}
                        onChange={(e) => updateMetric('composer_pitch', 'common_errors', e.target.value)}
                      />
                    </div>
                </Card>

                {/* 5. Oportunidades */}
                <Card className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="font-bold text-beatwap-gold text-lg">5. Oportunidades Específicas</div>
                        <AnimatedButton onClick={() => addItem('composer_opportunities', { title: '', type: 'Encomenda', status: 'Aberta' })} size="sm" variant="secondary"><Plus size={16} /></AnimatedButton>
                    </div>
                    <div className="space-y-2">
                        {data.composer_opportunities.map((opp, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-white/5 p-2 rounded-lg">
                                <input className="flex-1 bg-transparent border-b border-white/10 text-white text-sm outline-none" placeholder="Título/Descrição" value={opp.title} onChange={(e) => updateItem('composer_opportunities', idx, 'title', e.target.value)} />
                                <select className="bg-black/20 text-xs text-white rounded p-1 border border-white/10" value={opp.type} onChange={(e) => updateItem('composer_opportunities', idx, 'type', e.target.value)}>
                                    <option value="Encomenda">Encomenda</option>
                                    <option value="Parceria">Parceria</option>
                                    <option value="Projeto">Projeto</option>
                                    <option value="Campanha">Campanha</option>
                                </select>
                                <select className="bg-black/20 text-xs text-white rounded p-1 border border-white/10" value={opp.status} onChange={(e) => updateItem('composer_opportunities', idx, 'status', e.target.value)}>
                                    <option value="Aberta">Aberta</option>
                                    <option value="Em análise">Em análise</option>
                                    <option value="Selecionado">Selecionado</option>
                                    <option value="Fechado">Fechado</option>
                                </select>
                                <button onClick={() => removeItem('composer_opportunities', idx)} className="text-red-400"><Trash size={14} /></button>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* 6. Direitos Autorais */}
                <Card className="space-y-4">
                    <div className="font-bold text-beatwap-gold text-lg">6. Direitos Autorais & Organização</div>
                    <div className="flex gap-4 items-center">
                        <span className="text-sm text-gray-400">Música Registrada?</span>
                        <select className="bg-beatwap-graphite border border-white/10 rounded px-2 py-1 text-white" value={data.composer_rights.registered} onChange={(e) => updateMetric('composer_rights', 'registered', e.target.value)}>
                            <option value="Sim">Sim</option>
                            <option value="Não">Não</option>
                            <option value="Parcialmente">Parcialmente</option>
                        </select>
                    </div>
                    <AnimatedInput label="Coautores" value={data.composer_rights.coauthors} onChange={(e) => updateMetric('composer_rights', 'coauthors', e.target.value)} />
                    <AnimatedInput label="Percentuais" value={data.composer_rights.percentages} onChange={(e) => updateMetric('composer_rights', 'percentages', e.target.value)} />
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Observações</label>
                      <textarea 
                        className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                        rows={2}
                        value={data.composer_rights.observations}
                        onChange={(e) => updateMetric('composer_rights', 'observations', e.target.value)}
                      />
                    </div>
                </Card>

                {/* 7. Plano de Crescimento */}
                <Card className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="font-bold text-beatwap-gold text-lg">7. Plano de Crescimento</div>
                        <AnimatedButton onClick={() => addItem('composer_plan', { task: '', checked: false })} size="sm" variant="secondary"><Plus size={16} /></AnimatedButton>
                    </div>
                    <div className="space-y-2">
                        {data.composer_plan.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-white/5 p-2 rounded-lg">
                                <input type="checkbox" checked={item.checked} onChange={(e) => updateItem('composer_plan', idx, 'checked', e.target.checked)} className="accent-beatwap-gold" />
                                <input className="flex-1 bg-transparent border-b border-white/10 text-white text-sm outline-none" placeholder="Meta/Passo" value={item.task} onChange={(e) => updateItem('composer_plan', idx, 'task', e.target.value)} />
                                <button onClick={() => removeItem('composer_plan', idx)} className="text-red-400"><Trash size={14} /></button>
                            </div>
                        ))}
                    </div>
                </Card>

                 {/* 8. Mentoria */}
                 <Card className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-beatwap-gold text-lg">8. Conteúdo de Mentoria</div>
                    <AnimatedButton onClick={() => addItem('mentorship_content', { title: '', duration: '5 min', type: 'Vídeo Aula', url: '' })} size="sm" variant="secondary"><Plus size={16} /></AnimatedButton>
                  </div>
                  <div className="space-y-3">
                    {data.mentorship_content.map((item, index) => (
                      <div key={index} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Título da Aula"
                            className="flex-1 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-white pb-1"
                            value={item.title}
                            onChange={(e) => updateItem('mentorship_content', index, 'title', e.target.value)}
                          />
                          <button onClick={() => removeItem('mentorship_content', index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash size={16} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Link (URL)"
                            className="flex-1 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                            value={item.url || ''}
                            onChange={(e) => updateItem('mentorship_content', index, 'url', e.target.value)}
                          />
                          <input 
                            type="text" 
                            placeholder="Duração"
                            className="w-20 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                            value={item.duration}
                            onChange={(e) => updateItem('mentorship_content', index, 'duration', e.target.value)}
                          />
                           <select 
                            className="bg-black/20 border border-white/10 rounded text-xs text-gray-300 px-2"
                            value={item.type}
                            onChange={(e) => updateItem('mentorship_content', index, 'type', e.target.value)}
                          >
                            <option value="Vídeo Aula">Vídeo</option>
                            <option value="Documento">Doc</option>
                            <option value="Audio">Áudio</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              // ARTIST VIEW (Existing)
              <div className="space-y-6">
                {/* Social Media Metrics */}
                <Card className="space-y-4">
                  <div className="font-bold text-beatwap-gold flex items-center gap-2">
                    <Instagram size={20} /> Métricas Instagram
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <AnimatedInput label="Seguidores" value={data.instagram_metrics.followers} onChange={(e) => updateMetric('instagram_metrics', 'followers', e.target.value)} />
                    <AnimatedInput label="Frequência" value={data.instagram_metrics.frequency} onChange={(e) => updateMetric('instagram_metrics', 'frequency', e.target.value)} />
                    <AnimatedInput label="Engajamento" value={data.instagram_metrics.engagement} onChange={(e) => updateMetric('instagram_metrics', 'engagement', e.target.value)} />
                    <AnimatedInput label="Crescimento" value={data.instagram_metrics.growth} onChange={(e) => updateMetric('instagram_metrics', 'growth', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Análise/Interpretação</label>
                    <textarea 
                      className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                      rows={2}
                      value={data.instagram_metrics.interpretation}
                      onChange={(e) => updateMetric('instagram_metrics', 'interpretation', e.target.value)}
                    />
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="font-bold text-beatwap-gold flex items-center gap-2">
                    <Music size={20} /> Métricas TikTok
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnimatedInput label="Seguidores" value={data.tiktok_metrics.followers} onChange={(e) => updateMetric('tiktok_metrics', 'followers', e.target.value)} />
                    <AnimatedInput label="Média Views" value={data.tiktok_metrics.views_avg} onChange={(e) => updateMetric('tiktok_metrics', 'views_avg', e.target.value)} />
                    <AnimatedInput label="Melhor Conteúdo" value={data.tiktok_metrics.top_content} onChange={(e) => updateMetric('tiktok_metrics', 'top_content', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Análise/Interpretação</label>
                    <textarea 
                      className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                      rows={2}
                      value={data.tiktok_metrics.interpretation}
                      onChange={(e) => updateMetric('tiktok_metrics', 'interpretation', e.target.value)}
                    />
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="font-bold text-beatwap-gold flex items-center gap-2">
                    <Youtube size={20} /> Métricas YouTube
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <AnimatedInput label="Inscritos" value={data.youtube_metrics.subs} onChange={(e) => updateMetric('youtube_metrics', 'subs', e.target.value)} />
                    <AnimatedInput label="Vídeo Top" value={data.youtube_metrics.top_video} onChange={(e) => updateMetric('youtube_metrics', 'top_video', e.target.value)} />
                    <AnimatedInput label="Freq. Ideal" value={data.youtube_metrics.freq_ideal} onChange={(e) => updateMetric('youtube_metrics', 'freq_ideal', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Análise/Interpretação</label>
                    <textarea 
                      className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
                      rows={2}
                      value={data.youtube_metrics.interpretation}
                      onChange={(e) => updateMetric('youtube_metrics', 'interpretation', e.target.value)}
                    />
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="font-bold text-beatwap-gold">Diagnóstico Geral</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AnimatedInput 
                      label="Alcance" 
                      value={data.diagnosis.reach || ''} 
                      onChange={(e) => setData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, reach: e.target.value } }))} 
                    />
                    <AnimatedInput 
                      label="Presença Digital" 
                      value={data.diagnosis.presence || ''} 
                      onChange={(e) => setData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, presence: e.target.value } }))} 
                    />
                    <AnimatedInput 
                      label="Estratégia" 
                      value={data.diagnosis.strategy || ''} 
                      onChange={(e) => setData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, strategy: e.target.value } }))} 
                    />
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 ml-1">Pronto para shows?</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, ready_for_shows: true } }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold border ${data.diagnosis.ready_for_shows ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-white/10 text-gray-400'}`}
                        >
                          Sim
                        </button>
                        <button 
                          onClick={() => setData(prev => ({ ...prev, diagnosis: { ...prev.diagnosis, ready_for_shows: false } }))}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold border ${!data.diagnosis.ready_for_shows ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-white/10 text-gray-400'}`}
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-beatwap-gold">Plano de Ação</div>
                    <AnimatedButton onClick={() => addItem('action_plan', { task: '', status: 'pending', link: '' })} size="sm" variant="secondary"><Plus size={16} /> Adicionar Item</AnimatedButton>
                  </div>
                  <div className="space-y-3">
                    {data.action_plan.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" 
                            placeholder="Tarefa"
                            className="w-full bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-white pb-1"
                            value={item.task}
                            onChange={(e) => updateItem('action_plan', index, 'task', e.target.value)}
                          />
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Link (opcional)"
                              className="flex-1 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                              value={item.link || ''}
                              onChange={(e) => updateItem('action_plan', index, 'link', e.target.value)}
                            />
                            <select 
                              className="bg-black/20 border border-white/10 rounded text-xs text-gray-300 px-2"
                              value={item.status}
                              onChange={(e) => updateItem('action_plan', index, 'status', e.target.value)}
                            >
                              <option value="pending">Pendente</option>
                              <option value="done">Concluído</option>
                            </select>
                          </div>
                        </div>
                        <button onClick={() => removeItem('action_plan', index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                    {data.action_plan.length === 0 && <div className="text-gray-500 italic text-sm text-center py-4">Nenhum item no plano de ação.</div>}
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-beatwap-gold">Sugestões BeatWap (Curadoria)</div>
                    <AnimatedButton onClick={() => addItem('suggestions', { text: '' })} size="sm" variant="secondary"><Plus size={16} /> Adicionar Sugestão</AnimatedButton>
                  </div>
                  <div className="space-y-3">
                    {data.suggestions.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start bg-white/5 p-3 rounded-xl border border-white/10">
                        <textarea 
                          className="w-full bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-white pb-1 text-sm"
                          rows={2}
                          value={item.text}
                          onChange={(e) => updateItem('suggestions', index, 'text', e.target.value)}
                          placeholder="Escreva a sugestão aqui..."
                        />
                        <button onClick={() => removeItem('suggestions', index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                          <Trash size={16} />
                        </button>
                      </div>
                    ))}
                    {data.suggestions.length === 0 && <div className="text-gray-500 italic text-sm text-center py-4">Nenhuma sugestão cadastrada.</div>}
                  </div>
                </Card>

                <Card className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-beatwap-gold">Conteúdo de Mentoria (Mini Aulas)</div>
                    <AnimatedButton onClick={() => addItem('mentorship_content', { title: '', duration: '5 min', type: 'Vídeo Aula', url: '' })} size="sm" variant="secondary"><Plus size={16} /> Adicionar Aula</AnimatedButton>
                  </div>
                  <div className="space-y-3">
                    {data.mentorship_content.map((item, index) => (
                      <div key={index} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Título da Aula"
                            className="flex-1 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-white pb-1"
                            value={item.title}
                            onChange={(e) => updateItem('mentorship_content', index, 'title', e.target.value)}
                          />
                          <button onClick={() => removeItem('mentorship_content', index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash size={16} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Link (URL)"
                            className="flex-1 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                            value={item.url || ''}
                            onChange={(e) => updateItem('mentorship_content', index, 'url', e.target.value)}
                          />
                          <input 
                            type="text" 
                            placeholder="Duração"
                            className="w-20 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                            value={item.duration}
                            onChange={(e) => updateItem('mentorship_content', index, 'duration', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
