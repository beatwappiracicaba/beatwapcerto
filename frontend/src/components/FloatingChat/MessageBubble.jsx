import React from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, User as UserIcon } from 'lucide-react';

export const MessageBubble = ({ message, isOwn, avatarUrl }) => {
  const displayName = message.senderName || (isOwn ? 'Você' : (message.sender === 'admin' ? 'Produtor' : 'Usuário'));

  return (
    <div className={`flex items-end mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <div className="mr-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-beatwap-gold font-bold">
                {displayName.substring(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-[80%] rounded-2xl p-3 relative group ${
          isOwn 
            ? 'bg-beatwap-gold text-black rounded-tr-none' 
            : 'bg-white/10 text-white rounded-tl-none'
        }`}
      >
        <div className="text-[10px] font-bold mb-1">
          <span className={isOwn ? 'text-black/60' : 'text-beatwap-gold/80'}>
            {displayName}
          </span>
        </div>

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

      {isOwn && (
        <div className="ml-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
            <UserIcon size={16} className="text-black/60" />
          </div>
        </div>
      )}
    </div>
  );
};
