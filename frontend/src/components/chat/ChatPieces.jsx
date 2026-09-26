import { Check, Clock } from 'lucide-react';

export const MessageBubble = ({ message, mine, authorName, showTail }) => {
  const m = message || {};
  const media = Array.isArray(m.metadata?.media) ? m.metadata.media : [];
  const replying = m.metadata?.reply_to || null;

  const base = `max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
    mine ? 'rounded-br-md bg-beatwap-gold text-black' : 'rounded-bl-md bg-white/10 text-white'
  }`;

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-2' : 'mt-0.5'}`}>
      <div className={base}>
        {!mine && showTail && authorName && (
          <div className="mb-0.5 text-[11px] font-bold text-beatwap-gold">{authorName}</div>
        )}

        {replying && (
          <div className="mb-1.5 border-l-2 border-black/40 pl-2 text-[11px] opacity-80">
            {String(replying).slice(0, 90)}
          </div>
        )}

        {media.map((mid) => {
          const url = String(mid?.url || '');
          const tipo = String(mid?.type || 'image');
          if (!url) return null;
          if (tipo.startsWith('video')) {
            return (
              <video key={mid.id || url} src={url} controls playsInline preload="metadata"
                className="mb-1.5 max-h-64 w-full rounded-xl object-cover" />
            );
          }
          return (
            <img key={mid.id || url} src={url} alt="Anexo"
              className="mb-1.5 max-h-64 w-full rounded-xl object-cover" loading="lazy" />
          );
        })}

        {m.content ? <p className="whitespace-pre-wrap">{String(m.content)}</p>
          : (!media.length && <p className="italic opacity-70">Anexo</p>)}

        <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-black/60' : 'text-gray-400'}`}>
          <Clock size={9} />
          <span>
            {m.created_at
              ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </span>
          {mine && <Check size={10} />}
        </div>
      </div>
    </div>
  );
};

export const ConversationItem = ({ chat, meId, onOpen }) => {
  const msgs = Array.isArray(chat?.messages) ? chat.messages : [];
  const last = msgs.length ? msgs[msgs.length - 1] : null;
  const unread = msgs.filter((m) => !m.read && String(m.sender_id) !== String(meId)).length;

  const nome = chat?.peer?.nome || 'Usuário';
  const preview = last
    ? (String(last.sender_id) === String(meId) ? 'Você: ' : '') + String(last.content || (last.metadata?.media ? 'Enviou uma mídia' : ''))
    : 'Conversa iniciada';
  const hora = last?.created_at
    ? new Date(last.created_at).toLocaleDateString() === new Date().toLocaleDateString()
      ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : new Date(last.created_at).toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    : '';

  return (
    <button
      type="button"
      onClick={() => onOpen(chat.id)}
      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
    >
      <span className="relative h-12 w-12 shrink-0">
        <span className="block h-full w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
          {chat?.peer?.avatar_url ? (
            <img src={chat.peer.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
              {String(nome).trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        {/* Indicador de presenca so aparece se o backend informar. */}
        {chat?.peer?.is_online === true && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#101010] bg-green-500" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${unread ? 'font-extrabold text-white' : 'font-semibold text-gray-300'}`}>
            {nome}
          </span>
          {hora && <span className="shrink-0 text-[10px] text-gray-500">{hora}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate text-xs ${unread ? 'text-gray-200' : 'text-gray-500'}`}>
            {preview}
          </span>
          {unread > 0 && (
            <span className="shrink-0 rounded-full bg-beatwap-gold px-1.5 text-[10px] font-bold text-black">
              {unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
};
