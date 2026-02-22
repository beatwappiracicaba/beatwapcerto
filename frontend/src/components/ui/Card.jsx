import React from 'react';
import { motion } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={twMerge("bg-beatwap-graphite rounded-2xl border border-white/5 p-4 md:p-6 shadow-xl", className)}
    >
      {children}
    </motion.div>
  );
};
