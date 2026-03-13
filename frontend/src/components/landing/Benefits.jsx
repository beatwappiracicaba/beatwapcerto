import { motion } from 'framer-motion';
import { Headphones, Search, Rocket, Heart } from 'lucide-react';

const BenefitCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    whileInView={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -10 }}
    viewport={{ once: true }}
    transition={{ duration: 0.3, delay }}
    className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-beatwap-gold/30 hover:bg-white/10 transition-all duration-300 group cursor-default"
  >
    <div className="w-14 h-14 bg-beatwap-gold/10 rounded-xl flex items-center justify-center mb-6 text-beatwap-gold group-hover:scale-110 transition-transform duration-300">
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-beatwap-gold transition-colors">{title}</h3>
    <p className="text-gray-400 leading-relaxed">
      {description}
    </p>
  </motion.div>
);

const Benefits = () => {
  const benefits = [
    {
      icon: Headphones,
      title: 'Simplicidade no envio',
      description: 'Interface intuitiva projetada para artistas. Sem burocracias desnecessárias ou termos complicados.',
    },
    {
      icon: Search,
      title: 'Transparência no processo',
      description: 'Saiba exatamente onde sua música está, quanto rendeu e quando você receberá seus royalties.',
    },
    {
      icon: Rocket,
      title: 'Plataforma moderna',
      description: 'Tecnologia de ponta com validações automáticas para evitar rejeições e acelerar seu lançamento.',
    },
    {
      icon: Heart,
      title: 'Foco no artista independente',
      description: 'Entendemos as dores do artista independente e construímos ferramentas para impulsionar sua carreira.',
    },
  ];

  return (
    <section id="benefits" className="py-24 bg-beatwap-dark relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-1/2 left-0 w-96 h-96 bg-beatwap-gold/10 rounded-full blur-[100px] transform -translate-x-1/2 -translate-y-1/2"></div>
         <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] transform translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-2xl">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-bold text-white mb-6"
            >
              Por que escolher a <span className="text-beatwap-gold">BeatWap</span>?
            </motion.h2>
          </div>

          <motion.div
             initial={{ opacity: 0, x: 20 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="text-right hidden md:block"
          >
             <p className="text-gray-400 font-medium">Feito por quem ama música <br/> para quem faz música.</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, index) => (
            <BenefitCard 
              key={index}
              {...benefit}
              delay={index * 0.1}
            />
          ))}
        </div>
        
        {/* Target Audience Section */}
        <div className="mt-20 pt-10 border-t border-white/5">
           <h3 className="text-center text-xl font-bold text-white mb-10">Ideal para</h3>
           <div className="flex flex-wrap justify-center gap-6">
              {['Artistas Independentes', 'Produtores Musicais', 'Selos pequenos'].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium hover:border-beatwap-gold hover:text-beatwap-gold transition-colors cursor-default"
                  >
                    {item}
                  </motion.div>
              ))}
           </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
