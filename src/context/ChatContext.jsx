import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [admins, setAdmins] = useState([]); // Store admin profiles
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      fetchAdmins(); // Fetch admins for header display
      
      // Subscribe to real-time changes
      const channel = supabase
        .channel('public:chats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
          fetchChats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchChats();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setChats([]);
    }
  }, [user, profile]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, cargo')
        .eq('cargo', 'Produtor');

      if (error) throw error;
      const mapped = (data || []).map(p => ({
        id: p.id,
        name: p.nome || 'Produtor',
        avatar_url: p.avatar_url
      }));
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
        .select(`
          *,
          messages (*)
        `)
        .order('updated_at', { ascending: false });

      const cargo = profile?.cargo;
      const isAdmin = cargo === 'Produtor';
      const isSeller = cargo === 'Vendedor';
      if (!isAdmin && !isSeller) {
        query = query.eq('artista_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data to match mockChats structure
      const formattedChats = data.map(chat => {
        const sortedMessages = chat.messages?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) || [];
        const lastMsg = sortedMessages[sortedMessages.length - 1];
        
        const messagesWithSender = sortedMessages.map(m => {
          const roleStr = String(m.sender_role || m.sender_cargo || '').toLowerCase();
          const sender =
            roleStr.includes('artist') || roleStr.includes('artista')
              ? 'artist'
              : 'admin';
          return {
            ...m,
            sender,
            timestamp: m.created_at,
            text: m.content ?? m.message ?? ''
          };
        });

        const unreadCount = messagesWithSender.filter(m => 
          !m.read && 
          ((isAdmin && m.sender === 'artist') || 
           (!isAdmin && m.sender === 'admin'))
        ).length;

        const assignedTo = chat.assigned_to ?? null;

        return {
          id: chat.id,
          artistId: chat.artista_id ?? chat.artist_id,
          adminId: 'admin',
          assignedTo,
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
      await fetchChats();
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
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          sender_role: profile?.cargo || sender,
          sender_cargo: profile?.cargo || null,
          content: text,
          message: text,
          read: false
        });

      if (error) throw error;
      
      // Update chat updated_at
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId);

      // fetchChats will be triggered by subscription
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
        .eq('artista_id', artistId)
        .maybeSingle();

      if (existingDb) return existingDb.id;

      // Create new chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          artista_id: artistId
        })
        .select()
        .single();

      if (error) {
        // Handle race condition (concurrent creation)
        if (error.code === '23505' || error.status === 409) {
           const { data: retryData } = await supabase
             .from('chats')
             .select('id')
              .eq('artista_id', artistId)
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
      // Delete messages first
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chatId);
      if (msgError) throw msgError;
      // Delete chat
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
      if (chatError) throw chatError;
      // Update local state
      setChats(prev => prev.filter(c => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw error;
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
      deleteChat
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
