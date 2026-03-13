import { motion } from 'framer-motion';
import { Ghost } from 'lucide-react';

export const EmptyState = ({ 
  icon: Icon = Ghost, 
  title = "Nada por aqui...", 
  description = "Não encontramos nenhum item para mostrar no momento.",
  action
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5"
    >
      <div className="w-20 h-20 bg-beatwap-gold/10 rounded-full flex items-center justify-center mb-6 text-beatwap-gold">
        <Icon size={40} />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mb-6">{description}</p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </motion.div>
  );
};
