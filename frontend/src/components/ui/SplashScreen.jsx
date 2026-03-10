import React from 'react';
import { motion } from 'framer-motion';
import logo from '../../assets/images/beatwap-logo.png';

export const SplashScreen = ({ active = true, onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (!active) onComplete?.();
      }}
    >
      <div className="relative flex flex-col items-center justify-center">
        {/* Pulsing Glow Effect */}
        <motion.div
          className="absolute inset-0 bg-beatwap-gold/20 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Logo Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Logo Mark */}
          <div className="w-32 h-32 mb-6 flex items-center justify-center">
            <img src={logo} alt="BeatWap Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,197,66,0.5)]" />
          </div>

          {/* Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-3xl font-bold text-white tracking-widest mb-2"
          >
            BEATWAP
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-sm text-beatwap-gold/80 tracking-widest uppercase"
          >
            Preparando sua experiência musical...
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
};
