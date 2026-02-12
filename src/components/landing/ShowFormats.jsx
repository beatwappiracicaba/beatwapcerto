import React from 'react';
import { motion } from 'framer-motion';
import { Mic2, Music2, Speaker, CheckCircle2, Star, Users } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';

const ShowFormats = () => {
  const formats = [
    {
      title: "PLANO ESSENCIAL",
      description: "Formato em VS profissional, setup rápido. Ideal para bares e eventos menores.",
      price: "1.200",
      features: [
        "Formato em VS profissional",
        "Setup rápido",
        "Ideal para bares e eventos menores",
        "Estrutura leve e econômica"
      ],
      icon: Mic2,
      highlight: false,
      buttonText: "Solicitar Orçamento"
    },
    {
      title: "PLANO PROFISSIONAL",
      description: "Show em multipista com músico adicional. Som mais encorpado para casas médias.",
      price: "3.000",
      features: [
        "Show em multipista",
        "+ 1 músico ao vivo",
        "Som mais encorpado",
        "Ideal para casas médias e eventos regionais"
      ],
      icon: Music2,
      highlight: true,
      badge: "Mais Escolhido",
      buttonText: "Quero Esse Formato"
    },
    {
      title: "PLANO COMPLETO",
      description: "Show completo com banda e estrutura profissional. Para grandes eventos.",
      price: "6.000",
      features: [
        "Show completo em multipista",
        "Banda ao vivo",
        "Estrutura profissional de palco",
        "Ideal para grandes eventos e prefeituras"
      ],
      icon: Users,
      highlight: false,
      buttonText: "Falar com Produção"
    }
  ];

  return (
    <section className="py-20 bg-beatwap-dark relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-beatwap-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6"
          >
            Escolha o Formato Ideal <span className="text-beatwap-gold">Para Seu Evento</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Temos opções acessíveis e profissionais para qualquer tipo de evento, do bar pequeno ao grande palco.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {formats.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative group rounded-2xl border ${plan.highlight ? 'border-beatwap-gold bg-beatwap-gold/5' : 'border-white/10 bg-white/5'} p-8 hover:border-beatwap-gold/50 transition-all duration-300`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-beatwap-gold text-black font-bold px-4 py-1 rounded-full text-sm flex items-center gap-2">
                  <Star size={14} fill="black" />
                  {plan.badge}
                </div>
              )}

              <div className={`w-14 h-14 rounded-xl ${plan.highlight ? 'bg-beatwap-gold text-black' : 'bg-white/10 text-white'} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                <plan.icon size={32} />
              </div>

              <h3 className="text-2xl font-bold text-white text-center mb-2">{plan.title}</h3>
              <p className="text-gray-400 text-center text-sm mb-6 min-h-[40px]">{plan.description}</p>

              <div className="text-center mb-8">
                <span className="text-sm text-gray-400">A partir de</span>
                <div className="text-4xl font-bold text-beatwap-gold">
                  R$ {plan.price}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className={`shrink-0 mt-0.5 ${plan.highlight ? 'text-beatwap-gold' : 'text-gray-500'}`} />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <AnimatedButton 
                  fullWidth 
                  variant={plan.highlight ? 'primary' : 'outline'}
                  onClick={() => window.open('https://wa.me/5519981810467', '_blank')}
                >
                  {plan.buttonText}
                </AnimatedButton>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShowFormats;
