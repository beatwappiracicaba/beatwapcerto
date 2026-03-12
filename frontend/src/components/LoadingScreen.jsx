import React from 'react';
import { motion } from 'framer-motion';

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
      <div className="relative flex flex-col items-center">
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
            textShadow: [
              "0 0 10px rgba(245,197,66,0.2)",
              "0 0 20px rgba(245,197,66,0.6)",
              "0 0 10px rgba(245,197,66,0.2)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-3xl font-bold text-beatwap-gold tracking-tighter">BW</span>
        </motion.div>
        
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
