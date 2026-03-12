import React from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/images/beatwap-logo.png';

export const LoadingScreen = ({ active = true, onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-beatwap-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (!active) onComplete?.();
      }}
    >
      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <motion.div
            className="w-24 h-24 rounded-full border-4 border-beatwap-gold/30"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              filter: [
                "drop-shadow(0 0 6px rgba(245,197,66,0.2))",
                "drop-shadow(0 0 14px rgba(245,197,66,0.6))",
                "drop-shadow(0 0 6px rgba(245,197,66,0.2))"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img src={logo} alt="BeatWap" className="w-10 h-10 object-contain select-none pointer-events-none" />
          </motion.div>
        </div>
        
        <motion.p
          className="mt-8 text-beatwap-gold/60 text-sm tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          BeatWap
        </motion.p>
      </div>
    </motion.div>
  );
};
