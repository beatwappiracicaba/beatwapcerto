import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [supportQueue, setSupportQueue] = useState([]);
  const [admins, setAdmins] = useState([]); // Store admin profiles
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchQueue();
      fetchAdmins(); // Fetch admins for header display
      
      // Subscribe to real-time changes
      const channel = supabase
        .channel('public:chat-realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chats' }, (payload) => {
          const updated = payload.new;
          setChats(prev => {
            const exists = prev.find(c => c.id === updated.id);
            if (exists) {
              return prev.map(c => c.id === updated.id ? { 
                ...c, 
                assignedTo: updated.assigned_to ?? c.assignedTo,
                status: updated.status ?? c.status
              } : c);
            } else {
              // New chat updated (maybe we missed insert), refetch to be safe
              fetchChats();
              return prev;
            }
          });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, (payload) => {
           // New chat created. Check if relevant to me.
           const newChat = payload.new;
           const myId = user.id;
           const participants = newChat.participant_ids || [];
           const amIParticipant = participants.includes(myId);
           const myRole = profile?.cargo || '';
           
           // If I am participant, OR I am provider (Produtor/Vendedor) and should see it
           // Produtores see all support chats? Or just assigned?
           // The fetchChats logic says: "Vendedores e Produtores veem todos os chats (ou atribuídos)"
           // Actually fetchChats logic:
           // if (!isAdmin && !isCompositor && !isVendedor) { query = query.contains('participant_ids', [user.id]); }
           // So Admins/Sellers see ALL chats?
           // If so, we should refetch or add it.
           
           const isAdmin = myRole === 'Produtor';
           const isVendedor = myRole === 'Vendedor';
           const isCompositor = myRole === 'Compositor';
           
           if (amIParticipant || isAdmin || isVendedor || isCompositor) {
             fetchChats(); // Simplest way to get full data (artist names etc)
           }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chats' }, (payload) => {
          const deletedId = payload.old.id;
          setChats(prev => prev.filter(c => c.id !== deletedId));
          if (activeChatId === deletedId) {
            setActiveChatId(null);
            setIsOpen(false);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_queue' }, (payload) => {
          fetchQueue();
          if (payload.eventType === 'INSERT') {
             // Check if I am a provider who should see this
             const myRole = profile?.cargo || '';
             const needed = payload.new.role_needed; // 'produtor', 'vendedor', etc.
             // Simple check: if I am a Produtor, I see everything.
             // If I am Vendedor, I see 'vendedor' requests.
             let shouldNotify = false;
             if (myRole === 'Produtor') shouldNotify = true;
             else if (myRole === 'Vendedor' && needed === 'vendedor') shouldNotify = true;
             else if (myRole === 'Compositor' && needed === 'compositor') shouldNotify = true;

             if (shouldNotify && payload.new.requester_id !== user.id) {
               // Play sound or show toast?
               // For now, we rely on the UI updating, but we can log it or set a flag
               console.log('New support request!', payload.new);
             }
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new;
          // Fix: Extract role from metadata if available (since DB column is metadata, not sender_role)
          const metaRole = m.metadata?.sender_cargo || '';
          const roleStr = String(m.sender_role || m.sender_cargo || metaRole || '').toLowerCase();
          
          // Simplified sender logic - improves handling for multi-role chats
          const sender = m.sender_id === user.id ? 'me' : (
            roleStr.includes('artist') || roleStr.includes('artista') ? 'artist' : 'admin'
          );
          
          const text = m.content ?? m.message ?? '';
          const timestamp = m.created_at;
          
          setChats(prev => {
            const idx = prev.findIndex(c => c.id === m.chat_id);
            if (idx === -1) {
              // Fallback: refetch if chat not in local state
              fetchChats();
              return prev;
            }
            
            // Check if message already exists (deduplication for optimistic updates)
            const msgExists = prev[idx].messages.some(msg => msg.id === m.id);
            if (msgExists) return prev;

            const updatedChat = {
              ...prev[idx],
              messages: [...prev[idx].messages, { ...m, sender, text, timestamp }],
              lastMessage: text,
              lastMessageTime: timestamp,
              unreadCount: (sender !== 'me' && !m.read) ? (prev[idx].unreadCount || 0) + 1 : (prev[idx].unreadCount || 0)
            };
            const next = [...prev];
            next[idx] = updatedChat;
            return next;
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Chat realtime subscribed');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setChats([]);
      setSupportQueue([]);
    }
  }, [user, profile]);

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('support_queue')
        .select(`
          *,
          requester:requester_id (
            id, nome, nome_completo_razao_social, avatar_url, genero_musical, cidade, estado
          )
        `)
        .eq('active', true);
        
      if (!error) {
        setSupportQueue(data || []);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  const requestSupport = async (roleNeeded, metadata = {}) => {
    try {
      const { error } = await supabase
        .from('support_queue')
        .insert({
          requester_id: user.id,
          role_needed: roleNeeded,
          metadata
        });
      
      if (error) throw error;
      await fetchQueue();
      return true;
    } catch (error) {
      console.error('Error requesting support:', error);
      return false;
    }
  };

  const pickSupportRequest = async (request) => {
    try {
      // Create a new chat for this request
      const participant_ids = [user.id, request.requester_id];
      
      // Check if chat already exists for these participants (optional, but requested behavior is "separate chat")
      // "vários vendedores pode pegar... abrindo uma chat separado para cada um" implies unique per pair.
      // So if I already have a chat with this person, should I open it or create new?
      // "abrindo uma chat separado" usually means a NEW chat. But usually 1:1 chat is unique per pair.
      // I will check if a chat exists between these two to avoid spamming 100 chats for same pair.
      
      // First, find if we already have a chat with this user
      const existing = chats.find(c => {
         const otherId = c.participantIds?.find(id => id !== user.id) || c.artistId;
         return otherId === request.requester_id;
      });
      
      if (existing) {
        setActiveChatId(existing.id);
        setIsOpen(true);
        return existing.id;
      }

      const { data, error } = await supabase
        .from('chats')
        .insert({
          participant_ids,
          owner_id: request.requester_id, // The one who asked for help
          type: 'support',
          metadata: { original_request_id: request.id, ...request.metadata }
        })
        .select()
        .single();

      if (error) throw error;
      
      // Insert initial message from summary if exists so the context is preserved
      if (request.metadata?.summary) {
        await supabase.from('messages').insert({
          chat_id: data.id,
          sender_id: request.requester_id, // The requester sent this message
          content: request.metadata.summary,
          metadata: { type: 'initial_request', ...request.metadata }
        });
      }

      await fetchChats();
      setActiveChatId(data.id);
      setIsOpen(true);
      
      // Delete the request from queue immediately after picking it
      await supabase
        .from('support_queue')
        .delete()
        .eq('id', request.id);
      
      // Refresh queue (realtime might handle this, but to be safe)
      fetchQueue();

      return data.id;
    } catch (error) {
      console.error('Error picking request:', error);
      return null;
    }
  };


  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, cargo')
        .eq('cargo', 'Produtor');

      if (error) throw error;
      const ids = (data || []).map(p => p.id);
      let presence = [];
      if (ids.length) {
        const { data: pres } = await supabase
          .from('online_status')
          .select('profile_id, online, updated_at')
          .in('profile_id', ids);
        presence = pres || [];
      }
      const mapped = (data || []).map(p => {
        const st = presence.find(s => s.profile_id === p.id);
        const fresh = st?.updated_at ? (Date.now() - new Date(st.updated_at).getTime()) < 120000 : false;
        return {
        id: p.id,
        name: p.nome || 'Produtor',
        avatar_url: p.avatar_url,
          online: st ? (!!st.online && fresh) : false,
        online_updated_at: st?.updated_at
      };
      });
      setAdmins(mapped);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const fetchChats = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('chats')
        .select(`*`)
        .order('created_at', { ascending: false });

      const cargo = profile?.cargo;
      const isAdmin = cargo === 'Produtor';
      const isVendedor = cargo === 'Vendedor';
      const isCompositor = cargo === 'Compositor';
      
      // Vendedores e Produtores veem todos os chats (ou atribuídos)
      if (!isAdmin && !isCompositor && !isVendedor) {
        query = query.contains('participant_ids', [user.id]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch artist names and avatars in batch
      const artistIds = new Set();
      (data || []).forEach(c => {
        if (c.participant_ids) {
           c.participant_ids.forEach(pid => {
             if (pid !== user.id) artistIds.add(pid);
           });
        }
      });
      const uniqueArtistIds = Array.from(artistIds);

      let artistNameMap = {};
      let artistAvatarMap = {};
      if (uniqueArtistIds.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nome, nome_completo_razao_social, avatar_url')
          .in('id', uniqueArtistIds);
        (profilesData || []).forEach(p => {
          artistNameMap[p.id] = p.nome || p.nome_completo_razao_social || 'Usuário';
          artistAvatarMap[p.id] = p.avatar_url || null;
        });
      }

      // Fetch messages in batch
      const chatIds = (data || []).map(c => c.id);
      let messagesByChat = {};
      const allSenderIds = new Set();
      
      if (chatIds.length) {
        const { data: msgsData, error: msgsErr } = await supabase
          .from('messages')
          .select('*')
          .in('chat_id', chatIds);
        if (!msgsErr) {
          (msgsData || []).forEach(m => {
            messagesByChat[m.chat_id] = messagesByChat[m.chat_id] || [];
            messagesByChat[m.chat_id].push(m);
            if (m.sender_id) allSenderIds.add(m.sender_id);
          });
          // sort messages per chat
          Object.keys(messagesByChat).forEach(cid => {
            messagesByChat[cid].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
        }
      }

      // Fetch all sender profiles (admins, artists, etc.)
      let senderNameMap = {};
      const uniqueSenderIds = Array.from(allSenderIds);
      if (uniqueSenderIds.length) {
         const { data: senderProfiles } = await supabase
           .from('profiles')
           .select('id, nome, nome_completo_razao_social')
           .in('id', uniqueSenderIds);
         (senderProfiles || []).forEach(p => {
            senderNameMap[p.id] = p.nome || p.nome_completo_razao_social || 'Usuário';
         });
      }

      // Process data to match mockChats structure
      const formattedChats = data.map(chat => {
        const sortedMessages = messagesByChat[chat.id] || [];
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
            senderName: senderNameMap[m.sender_id] || 'Usuário',
            timestamp: m.created_at,
            text: m.content ?? m.message ?? ''
          };
        });

        const unreadCount = messagesWithSender.filter(m => 
          !m.read && m.sender !== 'me' // Simply count messages not from me that are unread
        ).length;

        const assignedTo = chat.assigned_to ?? null;
        
        // Determine the "Other" participant
        const participantIds = chat.participant_ids || [];
        let otherId = null;
        if (participantIds.length > 0) {
          otherId = participantIds.find(id => id !== user.id) || chat.owner_id || participantIds[0];
        }

        const artistName = artistNameMap[otherId] || `Usuário #${String(otherId || '').slice(0,4)}...`;
        const artistAvatarUrl = artistAvatarMap[otherId] || null;

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
          messages: messagesWithSender,
          lastMessage: (lastMsg?.content ?? lastMsg?.message) || '',
          lastMessageTime: lastMsg?.created_at || chat.created_at,
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social, avatar_url, cidade, estado, genero_musical')
        .or('cargo.eq.Artista,cargo.eq.Artist');
        
      if (error) throw error;
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
      
      const { error } = await supabase
        .from('chats')
        .update({ status })
        .eq('id', chatId);
        
      if (error) throw error;
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
      const { error } = await supabase
        .from('chats')
        .update({ assigned_to: user.id })
        .eq('id', chatId);

      if (error) {
        // Fallback local assignment if column missing
        setChats(prev => prev.map(c => c.id === chatId ? { ...c, assignedTo: user.id } : c));
        return;
      }
      // local state will be updated by realtime handler
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
      const { error } = await supabase
        .from('messages')
        .insert({
          id: tempId, 
          chat_id: chatId,
          sender_id: user.id,
          receiver_id: receiverId,
          content: text,
          metadata: { sender_cargo: profile?.cargo || null }
        });

      if (error) {
        // Rollback on error
        setChats(prev => {
            const idx = prev.findIndex(c => c.id === chatId);
            if (idx === -1) return prev;
            
            const updatedChat = {
              ...prev[idx],
              messages: prev[idx].messages.filter(m => m.id !== tempId)
            };
            const next = [...prev];
            next[idx] = updatedChat;
            return next;
        });
        throw error;
      }

      // Subscription will handle the rest (ignoring duplicate ID)
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createChat = async (artistId) => {
    // Check if exists in local state first
    const existing = chats.find(c => c.artistId === artistId);
    if (existing) return existing.id;

    try {
      // Validate artist exists and is an artist
      const { data: artistProfile } = await supabase
        .from('profiles')
        .select('id, cargo')
        .eq('id', artistId)
        .maybeSingle();
      const roleStr = String(artistProfile?.cargo || '').toLowerCase();
      if (!artistProfile || !['artist','artista'].includes(roleStr)) {
        return null;
      }

      // Check if exists in DB to avoid 409
      const { data: existingDb } = await supabase
        .from('chats')
        .select('id')
        .contains('participant_ids', [artistId])
        .maybeSingle();

      if (existingDb) return existingDb.id;

      // Create new chat
      // If creator is admin, participants = [me, artist]
      // If creator is artist, participants = [me] (and admin joins later or sees it via role)
      // But typically we want explicit participants.
      const participants = Array.from(new Set([artistId, user.id]));

      // Determine status based on who creates it
      // If Vendedor creates it for an artist, it starts as 'pending'
      const creatorRole = String(profile?.cargo || '').toLowerCase();
      const initialStatus = (creatorRole === 'vendedor' && artistId !== user.id) ? 'pending' : 'active';

      const { data, error } = await supabase
        .from('chats')
        .insert({
          participant_ids: participants,
          owner_id: user.id,
          status: initialStatus,
          metadata: { initiated_by: user.id, creator_role: creatorRole }
        })
        .select()
        .single();

      if (error) {
        // Handle race condition (concurrent creation)
        if (error.code === '23505' || error.status === 409) {
           const { data: retryData } = await supabase
             .from('chats')
             .select('id')
              .contains('participant_ids', [artistId])
             .maybeSingle();
           return retryData?.id;
        }
        throw error;
      }
      return data.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
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
      // Find chat to get request ID
      let chat = chats.find(c => c.id === chatId);
      let requestId = chat?.metadata?.original_request_id;

      // If not found in state or metadata missing, try fetching from DB
      if (!requestId) {
        const { data: dbChat } = await supabase
          .from('chats')
          .select('metadata')
          .eq('id', chatId)
          .maybeSingle();
        requestId = dbChat?.metadata?.original_request_id;
      }
      
      // Direct deletion - Messages first, then Chat
      // This avoids reliance on RPCs that might not exist or have permission issues
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);
      
      if (msgError) {
        console.error('Error deleting messages:', msgError);
        // Continue trying to delete chat even if messages fail (cascade might handle it)
      }
      
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
        
      if (chatError) throw chatError;
      
      // Delete associated support request if it exists
      if (requestId) {
          await supabase
            .from('support_queue')
            .delete()
            .eq('id', requestId);
      }

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
      const { error } = await supabase.rpc('send_notification', {
        p_recipient_id: recipientId,
        p_title: title,
        p_message: message,
        p_link: link
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  };

  const sendBroadcast = async (title, message, targetRole = null, link = null) => {
    try {
      const { error } = await supabase.rpc('send_broadcast_notification', {
        p_title: title,
        p_message: message,
        p_target_role: targetRole === 'all' ? null : targetRole,
        p_link: link
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending broadcast:', error);
      return false;
    }
  };

  const markChatRead = async (chatId) => {
     try {
       const { error } = await supabase
         .from('messages')
         .update({ read: true })
         .eq('chat_id', chatId)
         .eq('read', false);
       if (error) {
         console.error('Error marking messages read:', error);
       }
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
      userRole: profile?.cargo
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
