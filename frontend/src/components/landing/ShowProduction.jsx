import { motion } from 'framer-motion';
import { Sparkles, Zap, Award, Check, Star, TrendingUp, Music, Mic } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';

const ShowProduction = () => {
  const plans = [
    {
      title: "PLANO START",
      subtitle: "PARA QUEM ESTÁ COMEÇANDO",
      description: "Ideal para artistas iniciantes que querem organizar e profissionalizar o show.",
      price: "500",
      features: [
        "Organização estratégica de repertório",
        "Ajuste de sequência das músicas",
        "Estruturação do roteiro do show",
        "Direção básica de palco",
        "Uso de VS profissional (se disponível)"
      ],
      note: "*Gravação de novos VS cobrada à parte*",
      icon: Sparkles,
      highlight: false,
      buttonText: "Quero Começar Profissional"
    },
    {
      title: "PLANO PRO",
      subtitle: "MAIS ESCOLHIDO",
      description: "Show em multipista profissional, abertura personalizada e direção artística.",
      price: "2.000",
      features: [
        "Show em multipista profissional",
        "Criação de abertura personalizada",
        "Drops e vinhetas exclusivas",
        "Direção artística",
        "Ajuste completo de dinâmica",
        "Estratégia de entrada/encerramento"
      ],
      icon: Zap,
      highlight: true,
      badge: "Mais Escolhido",
      buttonText: "Quero Evoluir Meu Show"
    },
    {
      title: "PLANO ELITE",
      subtitle: "NÍVEL PROFISSIONAL",
      description: "Produção completa, identidade sonora e estrutura de grandes eventos.",
      price: "4.000",
      features: [
        "Produção completa personalizada",
        "Multipista exclusiva",
        "Identidade sonora do show",
        "Direção completa de palco",
        "Planejamento de impacto",
        "Estrutura padrão grandes eventos"
      ],
      icon: Award,
      highlight: false,
      buttonText: "Quero Show Nível Profissional"
    }
  ];

  const benefits = [
    { text: "Aumenta seu valor de cachê", icon: TrendingUp },
    { text: "Passa mais profissionalismo", icon: Star },
    { text: "Diferencial competitivo", icon: Award },
    { text: "Mais impacto no público", icon: Mic },
    { text: "Mais chances de fechar eventos", icon: Music }
  ];

  return (
    <section className="py-20 bg-black relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-beatwap-gold/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Profissionalize <span className="text-beatwap-gold">Seu Show</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto"
          >
            Mesmo começando, seu show pode ter nível profissional.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col h-full rounded-2xl border ${plan.highlight ? 'border-beatwap-gold bg-beatwap-gold/5 scale-105 shadow-2xl shadow-beatwap-gold/10' : 'border-white/10 bg-white/5'} p-8 hover:border-beatwap-gold/30 transition-all duration-300`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-beatwap-gold text-black font-bold px-4 py-1 rounded-full text-sm flex items-center gap-2 shadow-lg">
                  <Star size={14} fill="black" />
                  {plan.badge}
                </div>
              )}

              <div className={`w-16 h-16 rounded-2xl ${plan.highlight ? 'bg-beatwap-gold text-black' : 'bg-white/10 text-white'} flex items-center justify-center mb-6 mx-auto transition-transform duration-300 group-hover:scale-110`}>
                <plan.icon size={32} />
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.title}</h3>
                <span className="text-xs font-bold tracking-wider text-beatwap-gold uppercase">{plan.subtitle}</span>
              </div>

              <p className="text-gray-400 text-center text-sm mb-8 min-h-[40px]">{plan.description}</p>

              <div className="text-center mb-8">
                <span className="text-sm text-gray-400">Investimento</span>
                <div className="flex items-baseline justify-center gap-1">
                  {plan.price !== "500" && <span className="text-sm text-gray-500">A partir de</span>}
                  <div className="text-4xl font-bold text-white">
                    R$ {plan.price}
                  </div>
                </div>
                {plan.note && (
                  <p className="text-[10px] text-gray-500 mt-2 max-w-[200px] mx-auto italic">{plan.note}</p>
                )}
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={18} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-beatwap-gold' : 'text-gray-600'}`} />
                    <span className="text-gray-300 text-sm text-left">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <AnimatedButton 
                  fullWidth 
                  variant={plan.highlight ? 'primary' : 'outline'}
                  onClick={() => window.open('https://wa.me/5519981810467', '_blank')}
                  className={plan.highlight ? 'shadow-lg shadow-beatwap-gold/20' : ''}
                >
                  {plan.buttonText}
                </AnimatedButton>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Why Produce Section */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Por que produzir seu show?</h3>
            <p className="text-gray-400">Investir na produção é o passo fundamental para elevar sua carreira.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col items-center text-center gap-4 p-4 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 hover:border-beatwap-gold/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-beatwap-gold/10 text-beatwap-gold flex items-center justify-center">
                  <benefit.icon size={24} />
                </div>
                <span className="text-sm font-medium text-gray-200">{benefit.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShowProduction;
