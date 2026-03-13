import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Globe, Heart } from 'lucide-react';

const quotes = [
  {
    icon: Music,
    text: "Sua música merece o mundo.",
    sub: "Distribuição global simplificada."
  },
  {
    icon: Globe,
    text: "Cada lançamento importa.",
    sub: "Tratamos sua obra com o respeito que ela merece."
  },
  {
    icon: Heart,
    text: "Aqui sua arte é levada a sério.",
    sub: "Tecnologia feita por quem ama música."
  }
];

export const MotivationalPanel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const CurrentIcon = quotes[index].icon;

  return (
    <div className="hidden lg:flex w-1/2 bg-black relative overflow-hidden items-center justify-center p-12">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-beatwap-gold/10 via-transparent to-transparent opacity-50" />
      
      {/* Animated Particles (Simplified) */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-beatwap-gold rounded-full opacity-20"
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: i * 1,
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}

      <div className="z-10 max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-beatwap-gold/10 flex items-center justify-center text-beatwap-gold mb-8 border border-beatwap-gold/20">
              <CurrentIcon size={32} />
            </div>
            
            <h2 className="text-5xl font-bold leading-tight text-white">
              {quotes[index].text}
            </h2>
            
            <p className="text-xl text-gray-400 font-light">
              {quotes[index].sub}
            </p>
            
            <div className="h-1 w-24 bg-gradient-to-r from-beatwap-gold to-transparent rounded-full mt-8" />
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-12">
          {quotes.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-beatwap-gold' : 'w-2 bg-gray-700'}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};
