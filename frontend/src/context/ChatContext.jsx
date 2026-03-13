import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../services/apiClient';
import { API_BASE_URL } from '../config/apiConfig.js';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [supportQueue, setSupportQueue] = useState([]);
  const [admins, setAdmins] = useState([]); // Store admin profiles
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [typingState, setTypingState] = useState({});
  const typingTimeoutsRef = useRef({});
  const channelRef = useRef(null);
  const streamAbortRef = useRef(null);
  const streamOkRef = useRef(false);
  const streamRetryRef = useRef(0);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchQueue();
      fetchAdmins(); // Fetch admins for header display

      const scheduleRefresh = ({ chats: shouldChats, queue: shouldQueue } = { chats: true, queue: true }) => {
        if (refreshTimerRef.current) return;
        refreshTimerRef.current = setTimeout(() => {
          refreshTimerRef.current = null;
          if (shouldChats) fetchChats();
          if (shouldQueue) fetchQueue();
        }, 250);
      };

      const connectStream = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        if (streamAbortRef.current) streamAbortRef.current.abort();
        const controller = new AbortController();
        streamAbortRef.current = controller;
        const connectTimeoutId = setTimeout(() => {
          try { controller.abort(); } catch { void 0; }
        }, 25000);

        try {
          const normalizedBaseUrl = API_BASE_URL
            ? String(API_BASE_URL)
                .trim()
                .replace(/^['"`\s]+|['"`\s]+$/g, '')
                .replace(/\/+$/, '')
            : '';
          const hostname = typeof window !== 'undefined' && window.location ? String(window.location.hostname || '') : '';
          const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
          const candidates = [];
          if (normalizedBaseUrl) candidates.push(normalizedBaseUrl);
          if (isLocalHost) {
            if (!candidates.includes('')) candidates.push('');
            if (!candidates.includes('https://api.beatwap.com.br')) candidates.push('https://api.beatwap.com.br');
          } else {
            if (!candidates.includes('https://api.beatwap.com.br')) candidates.push('https://api.beatwap.com.br');
            const allowSameOriginApi = hostname === 'api.beatwap.com.br';
            if (allowSameOriginApi && !candidates.includes('')) candidates.push('');
          }

          let res = null;
          for (let i = 0; i < candidates.length; i += 1) {
            const baseUrl = candidates[i];
            const apiBase = baseUrl ? `${baseUrl}/api` : '/api';
            const url = `${apiBase}/chat/stream`;
            try {
              res = await fetch(url, {
                method: 'GET',
                headers: {
                  Accept: 'text/event-stream',
                  Authorization: `Bearer ${token}`,
                },
                signal: controller.signal,
              });
              if (res.ok && res.body) break;
              if (res.status === 404 && i < candidates.length - 1) continue;
              break;
            } catch (e) {
              if (i < candidates.length - 1) continue;
              throw e;
            }
          }
          clearTimeout(connectTimeoutId);

          if (!res || !res.ok || !res.body) throw new Error('Falha ao conectar no realtime');
          const contentType = String(res.headers.get('content-type') || '').toLowerCase();
          if (!contentType.includes('text/event-stream')) throw new Error('Realtime inválido');
          streamOkRef.current = true;
          streamRetryRef.current = 0;

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (!controller.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx;
            while ((idx = buffer.indexOf('\n\n')) >= 0) {
              const raw = buffer.slice(0, idx);
              buffer = buffer.slice(idx + 2);
              const lines = raw.split('\n').map(l => l.trimEnd()).filter(Boolean);
              let event = '';
              let data = '';
              for (const line of lines) {
                if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
                else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice('data:'.length).trim();
              }

              if (event === 'chat_update') scheduleRefresh({ chats: true, queue: false });
              if (event === 'queue_update') scheduleRefresh({ chats: false, queue: true });
              if (event === 'connected') scheduleRefresh({ chats: true, queue: true });
            }
          }
        } catch (e) {
          clearTimeout(connectTimeoutId);
          if (controller.signal.aborted) return;
        } finally {
          clearTimeout(connectTimeoutId);
          streamOkRef.current = false;
          if (!controller.signal.aborted) {
            const retry = Math.min(10000, 1000 * Math.max(1, streamRetryRef.current + 1));
            streamRetryRef.current += 1;
            setTimeout(() => {
              if (streamAbortRef.current?.signal?.aborted) return;
              connectStream();
            }, retry);
          }
        }
      };

      connectStream();

      const pollInterval = setInterval(() => {
        if (streamOkRef.current) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        fetchChats();
        fetchQueue();
      }, 15000);

      return () => {
        clearInterval(pollInterval);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
        if (streamAbortRef.current) streamAbortRef.current.abort();
        streamAbortRef.current = null;
        streamOkRef.current = false;
        const timeouts = typingTimeoutsRef.current || {};
        Object.values(timeouts).forEach(t => clearTimeout(t));
        typingTimeoutsRef.current = {};
      };
    } else {
      setChats([]);
      setSupportQueue([]);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      if (streamAbortRef.current) streamAbortRef.current.abort();
      streamAbortRef.current = null;
      streamOkRef.current = false;
    }
  }, [user, profile]);

  const fetchQueue = async () => {
    try {
      const data = await apiClient.get('/queue', { cache: false });
      setSupportQueue(data || []);
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const requestSupport = async (roleNeeded, metadata = {}) => {
    try {
      await apiClient.post('/queue', {
        role_needed: roleNeeded,
        metadata
      });
      await fetchQueue();
      return true;
    } catch (error) {
      console.error('Error requesting support:', error);
      return false;
    }
  };

  const pickSupportRequest = async (request) => {
    try {
      const participant_ids = [user.id, request.requester_id];
      const requesterId = request.requester_id;
      const myName = profile?.nome || profile?.nome_completo_razao_social || 'Produtor';

      const existing = chats.find(
        c =>
          Array.isArray(c.participantIds) &&
          c.participantIds.includes(user.id) &&
          c.participantIds.includes(requesterId)
      );

      if (existing) {
        setActiveChatId(existing.id);
        setIsOpen(true);
        return existing.id;
      }

      // Verificar se já existe chat com esses participantes
      const existingChats = await apiClient.get('/chats', { cache: false });
      const existingDb = existingChats.find(c => 
        c.participant_ids.includes(user.id) && c.participant_ids.includes(requesterId)
      );

      let chatId;

      if (existingDb) {
        chatId = existingDb.id;
      } else {
        // Criar novo chat
        const newChat = await apiClient.post('/chats', {
          participant_ids,
          type: 'support',
          metadata: { original_request_id: request.id, ...request.metadata }
        });
        chatId = newChat.id;
      }

      // Criar mensagens do sistema
      if (request.metadata?.summary) {
        await apiClient.post('/messages', {
          chat_id: chatId,
          sender_id: user.id,
          receiver_id: requesterId,
          message: request.metadata.summary,
          metadata: { type: 'initial_request', ...request.metadata, sender_cargo: profile?.cargo || null }
        });
      }

      await apiClient.post('/messages', {
        chat_id: chatId,
        sender_id: user.id,
        receiver_id: requesterId,
        message: `${myName} iniciou seu atendimento.`,
        metadata: { type: 'assignment_notice', sender_cargo: profile?.cargo || null }
      });

      await fetchChats();
      setActiveChatId(chatId);
      setIsOpen(true);

      // Deletar da fila
      await apiClient.del(`/queue/${request.id}`);
      setSupportQueue(prev => prev.filter(r => r.id !== request.id));
      
      fetchQueue();

      return chatId;
    } catch (error) {
      console.error('Error picking request:', error);
      return null;
    }
  };


  const fetchAdmins = async () => {
    try {
      const data = await apiClient.get('/admins', { cache: false });
      const mapped = (data || []).map(p => ({
        id: p.id,
        name: p.nome || p.nome_completo_razao_social || 'Produtor',
        avatar_url: p.avatar_url,
        online: p.online,
        online_updated_at: p.online_updated_at
      }));
      setAdmins(mapped);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/chats', { cache: false });

      // Process data to match mockChats structure
      const formattedChats = (data || []).map(chat => {
        // Buscar mensagens para este chat
        const messages = chat.messages || [];
        const sortedMessages = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const lastMsg = sortedMessages[sortedMessages.length - 1];
        
        const messagesWithSender = sortedMessages.map(m => {
          const roleStr = String(m.sender_role || m.sender_cargo || '').toLowerCase();
          // Simplified sender logic - improves handling for multi-role chats
          const sender = m.sender_id === user.id ? 'me' : (
            roleStr.includes('artist') || roleStr.includes('artista') ? 'artist' : 'admin'
          );

          return {
            ...m,
            sender,
            senderName: m.nome || m.nome_completo_razao_social || 'Usuário',
            timestamp: m.created_at,
            text: m.content ?? m.message ?? ''
          };
        });

        // Extract system-like messages and remove them from the conversation stream
        const initialRequestMsg = messagesWithSender.find(m => m?.metadata?.type === 'initial_request');
        const assignmentNoticeMsg = messagesWithSender.find(m => m?.metadata?.type === 'assignment_notice');
        const visibleMessages = messagesWithSender.filter(m => !['initial_request','assignment_notice'].includes(m?.metadata?.type));

        const unreadCount = visibleMessages.filter(m => 
          !m.read && m.sender !== 'me' // Simply count messages not from me that are unread
        ).length;

        const assignedTo = chat.assigned_to ?? null;
        
        // Determine the "Other" participant
        const participantIds = chat.participant_ids || [];
        let otherId = null;
        if (participantIds.length > 0) {
          otherId = participantIds.find(id => id !== user.id) || chat.owner_id || participantIds[0];
        }

        const artistName = chat.participant_names?.find((name, idx) => 
          chat.participant_ids[idx] === otherId
        ) || `Usuário #${String(otherId || '').slice(0,4)}...`;
        
        const artistAvatarUrl = chat.participant_avatars?.find((avatar, idx) => 
          chat.participant_ids[idx] === otherId
        ) || null;

        return {
          id: chat.id,
          participantIds,
          artistId: otherId, // Keep compatible prop name
          artistName,
          artistAvatarUrl,
          adminId: assignedTo,
          assignedTo,
          status: chat.status,
          initiatedBy: chat.metadata?.initiated_by,
          // Watermark/system info to show at the top of chat UI
          initialSummary: initialRequestMsg?.text || null,
          initialSummaryAt: initialRequestMsg?.timestamp || null,
          assignmentNotice: assignmentNoticeMsg?.text || null,
          assignmentNoticeAt: assignmentNoticeMsg?.timestamp || null,
          // Visible conversation
          messages: visibleMessages,
          lastMessage: (visibleMessages[visibleMessages.length - 1]?.content ?? visibleMessages[visibleMessages.length - 1]?.message) || '',
          lastMessageTime: visibleMessages.length ? visibleMessages[visibleMessages.length - 1]?.created_at : (lastMsg?.created_at || chat.created_at),
          unreadCount
        };
      });

      setChats(formattedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtistsForSeller = async () => {
    try {
      const data = await apiClient.get('/artists-for-seller');
      return data || [];
    } catch (error) {
      console.error('Error fetching artists for seller:', error);
      return [];
    }
  };

  const updateChatStatus = async (chatId, status) => {
    try {
      // Optimistic update
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, status } : c));
      
      await apiClient.put(`/chats/${chatId}/status`, { status });
      return true;
    } catch (error) {
      console.error('Error updating chat status:', error);
      // Rollback
      fetchChats();
      return false;
    }
  };

  const assignChat = async (chatId) => {
    try {
      await apiClient.put(`/chats/${chatId}/assign`);
      // local state will be updated by next poll
    } catch (error) {
      // Fallback local assignment
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, assignedTo: user.id } : c));
    }
  };

  const getChatByArtist = (artistId) => {
    return chats.find(c => c.artistId === artistId);
  };

  const sendMessage = async (chatId, text, sender, context = null) => {
    // sender is 'artist' or 'admin' string from UI.
    // We need to insert with sender_id = user.id
    
    const chat = chats.find(c => c.id === chatId);
    const receiverId = chat ? chat.participantIds.find(id => id !== user.id) : null;

    // Generate ID for optimistic update to prevent duplication with realtime
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`;
    
    // Optimistic Update
    const optimisticMsg = {
        id: tempId,
        chat_id: chatId,
        sender_id: user.id,
        receiver_id: receiverId, 
        content: text,
        created_at: new Date().toISOString(),
        sender: 'me',
        senderName: profile?.nome || profile?.nome_completo_razao_social || 'Eu',
        text: text,
        read: false,
        metadata: { sender_cargo: profile?.cargo || null }
    };

    setChats(prev => {
        const idx = prev.findIndex(c => c.id === chatId);
        if (idx === -1) return prev;
        
        const updatedChat = {
          ...prev[idx],
          messages: [...prev[idx].messages, optimisticMsg],
          lastMessage: text,
          lastMessageTime: optimisticMsg.created_at
        };
        const next = [...prev];
        next[idx] = updatedChat;
        return next;
    });

    try {
      await apiClient.post('/messages', {
        chat_id: chatId,
        sender_id: user.id,
        receiver_id: receiverId,
        message: text,
        metadata: { sender_cargo: profile?.cargo || null }
      });

      // Subscription will handle the rest (ignoring duplicate ID)

      // Subscription will handle the rest (ignoring duplicate ID)
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createChat = async (artistId) => {
    // Check if exists in local state first
    const existing = chats.find(c => Array.isArray(c.participantIds) && c.participantIds.includes(user.id) && c.participantIds.includes(artistId));
    if (existing) return existing.id;

    try {
      // Create new chat via API
      const creatorRole = String(profile?.cargo || '').toLowerCase();
      const initialStatus = (creatorRole === 'vendedor' && artistId !== user.id) ? 'pending' : 'active';
      
      const data = await apiClient.post('/chats', {
        participant_ids: Array.from(new Set([artistId, user.id])),
        status: initialStatus,
        metadata: { initiated_by: user.id, creator_role: creatorRole }
      });
      
      return data.id;
    } catch (error) {
      // Handle race condition (concurrent creation)
      if (error.response?.status === 409) {
        // Try to find existing chat
        const existingChats = await apiClient.get('/chats');
        const existingChat = existingChats.find(c => 
          c.participant_ids.includes(artistId) && c.participant_ids.includes(user.id)
        );
        return existingChat?.id;
      }
      console.error('Error creating chat:', error);
      return null;
    }
  };

  const sendTypingStatus = (chatId, isTyping) => {
    try {
      if (!chatId || !user) return;
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { chatId, userId: user.id, isTyping }
      });
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  const toggleChat = () => setIsOpen(!isOpen);
  
  const openChatWithContext = (context) => {
    setIsOpen(true);
    // Logic to select specific chat based on context could go here
    const roleStr = String(profile?.role || '').toLowerCase();
    if (roleStr === 'artist' || roleStr === 'artista') {
      // Ensure chat exists
      if (!chats.find(c => c.artistId === user.id)) {
        createChat(user.id);
      }
    }
  };

  const deleteChat = async (chatId) => {
    try {
      await apiClient.del(`/chats/${chatId}`);

      // Update local state
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setIsOpen(false);
      }
      return true;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  };

  const sendNotification = async (recipientId, title, message, link = null) => {
    try {
      await apiClient.post('/notifications', {
        recipient_id: recipientId,
        title,
        message,
        link
      });
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  const sendBroadcast = async (title, message, targetRole = null, link = null) => {
    try {
      await apiClient.post('/broadcast-notifications', {
        title,
        message,
        target_role: targetRole === 'all' ? null : targetRole,
        link
      });
      return true;
    } catch (error) {
      console.error('Error sending broadcast:', error);
      return false;
    }
  };

  const markChatRead = async (chatId) => {
     try {
       await apiClient.put(`/chats/${chatId}/mark-read`);
     } catch (e) {
       console.error('Error marking messages read:', e);
     } finally {
       setChats(prev => prev.map(c => {
         if (c.id !== chatId) return c;
         const updatedMessages = (c.messages || []).map(m => ({ ...m, read: true }));
         const unreadCount = updatedMessages.filter(m => {
           const roleStr = String(profile?.cargo || '').toLowerCase();
           const isAdmin = roleStr === 'produtor' || roleStr === 'vendedor' || roleStr === 'compositor';
           return !m.read && ((isAdmin && m.sender === 'artist') || (!isAdmin && m.sender === 'admin'));
         }).length;
         return { ...c, messages: updatedMessages, unreadCount };
       }));
     }
   };
 
  return (
    <ChatContext.Provider value={{ 
      chats, 
      isOpen, 
      setIsOpen, 
      toggleChat, 
      activeChatId, 
      setActiveChatId,
      sendMessage,
      getChatByArtist,
      createChat,
      openChatWithContext,
      loading,
      admins,
      assignChat,
      deleteChat,
      markChatRead,
      supportQueue,
      requestSupport,
      pickSupportRequest,
      sendNotification,
      sendBroadcast,
      fetchArtistsForSeller,
      updateChatStatus,
      fetchChats,
      fetchQueue,
      userRole: profile?.cargo,
      typingState,
      sendTypingStatus
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
