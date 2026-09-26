import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, MessageCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocialChats } from '../../hooks/useSocialChats';

const clock = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const dayLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  if (mesmoDia) return `Hoje ${clock(iso)}`;
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
};

const Avatar = ({ url, nome, size = 'md' }) => {
  const cls = size === 'lg' ? 'h-11 w-11 text-base' : 'h-10 w-10 text-sm';
  return (
    <span className={`${cls} shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5`}>
      {url ? (
        <img src={url} alt={nome} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-bold text-white">
          {String(nome || 'U').trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
};

/**
 * Chat Social do Feed.
 *
 * Janela propria, separada do chat administrativo: consome apenas
 * `context=social` e nunca soma mensagens do atendimento. No desktop fica
 * em duas colunas; no celular abre a lista e a conversa ocupa a tela toda.
 */
export const FeedChatPanel = ({ open, onClose, meId, startChatWith }) => {
  const navigate = useNavigate();
  const {
    chats, active, activeId, setActiveId,
    loading, sending, error, refresh, sendMessage, markRead
  } = useSocialChats();

  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (activeId && active?.unread) markRead(activeId);
  }, [activeId, active?.unread, markRead]);

  useEffect(() => {
    if (open && active) endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, active]);

  // Vindo do perfil social: abre/seleciona a conversa com a pessoa.
  useEffect(() => {
    if (!open || !startChatWith) return;
    const run = async () => {
      const chat = await startChatWith();
      if (chat?.id) setActiveId(chat.id);
    };
    run();
  }, [open, startChatWith, setActiveId]);

  const submit = async (e) => {
    e?.preventDefault();
    const text = draft;
    if (!text.trim() || !activeId || sending) return;
    setDraft('');
    await sendMessage(activeId, text);
  };

  if (!open) return null;

  const list = (
    <div className={`flex min-h-0 flex-col ${active ? 'hidden md:flex' : 'flex'} md:w-[300px] md:shrink-0 md:border-r md:border-white/10`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="text-sm font-bold text-white">Mensagens</div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Atualizar conversas"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Carregando conversas...</div>
        ) : chats.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-20" />
            <div className="text-sm text-gray-400">Nenhuma conversa</div>
            <p className="mt-1 text-xs text-gray-600">
              Abra um perfil no Feed e use <strong>Mensagem</strong> para comecar.
            </p>
          </div>
        ) : (
          chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`flex w-full items-center gap-3 border-b border-white/5 px-3 py-3 text-left transition ${
                activeId === c.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              }`}
            >
              <Avatar url={c.peer.avatar_url} nome={c.peer.nome} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-white">{c.peer.nome}</span>
                  {c.last?.created_at && (
                    <span className="shrink-0 text-[10px] text-gray-500">{dayLabel(c.last.created_at)}</span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-400">
                    {c.last ? String(c.last.content || '') : 'Conversa iniciada'}
                  </span>
                  {c.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-beatwap-gold px-1.5 text-[10px] font-bold text-black">
                      {c.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const thread = (
    <div className={`min-h-0 flex-1 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
      {!active ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <MessageCircle size={36} className="opacity-20" />
          <div className="text-sm text-gray-400">Escolha uma conversa</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="rounded-lg p-1.5 text-gray-300 transition hover:bg-white/5 md:hidden"
              aria-label="Voltar para a lista"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/feed/perfil/${active.peer.id}`)}
              className="rounded-full transition hover:ring-2 hover:ring-beatwap-gold/50"
              aria-label={`Perfil social de ${active.peer.nome}`}
            >
              <Avatar url={active.peer.avatar_url} nome={active.peer.nome} />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/feed/perfil/${active.peer.id}`)}
              className="min-w-0 flex-1 truncate text-left text-sm font-bold text-white hover:text-beatwap-gold"
            >
              {active.peer.nome}
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {active.messages.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                Diga oi para {active.peer.nome}.
              </div>
            ) : (
              active.messages.map((m) => {
                const mine = String(m.sender_id) === String(meId);
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        mine
                          ? 'rounded-br-md bg-beatwap-gold text-black'
                          : 'rounded-bl-md bg-white/10 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{String(m.content || '')}</p>
                      <span className={`mt-0.5 block text-[10px] ${mine ? 'text-black/60' : 'text-gray-400'}`}>
                        {clock(m.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t border-white/10 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:pb-2.5"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-beatwap-gold/50"
              aria-label="Mensagem"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-beatwap-gold text-black transition disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send size={17} />
            </button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[95] flex bg-black/70 backdrop-blur-sm" role="dialog" aria-label="Mensagens">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        aria-label="Fechar mensagens"
      />
      <div className="relative m-auto flex h-[86dvh] w-[94vw] max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] md:h-[80vh]">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="text-sm font-bold text-white">Mensagens</div>
          <div className="flex items-center gap-1">
            {error && (
              <span className="flex items-center gap-1 text-xs text-red-300">
                <AlertCircle size={13} />
                {error}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Fechar"
            >
              <ArrowLeft size={18} className="md:hidden" />
              <span className="hidden md:inline text-sm">Fechar</span>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {list}
          {thread}
        </div>
      </div>
    </div>
  );
};
