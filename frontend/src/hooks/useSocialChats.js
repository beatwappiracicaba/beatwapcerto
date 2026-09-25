import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';

// Chat Social do Feed.
//
// Conversas 1:1 entre usuarios cadastrados, sempre com `context: 'social'`
// no servidor. Nao encosta no contexto administrativo: o `ChatContext`
// continua sendo so do chat flutuante de atendimento.
const strip = (v) => String(v ?? '').trim();

// Deriva o "outro" da conversa a partir de quem sou eu.
function peerOf(chat, meId) {
  const ids = Array.isArray(chat?.participant_ids) ? chat.participant_ids : [];
  const names = Array.isArray(chat?.participant_names) ? chat.participant_names : [];
  const avatars = Array.isArray(chat?.participant_avatars) ? chat.participant_avatars : [];
  const idx = ids.findIndex((id) => strip(id) !== strip(meId));
  if (idx === -1) return null;
  return {
    id: strip(ids[idx]),
    nome: names[idx] || 'Usuário',
    avatar_url: avatars[idx] || null
  };
}

const lastMessageOf = (chat) => {
  const list = Array.isArray(chat?.messages) ? chat.messages : [];
  return list.length ? list[list.length - 1] : null;
};

export const useSocialChats = () => {
  const { user } = useAuth();
  const meId = strip(user?.id);
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!meId || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const data = await apiClient.get('/chats?context=social', { cache: false });
      setRaw(Array.isArray(data) ? data : []);
      setError('');
    } catch (e) {
      setError(e?.message || 'Falha ao carregar conversas');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [meId]);

  useEffect(() => {
    if (!meId) {
      setRaw([]);
      return;
    }
    refresh();
  }, [meId, refresh]);

  // Contador: mensagens nao lidas em conversas SOCIAIS. Nunca soma o
  // administrativo, que tem o proprio contador na bolinha flutuante.
  const chats = useMemo(() => {
    const list = (Array.isArray(raw) ? raw : [])
      .map((c) => {
        const messages = Array.isArray(c.messages) ? c.messages : [];
        const unread = messages.filter((m) => !m.read && strip(m.sender_id) !== meId).length;
        const last = lastMessageOf(c);
        return {
          id: c.id,
          peer: peerOf(c, meId),
          messages,
          unread,
          last,
          updatedAt: last?.created_at || c.created_at || null
        };
      })
      .filter((c) => c.peer)
      .sort((a, b) => {
        const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return tb - ta;
      });
    return list;
  }, [raw, meId]);

  const unreadCount = useMemo(
    () => chats.reduce((sum, c) => sum + c.unread, 0),
    [chats]
  );

  const active = useMemo(
    () => chats.find((c) => c.id === activeId) || null,
    [chats, activeId]
  );

  // Abre (ou cria) a conversa com um usuario. O servidor reaproveita a
  // conversa existente, entao chamar duas vezes nao duplica.
  const startChat = useCallback(async (userId) => {
    const target = strip(userId);
    if (!meId || !target || target === meId) return null;
    const chat = await apiClient.post('/chats', { context: 'social', participant_id: target });
    await refresh();
    setActiveId(chat?.id || null);
    return chat;
  }, [meId, refresh]);

  const sendMessage = useCallback(async (chatId, text) => {
    const content = strip(text);
    if (!chatId || !content) return null;
    setSending(true);
    try {
      const msg = await apiClient.post('/messages', { chat_id: chatId, content });
      await refresh();
      return msg;
    } catch (e) {
      setError(e?.message || 'Falha ao enviar mensagem');
      return null;
    } finally {
      setSending(false);
    }
  }, [refresh]);

  const markRead = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      await apiClient.put(`/chats/${chatId}/mark-read`);
      await refresh();
    } catch {
      void 0;
    }
  }, [refresh]);

  return {
    chats,
    active,
    activeId,
    setActiveId,
    loading,
    sending,
    error,
    unreadCount,
    refresh,
    startChat,
    sendMessage,
    markRead
  };
};
