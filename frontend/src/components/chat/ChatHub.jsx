import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, PenSquare, MessageCircle, Users, Bell, X, Loader } from 'lucide-react';
import { useSocialChats } from '../../hooks/useSocialChats';
import { useNotification, CONTEXT_FEED } from '../../context/NotificationContext';
import { ConversationItem, MessageBubble } from './ChatPieces';
import { MessageComposer } from './MessageComposer';
import { NewConversationModal } from './NewConversationModal';

/**
 * Central de Conversas do Feed.
 *
 * Celular: lista de conversas ou conversa aberta em tela cheia.
 * Desktop: lista a esquerda e conversa a direita, no mesmo painel.
 * Usa apenas `context=social` e o realtime que ja existe: nada de dados
 * ficticios nem um segundo sistema de mensagens.
 */
export const ChatHub = ({ open, onClose, meId, autoTarget, me }) => {
  const { chats, active, activeId, setActiveId, loading, sending, startChat, sendMessage, markRead, unreadCount } = useSocialChats();
  const { getUnreadCount } = useNotification();
  const [busca, setBusca] = useState('');
  const [nova, setNova] = useState(false);
  const fimRef = useRef(null);

  const notifUnread = Number(getUnreadCount?.(CONTEXT_FEED) || 0);
  const [abrindo, setAbrindo] = useState(false);
  const [erroAbrindo, setErroAbrindo] = useState('');

  // Vindo do Perfil Social com um alvo: abre direto a conversa com essa
  // pessoa. Nao cai na lista para o usuario escolher de novo.
  useEffect(() => {
    if (!open || !autoTarget) return undefined;
    let vivo = true;
    setAbrindo(true);
    setErroAbrindo('');
    (async () => {
      try {
        const c = await startChat(autoTarget);
        if (!vivo) return;
        if (c?.id) setActiveId(c.id);
        else setErroAbrindo('Nao foi possivel abrir a conversa.');
      } catch (e) {
        if (vivo) setErroAbrindo(e?.message || 'Nao foi possivel abrir a conversa.');
      } finally {
        if (vivo) setAbrindo(false);
      }
    })();
    return () => { vivo = false; };
  }, [open, autoTarget, startChat, setActiveId]);

  useEffect(() => {
    if (!open) { setActiveId(null); setBusca(''); setAbrindo(false); setErroAbrindo(''); }
  }, [open, setActiveId]);

  useEffect(() => {
    if (activeId && active?.unread) markRead(activeId);
  }, [activeId, active?.unread, markRead]);

  useEffect(() => {
    if (open && active) fimRef.current?.scrollIntoView({ block: 'end' });
  }, [open, active, active?.messages?.length]);

  const termo = busca.trim().toLowerCase();
  const filtradas = useMemo(() => {
    if (!busca.trim()) return chats;
    const alvo = busca.trim().toLowerCase();
    return chats.filter((c) => {
      const nome = String(c?.peer?.nome || '').toLowerCase();
      const social = String(c?.peer?.social_username || '').toLowerCase();
      const conversa = (c?.messages || [])
        .map((m) => String(m?.content || '')).join(' ').toLowerCase();
      return nome.includes(alvo) || social.includes(alvo)
        || String(c?.id) === alvo || conversa.includes(alvo);
    });
  }, [busca, chats]);

  if (!open) return null;

  const lista = (
    <div className="flex min-h-0 w-full flex-col md:w-[320px] md:shrink-0 md:border-r md:border-white/10">
      <div className="shrink-0 px-3 py-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar conversas"
            aria-label="Pesquisar conversas"
            className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/50"
          />
        </div>
      </div>

      <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
        {/* Status: interlocutores reais das conversas. O "Seu status" fica
            preparado e desabilitado: o sistema nao tem status/stories ainda,
            e nada aqui e dado ficticio. */}
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex w-16 shrink-0 flex-col items-center gap-1">
            <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-black/30">
              {me?.avatar_url ? (
                <img src={me.avatar_url} alt="" className="h-full w-full object-cover opacity-50" />
              ) : (
                <span className="text-xs font-bold text-gray-500">+</span>
              )}
            </span>
            <span className="w-full truncate text-center text-[10px] text-gray-500">Seu status</span>
          </div>

          {chats.map((c) => (
            <button
              key={`st-${c.id}`}
              type="button"
              onClick={() => setActiveId(c.id)}
              className="flex w-16 shrink-0 flex-col items-center gap-1"
            >
              <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-beatwap-gold/50 bg-black/30">
                {c.peer?.avatar_url ? (
                  <img src={c.peer.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {String(c.peer?.nome || 'U').trim().charAt(0).toUpperCase()}
                  </span>
                )}
                {c.unread > 0 && (
                  <span className="absolute bottom-0 right-0 min-w-[15px] rounded-full bg-beatwap-gold px-1 text-[9px] font-bold leading-[15px] text-black">
                    {c.unread}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[10px] text-gray-400">{c.peer?.nome}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
            <Loader size={15} className="animate-spin" /> Carregando conversas...
          </div>
        ) : filtradas.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <MessageCircle size={30} className="mx-auto mb-2 opacity-20" />
            <div className="text-sm text-gray-400">
              {termo ? 'Não encontramos nenhuma conversa.' : 'Você ainda não tem conversas.'}
            </div>
            {!termo && (
              <button
                type="button"
                onClick={() => setNova(true)}
                className="mt-3 text-xs font-bold text-beatwap-gold hover:underline"
              >
                Começar uma conversa
              </button>
            )}
          </div>
        ) : (
          filtradas.map((c) => (
            <ConversationItem key={c.id} chat={c} meId={meId} onOpen={setActiveId} />
          ))
        )}
      </div>

      {/* Navegacao inferior, so no celular. */}
      <nav className="shrink-0 border-t border-white/10 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 md:hidden" aria-label="Navegação de mensagens">
        <div className="flex">
          {[
            { key: 'conversas', label: 'Conversas', icon: MessageCircle, badge: unreadCount, active: true },
            { key: 'pessoas', label: 'Pessoas', icon: Users, onClick: () => setNova(true) },
            { key: 'avisos', label: 'Avisos', icon: Bell, badge: notifUnread }
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={t.onClick}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold"
              aria-current={t.active ? 'page' : undefined}
            >
              <span className="relative">
                <t.icon size={19} className={t.active ? 'text-beatwap-gold' : 'text-gray-500'} />
                {t.badge > 0 && (
                  <span className="absolute -right-1.5 -top-0.5 min-w-[15px] rounded-full bg-red-500 px-1 text-[9px] font-bold leading-[15px] text-white">
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                )}
              </span>
              <span className={t.active ? 'text-beatwap-gold' : 'text-gray-500'}>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );

  const conversa = (
    <div className={`min-h-0 flex-1 flex-col ${active || abrindo ? 'flex' : 'hidden md:flex'}`}>
      {abrindo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <Loader size={26} className="animate-spin text-beatwap-gold" />
          <div className="text-sm text-gray-400">Abrindo conversa...</div>
        </div>
      ) : erroAbrindo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="text-sm text-red-400">{erroAbrindo}</div>
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-gray-300 transition hover:bg-white/5"
          >
            Voltar para a lista
          </button>
        </div>
      ) : !active ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <MessageCircle size={34} className="opacity-20" />
          <div className="text-sm text-gray-500">Escolha uma conversa</div>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2 py-2.5">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="Voltar para a lista"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/5 md:hidden"
            >
              <ArrowLeft size={19} />
            </button>
            <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-black/30">
              {active.peer?.avatar_url ? (
                <img src={active.peer.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                  {String(active.peer?.nome || 'U').trim().charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white">{active.peer?.nome}</div>
              {active.peer?.is_online === true && (
                <div className="text-[11px] text-green-400">Online</div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {(active.messages || []).map((m, i, arr) => (
              <MessageBubble
                key={m.id}
                message={m}
                mine={String(m.sender_id) === String(meId)}
                showTail={i === 0 || String(arr[i - 1]?.sender_id) !== String(m.sender_id)}
              />
            ))}
            <div ref={fimRef} />
          </div>

          <MessageComposer
            sending={sending}
            onSend={async (texto, midia) => {
              if (!midia) return sendMessage(activeId, texto);
              const ok = await sendMessage(activeId, '', {
                url: midia.url, type: midia.type
              });
              return !!ok;
            }}
          />
        </>
      )}
    </div>
  );

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[115] flex items-stretch justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Fechar"
            className="absolute inset-0 h-full w-full cursor-default bg-black/75 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Central de conversas"
            className="relative flex w-full max-w-5xl flex-col overflow-hidden border border-white/10 bg-[#101010] sm:rounded-2xl"
            initial={{ y: '100%', opacity: 0.7 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0.7 }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-2 py-2.5 sm:px-4">
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar conversas"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/5 hover:text-white"
              >
                <X size={19} />
              </button>
              <h2 className="min-w-0 flex-1 truncate text-center text-sm font-bold text-white sm:text-base">
                Mensagens
              </h2>
              <button
                type="button"
                onClick={() => setNova(true)}
                aria-label="Nova conversa"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-beatwap-gold text-black transition hover:brightness-95"
              >
                <PenSquare size={17} />
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {lista}
              {conversa}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <NewConversationModal
        open={nova}
        meId={meId}
        onClose={() => setNova(false)}
        onPick={async (id) => {
          const c = await startChat(id);
          if (c?.id) setActiveId(c.id);
        }}
      />
    </>
  );
};

export default ChatHub;
