import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, Instagram, Youtube, Music, Smartphone, 
  Target, Zap, BookOpen, MessageCircle, Send, FileText,
  AlertCircle, CheckCircle, Clock, BarChart3, Lock,
  Play, Download, ExternalLink, DollarSign, Shield, Mic2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

export const DashboardMarketing = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isCompositor = user?.cargo === 'Compositor';

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
              <span>{isCompositor ? 'Dicas estratégicas' : 'Métricas automáticas em desenvolvimento'}</span>
            </div>
            <p className="text-gray-400 mt-2 max-w-2xl text-sm">
              {isCompositor 
                ? 'Acesse materiais exclusivos para impulsionar suas vendas, proteger suas obras e conectar com grandes artistas.'
                : 'No momento, as informações abaixo são analisadas pela equipe BeatWap com base nos dados públicos e enviados por você. Isso garante uma análise humana e estratégica para sua carreira.'
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
          {/* 1. Métricas / Guia do Compositor */}
          <motion.div variants={item}>
            {isCompositor ? (
              <>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BookOpen className="text-beatwap-gold" />
                  Guia do Compositor de Sucesso
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Registro de Obras */}
                  <Card className="space-y-4 hover:border-beatwap-gold/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                        <Shield size={24} />
                      </div>
                      <span className="font-bold text-lg">Direitos Autorais</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>Garanta seus royalties registrando suas obras em associações (UBC, ABRAMUS, ECAD).</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-500 mt-2">
                        <li>ISRC é o RG da sua música</li>
                        <li>Registre antes de lançar</li>
                        <li>Mantenha o cadastro atualizado</li>
                      </ul>
                    </div>
                  </Card>

                  {/* Venda de Composições */}
                  <Card className="space-y-4 hover:border-beatwap-gold/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-500/10 rounded-lg text-green-400 group-hover:scale-110 transition-transform">
                        <DollarSign size={24} />
                      </div>
                      <span className="font-bold text-lg">Venda & Negociação</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>Entenda a diferença entre liberação exclusiva e não-exclusiva.</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-500 mt-2">
                        <li>Defina o valor base da obra</li>
                        <li>Contratos de cessão de direitos</li>
                        <li>Split sheets (divisão de % com parceiros)</li>
                      </ul>
                    </div>
                  </Card>

                  {/* Pitching */}
                  <Card className="space-y-4 hover:border-beatwap-gold/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                        <Mic2 size={24} />
                      </div>
                      <span className="font-bold text-lg">Pitching para Artistas</span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-400">
                      <p>Como apresentar suas músicas para grandes artistas e produtores.</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-500 mt-2">
                        <li>Guias de alta qualidade (Voz/Violão)</li>
                        <li>Seja breve e profissional</li>
                        <li>Pesquise o estilo do artista antes</li>
                      </ul>
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Smartphone className="text-beatwap-gold" />
                  Métricas das Redes Sociais
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Instagram */}
                  <Card className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Instagram className="text-pink-500" />
                      <span className="font-bold">Instagram</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Seguidores</span>
                        <span className="font-mono">{data?.instagram_metrics?.followers || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Frequência</span>
                        <span className="font-mono">{data?.instagram_metrics?.frequency || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Engajamento</span>
                        <span className="font-mono">{data?.instagram_metrics?.engagement || '-'}</span>
                      </div>
                    </div>
                    {data?.instagram_metrics?.interpretation && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm">
                        <div className="text-xs text-beatwap-gold font-bold mb-1">🧠 Interpretação</div>
                        <div className="text-gray-300 italic">"{data.instagram_metrics.interpretation}"</div>
                      </div>
                    )}
                  </Card>

                  {/* TikTok */}
                  <Card className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="text-cyan-400" />
                      <span className="font-bold">TikTok</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Seguidores</span>
                        <span className="font-mono">{data?.tiktok_metrics?.followers || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Visualizações (méd.)</span>
                        <span className="font-mono">{data?.tiktok_metrics?.views_avg || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Melhor conteúdo</span>
                        <span className="font-mono truncate max-w-[120px]">{data?.tiktok_metrics?.best_content || '-'}</span>
                      </div>
                    </div>
                    {data?.tiktok_metrics?.interpretation && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm">
                        <div className="text-xs text-beatwap-gold font-bold mb-1">🧠 Interpretação</div>
                        <div className="text-gray-300 italic">"{data.tiktok_metrics.interpretation}"</div>
                      </div>
                    )}
                  </Card>

                  {/* YouTube */}
                  <Card className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Youtube className="text-red-500" />
                      <span className="font-bold">YouTube</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Inscritos</span>
                        <span className="font-mono">{data?.youtube_metrics?.subscribers || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Vídeo destaque</span>
                        <span className="font-mono truncate max-w-[120px]">{data?.youtube_metrics?.best_video || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Visualizações</span>
                        <span className="font-mono">{data?.youtube_metrics?.views || '-'}</span>
                      </div>
                    </div>
                    {data?.youtube_metrics?.interpretation && (
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm">
                        <div className="text-xs text-beatwap-gold font-bold mb-1">🧠 Interpretação</div>
                        <div className="text-gray-300 italic">"{data.youtube_metrics.interpretation}"</div>
                      </div>
                    )}
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <Card className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-gray-400 text-sm mb-1">Alcance Total</div>
                    <div className="text-2xl font-bold text-white">{data?.diagnosis?.reach || '-'}</div>
                  </Card>
                  <Card className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-gray-400 text-sm mb-1">Presença Digital</div>
                    <div className="text-2xl font-bold text-white">{data?.diagnosis?.digital_presence || '-'}</div>
                  </Card>
                  <Card className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="text-gray-400 text-sm mb-1">Estratégia</div>
                    <div className="text-2xl font-bold text-white">{data?.diagnosis?.strategy || '-'}</div>
                  </Card>
                  <Card className="flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                    <div className="text-gray-400 text-sm mb-1">Pronto para Shows?</div>
                    <div className={`text-2xl font-bold ${data?.diagnosis?.show_readiness?.includes('Sim') ? 'text-green-400' : 'text-red-400'}`}>
                      {data?.diagnosis?.show_readiness || 'Ainda não'}
                    </div>
                    {data?.diagnosis?.show_readiness?.includes('não') && (
                      <div className="text-xs text-beatwap-gold mt-1">Ouro para mentoria</div>
                    )}
                  </Card>
                </div>
              </>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 3. Plano de Ação */}
            <motion.div variants={item} className="lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Zap className="text-beatwap-gold" />
                Plano de Ação Personalizado
              </h2>
              <Card className="space-y-4">
                {(data?.action_plan || []).length > 0 ? (
                  <div className="space-y-3">
                    {data.action_plan.map((plan, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-beatwap-gold/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${plan.completed ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                            {plan.completed && <CheckCircle size={12} className="text-black" />}
                          </div>
                          <span className={plan.completed ? 'text-gray-500 line-through' : 'text-white'}>
                            {plan.text}
                          </span>
                        </div>
                        <div className="flex gap-2 pl-8 sm:pl-0">
                      {plan.link && (
                        <button 
                          onClick={() => window.open(plan.link, '_blank')}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white/5 hover:bg-white/10 text-beatwap-gold transition-colors whitespace-nowrap"
                        >
                          Ver orientação
                        </button>
                      )}
                      <button 
                        onClick={() => window.open('https://wa.me/5519981083497', '_blank')}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-beatwap-gold hover:bg-beatwap-gold/90 text-black transition-colors whitespace-nowrap"
                      >
                        Falar com mentor
                      </button>
                    </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aguardando definição do plano de ação pela equipe.
                  </div>
                )}
              </Card>
            </motion.div>

            {/* 6. Sugestões Automáticas */}
            <motion.div variants={item}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Target className="text-beatwap-gold" />
                Sugestões BeatWap
              </h2>
              <div className="space-y-4">
                {(data?.suggestions || []).length > 0 ? (
                  data.suggestions.map((sug, idx) => (
                    <Card key={idx} className="bg-gradient-to-br from-white/5 to-white/[0.02]">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-beatwap-gold/10 rounded-lg text-beatwap-gold">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <div className="text-xs text-beatwap-gold font-bold mb-1">Sugestão Curada</div>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            "{sug.text}"
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Nenhuma sugestão no momento.
                    </div>
                  </Card>
                )}
              </div>
            </motion.div>
          </div>

          {/* 4. Conteúdo de Mentoria */}
          <motion.div variants={item}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="text-beatwap-gold" />
              Conteúdo de Mentoria
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(data?.mentorship_content || []).length > 0 ? (
                data.mentorship_content.map((content, i) => {
                  const hasLink = !!content.url;
                  const getIcon = () => {
                    if (!hasLink) return Lock;
                    if (content.type === 'Vídeo Aula') return Play;
                    if (content.type === 'Documento') return Download;
                    if (content.type === 'Audio') return Music;
                    return FileText;
                  };
                  const Icon = getIcon();

                  return (
                    <Card 
                      key={i} 
                      className={`group transition-all ${hasLink ? 'cursor-pointer hover:border-beatwap-gold/50' : 'cursor-not-allowed opacity-70'}`}
                      onClick={() => hasLink && window.open(content.url, '_blank')}
                    >
                      <div className="aspect-video bg-black/40 rounded-lg mb-3 flex items-center justify-center group-hover:bg-black/60 transition-colors relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${hasLink ? 'bg-beatwap-gold text-black' : 'bg-white/10 text-gray-400'}`}>
                          <Icon size={20} className={hasLink && content.type === 'Vídeo Aula' ? 'ml-1' : ''} />
                        </div>
                      </div>
                      <h3 className={`font-bold text-sm leading-tight transition-colors ${hasLink ? 'group-hover:text-beatwap-gold' : 'text-gray-400'}`}>
                        {content.title}
                      </h3>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span className="bg-white/5 px-2 py-0.5 rounded">{content.type || 'Vídeo Aula'}</span>
                        <span>{content.duration || '5 min'}</span>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-gray-500 border border-dashed border-white/10 rounded-xl">
                  Em breve novos conteúdos de mentoria para você.
                </div>
              )}
            </div>
          </motion.div>

          {/* 5. Comunicação Direta */}
          <motion.div variants={item}>
            <Card className="bg-gradient-to-r from-beatwap-graphite to-black">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Precisa de ajuda específica?</h2>
                  <p className="text-gray-400 mb-6">
                    Nossa equipe de mentores está pronta para analisar seu caso individualmente.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <AnimatedButton 
                      onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                      className="bg-green-600 hover:bg-green-500 border-none text-white"
                      icon={MessageCircle}
                    >
                      Falar no WhatsApp
                    </AnimatedButton>
                    <AnimatedButton 
                      variant="secondary"
                      icon={FileText}
                    >
                      Enviar Material
                    </AnimatedButton>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-beatwap-gold/30 transition-all text-left group">
                    <div className="p-2 bg-beatwap-gold/10 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                      <BarChart3 className="text-beatwap-gold" size={20} />
                    </div>
                    <div className="font-bold text-sm">Solicitar Análise</div>
                    <div className="text-xs text-gray-400 mt-1">Perfil completo</div>
                  </button>
                  <button className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-beatwap-gold/30 transition-all text-left group">
                    <div className="p-2 bg-beatwap-gold/10 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                      <Target className="text-beatwap-gold" size={20} />
                    </div>
                    <div className="font-bold text-sm">Mentoria Individual</div>
                    <div className="text-xs text-gray-400 mt-1">Agendar horário</div>
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 7. Footer Notice */}
          <motion.div variants={item} className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400">
              <TrendingUp size={16} className="text-beatwap-gold" />
              <span>Em breve: Métricas automáticas, gráficos de crescimento e comparação de desempenho.</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};
