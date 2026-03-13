import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card } from './Card';

export const Checklist = ({ items }) => {
  return (
    <Card className="bg-beatwap-graphite/50">
      <h3 className="text-lg font-bold text-white mb-4">Checklist de Qualidade</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-black/20"
          >
            <div className="mt-0.5">
              {item.valid ? (
                <CheckCircle2 className="text-green-500" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${item.valid ? 'text-white' : 'text-red-400'}`}>
                {item.label}
              </p>
              {!item.valid && item.error && (
                <p className="text-xs text-gray-500 mt-1">{item.error}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {items.every(i => i.valid) ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm"
        >
          <CheckCircle2 size={16} />
          <span>Tudo pronto para o envio!</span>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-yellow-500 text-sm"
        >
          <AlertTriangle size={16} />
          <span>Corrija os itens acima para continuar.</span>
        </motion.div>
      )}
    </Card>
  );
};
