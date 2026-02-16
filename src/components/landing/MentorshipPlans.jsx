import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Lock, Zap, TrendingUp, Award } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useAuth } from '../../context/AuthContext';

const MentorshipPlans = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'annual'

  const openPlan = (planLabel, value) => {
    try {
      const artistName = profile?.nome || profile?.nome_completo_razao_social || '';
      const cycleText = billingCycle === 'monthly' ? 'Mensal' : 'Anual';
      const msg = artistName 
        ? `Olá! Tenho interesse no ${planLabel} (${cycleText} - ${value}) - Artista: ${artistName}` 
        : `Olá! Tenho interesse no ${planLabel} (${cycleText} - ${value})`;
      
      const wa = 'https://wa.me/5519981083497?text=' + encodeURIComponent(msg);
      window.open(wa, '_blank');
    } catch (e) {
      console.warn('Falha ao abrir WhatsApp');
    }
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-black to-beatwap-black relative overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-beatwap-gold/10 text-beatwap-gold font-bold text-sm mb-6 border border-beatwap-gold/20">
            <Zap size={16} />
            NOVIDADE
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Planos de Mentoria & Marketing</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Acelere sua carreira com acompanhamento estratégico e ferramentas exclusivas.
          </p>
          
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center mt-8 gap-4">
            <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Mensal</span>
            <button 
              className="w-16 h-8 bg-white/10 rounded-full relative p-1 transition-colors hover:bg-white/20"
              onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annual' : 'monthly')}
            >
              <div className={`w-6 h-6 bg-beatwap-gold rounded-full shadow-lg transform transition-transform duration-300 ${billingCycle === 'annual' ? 'translate-x-8' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-bold ${billingCycle === 'annual' ? 'text-white' : 'text-gray-500'}`}>
              Anual <span className="text-beatwap-gold text-xs ml-1">(2 meses grátis)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* PLANO BÁSICO */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-beatwap-gold/50 transition-all duration-300 group flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-beatwap-gold mb-1">PLANO BÁSICO — Impulso</h3>
              <p className="text-gray-400 text-sm">Pra quem está começando e precisa de direção</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                {billingCycle === 'monthly' ? 'R$ 29,90' : 'R$ 299,00'}
              </span>
              <span className="text-gray-400 text-sm">
                {billingCycle === 'monthly' ? '/mês' : '/ano'}
              </span>
            </div>
            
            <div className="flex-grow space-y-4 mb-8">
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Diagnóstico do perfil artístico ou compositor</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Plano de ação básico mensal</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Acesso à aba Marketing & Mentoria</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Conteúdos educativos (vídeos/textos)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Sugestões personalizadas</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Acesso às oportunidades disponíveis</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Check size={16} className="text-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Mensagens motivacionais e metas</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500">
                  <Lock size={16} className="text-gray-600 mt-0.5 flex-shrink-0" /> 
                  <span>Sem mentoria individual</span>
                </li>
              </ul>
            </div>

            <div className="mt-auto">
              <div className="text-center mb-4">
                <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full text-white">
                  🎯 Ideal pra iniciantes
                </span>
              </div>
              <AnimatedButton 
                variant="outline" 
                className="w-full" 
                onClick={() => openPlan('Plano Básico - Impulso', billingCycle === 'monthly' ? 'R$ 29,90' : 'R$ 299,00')}
              >
                Começar Agora
              </AnimatedButton>
            </div>
          </div>

          {/* PLANO INTERMEDIÁRIO */}
          <div className="bg-gradient-to-b from-beatwap-gold/10 to-transparent border border-beatwap-gold rounded-3xl p-8 relative transform md:-translate-y-4 shadow-xl shadow-beatwap-gold/10 flex flex-col">
            <div className="absolute top-0 right-0 bg-beatwap-gold text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
              <TrendingUp size={12} /> MELHOR CUSTO-BENEFÍCIO
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-beatwap-gold mb-1">PLANO INTERMEDIÁRIO — Crescimento</h3>
              <p className="text-gray-400 text-sm">Pra quem quer evoluir mais rápido</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                {billingCycle === 'monthly' ? 'R$ 59,90' : 'R$ 599,00'}
              </span>
              <span className="text-gray-400 text-sm">
                {billingCycle === 'monthly' ? '/mês' : '/ano'}
              </span>
            </div>
            
            <div className="flex-grow space-y-4 mb-8">
              <p className="text-sm text-white font-medium border-b border-white/10 pb-2">
                Inclui tudo do plano Impulso +
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-white font-medium">
                  <Star size={16} className="text-beatwap-gold fill-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>1 mentoria individual por mês (30 min)</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white font-medium">
                  <Star size={16} className="text-beatwap-gold fill-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Análise de perfil / músicas / catálogo</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white font-medium">
                  <Star size={16} className="text-beatwap-gold fill-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Feedback estratégico personalizado</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white font-medium">
                  <Star size={16} className="text-beatwap-gold fill-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Prioridade em oportunidades</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white font-medium">
                  <Star size={16} className="text-beatwap-gold fill-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Acompanhamento de metas</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-white font-medium">
                  <Star size={16} className="text-beatwap-gold fill-beatwap-gold mt-0.5 flex-shrink-0" /> 
                  <span>Suporte direto via WhatsApp</span>
                </li>
              </ul>
            </div>

            <div className="mt-auto">
              <div className="text-center mb-4">
                <span className="text-xs font-bold bg-beatwap-gold/20 text-beatwap-gold px-3 py-1 rounded-full">
                  🔥 Mais Popular
                </span>
              </div>
              <AnimatedButton 
                className="w-full bg-beatwap-gold text-black hover:bg-white" 
                onClick={() => openPlan('Plano Intermediário - Crescimento', billingCycle === 'monthly' ? 'R$ 59,90' : 'R$ 599,00')}
              >
                Quero Crescer
              </AnimatedButton>
            </div>
          </div>

          {/* PLANO AVANÇADO */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-beatwap-gold/50 transition-all duration-300 group flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-beatwap-gold mb-1">PLANO AVANÇADO — Profissional</h3>
              <p className="text-gray-400 text-sm">Pra quem quer tratar carreira como negócio</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                {billingCycle === 'monthly' ? 'R$ 99,90' : 'R$ 999,00'}
              </span>
              <span className="text-gray-400 text-sm">
                {billingCycle === 'monthly' ? '/mês' : '/ano'}
              </span>
            </div>
            
            <div className="flex-grow space-y-4 mb-8">
              <p className="text-sm text-gray-300 border-b border-white/10 pb-2">
                Inclui tudo do plano Crescimento +
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Award size={16} className="text-purple-400 mt-0.5 flex-shrink-0" /> 
                  <span>2 mentorias individuais por mês</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Award size={16} className="text-purple-400 mt-0.5 flex-shrink-0" /> 
                  <span>Plano estratégico trimestral</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Award size={16} className="text-purple-400 mt-0.5 flex-shrink-0" /> 
                  <span>Análise profunda de posicionamento</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Award size={16} className="text-purple-400 mt-0.5 flex-shrink-0" /> 
                  <span>Suporte prioritário</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Award size={16} className="text-purple-400 mt-0.5 flex-shrink-0" /> 
                  <span>Avaliação contínua de oportunidades</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-300">
                  <Award size={16} className="text-purple-400 mt-0.5 flex-shrink-0" /> 
                  <span>Acesso antecipado a novidades</span>
                </li>
              </ul>
            </div>

            <div className="mt-auto">
              <div className="text-center mb-4">
                <span className="text-xs font-bold bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full">
                  🎯 Para Profissionais
                </span>
              </div>
              <AnimatedButton 
                variant="outline" 
                className="w-full" 
                onClick={() => openPlan('Plano Avançado - Profissional', billingCycle === 'monthly' ? 'R$ 99,90' : 'R$ 999,00')}
              >
                Ser Profissional
              </AnimatedButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MentorshipPlans;
