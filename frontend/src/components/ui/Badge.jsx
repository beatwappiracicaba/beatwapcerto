import { motion } from 'framer-motion';

export const Badge = ({ icon: Icon, label, unlocked = false, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: unlocked ? 1 : 0.5, scale: 1 }}
      transition={{ delay }}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${unlocked ? 'bg-beatwap-gold/10 border-beatwap-gold/30' : 'bg-white/5 border-transparent'} transition-all`}
    >
      <div className={`p-3 rounded-full ${unlocked ? 'bg-beatwap-gold text-beatwap-black shadow-[0_0_15px_rgba(245,197,66,0.3)]' : 'bg-gray-800 text-gray-500'}`}>
        <Icon size={24} />
      </div>
      <span className={`text-xs font-bold text-center ${unlocked ? 'text-beatwap-gold' : 'text-gray-500'}`}>
        {label}
      </span>
    </motion.div>
  );
};
