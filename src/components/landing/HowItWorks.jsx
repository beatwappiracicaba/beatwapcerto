import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Upload, Activity, Globe } from 'lucide-react';

const Step = ({ icon: Icon, number, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="relative flex flex-col items-center text-center group"
  >
    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 relative group-hover:border-beatwap-gold/50 transition-colors duration-300">
      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-beatwap-gold text-black font-bold flex items-center justify-center text-sm shadow-lg shadow-beatwap-gold/20">
        {number}
      </div>
      <Icon size={32} className="text-gray-400 group-hover:text-beatwap-gold transition-colors duration-300" />
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
      {description}
    </p>
    
    {/* Connector Line (except for last item) */}
    {number !== 4 && (
      <div className="hidden md:block absolute top-8 left-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10 transform translate-x-1/2"></div>
    )}
  </motion.div>
);

const HowItWorks = () => {
  const steps = [
    {
      icon: UserPlus,
      title: 'Crie sua conta',
      description: 'Cadastre-se gratuitamente em poucos segundos e tenha acesso ao painel do artista.',
    },
    {
      icon: Upload,
      title: 'Envie sua música',
      description: 'Faça o upload dos seus arquivos de áudio e capa com nosso checklist inteligente.',
    },
    {
      icon: Activity,
      title: 'Acompanhe o status',
      description: 'Receba atualizações em tempo real sobre a análise e aprovação do seu lançamento.',
    },
    {
      icon: Globe,
      title: 'Sua música publicada',
      description: 'Sua música disponível nas maiores plataformas digitais do mundo.',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-black relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-4"
          >
            Como Funciona
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 max-w-2xl mx-auto"
          >
            Simplificamos o processo complexo de distribuição para que você foque apenas no que importa: sua música.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {steps.map((step, index) => (
            <Step 
              key={index}
              number={index + 1}
              {...step}
              delay={index * 0.2}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
