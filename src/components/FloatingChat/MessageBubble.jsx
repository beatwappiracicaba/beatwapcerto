import React from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

export const MessageBubble = ({ message, isOwn }) => {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-[80%] rounded-2xl p-3 relative group ${
          isOwn 
            ? 'bg-beatwap-gold text-black rounded-tr-none' 
            : 'bg-white/10 text-white rounded-tl-none'
        }`}
      >
        {message.context && (
          <div className={`text-xs mb-2 p-2 rounded ${
            isOwn ? 'bg-black/10' : 'bg-black/20'
          }`}>
            <span className="font-bold block uppercase tracking-wider opacity-70">{message.context.type}</span>
            {message.context.title}
          </div>
        )}
        
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        
        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
          isOwn ? 'text-black/60' : 'text-white/50'
        }`}>
          {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          {isOwn && (
            message.read ? <CheckCheck size={12} /> : <Check size={12} />
          )}
        </div>
      </motion.div>
    </div>
  );
};
