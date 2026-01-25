import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchChats();
      
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

      if (profile?.role !== 'admin') {
        query = query.eq('artist_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data to match mockChats structure
      const formattedChats = data.map(chat => {
        const sortedMessages = chat.messages?.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) || [];
        const lastMsg = sortedMessages[sortedMessages.length - 1];
        
        // Calculate unread count
        // If I am admin, I count messages from artist that are unread
        // If I am artist, I count messages from admin that are unread
        // Note: sender_id in messages is UUID. profile.id is UUID.
        // We need to map sender_id to 'admin' or 'artist' conceptually for the UI components if they rely on string 'admin'/'artist'.
        // BUT the UI components use `msg.sender === 'admin'`.
        // I should probably transform the messages to have `sender: 'admin' | 'artist'` based on sender_id.
        // Or I can update UI components.
        // To be safe and quick, I will transform here.
        // Wait, I need to know if sender_id is admin or artist.
        // I can fetch sender profiles or assume based on role?
        // Actually, if sender_id == chat.artist_id, it is 'artist'. Otherwise 'admin'.
        
        const messagesWithSender = sortedMessages.map(m => ({
          ...m,
          sender: m.sender_id === chat.artist_id ? 'artist' : 'admin',
          timestamp: m.created_at,
          text: m.content
        }));

        const unreadCount = messagesWithSender.filter(m => 
          !m.read && 
          ((profile?.role === 'admin' && m.sender === 'artist') || 
           (profile?.role !== 'admin' && m.sender === 'admin'))
        ).length;

        return {
          id: chat.id,
          artistId: chat.artist_id,
          adminId: 'admin', // Placeholder
          messages: messagesWithSender,
          lastMessage: lastMsg?.content || '',
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
          content: text,
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
      // Check if exists in DB to avoid 409
      const { data: existingDb } = await supabase
        .from('chats')
        .select('id')
        .eq('artist_id', artistId)
        .maybeSingle();

      if (existingDb) return existingDb.id;

      // Create new chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          artist_id: artistId
        })
        .select()
        .single();

      if (error) {
        // Handle race condition (concurrent creation)
        if (error.code === '23505' || error.status === 409) {
           const { data: retryData } = await supabase
             .from('chats')
             .select('id')
             .eq('artist_id', artistId)
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
    if (profile?.role !== 'admin') {
      // Ensure chat exists
      if (!chats.find(c => c.artistId === user.id)) {
        createChat(user.id);
      }
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
      loading
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
