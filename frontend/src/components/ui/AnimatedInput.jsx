import { motion } from 'framer-motion';

export const AnimatedInput = ({ 
  label, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  error,
  icon: Icon
}) => {
  return (
    <div className="w-full space-y-2">
      {label && <label className="text-sm text-gray-400 ml-1">{label}</label>}
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
            <Icon size={18} />
          </div>
        )}
        <motion.input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-beatwap-graphite/50 border border-white/10 rounded-xl px-4 py-3 ${Icon ? 'pl-12' : ''} text-white placeholder-gray-600 focus:outline-none focus:border-beatwap-gold/50 transition-colors`}
          whileFocus={{ scale: 1.01, borderColor: '#F5C542', boxShadow: '0 0 15px rgba(245, 197, 66, 0.1)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        />
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-xs ml-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};
