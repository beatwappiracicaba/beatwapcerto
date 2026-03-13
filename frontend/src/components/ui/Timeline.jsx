import { motion } from 'framer-motion';
import { Clock, AlertCircle, Send, Globe } from 'lucide-react';
import { clsx } from 'clsx';

const steps = [
  { id: 'uploaded', label: 'Upload Realizado', icon: Clock },
  { id: 'review', label: 'Em Análise', icon: AlertCircle },
  { id: 'adjustments', label: 'Ajustes', icon: AlertCircle }, // Optional step
  { id: 'sent', label: 'Enviada', icon: Send },
  { id: 'published', label: 'Publicada', icon: Globe },
];

export const Timeline = ({ currentStatus }) => {
  // Map status to step index
  const statusMap = {
    'uploaded': 0,
    'review': 1,
    'adjustments': 2,
    'approved': 3, // Skips adjustments if approved
    'sent': 3,
    'published': 4
  };

  const activeIndex = statusMap[currentStatus] || 0;

  // Filter out adjustments step if not relevant or handled differently
  const filteredSteps = steps.filter(step => {
    if (step.id === 'adjustments' && currentStatus !== 'adjustments' && currentStatus !== 'rejected') return false;
    return true;
  });

  return (
    <div className="relative">
      {/* Horizontal Line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 rounded-full" />
      <div 
        className="absolute top-1/2 left-0 h-1 bg-beatwap-gold -translate-y-1/2 rounded-full transition-all duration-1000"
        style={{ width: `${(activeIndex / (filteredSteps.length - 1)) * 100}%` }}
      />

      <div className="relative flex justify-between">
        {filteredSteps.map((step, index) => {
          const isActive = index <= activeIndex;
          const isCurrent = index === activeIndex;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 group cursor-help relative">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isActive ? '#F5C542' : '#1C1C1E',
                  borderColor: isActive ? '#F5C542' : '#333'
                }}
                className={`w-10 h-10 rounded-full border-4 flex items-center justify-center z-10 transition-colors duration-500`}
              >
                <Icon size={16} className={isActive ? 'text-black' : 'text-gray-500'} />
              </motion.div>
              
              <span className={clsx(
                "text-xs font-medium transition-colors duration-300 absolute -bottom-8 whitespace-nowrap",
                isActive ? "text-beatwap-gold" : "text-gray-500"
              )}>
                {step.label}
              </span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-3 py-1 rounded-lg text-xs whitespace-nowrap pointer-events-none">
                {isActive ? 'Concluído em 24/01/2026' : 'Aguardando'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
