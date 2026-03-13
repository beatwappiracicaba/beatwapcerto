import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AnimatedButton } from '../ui/AnimatedButton';
import { Play, ArrowRight } from 'lucide-react';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-beatwap-dark z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-beatwap-dark/80 via-beatwap-dark/90 to-beatwap-dark"></div>
        
        {/* Animated Particles/Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1], 
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-beatwap-gold/20 rounded-full blur-[100px]"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.2, 0.1], 
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]"
        />
      </div>

      <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-beatwap-gold/10 border border-beatwap-gold/20 text-beatwap-gold text-sm font-bold mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-beatwap-gold animate-pulse"></span>
            Produtora/Selo a caminho de ser uma Distribuidora Independente
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            Sua música merece <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-beatwap-gold to-yellow-300">
              o mundo
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-lg leading-relaxed">
            Envie, acompanhe e gerencie seus lançamentos com a BeatWap.
          </p>
          
          <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xl">
            <p className="text-white font-bold text-lg">
              Produção Musical com a BeatWap
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Produzimos músicas e shows, cuidamos do Instagram e redes sociais, temos parcerias para DVD, clipes e audiovisual, e um espaço no estúdio para gravações de vídeo. Também fazemos sessões de voz e violão do jeito que você quiser.
            </p>
            <div className="mt-4">
              <AnimatedButton 
                onClick={() => window.open('https://wa.me/5519981083497?text=' + encodeURIComponent('Olá! Quero cotar serviços da BeatWap: produção musical e de shows, gestão de Instagram/redes, parcerias para DVD/clipes/audiovisual e uso do estúdio para gravações (inclui voz e violão).'), '_blank')}
                className="px-6 py-3"
              >
                Cote agora mesmo
              </AnimatedButton>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <AnimatedButton 
              onClick={() => navigate('/login')} 
              className="px-8 py-4 text-lg shadow-xl shadow-beatwap-gold/20"
            >
              Área do Artista <ArrowRight className="ml-2" size={20} />
            </AnimatedButton>
            
            <button className="px-8 py-4 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              <Play size={20} className="text-beatwap-gold fill-beatwap-gold" /> Ver como funciona
            </button>
          </div>
        </motion.div>

        {/* Visual Element - Sound Waves */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden md:flex items-center justify-center h-full min-h-[400px]"
        >
          {/* Sound Wave Animation */}
          <div className="flex items-center gap-2 h-64">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="w-4 bg-gradient-to-t from-beatwap-gold/20 via-beatwap-gold to-beatwap-gold/20 rounded-full"
                animate={{
                  height: ["20%", "100%", "20%"],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                  repeatType: "mirror"
                }}
              />
            ))}
          </div>
          
          {/* Abstract Circle Backdrop */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
