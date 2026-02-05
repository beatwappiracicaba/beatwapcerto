import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Instagram, Youtube, Music, Smartphone, 
  Target, Zap, BookOpen, MessageCircle, Send, FileText,
  AlertCircle, CheckCircle, Clock, BarChart3, Lock,
  Play, Download, ExternalLink, DollarSign, Shield, Mic2,
  CheckSquare, Star, Users, Briefcase
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

export const DashboardMarketing = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCompositor = ['Compositor', 'Produtor', 'compositor', 'produtor'].includes(user?.cargo);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const { data: marketingData } = await supabase
          .from('artist_marketing')
          .select('*')
          .eq('artist_id', user.id)
          .maybeSingle();
        
        setData(marketingData || {});
      } catch (error) {
        console.error('Error loading marketing data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const toggleComposerTask = async (index, currentStatus) => {
    if (!data?.composer_plan) return;
    
    const newPlan = [...data.composer_plan];
    newPlan[index] = { ...newPlan[index], checked: !currentStatus };
    
    // Optimistic update
    setData(prev => ({ ...prev, composer_plan: newPlan }));

    try {
      await supabase
        .from('artist_marketing')
        .update({ composer_plan: newPlan })
        .eq('artist_id', user.id);
    } catch (error) {
      console.error('Error updating task:', error);
      addToast('Erro ao atualizar tarefa', 'error');
      // Revert
      loadData();
    }
  };

  const handleSendPitch = () => {
    addToast('Pitch enviado para análise da equipe!', 'success');
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const diagnosis = data?.composer_diagnosis || {};
  const catalog = data?.composer_catalog || {};
  const positioning = data?.composer_positioning || {};
  const pitch = data?.composer_pitch || {};
  const rights = data?.composer_rights || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-beatwap-gold/20 via-beatwap-gold/5 to-transparent border border-beatwap-gold/20 p-6">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isCompositor ? 'Carreira & Negócios' : 'Mentoria & Marketing'}
            </h1>
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 w-fit px-3 py-1 rounded-full text-sm font-medium border border-yellow-500/20">
              <Clock size={16} />
              <span>{isCompositor ? 'Gestão de Carreira' : 'Métricas & Estratégia'}</span>
            </div>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm">
              {isCompositor 
                ? 'Painel estratégico para gerenciar seu catálogo, aprimorar seus pitches e acompanhar oportunidades de mercado.'
                : 'Análise estratégica baseada em dados reais e feedback da equipe BeatWap para impulsionar sua carreira artística.'
              }
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-beatwap-gold/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {isCompositor ? (
            // COMPOSITOR VIEW
            <>
              {/* 1. Diagnóstico */}
              <motion.div variants={item}>
                <Card className="p-6 border-l-4 border-l-beatwap-gold">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="text-beatwap-gold" size={24} />
                    <h2 className="text-xl font-bold text-white">Seu Perfil de Compositor</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Nível Atual</div>
                      <div className="text-lg font-bold text-white">{diagnosis.level || '-'}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Estilo Forte</div>
                      <div className="text-lg font-bold text-beatwap-gold">{diagnosis.style || '-'}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Ponto Forte</div>
                      <div className="text-lg font-bold text-green-400">{diagnosis.strengths || '-'}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">A Melhorar</div>
                      <div className="text-lg font-bold text-red-400">{diagnosis.improvements || '-'}</div>
                    </div>
                  </div>
                  {diagnosis.interpretation && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3">
                        <Zap className="text-blue-400 shrink-0 mt-1" size={18} />
                        <p className="text-sm text-blue-200 italic">"{diagnosis.interpretation}"</p>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* 2. Catálogo */}
              <motion.div variants={item}>
                <Card className="h-full p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Music className="text-purple-500" size={24} />
                    <h2 className="text-xl font-bold text-white">Catálogo de Composições</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-2xl font-bold text-white">{catalog.registered || 0}</div>
                      <div className="text-xs text-gray-400">Cadastradas</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-2xl font-bold text-yellow-500">{catalog.unpublished || 0}</div>
                      <div className="text-xs text-gray-400">Inéditas</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-2xl font-bold text-green-500">{catalog.recorded || 0}</div>
                      <div className="text-xs text-gray-400">Gravadas</div>
                    </div>
                    <div className="text-center p-4 bg-white/5 rounded-xl">
                      <div className="text-2xl font-bold text-blue-500">{catalog.negotiating || 0}</div>
                      <div className="text-xs text-gray-400">Em Negociação</div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* 3. Posicionamento */}
              <motion.div variants={item}>
                <Card className="h-full p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Target className="text-red-500" size={24} />
                    <h2 className="text-xl font-bold text-white">Posicionamento</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Público Alvo / Artistas</div>
                      <div className="text-white font-medium bg-white/5 px-3 py-2 rounded-lg">{positioning.target_audience || 'Não definido'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Seu Diferencial</div>
                      <div className="text-white font-medium bg-white/5 px-3 py-2 rounded-lg">{positioning.differential || 'Não definido'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Bio Profissional</div>
                      <p className="text-sm text-gray-300 italic bg-white/5 px-3 py-2 rounded-lg">{positioning.bio || 'Sem bio cadastrada.'}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* 4. Pitch (ESSENCIAL) */}
              <motion.div variants={item}>
                <Card className="p-6 border border-beatwap-gold/30 bg-gradient-to-b from-beatwap-gold/5 to-transparent">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <Mic2 className="text-beatwap-gold" size={24} />
                            <div>
                                <h2 className="text-xl font-bold text-white">Pitch de Músicas</h2>
                                <p className="text-xs text-beatwap-gold uppercase font-bold tracking-wider">Essencial</p>
                            </div>
                        </div>
                        <AnimatedButton onClick={handleSendPitch} className="bg-beatwap-gold text-black hover:bg-beatwap-gold/90">
                            Enviar para Análise
                        </AnimatedButton>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><Play size={14} /> Modelo de Áudio</h3>
                            {pitch.audio_url ? (
                                <a href={pitch.audio_url} target="_blank" rel="noopener noreferrer" className="block p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-blue-400 text-sm truncate transition-colors">
                                    {pitch.audio_url}
                                </a>
                            ) : (
                                <div className="text-gray-500 text-sm italic">Nenhum modelo disponível.</div>
                            )}
                            <p className="text-xs text-gray-400">Referência de voz e violão/guia.</p>
                        </div>
                        
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileText size={14} /> Texto Ideal</h3>
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-gray-300 text-sm min-h-[80px]">
                                {pitch.presentation_text || 'Aguardando modelo de texto...'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2 text-red-400"><AlertCircle size={14} /> Erros Comuns</h3>
                            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-red-200 text-sm min-h-[80px]">
                                {pitch.common_errors || 'Nenhum alerta registrado.'}
                            </div>
                        </div>
                    </div>
                </Card>
              </motion.div>

              {/* 5. Oportunidades */}
              <motion.div variants={item}>
                <Card className="h-full p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Briefcase className="text-blue-400" size={24} />
                    <h2 className="text-xl font-bold text-white">Oportunidades</h2>
                  </div>
                  <div className="space-y-3">
                    {(data?.composer_opportunities || []).map((opp, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                        <div>
                          <div className="font-bold text-white">{opp.title}</div>
                          <div className="text-xs text-gray-400">{opp.type}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          opp.status === 'Aberta' ? 'bg-green-500/20 border-green-500 text-green-400' :
                          opp.status === 'Em análise' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
                          opp.status === 'Selecionado' ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                          'bg-gray-500/20 border-gray-500 text-gray-400'
                        }`}>
                          {opp.status}
                        </span>
                      </div>
                    ))}
                    {(!data?.composer_opportunities || data.composer_opportunities.length === 0) && (
                      <div className="text-center py-8 text-gray-500">Nenhuma oportunidade ativa no momento.</div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* 6. Direitos Autorais */}
              <motion.div variants={item}>
                <Card className="h-full p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Shield className="text-gray-300" size={24} />
                    <h2 className="text-xl font-bold text-white">Direitos Autorais</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-gray-400">Músicas Registradas?</span>
                      <span className={`font-bold ${rights.registered === 'Sim' ? 'text-green-400' : rights.registered === 'Não' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {rights.registered || 'Não informado'}
                      </span>
                    </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Coautores Frequentes</div>
                                <div className="text-white text-sm bg-white/5 px-3 py-2 rounded-lg">{rights.coauthors || '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-400 mb-1">Percentuais Padrão</div>
                                <div className="text-white text-sm bg-white/5 px-3 py-2 rounded-lg">{rights.percentages || '-'}</div>
                            </div>
                            {rights.observations && (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-xs text-yellow-200">
                                    <span className="font-bold block mb-1">Nota:</span>
                                    {rights.observations}
                                </div>
                            )}
                        </div>
                    </Card>
                </motion.div>

              {/* 7. Plano de Crescimento */}
              <motion.div variants={item}>
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="text-green-400" size={24} />
                        <h2 className="text-xl font-bold text-white">Plano de Crescimento</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(data?.composer_plan || []).map((task, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => toggleComposerTask(idx, task.checked)}
                                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                    task.checked 
                                    ? 'bg-green-500/10 border-green-500/30 opacity-70' 
                                    : 'bg-white/5 border-white/10 hover:border-white/30'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                                    task.checked ? 'bg-green-500 border-green-500 text-black' : 'border-gray-500'
                                }`}>
                                    {task.checked && <CheckSquare size={14} />}
                                </div>
                                <span className={`text-sm ${task.checked ? 'text-green-200 line-through' : 'text-white'}`}>
                                    {task.task}
                                </span>
                            </div>
                        ))}
                        {(!data?.composer_plan || data.composer_plan.length === 0) && (
                            <div className="col-span-full text-center py-6 text-gray-500">Seu plano de crescimento será definido em breve.</div>
                        )}
                    </div>
                </Card>
              </motion.div>

              {/* 8. Mentoria */}
              <motion.div variants={item}>
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <BookOpen className="text-pink-400" size={24} />
                        <h2 className="text-xl font-bold text-white">Conteúdo de Mentoria</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(data?.mentorship_content || []).map((content, idx) => (
                            <a 
                                key={idx} 
                                href={content.url || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-beatwap-gold/50 p-4 rounded-xl transition-all"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs px-2 py-1 rounded bg-black/30 text-gray-400 border border-white/5">{content.type}</span>
                                    <ExternalLink size={14} className="text-gray-500 group-hover:text-beatwap-gold" />
                                </div>
                                <h3 className="font-bold text-white mb-1 group-hover:text-beatwap-gold transition-colors">{content.title}</h3>
                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Clock size={12} />
                                    <span>{content.duration}</span>
                                </div>
                            </a>
                        ))}
                         {(!data?.mentorship_content || data.mentorship_content.length === 0) && (
                            <div className="col-span-full text-center py-6 text-gray-500">Conteúdos em breve.</div>
                        )}
                    </div>
                </Card>
              </motion.div>
            </>
          ) : (
            // ARTIST VIEW (Existing/Enhanced)
            <>
              {/* Social Media Metrics */}
              <motion.div variants={item}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Instagram */}
                    <Card className="p-6 border-t-4 border-t-pink-500">
                        <div className="flex items-center gap-3 mb-4">
                            <Instagram className="text-pink-500" size={24} />
                            <h2 className="text-lg font-bold text-white">Instagram</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Seguidores</div>
                                    <div className="font-bold text-white">{data?.instagram_metrics?.followers || '-'}</div>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Crescimento</div>
                                    <div className="font-bold text-green-400">{data?.instagram_metrics?.growth || '-'}</div>
                                </div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <div className="text-xs text-gray-400">Engajamento</div>
                                <div className="font-bold text-white">{data?.instagram_metrics?.engagement || '-'}</div>
                            </div>
                            {data?.instagram_metrics?.interpretation && (
                                <div className="text-xs text-gray-300 italic border-l-2 border-pink-500 pl-2">
                                    "{data.instagram_metrics.interpretation}"
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* TikTok */}
                    <Card className="p-6 border-t-4 border-t-cyan-400">
                        <div className="flex items-center gap-3 mb-4">
                            <Music className="text-cyan-400" size={24} />
                            <h2 className="text-lg font-bold text-white">TikTok</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Seguidores</div>
                                    <div className="font-bold text-white">{data?.tiktok_metrics?.followers || '-'}</div>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Média Views</div>
                                    <div className="font-bold text-cyan-400">{data?.tiktok_metrics?.views_avg || '-'}</div>
                                </div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <div className="text-xs text-gray-400">Melhor Conteúdo</div>
                                <div className="font-bold text-white truncate">{data?.tiktok_metrics?.top_content || '-'}</div>
                            </div>
                            {data?.tiktok_metrics?.interpretation && (
                                <div className="text-xs text-gray-300 italic border-l-2 border-cyan-400 pl-2">
                                    "{data.tiktok_metrics.interpretation}"
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* YouTube */}
                    <Card className="p-6 border-t-4 border-t-red-500">
                        <div className="flex items-center gap-3 mb-4">
                            <Youtube className="text-red-500" size={24} />
                            <h2 className="text-lg font-bold text-white">YouTube</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white/5 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Inscritos</div>
                                    <div className="font-bold text-white">{data?.youtube_metrics?.subs || '-'}</div>
                                </div>
                                <div className="bg-white/5 p-2 rounded-lg">
                                    <div className="text-xs text-gray-400">Freq. Ideal</div>
                                    <div className="font-bold text-red-400">{data?.youtube_metrics?.freq_ideal || '-'}</div>
                                </div>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg">
                                <div className="text-xs text-gray-400">Vídeo Top</div>
                                <div className="font-bold text-white truncate">{data?.youtube_metrics?.top_video || '-'}</div>
                            </div>
                            {data?.youtube_metrics?.interpretation && (
                                <div className="text-xs text-gray-300 italic border-l-2 border-red-500 pl-2">
                                    "{data.youtube_metrics.interpretation}"
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
              </motion.div>

              {/* Diagnosis */}
              <motion.div variants={item}>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Target className="text-beatwap-gold" />
                    Diagnóstico de Carreira
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Alcance Atual</p>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-[60%]" />
                      </div>
                      <p className="text-white font-medium">{data?.diagnosis?.reach || 'Em análise'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Presença Digital</p>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[45%]" />
                      </div>
                      <p className="text-white font-medium">{data?.diagnosis?.presence || 'Em análise'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-400">Estratégia</p>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-[75%]" />
                      </div>
                      <p className="text-white font-medium">{data?.diagnosis?.strategy || 'Em análise'}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center">
                      <p className="text-sm text-gray-400 mb-1">Pronto para Shows?</p>
                      {data?.diagnosis?.ready_for_shows ? (
                        <div className="text-green-400 font-bold flex items-center justify-center gap-2">
                          <CheckCircle size={16} /> SIM
                        </div>
                      ) : (
                        <div className="text-yellow-400 font-bold flex items-center justify-center gap-2">
                          <Clock size={16} /> Em Preparação
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Action Plan */}
              <motion.div variants={item}>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="text-yellow-400" />
                    Plano de Ação
                  </h2>
                  <div className="space-y-3">
                    {(data?.action_plan || []).map((action, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-beatwap-gold/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${action.status === 'done' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {action.status === 'done' ? <CheckCircle size={16} /> : <Clock size={16} />}
                          </div>
                          <span className={action.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}>
                            {action.task}
                          </span>
                        </div>
                        {action.link && (
                          <a href={action.link} target="_blank" rel="noopener noreferrer" className="text-beatwap-gold hover:underline text-sm">
                            Acessar
                          </a>
                        )}
                      </div>
                    ))}
                    {(!data?.action_plan || data.action_plan.length === 0) && (
                        <div className="text-center text-gray-500 py-4">Nenhuma ação pendente.</div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Suggestions */}
              <motion.div variants={item}>
                <Card className="p-6 border border-beatwap-gold/30 bg-gradient-to-b from-beatwap-gold/5 to-transparent">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Star className="text-beatwap-gold" />
                    Sugestões da Curadoria
                  </h2>
                  <div className="space-y-3">
                    {(data?.suggestions || []).map((suggestion, idx) => (
                      <div key={idx} className="flex gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                        <div className="mt-1">
                            <Zap size={16} className="text-beatwap-gold" />
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed">
                            {suggestion.text}
                        </p>
                      </div>
                    ))}
                    {(!data?.suggestions || data.suggestions.length === 0) && (
                        <div className="text-center text-gray-500 py-4">Nenhuma sugestão disponível no momento.</div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Mentorship Content */}
              <motion.div variants={item}>
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <BookOpen className="text-blue-400" />
                    Conteúdo de Mentoria
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(data?.mentorship_content || []).map((content, idx) => (
                      <a 
                        key={idx} 
                        href={content.url || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="group block bg-white/5 hover:bg-white/10 border border-white/10 hover:border-beatwap-gold/50 p-4 rounded-xl transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-black/30 text-gray-400 border border-white/5">{content.type}</span>
                          <ExternalLink size={14} className="text-gray-500 group-hover:text-beatwap-gold" />
                        </div>
                        <h3 className="font-bold text-white mb-1 group-hover:text-beatwap-gold transition-colors">{content.title}</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>{content.duration}</span>
                        </div>
                      </a>
                    ))}
                     {(!data?.mentorship_content || data.mentorship_content.length === 0) && (
                        <div className="text-center col-span-full text-gray-500 py-4">Conteúdos em breve.</div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};
