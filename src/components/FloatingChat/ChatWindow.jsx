import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ArrowLeft, Search, User, UserCheck, Lock, Trash2, Plus, Users, Music, Briefcase, Bell } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { MessageBubble } from './MessageBubble';
import { AnimatedInput } from '../ui/AnimatedInput';

export const ChatWindow = ({ isAdmin = false, currentUserId }) => {
  const { 
    chats, 
    isOpen, 
    setIsOpen, 
    activeChatId, 
    setActiveChatId, 
    sendMessage, 
    getChatByArtist,
    createChat,
    admins,
    assignChat,
    deleteChat,
    loading,
    markChatRead,
    supportQueue,
    requestSupport,
    pickSupportRequest,
    sendNotification,
    sendBroadcast
  } = useChat();
  
  const { profile } = useAuth();
  const userRole = profile?.cargo || 'Artista';

  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('list'); // 'list', 'chat', 'new', 'queue', 'notifications'
  const [notificationForm, setNotificationForm] = useState({
    type: 'broadcast', // 'broadcast', 'specific'
    targetRole: 'all', // 'all', 'Artista', 'Vendedor', 'Compositor'
    targetId: '',
    title: '',
    message: ''
  });
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showNewMessageToast, setShowNewMessageToast] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, activeChatId, isOpen, mode]);

  useEffect(() => {
    const handlerOnline = () => setIsOnline(true);
    const handlerOffline = () => setIsOnline(false);
    window.addEventListener('online', handlerOnline);
    window.addEventListener('offline', handlerOffline);
    return () => {
      window.removeEventListener('online', handlerOnline);
      window.removeEventListener('offline', handlerOffline);
    };
  }, []);

  // Determine which chat is active
  const activeChat = chats.find(c => c.id === activeChatId);

  // Sync mode with activeChatId
  useEffect(() => {
    if (activeChatId) {
      setMode('chat');
    } else if (mode === 'chat' && !activeChatId) {
      setMode('list');
    }
  }, [activeChatId]);

  useEffect(() => {
    const id = activeChatId;
    if (isOpen && id) {
      markChatRead(id);
    }
  }, [isOpen, activeChatId, markChatRead]);

  useEffect(() => {
    const key = `chatDraft:${activeChatId || 'new'}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setInputText(stored);
    } else {
      setInputText('');
    }
  }, [activeChatId]);

  useEffect(() => {
    const key = `chatDraft:${activeChatId || 'new'}`;
    localStorage.setItem(key, inputText);
  }, [inputText, activeChatId]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (nearBottom) {
        setShowNewMessageToast(false);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef.current]);
 
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    const msgs = activeChat?.messages?.length || 0;
    const prev = (ChatWindow.__prevMsgCount || 0);
    if (msgs > prev && !nearBottom) {
      setShowNewMessageToast(true);
    }
    ChatWindow.__prevMsgCount = msgs;
  }, [chats, activeChatId, activeChat?.messages?.length, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!activeChatId) return;
    // For generalized chat, sender role logic is handled in Context/Backend usually,
    // but here we pass 'me' or 'admin' just for context if needed, mostly context handles it.
    // We just pass the text.
    await sendMessage(activeChatId, inputText, 'me'); // 'me' is a placeholder, Context uses profile
    setInputText('');
  };

  const handleAssign = async () => {
    if (activeChatId) {
      try {
        await assignChat(activeChatId);
      } catch (error) {
        console.error("Failed to assign chat", error);
      }
    }
  };
  
  const handleRequestSupport = async (role) => {
    const success = await requestSupport(role);
    if (success) {
      alert('Solicitação enviada! Aguarde um atendimento.');
      setMode('list');
    }
  };

  const handlePickRequest = async (request) => {
    const chatId = await pickSupportRequest(request);
    if (chatId) {
      setMode('chat');
    }
  };

  // Filter chats for list
  const filteredChats = chats
    .filter(c => 
      (c.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.artistName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getAssignedAdminName = (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    return admin ? admin.name : 'Usuário';
  };

  if (!isOpen) return null;

  const isAssignedToMe = activeChat?.assignedTo === currentUserId;
  const isAssignedToOther = activeChat?.assignedTo && activeChat?.assignedTo !== currentUserId;
  const isUnassigned = !activeChat?.assignedTo;
  
  // Logic for Queue Filtering
  const queueFilter = 
    userRole === 'Produtor' ? null : // All
    userRole === 'Vendedor' ? 'vendedor' :
    userRole === 'Compositor' ? 'compositor' : 
    'none'; // Artist shouldn't see queue usually
    
  const filteredQueue = supportQueue.filter(req => 
    queueFilter ? req.role_needed === queueFilter || (userRole === 'Produtor') : false
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-20 right-2 sm:right-6 w-[94vw] sm:w-96 h-[70vh] sm:h-[500px] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-beatwap-gold/10 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {(mode !== 'list') ? (
             <button onClick={() => {
               if (mode === 'chat') setActiveChatId(null);
               setMode('list');
             }} className="hover:bg-white/10 p-1 rounded-full">
               <ArrowLeft size={18} />
             </button>
          ) : null}
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              {mode === 'chat' 
                ? (activeChat?.artistName || 'Conversa') 
                : mode === 'new' ? 'Nova Conversa'
                : mode === 'queue' ? 'Solicitações'
                : mode === 'notifications' ? 'Enviar Notificação'
                : 'Mensagens'}
            </h3>
            
            {mode === 'chat' && (
              !activeChat?.assignedTo ? (
                 <p className={`text-xs flex items-center gap-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span> {isOnline ? 'Online' : 'Offline'}
                 </p>
              ) : (
                 <p className="text-xs text-beatwap-gold flex items-center gap-1">
                   <UserCheck size={12} />
                   {activeChat.assignedTo === currentUserId ? 'Você está atendendo' : `Atendido por ${getAssignedAdminName(activeChat.assignedTo)}`}
                 </p>
              )
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'list' && (
            <>
              {userRole === 'Produtor' && (
                <button 
                  onClick={() => setMode('notifications')} 
                  className="text-beatwap-gold hover:bg-white/10 p-1 rounded-full mr-1"
                  title="Enviar Notificações"
                >
                  <Bell size={20} />
                </button>
              )}
              <button 
                onClick={() => setMode('new')} 
                className="text-beatwap-gold hover:bg-white/10 p-1 rounded-full"
                title="Nova Conversa"
              >
                <Plus size={20} />
              </button>
            </>
          )}
          
          {mode === 'chat' && (
            <>
              <button 
                onClick={async () => {
                  if (window.confirm('Finalizar e apagar esta conversa para todos?')) {
                    try {
                      await deleteChat(activeChatId);
                      setActiveChatId(null);
                      setMode('list');
                    } catch (e) {
                      console.error('Falha ao apagar conversa', e);
                    }
                  }
                }} 
                className="text-red-400 hover:bg-red-500/10 p-1 rounded-full"
                title="Finalizar e Apagar"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-black/20 relative">
        
        {/* LIST MODE */}
        {mode === 'list' && (
          <div className="p-2 space-y-2">
            <div className="px-2 pb-2">
               <AnimatedInput 
                  placeholder="Buscar conversa..." 
                  icon={Search} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/40 border-white/5"
               />
            </div>
            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="mx-auto mb-2 opacity-20" size={32} />
                <p className="text-sm">Nenhuma conversa ativa.</p>
                <button onClick={() => setMode('new')} className="text-beatwap-gold text-sm mt-2 hover:underline">Iniciar nova conversa</button>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div 
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex gap-3 items-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative flex items-center justify-center">
                    {chat.artistAvatarUrl ? (
                      <img src={chat.artistAvatarUrl} alt={chat.artistName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-beatwap-gold">
                        <User size={20} />
                      </div>
                    )}
                    {chat.unreadCount > 0 && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-beatwap-gold rounded-full border border-[#121212]" />
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                     <div className="flex justify-between items-center">
                       <h4 className="font-bold text-sm text-white flex items-center gap-2 truncate">
                          {chat.artistName}
                       </h4>
                       <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                         {new Date(chat.lastMessageTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                       </span>
                     </div>
                     <p className="text-xs text-gray-400 truncate">
                        {chat.lastMessage || 'Inicie a conversa...'}
                     </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* NEW CHAT MODE */}
        {mode === 'new' && (
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-400 mb-4">Com quem você deseja falar?</p>
            
            {/* Options for Artist */}
            {(userRole === 'Artista' || userRole === 'Artist') && (
              <>
                <button onClick={() => handleRequestSupport('produtor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Falar com Produtor</h4>
                    <p className="text-xs text-gray-400">Tirar dúvidas e suporte</p>
                  </div>
                </button>
                <button onClick={() => handleRequestSupport('vendedor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Briefcase size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Falar com Vendedor</h4>
                    <p className="text-xs text-gray-400">Negócios e contratações</p>
                  </div>
                </button>
                <button onClick={() => handleRequestSupport('compositor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Music size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Falar com Compositor</h4>
                    <p className="text-xs text-gray-400">Comprar músicas inéditas</p>
                  </div>
                </button>
              </>
            )}

            {/* Options for Seller */}
            {(userRole === 'Vendedor') && (
              <>
                <button onClick={() => handleRequestSupport('produtor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Falar com Produtor</h4>
                    <p className="text-xs text-gray-400">Suporte administrativo</p>
                  </div>
                </button>
                <button onClick={() => setMode('queue')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><UserCheck size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Atender Artistas</h4>
                    <p className="text-xs text-gray-400">Ver solicitações de artistas</p>
                  </div>
                </button>
              </>
            )}

            {/* Options for Composer */}
            {(userRole === 'Compositor') && (
              <>
                <button onClick={() => handleRequestSupport('produtor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Falar com Produtor</h4>
                    <p className="text-xs text-gray-400">Suporte administrativo</p>
                  </div>
                </button>
                <button onClick={() => setMode('queue')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><UserCheck size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Atender Artistas</h4>
                    <p className="text-xs text-gray-400">Ver solicitações de artistas</p>
                  </div>
                </button>
              </>
            )}

            {/* Options for Producer */}
            {(userRole === 'Produtor') && (
              <>
                <button onClick={() => setMode('queue')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><UserCheck size={20} /></div>
                  <div>
                    <h4 className="font-bold text-white">Ver Solicitações</h4>
                    <p className="text-xs text-gray-400">Atender usuários precisando de ajuda</p>
                  </div>
                </button>
                {/* Future: Direct message search */}
              </>
            )}
          </div>
        )}

        {/* NOTIFICATIONS MODE */}
        {mode === 'notifications' && (
          <div className="p-4 space-y-4">
             <div className="space-y-2">
               <label className="text-xs text-gray-400">Tipo de Envio</label>
               <div className="flex gap-2">
                 <button 
                   onClick={() => setNotificationForm({...notificationForm, type: 'broadcast'})}
                   className={`flex-1 py-2 rounded text-sm ${notificationForm.type === 'broadcast' ? 'bg-beatwap-gold text-black font-bold' : 'bg-white/10 text-white'}`}
                 >
                   Geral / Grupo
                 </button>
                 <button 
                   onClick={() => setNotificationForm({...notificationForm, type: 'specific'})}
                   className={`flex-1 py-2 rounded text-sm ${notificationForm.type === 'specific' ? 'bg-beatwap-gold text-black font-bold' : 'bg-white/10 text-white'}`}
                 >
                   Individual
                 </button>
               </div>
             </div>

             {notificationForm.type === 'broadcast' ? (
               <div className="space-y-2">
                 <label className="text-xs text-gray-400">Público Alvo</label>
                 <select 
                    value={notificationForm.targetRole}
                    onChange={(e) => setNotificationForm({...notificationForm, targetRole: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm focus:border-beatwap-gold outline-none"
                 >
                   <option value="all">Todos os Usuários</option>
                   <option value="Artista">Apenas Artistas</option>
                   <option value="Vendedor">Apenas Vendedores</option>
                   <option value="Compositor">Apenas Compositores</option>
                 </select>
               </div>
             ) : (
               <div className="space-y-2">
                 <label className="text-xs text-gray-400">ID do Usuário</label>
                 <input 
                    type="text"
                    value={notificationForm.targetId}
                    onChange={(e) => setNotificationForm({...notificationForm, targetId: e.target.value})}
                    placeholder="Cole o UUID do usuário..."
                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm focus:border-beatwap-gold outline-none"
                 />
               </div>
             )}

             <div className="space-y-2">
               <label className="text-xs text-gray-400">Título</label>
               <input 
                  type="text"
                  value={notificationForm.title}
                  onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                  placeholder="Título da notificação"
                  className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm focus:border-beatwap-gold outline-none"
               />
             </div>

             <div className="space-y-2">
               <label className="text-xs text-gray-400">Mensagem</label>
               <textarea 
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                  placeholder="Escreva sua mensagem..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm focus:border-beatwap-gold outline-none resize-none"
               />
             </div>

             <button 
               onClick={handleSendNotification}
               className="w-full py-3 bg-beatwap-gold hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
             >
               <Send size={18} />
               Enviar Notificação
             </button>
          </div>
        )}

        {/* QUEUE MODE */}
        {mode === 'queue' && (
          <div className="p-2 space-y-2">
             <div className="px-2 pb-2 text-sm text-gray-400">
               Usuários aguardando atendimento ({filteredQueue.length})
             </div>
             {filteredQueue.length === 0 ? (
               <div className="text-center py-8 text-gray-500">
                 <p>Nenhuma solicitação pendente.</p>
               </div>
             ) : (
               filteredQueue.map(req => (
                 <div key={req.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                   <div className="flex gap-3 items-start">
                     <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative">
                        {req.requester?.avatar_url ? (
                          <img src={req.requester.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={20} /></div>
                        )}
                     </div>
                     <div className="flex-1">
                       <h4 className="font-bold text-white">{req.requester?.nome || req.requester?.nome_completo_razao_social || 'Usuário'}</h4>
                       <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                          {req.requester?.cidade && (
                            <span className="bg-black/40 px-2 py-0.5 rounded flex items-center gap-1">
                              📍 {req.requester.cidade} - {req.requester.estado}
                            </span>
                          )}
                          {req.requester?.genero_musical && (
                            <span className="bg-black/40 px-2 py-0.5 rounded flex items-center gap-1">
                              🎵 {req.requester.genero_musical}
                            </span>
                          )}
                          <span className="bg-beatwap-gold/10 text-beatwap-gold px-2 py-0.5 rounded">
                            {req.role_needed === 'produtor' ? 'Ajuda Produtor' : req.role_needed === 'vendedor' ? 'Interesse Venda' : 'Interesse Composição'}
                          </span>
                       </div>
                     </div>
                   </div>
                   <button 
                     onClick={() => handlePickRequest(req)}
                     className="w-full mt-3 py-2 bg-beatwap-gold text-black font-bold rounded-lg hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2 text-sm"
                   >
                     <UserCheck size={16} />
                     Pegar Atendimento
                   </button>
                 </div>
               ))
             )}
          </div>
        )}

        {/* CHAT MODE */}
        {mode === 'chat' && (
          <div className="p-4">
             {!activeChat?.messages?.length ? (
               <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-20 text-center">
                 <MessageCircle size={40} className="mb-2 opacity-20" />
                 <p className="text-sm">Escreva o que precisa e espere alguém responder.</p>
               </div>
             ) : (
               activeChat.messages.map(msg => (
                 <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isOwn={msg.sender === 'me'} 
                 />
               ))
             )}
             <div ref={messagesEndRef} />
             {showNewMessageToast && (
               <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-beatwap-gold text-black text-xs font-bold px-3 py-2 rounded-full shadow">
                 Novas mensagens
                 <button className="ml-2 underline" onClick={scrollToBottom}>Ver</button>
               </div>
             )}
          </div>
        )}

      </div>

      {/* Input Area */}
      {mode === 'chat' && (
        <div className="p-3 border-t border-white/10 bg-[#181818]">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (inputText.trim()) {
                      handleSend(e);
                    }
                  }
                }}
              />
              <button 
                type="submit" 
                disabled={!inputText.trim()}
                className="p-3 bg-beatwap-gold text-black rounded-xl hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
        </div>
      )}
    </motion.div>
  );
};
