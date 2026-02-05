import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../context/ToastContext';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { Card } from '../ui/Card';
import { Plus, Trash, Save, Loader } from 'lucide-react';

export const MarketingManager = ({ artistId }) => {
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
    mentorship_content: []
  });

  useEffect(() => {
    if (artistId) loadData();
  }, [artistId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: existingData, error } = await supabase
        .from('artist_marketing')
        .select('*')
        .eq('artist_id', artistId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (existingData) {
        setData({
          instagram_metrics: existingData.instagram_metrics || {},
          tiktok_metrics: existingData.tiktok_metrics || {},
          youtube_metrics: existingData.youtube_metrics || {},
          diagnosis: existingData.diagnosis || {},
          action_plan: existingData.action_plan || [],
          suggestions: existingData.suggestions || [],
          mentorship_content: (existingData.mentorship_content && existingData.mentorship_content.length > 0) ? existingData.mentorship_content : [
            { title: "Como crescer no Instagram sem gastar", duration: "5 min", type: "Vídeo Aula" },
            { title: "O que postar quando não tem show", duration: "5 min", type: "Vídeo Aula" },
            { title: "Quando impulsionar ou não", duration: "5 min", type: "Vídeo Aula" },
            { title: "Como transformar seguidor em público", duration: "5 min", type: "Vídeo Aula" }
          ]
        });
      } else {
        // Reset defaults if no data exists
        setData({
          instagram_metrics: { followers: '', frequency: '', engagement: '', growth: '', interpretation: '' },
          tiktok_metrics: { followers: '', views_avg: '', top_content: '', interpretation: '' },
          youtube_metrics: { subs: '', top_video: '', freq_ideal: '', interpretation: '' },
          diagnosis: { reach: '', presence: '', strategy: '', ready_for_shows: false },
          action_plan: [],
          suggestions: [],
          mentorship_content: [
            { title: "Como crescer no Instagram sem gastar", duration: "5 min", type: "Vídeo Aula" },
            { title: "O que postar quando não tem show", duration: "5 min", type: "Vídeo Aula" },
            { title: "Quando impulsionar ou não", duration: "5 min", type: "Vídeo Aula" },
            { title: "Como transformar seguidor em público", duration: "5 min", type: "Vídeo Aula" }
          ]
        });
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
      addToast('Dados de marketing salvos com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving marketing data:', error);
      addToast('Erro ao salvar dados', 'error');
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

  const addActionItem = () => {
    setData(prev => ({
      ...prev,
      action_plan: [...prev.action_plan, { task: '', status: 'pending', link: '' }]
    }));
  };

  const updateActionItem = (index, field, value) => {
    const newPlan = [...data.action_plan];
    newPlan[index] = { ...newPlan[index], [field]: value };
    setData(prev => ({ ...prev, action_plan: newPlan }));
  };

  const removeActionItem = (index) => {
    const newPlan = data.action_plan.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, action_plan: newPlan }));
  };

  const addSuggestion = () => {
    setData(prev => ({
      ...prev,
      suggestions: [...prev.suggestions, { text: '' }]
    }));
  };

  const updateSuggestion = (index, value) => {
    const newSuggestions = [...data.suggestions];
    newSuggestions[index] = { ...newSuggestions[index], text: value };
    setData(prev => ({ ...prev, suggestions: newSuggestions }));
  };

  const removeSuggestion = (index) => {
    const newSuggestions = data.suggestions.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, suggestions: newSuggestions }));
  };

  const addMentorshipContent = () => {
    setData(prev => ({
      ...prev,
      mentorship_content: [...prev.mentorship_content, { title: '', duration: '5 min', type: 'Vídeo Aula' }]
    }));
  };

  const updateMentorshipContent = (index, field, value) => {
    const newContent = [...data.mentorship_content];
    newContent[index] = { ...newContent[index], [field]: value };
    setData(prev => ({ ...prev, mentorship_content: newContent }));
  };

  const removeMentorshipContent = (index) => {
    const newContent = data.mentorship_content.filter((_, i) => i !== index);
    setData(prev => ({ ...prev, mentorship_content: newContent }));
  };

  if (loading) return <div className="p-4 text-center"><Loader className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Gerenciar Marketing</h3>
        <AnimatedButton onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
          {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar Alterações
        </AnimatedButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instagram */}
        <Card className="space-y-3">
          <div className="font-bold text-pink-500">Instagram</div>
          <AnimatedInput 
            label="Seguidores" 
            value={data.instagram_metrics.followers || ''} 
            onChange={(e) => updateMetric('instagram_metrics', 'followers', e.target.value)} 
          />
          <AnimatedInput 
            label="Frequência" 
            value={data.instagram_metrics.frequency || ''} 
            onChange={(e) => updateMetric('instagram_metrics', 'frequency', e.target.value)} 
          />
          <AnimatedInput 
            label="Engajamento" 
            value={data.instagram_metrics.engagement || ''} 
            onChange={(e) => updateMetric('instagram_metrics', 'engagement', e.target.value)} 
          />
          <AnimatedInput 
            label="Crescimento" 
            value={data.instagram_metrics.growth || ''} 
            onChange={(e) => updateMetric('instagram_metrics', 'growth', e.target.value)} 
          />
          <div className="space-y-1">
            <label className="text-xs text-gray-400 ml-1">Interpretação</label>
            <textarea 
              className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors text-sm"
              rows={2}
              value={data.instagram_metrics.interpretation || ''}
              onChange={(e) => updateMetric('instagram_metrics', 'interpretation', e.target.value)}
            />
          </div>
        </Card>

        {/* TikTok */}
        <Card className="space-y-3">
          <div className="font-bold text-white">TikTok</div>
          <AnimatedInput 
            label="Seguidores" 
            value={data.tiktok_metrics.followers || ''} 
            onChange={(e) => updateMetric('tiktok_metrics', 'followers', e.target.value)} 
          />
          <AnimatedInput 
            label="Média Views" 
            value={data.tiktok_metrics.views_avg || ''} 
            onChange={(e) => updateMetric('tiktok_metrics', 'views_avg', e.target.value)} 
          />
          <AnimatedInput 
            label="Top Content" 
            value={data.tiktok_metrics.top_content || ''} 
            onChange={(e) => updateMetric('tiktok_metrics', 'top_content', e.target.value)} 
          />
          <div className="space-y-1">
            <label className="text-xs text-gray-400 ml-1">Interpretação</label>
            <textarea 
              className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors text-sm"
              rows={2}
              value={data.tiktok_metrics.interpretation || ''}
              onChange={(e) => updateMetric('tiktok_metrics', 'interpretation', e.target.value)}
            />
          </div>
        </Card>

        {/* YouTube */}
        <Card className="space-y-3">
          <div className="font-bold text-red-500">YouTube</div>
          <AnimatedInput 
            label="Inscritos" 
            value={data.youtube_metrics.subs || ''} 
            onChange={(e) => updateMetric('youtube_metrics', 'subs', e.target.value)} 
          />
          <AnimatedInput 
            label="Vídeo Destaque" 
            value={data.youtube_metrics.top_video || ''} 
            onChange={(e) => updateMetric('youtube_metrics', 'top_video', e.target.value)} 
          />
          <AnimatedInput 
            label="Freq. Ideal" 
            value={data.youtube_metrics.freq_ideal || ''} 
            onChange={(e) => updateMetric('youtube_metrics', 'freq_ideal', e.target.value)} 
          />
          <div className="space-y-1">
            <label className="text-xs text-gray-400 ml-1">Interpretação</label>
            <textarea 
              className="w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors text-sm"
              rows={2}
              value={data.youtube_metrics.interpretation || ''}
              onChange={(e) => updateMetric('youtube_metrics', 'interpretation', e.target.value)}
            />
          </div>
        </Card>
      </div>

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
          <AnimatedButton onClick={addActionItem} size="sm" variant="secondary"><Plus size={16} /> Adicionar Item</AnimatedButton>
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
                  onChange={(e) => updateActionItem(index, 'task', e.target.value)}
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Link (opcional)"
                    className="flex-1 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                    value={item.link || ''}
                    onChange={(e) => updateActionItem(index, 'link', e.target.value)}
                  />
                  <select 
                    className="bg-black/20 border border-white/10 rounded text-xs text-gray-300 px-2"
                    value={item.status}
                    onChange={(e) => updateActionItem(index, 'status', e.target.value)}
                  >
                    <option value="pending">Pendente</option>
                    <option value="done">Concluído</option>
                  </select>
                </div>
              </div>
              <button onClick={() => removeActionItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
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
          <AnimatedButton onClick={addSuggestion} size="sm" variant="secondary"><Plus size={16} /> Adicionar Sugestão</AnimatedButton>
        </div>
        <div className="space-y-3">
          {data.suggestions.map((item, index) => (
            <div key={index} className="flex gap-2 items-start bg-white/5 p-3 rounded-xl border border-white/10">
              <textarea 
                className="w-full bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-white pb-1 text-sm"
                rows={2}
                value={item.text}
                onChange={(e) => updateSuggestion(index, e.target.value)}
                placeholder="Escreva a sugestão aqui..."
              />
              <button onClick={() => removeSuggestion(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
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
          <AnimatedButton onClick={addMentorshipContent} size="sm" variant="secondary"><Plus size={16} /> Adicionar Aula</AnimatedButton>
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
                  onChange={(e) => updateMentorshipContent(index, 'title', e.target.value)}
                />
                <button onClick={() => removeMentorshipContent(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                  <Trash size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Duração (ex: 5 min)"
                  className="w-24 bg-transparent border-b border-white/10 focus:border-beatwap-gold outline-none text-xs text-gray-300 pb-1"
                  value={item.duration}
                  onChange={(e) => updateMentorshipContent(index, 'duration', e.target.value)}
                />
                <select 
                  className="bg-black/20 border border-white/10 rounded text-xs text-gray-300 px-2"
                  value={item.type}
                  onChange={(e) => updateMentorshipContent(index, 'type', e.target.value)}
                >
                  <option value="Vídeo Aula">Vídeo Aula</option>
                  <option value="Artigo">Artigo</option>
                  <option value="Audio">Áudio</option>
                </select>
              </div>
            </div>
          ))}
          {data.mentorship_content.length === 0 && <div className="text-gray-500 italic text-sm text-center py-4">Nenhum conteúdo de mentoria.</div>}
        </div>
      </Card>
    </div>
  );
};
