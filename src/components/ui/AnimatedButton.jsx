import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const AnimatedButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className, 
  isLoading = false,
  fullWidth = false,
  type = 'button'
}) => {
  const baseStyles = "relative px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden";
  
  const variants = {
    primary: "bg-beatwap-gold text-beatwap-black hover:shadow-[0_0_20px_rgba(245,197,66,0.4)]",
    secondary: "bg-transparent border border-beatwap-gold/30 text-beatwap-gold hover:bg-beatwap-gold/10",
    danger: "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20"
  };

  return (
    <motion.button
      type={type}
      className={twMerge(baseStyles, variants[variant], fullWidth && "w-full", className)}
      onClick={onClick}
      disabled={isLoading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        children
      )}
      {variant === 'primary' && (
        <motion.div
          className="absolute inset-0 bg-white/20"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
};
