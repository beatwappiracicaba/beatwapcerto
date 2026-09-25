import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Trash2, Check, Heart, MessageCircle, UserPlus, AtSign, Send, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useNotification, CONTEXT_FEED } from '../../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Icone por natureza da interacao social. Notificacao do Feed e sempre
// social: curtida, comentario, mencao, mensagem.
const iconFor = (type) => {
  switch (type) {
    case 'like': return <Heart size={16} className="text-red-400" />;
    case 'comment': return <MessageCircle size={16} className="text-beatwap-gold" />;
    case 'follow': return <UserPlus size={16} className="text-beatwap-gold" />;
    case 'mention': return <AtSign size={16} className="text-beatwap-gold" />;
    case 'message': return <Send size={16} className="text-beatwap-gold" />;
    case 'success': return <CheckCircle size={16} className="text-green-500" />;
    case 'error': return <XCircle size={16} className="text-red-500" />;
    case 'warning': return <AlertTriangle size={16} className="text-yellow-500" />;
    default: return <Info size={16} className="text-blue-500" />;
  }
};

/**
 * Aba de notificacoes do Feed.
 *
 * Abre como uma tela propria (nao um dropdown) com voltar e limpar. Lista
 * somente o bucket `feed`: interacoes sociais, nunca avisos de plataforma.
 */
export const FeedNotificationsPanel = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } = useNotification();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = getNotifications(CONTEXT_FEED);
  const unread = getUnreadCount(CONTEXT_FEED);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  if (!open) return null;

  const openItem = async (n) => {
    await markAsRead(n.id, CONTEXT_FEED);
    const link = String(n.link || '').trim();
    if (link) {
      onClose();
      navigate(link);
      return;
    }
    navigate(`/notifications/${n.id}?context=${CONTEXT_FEED}`);
  };

  const clearAll = async () => {
    setBusy(true);
    try {
      await markAllAsRead(CONTEXT_FEED);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition hover:border-beatwap-gold/50 hover:bg-white/10 hover:text-beatwap-gold"
        >
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="rounded-full bg-beatwap-gold px-2.5 py-1 text-[11px] font-bold text-black">
              {unread} nao lida{unread === 1 ? '' : 's'}
            </span>
          )}
          {list.length > 0 && (
            confirming ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={busy}
                  className="rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {busy ? 'Limpando...' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition hover:bg-white/5"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-bold text-gray-300 transition hover:border-red-400/40 hover:text-red-300"
              >
                <Trash2 size={13} />
                <span>Limpar</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-beatwap-gold/10">
          <Bell size={18} className="text-beatwap-gold" />
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-white">Notificacoes</h2>
          <p className="text-xs text-gray-400">Interacoes sociais com suas publicacoes.</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-14 text-center">
          <Bell size={34} className="mx-auto mb-3 opacity-20" />
          <div className="text-sm font-bold text-gray-300">Nenhuma notificacao</div>
          <p className="mt-1 text-xs text-gray-500">
            Curtidas, comentarios, mencoes e novas conversas aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => openItem(n)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  n.read
                    ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                    : 'border-beatwap-gold/25 bg-beatwap-gold/[0.05] hover:bg-beatwap-gold/10'
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  {iconFor(n.type)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-bold ${n.read ? 'text-gray-300' : 'text-white'}`}>
                      {n.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-500">{when(n.created_at)}</span>
                  </span>
                  <span className="mt-0.5 block break-words text-xs text-gray-400">{n.message}</span>
                </span>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-beatwap-gold" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {list.length > 0 && (
        <button
          type="button"
          onClick={() => list.forEach((n) => !n.read && markAsRead(n.id, CONTEXT_FEED))}
          className="mx-auto flex items-center gap-1.5 text-xs font-bold text-gray-400 transition hover:text-beatwap-gold"
        >
          <Check size={13} />
          <span>Marcar todas como lidas</span>
        </button>
      )}
    </div>
  );
};
