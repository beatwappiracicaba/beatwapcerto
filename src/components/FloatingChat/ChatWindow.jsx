import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ArrowLeft, Search, User, UserCheck, Lock, Trash2, Plus, Users, Music, Briefcase, Bell, ChevronLeft, Bot, Sparkles } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { MessageBubble } from './MessageBubble';
import { AnimatedInput } from '../ui/AnimatedInput';
import { AIAssistant } from './AIAssistant';

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
    sendBroadcast,
    fetchArtistsForSeller,
    updateChatStatus
  } = useChat();
  
  const { profile, user } = useAuth();
  const userRole = profile?.cargo || 'Artista';

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ai'
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('list'); // 'list', 'chat', 'new', 'queue', 'notifications', 'artists_list'
  const [availableArtists, setAvailableArtists] = useState([]);
  const [artistSearchTerm, setArtistSearchTerm] = useState('');
  const [notificationForm, setNotificationForm] = useState({
    type: 'broadcast', // 'broadcast', 'specific'
    targetRole: 'all', // 'all', 'Artista', 'Vendedor', 'Compositor'
    targetId: '',
    title: '',
    message: ''
  });
  const [allUsers, setAllUsers] = useState([]);
  const [requestSummary, setRequestSummary] = useState('');
  const [pendingRequestRole, setPendingRequestRole] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showNewMessageToast, setShowNewMessageToast] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'ia'

  const AUTO_HELP_QUESTIONS = {
    'Artista': [
      { question: 'Como enviar minha música?', answer: 'Para enviar sua música, acesse o menu "Minha Conta", clique em "Músicas" e depois no botão "Nova Música". Preencha os dados e faça o upload.' },
      { question: 'Como editar meu perfil?', answer: 'Vá em "Minha Conta" > "Perfil" para alterar sua foto, biografia e links de redes sociais.' },
      { question: 'Como ver meus pagamentos?', answer: 'Acesse o menu "Financeiro" para visualizar seu saldo e histórico de saques.' },
      { question: 'Minha música foi reprovada?', answer: 'Verifique o motivo no status da música. Corrija o arquivo ou as informações e envie novamente.' }
    ],
    'Vendedor': [
      { question: 'Como ver meus leads?', answer: 'No menu lateral, clique em "Leads" para visualizar seus clientes potenciais.' },
      { question: 'Como registrar vendas?', answer: 'Acesse "Vendas" ou "Financeiro" para registrar novas transações.' }
    ],
    'Compositor': [
      { question: 'Como cadastrar obras?', answer: 'No menu "Minhas Obras", clique em "Nova Obra" para cadastrar suas composições.' },
      { question: 'Como recebo royalties?', answer: 'Os royalties são calculados e repassados conforme seu contrato. Verifique no menu "Financeiro".' }
    ],
    'Produtor': [
      { question: 'Como aprovar artistas?', answer: 'Acesse o Painel Admin > Artistas Pendentes para revisar cadastros.' },
      { question: 'Como enviar notificações?', answer: 'Use o ícone de sino no topo da lista de conversas para enviar mensagens em massa ou individuais.' }
    ]
  };

  const getHelpQuestions = () => {
    return AUTO_HELP_QUESTIONS[userRole] || AUTO_HELP_QUESTIONS['Artista'];
  };

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
    
    const textToSend = inputText;
    setInputText(''); // Clear immediately (optimistic)

    await sendMessage(activeChatId, textToSend, 'me'); 
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
  
  const handleInitiateSupport = (role) => {
    setPendingRequestRole(role);
    setRequestSummary('');
    setMode('request_summary');
  };

  const handleSubmitSupportRequest = async () => {
    if (!requestSummary.trim()) {
      alert('Por favor, descreva brevemente o motivo do contato.');
      return;
    }
    const success = await requestSupport(pendingRequestRole, { summary: requestSummary });
    if (success) {
      alert('Solicitação enviada! Aguarde um atendimento.');
      setMode('list');
      setPendingRequestRole(null);
      setRequestSummary('');
    }
  };

  const handlePickRequest = async (request) => {
    const chatId = await pickSupportRequest(request);
    if (chatId) {
      setMode('chat');
    }
  };

  const handleArtistSelect = async (artistId) => {
    const chatId = await createChat(artistId);
    if (chatId) {
      setActiveChatId(chatId);
      setMode('chat');
    }
  };

  const handleLoadArtists = async () => {
    setMode('artists_list');
    const artists = await fetchArtistsForSeller();
    setAvailableArtists(artists);
  };

  const filteredArtists = availableArtists.filter(a => 
    (a.nome || '').toLowerCase().includes(artistSearchTerm.toLowerCase()) ||
    (a.nome_completo_razao_social || '').toLowerCase().includes(artistSearchTerm.toLowerCase())
  );

  useEffect(() => {
    if ((mode === 'new' || mode === 'notifications' || mode === 'users_list') && (userRole === 'Produtor' || userRole === 'admin')) {
      const fetchAll = async () => {
         const { data, error } = await supabase
           .from('profiles')
           .select('id, nome, nome_completo_razao_social, cargo, avatar_url') // Removed email/cidade/estado to avoid 400 error
           .order('nome', { ascending: true });
         
         if (error) {
           console.error('Error fetching profiles:', error);
           return;
         }
         if (data) setAllUsers(data);
      };
      fetchAll();
    }
  }, [mode, userRole]);

  const filteredUsers = allUsers.filter(u => 
    (u.nome || '').toLowerCase().includes(artistSearchTerm.toLowerCase()) || 
    (u.nome_completo_razao_social || '').toLowerCase().includes(artistSearchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(artistSearchTerm.toLowerCase())
  );

  const handleAcceptChat = async () => {
      if (!activeChatId) return;
      const success = await updateChatStatus(activeChatId, 'active');
      if (success) {
          // Force refresh or just UI update handled by optimistic
      }
  };

  const handleDeclineChat = async () => {
      if (!activeChatId) return;
      if (window.confirm('Tem certeza que deseja recusar esta conversa?')) {
          await deleteChat(activeChatId);
          setActiveChatId(null);
          setMode('list');
      }
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      alert('Preencha título e mensagem.');
      return;
    }

    try {
      if (notificationForm.type === 'broadcast') {
        const success = await sendBroadcast(
          notificationForm.title, 
          notificationForm.message, 
          notificationForm.targetRole,
          null
        );
        if (success) {
          alert('Notificação em massa enviada com sucesso!');
          setMode('list');
        }
      } else {
        if (!notificationForm.targetId) {
          alert('Informe o ID do usuário.');
          return;
        }
        const success = await sendNotification(
          notificationForm.targetId,
          notificationForm.title,
          notificationForm.message,
          null
        );
        if (success) {
          alert('Notificação enviada com sucesso!');
          setMode('list');
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Erro ao enviar notificação.');
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
    
  const filteredQueue = supportQueue.filter(req => {
    // Ensure producers see everything
    if (['Produtor', 'produtor', 'admin'].includes(userRole)) return true;
    return queueFilter ? req.role_needed === queueFilter : false;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className="fixed bottom-20 right-2 sm:right-6 w-[94vw] sm:w-96 h-[70vh] sm:h-[500px] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-beatwap-gold/10 border-b border-white/10 flex flex-col">
        {/* Top Bar */}
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {(mode !== 'list' && activeTab === 'chat') ? (
               <button onClick={() => {
                 if (mode === 'chat') setActiveChatId(null);
                 setMode('list');
               }} className="hover:bg-white/10 p-1 rounded-full">
                 <ArrowLeft size={18} />
               </button>
            ) : null}
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                {activeTab === 'ai' ? (
                  <>
                    <Bot size={18} className="text-beatwap-gold" />
                    <span>Assistente IA</span>
                  </>
                ) : (
                  mode === 'chat' 
                    ? (activeChat?.artistName || 'Conversa') 
                    : mode === 'new' ? 'Nova Conversa'
                    : mode === 'queue' ? 'Solicitações'
                    : mode === 'request_summary' ? 'Motivo do Contato'
                    : mode === 'notifications' ? 'Enviar Notificação'
                    : 'Mensagens'
                )}
              </h3>
              
              {activeTab === 'chat' && mode === 'chat' && (
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
              {activeTab === 'ai' && (
                <p className="text-xs text-beatwap-gold flex items-center gap-1">
                  <Sparkles size={10} />
                  <span>Online • Powered by BeatWap AI</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'chat' && mode === 'list' && (
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
                  className="text-beatwap-gold hover:bg-white/10 px-2 py-1 rounded-full flex items-center gap-1 transition-colors"
                  title="Nova Conversa"
                >
                  <Plus size={20} />
                  <span className="text-xs font-bold hidden sm:inline">Nova Conversa</span>
                </button>
              </>
            )}
            
            {activeTab === 'chat' && mode === 'chat' && (
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

        {/* Tabs Navigation */}
        <div className="flex border-t border-white/5">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${
              activeTab === 'chat' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <MessageCircle size={16} />
            Chat
            {activeTab === 'chat' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-beatwap-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors relative ${
              activeTab === 'ai' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Bot size={16} />
            Assistente IA
            {activeTab === 'ai' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-beatwap-gold" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-black/20 relative flex flex-col">
        
        {activeTab === 'ai' ? (
          <AIAssistant />
        ) : (
          <>
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

            {/* Support Queue Section (Visible to Providers) */}
            {filteredQueue.length > 0 && (
              <div className="mb-4">
                <h4 className="px-2 text-xs font-bold text-beatwap-gold uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Solicitações Pendentes</span>
                  <span className="bg-beatwap-gold text-black text-[10px] px-1.5 rounded-full">{filteredQueue.length}</span>
                </h4>
                <div className="space-y-2">
                  {filteredQueue.map(req => (
                    <div 
                      key={req.id}
                      onClick={() => handlePickRequest(req)}
                      className="p-3 bg-beatwap-gold/5 border border-beatwap-gold/20 hover:bg-beatwap-gold/10 rounded-xl cursor-pointer transition-all group"
                    >
                      {/* Header with Name and Time */}
                      <div className="flex flex-col mb-2 pb-2 border-b border-white/5">
                         <div className="flex justify-between items-start">
                           <h4 className="font-bold text-base text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-beatwap-gold inline-block animate-pulse"/>
                              {req.requester?.nome || req.requester?.nome_completo_razao_social || 'Usuário'}
                            </h4>
                            <span className="text-[10px] text-beatwap-gold font-mono bg-black/40 px-1.5 py-0.5 rounded whitespace-nowrap ml-2">
                              {new Date(req.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                         </div>
                         <span className="text-[10px] text-gray-500 mt-0.5">
                           {req.requester?.cidade ? `${req.requester.cidade}` : ''}
                           {req.requester?.cidade && req.requester?.genero_musical ? ' • ' : ''}
                           {req.requester?.genero_musical || ''}
                         </span>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-beatwap-gold/20 flex-shrink-0 flex items-center justify-center text-beatwap-gold font-bold text-xs">
                             {(req.requester?.nome || req.requester?.nome_completo_razao_social || 'U').substring(0,1).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                             {req.metadata?.summary ? (
                               <div className="p-2 bg-black/20 rounded-lg border border-white/5">
                                 <p className="text-xs text-gray-300 italic break-words">"{req.metadata.summary}"</p>
                               </div>
                             ) : (
                               <p className="text-xs text-gray-500 italic">Sem descrição...</p>
                             )}
                        </div>
                      </div>
                      
                      <div className="mt-2 flex justify-end">
                        <button className="text-[10px] bg-beatwap-gold text-black px-3 py-1 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Atender Agora
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-px bg-white/10 my-4 mx-2" />
              </div>
            )}

            {filteredChats.length === 0 ? (
              <div className="p-4">
                <div className="text-center py-4 text-gray-500 mb-4">
                   <MessageCircle className="mx-auto mb-2 opacity-20" size={32} />
                   <p className="text-sm font-bold text-gray-400">Como podemos ajudar?</p>
                </div>
                
                <div className="space-y-2">
                   {getHelpQuestions().map((q, i) => (
                     <button 
                       key={i} 
                       onClick={() => {
                         setMode('new');
                         setSelectedQuestion(q);
                       }} 
                       className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-200 transition-colors border border-white/5 flex justify-between items-center group"
                     >
                       <span>{q.question}</span>
                       <span className="text-beatwap-gold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                     </button>
                   ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                   <button onClick={() => setMode('new')} className="text-beatwap-gold text-sm font-bold hover:underline flex items-center justify-center gap-2 mx-auto">
                      <Plus size={16} /> Iniciar nova conversa
                   </button>
                </div>
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
          <div className="p-4 h-full flex flex-col">
            {!selectedQuestion ? (
              <div className="flex-1 overflow-y-auto space-y-4">
                 <div>
                    <p className="text-sm text-gray-400 mb-2 font-bold flex items-center gap-2">
                       <span className="w-1 h-4 bg-beatwap-gold rounded-full"></span>
                       Ajuda Rápida
                    </p>
                    <div className="space-y-2">
                      {getHelpQuestions().map((q, i) => (
                        <button 
                          key={i} 
                          onClick={() => setSelectedQuestion(q)} 
                          className="w-full text-left p-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-200 transition-colors border border-white/5 flex justify-between items-center group"
                        >
                          <span>{q.question}</span>
                          <span className="text-beatwap-gold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
                      ))}
                    </div>
                 </div>

                 <div>
                    <p className="text-sm text-gray-400 mb-2 font-bold flex items-center gap-2">
                       <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                       Falar com alguém
                    </p>
                    <div className="space-y-2">
                        {/* Options for Artist */}
                        {(userRole === 'Artista' || userRole === 'Artist') && (
                          <>
                            <button onClick={() => handleInitiateSupport('produtor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Falar com Produtor</h4>
                                <p className="text-xs text-gray-400">Tirar dúvidas e suporte</p>
                              </div>
                            </button>
                            <button onClick={() => handleInitiateSupport('vendedor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Briefcase size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Falar com Vendedor</h4>
                                <p className="text-xs text-gray-400">Negócios e contratações</p>
                              </div>
                            </button>
                            <button onClick={() => handleRequestSupport('compositor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left border border-white/5">
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
                            <button onClick={() => handleRequestSupport('produtor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Falar com Produtor</h4>
                                <p className="text-xs text-gray-400">Suporte administrativo</p>
                              </div>
                            </button>
                            <button onClick={() => setMode('queue')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left relative border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><UserCheck size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Atender Artistas</h4>
                                <p className="text-xs text-gray-400">Ver solicitações de artistas</p>
                              </div>
                              {filteredQueue.length > 0 && (
                                <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {filteredQueue.length}
                                </span>
                              )}
                            </button>
                            <button onClick={handleLoadArtists} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Users size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Todos os Artistas</h4>
                                <p className="text-xs text-gray-400">Iniciar conversa com qualquer artista</p>
                              </div>
                            </button>
                          </>
                        )}

                        {/* Options for Composer */}
                        {(userRole === 'Compositor') && (
                          <>
                            <button onClick={() => handleRequestSupport('produtor')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><Users size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Falar com Produtor</h4>
                                <p className="text-xs text-gray-400">Suporte administrativo</p>
                              </div>
                            </button>
                            <button onClick={() => setMode('queue')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left relative border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><UserCheck size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Atender Artistas</h4>
                                <p className="text-xs text-gray-400">Ver solicitações de artistas</p>
                              </div>
                              {filteredQueue.length > 0 && (
                                <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {filteredQueue.length}
                                </span>
                              )}
                            </button>
                          </>
                        )}

                        {/* Options for Producer */}
                        {(userRole === 'Produtor') && (
                          <>
                            <button onClick={() => setMode('queue')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left relative border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400"><UserCheck size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Ver Solicitações</h4>
                                <p className="text-xs text-gray-400">Atender usuários precisando de ajuda</p>
                              </div>
                              {filteredQueue.length > 0 && (
                                <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {filteredQueue.length}
                                </span>
                              )}
                            </button>
                            <button onClick={() => setMode('users_list')} className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-colors text-left relative border border-white/5">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Users size={20} /></div>
                              <div>
                                <h4 className="font-bold text-white">Todos os Usuários</h4>
                                <p className="text-xs text-gray-400">Iniciar conversa com qualquer usuário</p>
                              </div>
                            </button>
                          </>
                        )}
                    </div>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                 <button onClick={() => setSelectedQuestion(null)} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs mb-4">
                    <ChevronLeft size={14} /> Voltar
                 </button>

                 <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                     <div className="flex justify-end">
                         <div className="bg-beatwap-gold text-black p-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm font-medium shadow-lg">
                             {selectedQuestion.question}
                         </div>
                     </div>
                     
                     <div className="flex justify-start">
                         <div className="bg-[#222] text-white border border-white/10 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm shadow-lg">
                             <p>{selectedQuestion.answer}</p>
                         </div>
                     </div>
                 </div>
                 
                 <div className="space-y-2 mt-auto pt-4 border-t border-white/10">
                     <button 
                        onClick={() => {
                            setSelectedQuestion(null);
                            handleInitiateSupport('produtor');
                        }}
                        className="w-full py-3 bg-beatwap-gold hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors shadow-lg shadow-beatwap-gold/10"
                     >
                        Ainda sim preciso falar com o produtor
                     </button>
                     <button 
                        onClick={() => setSelectedQuestion(null)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
                     >
                        Isso ajudou, obrigado
                     </button>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* ARTISTS LIST MODE */}
        {mode === 'artists_list' && (
            <div className="p-2 space-y-2">
                <div className="px-2 pb-2 space-y-2">
                    <button onClick={() => setMode('new')} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                        <ChevronLeft size={14} /> Voltar
                    </button>
                    <AnimatedInput 
                        placeholder="Buscar artista..." 
                        icon={Search} 
                        value={artistSearchTerm}
                        onChange={(e) => setArtistSearchTerm(e.target.value)}
                        className="bg-black/40 border-white/5"
                    />
                </div>
                {filteredArtists.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Nenhum artista encontrado.</p>
                    </div>
                ) : (
                    filteredArtists.map(artist => (
                        <div 
                            key={artist.id}
                            onClick={() => handleArtistSelect(artist.id)}
                            className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex gap-3 items-center"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative flex items-center justify-center">
                                {artist.avatar_url ? (
                                    <img src={artist.avatar_url} alt={artist.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-beatwap-gold">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-sm text-white truncate">
                                    {artist.nome || artist.nome_completo_razao_social || 'Artista'}
                                </h4>
                                <div className="flex gap-2 text-[10px] text-gray-500">
                                    {artist.cidade && <span>📍 {artist.cidade}</span>}
                                    {artist.genero_musical && <span>🎵 {artist.genero_musical}</span>}
                                </div>
                            </div>
                            <div className="text-beatwap-gold">
                                <MessageCircle size={18} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* USERS LIST MODE */}
        {mode === 'users_list' && (
            <div className="p-2 space-y-2">
                <div className="px-2 pb-2 space-y-2">
                    <button onClick={() => setMode('new')} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                        <ChevronLeft size={14} /> Voltar
                    </button>
                    <AnimatedInput 
                        placeholder="Buscar usuário..." 
                        icon={Search} 
                        value={artistSearchTerm}
                        onChange={(e) => setArtistSearchTerm(e.target.value)}
                        className="bg-black/40 border-white/5"
                    />
                </div>
                {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">Nenhum usuário encontrado.</p>
                    </div>
                ) : (
                    filteredUsers.map(u => (
                        <div 
                            key={u.id}
                            onClick={() => handleArtistSelect(u.id)}
                            className="p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors flex gap-3 items-center"
                        >
                            <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative flex items-center justify-center">
                                {u.avatar_url ? (
                                    <img src={u.avatar_url} alt={u.nome} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-beatwap-gold">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-bold text-sm text-white truncate">
                                    {u.nome || u.nome_completo_razao_social || 'Usuário'}
                                </h4>
                                <div className="flex gap-2 text-[10px] text-gray-500">
                                    <span className="bg-white/10 px-1.5 rounded">{u.cargo || 'Artista'}</span>
                                    {u.cidade && <span>📍 {u.cidade}</span>}
                                </div>
                            </div>
                            <div className="text-beatwap-gold">
                                <MessageCircle size={18} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* NOTIFICATIONS MODE */}
        {activeTab === 'chat' && mode === 'notifications' && (
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
                 <label className="text-xs text-gray-400">Selecionar Usuário</label>
                 <select 
                    value={notificationForm.targetId}
                    onChange={(e) => setNotificationForm({...notificationForm, targetId: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm focus:border-beatwap-gold outline-none"
                 >
                   <option value="">Selecione...</option>
                   {filteredUsers.map(u => (
                     <option key={u.id} value={u.id}>
                       {u.nome || u.nome_completo_razao_social || u.email} ({u.cargo || 'Sem cargo'})
                     </option>
                   ))}
                 </select>
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

        {/* REQUEST SUMMARY MODE */}
        {mode === 'request_summary' && (
          <div className="p-4 space-y-4">
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
               <h4 className="text-white font-bold mb-2">Descreva o que precisa</h4>
               <p className="text-sm text-gray-400 mb-4">
                 Isso ajuda o {pendingRequestRole} a entender sua solicitação antes de iniciar a conversa.
               </p>
               <textarea
                 value={requestSummary}
                 onChange={(e) => setRequestSummary(e.target.value)}
                 placeholder="Ex: Gostaria de saber mais sobre a produção da minha música..."
                 rows={4}
                 className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-beatwap-gold outline-none resize-none"
               />
             </div>
             <button 
               onClick={handleSubmitSupportRequest}
               className="w-full py-3 bg-beatwap-gold hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors"
             >
               Enviar Solicitação
             </button>
             <button 
               onClick={() => { setMode('new'); setPendingRequestRole(null); }}
               className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors"
             >
               Cancelar
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
                       {req.metadata?.summary && (
                         <div className="mt-2 text-xs text-gray-300 bg-white/5 p-2 rounded italic">
                           "{req.metadata.summary}"
                         </div>
                       )}
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
          <div className="p-4 relative min-h-full">
            {/* PENDING ACCEPTANCE OVERLAY */}
            {activeChat?.status === 'pending' && activeChat?.initiatedBy !== user.id && (
                <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 mb-4 overflow-hidden">
                        {activeChat.artistAvatarUrl ? (
                            <img src={activeChat.artistAvatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} className="m-auto mt-4 text-gray-400" />
                        )}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Solicitação de Conversa</h3>
                    <p className="text-sm text-gray-400 mb-6">
                        {activeChat.artistName} deseja iniciar uma conversa com você.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={handleDeclineChat}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-red-400 font-bold rounded-xl transition-colors"
                        >
                            Recusar
                        </button>
                        <button 
                            onClick={handleAcceptChat}
                            className="flex-1 py-3 bg-beatwap-gold hover:bg-yellow-500 text-black font-bold rounded-xl transition-colors"
                        >
                            Aceitar
                        </button>
                    </div>
                </div>
            )}

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
