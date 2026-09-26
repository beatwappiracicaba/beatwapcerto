import { useEffect, useRef, useState } from 'react';
import { Lock, X, Plus, Search, User } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { FeedChatPanel } from './FeedChatPanel';
import { FeedNotificationsPanel } from './FeedNotificationsPanel';

const iconBtn =
  'flex h-10 w-10 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-beatwap-gold/60';

/**
 * Tela independente do Feed, em tres areas no desktop:
 * menu lateral fixo | feed central | sidebar direita.
 * No celular troca para header compacto + barra inferior de navegacao.
 *
 * Nao ha sidebar do sistema aqui: o Feed ocupa a tela inteira e a volta
 * para a tela anterior usa o historico.
 *
 * `railItems` e `bottomItems` recebem { key, label, icon, badge, onSelect }.
 * O item "notifications" e resolvido aqui dentro, porque o sino vive neste
 * cabecalho.
 */
export const FeedShell = ({
  onBack,
  canAccess = true,
  railItems = [],
  bottomItems = [],
  menuItems = [],
  rightRail = null,
  chatUnread = 0,
  chatRequest = null,
  children
}) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;

  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const panelRef = useRef(null);
  const burgerRef = useRef(null);

  // `chatRequest` vem da pagina como { targetId?, nonce }. Quando muda, o
  // Chat Social abre (ja escolhendo a conversa, se veio do perfil social).
  const lastRequest = useRef(chatRequest);
  useEffect(() => {
    if (!chatRequest || chatRequest === lastRequest.current) return;
    lastRequest.current = chatRequest;
    setChatTarget(chatRequest.targetId || null);
    setChatOpen(true);
  }, [chatRequest]);

  const searchItem = bottomItems.find((i) => i.key === 'search') || null;

  const closeMenu = () => {
    setMenuOpen(false);
    burgerRef.current?.focus();
  };

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeMenu();
        return;
      }
      if (event.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const runItem = (item) => {
    if (item.key === 'notifications') {
      // Abre a aba de notificacoes do Feed, nao o sino.
      setChatOpen(false);
      setNotificationsOpen(true);
      return;
    }
    if (item.key === 'messages') {
      // Chat Social do Feed. Nao abre o chat administrativo.
      setNotificationsOpen(false);
      setChatTarget(null);
      setChatOpen(true);
      return;
    }
    item.onSelect?.();
  };

  const selectItem = (item) => {
    setMenuOpen(false);
    runItem(item);
  };

  const renderBadge = (badge) =>
    badge > 0 ? (
      <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white">
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null;

  return (
    <div className="feed-shell bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white">
      {/* ---------- Menu lateral fixo (desktop) ---------- */}
      <aside className="feed-rail">
        <div className="flex flex-col items-center gap-1 py-4">
          <div className="mb-2 text-lg font-bold tracking-wide">
            <span className="text-beatwap-gold">B</span>W
          </div>

          {railItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={`rail-${item.key}`}
                type="button"
                onClick={() => runItem(item)}
                title={item.label}
                aria-label={item.label}
                className={`${iconBtn} relative flex-col gap-0.5 text-gray-300 hover:bg-white/5 hover:text-white`}
              >
                <span className="relative">
                  {Icon ? <Icon size={21} /> : null}
                  {renderBadge(item.key === 'messages' ? chatUnread : item.badge)}
                </span>
                <span className="text-[9px] font-semibold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ---------- Coluna principal ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header compacto (celular): lupa a esquerda, avatar a direita. */}
        <header className="feed-header border-b border-white/10 bg-black/85 backdrop-blur-xl md:hidden">
          <div className="flex w-full items-center gap-2 px-3 py-2.5">
            {searchItem && (
              <button
                type="button"
                onClick={() => runItem(searchItem)}
                className={`${iconBtn} shrink-0 text-gray-300 hover:bg-white/5 hover:text-white`}
                aria-label="Pesquisar"
              >
                <Search size={20} />
              </button>
            )}
            <div className="min-w-0 flex-1" />
            {/* A bolinha da foto e o botao de voltar do Feed. */}
            {typeof onBack === 'function' && (
              <button
                type="button"
                onClick={onBack}
                className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-beatwap-gold/40 bg-white/5 transition hover:border-beatwap-gold"
                aria-label="Voltar para o Dashboard"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Voltar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <User size={16} className="text-gray-400" />
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="feed-body">
          {!canAccess ? (
            <div className="mx-auto flex h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
              <div className="rounded-full bg-red-500/10 p-4 text-red-500">
                <Lock size={40} />
              </div>
              <h2 className="text-2xl font-bold">Acesso Restrito</h2>
              <p className="text-sm text-gray-400">
                Voce nao tem permissao para acessar o Feed. Entre em contato com o produtor para solicitar acesso.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-6xl items-start gap-6 px-2 py-3 sm:px-4 sm:py-5 xl:gap-8">
              <div className="min-w-0 flex-1">
                {notificationsOpen ? (
                  <FeedNotificationsPanel open onClose={() => setNotificationsOpen(false)} />
                ) : (
                  children
                )}
              </div>
              {rightRail && (
                <aside className="hidden w-[300px] shrink-0 xl:block">
                  <div className="sticky top-4">{rightRail}</div>
                </aside>
              )}
            </div>
          )}
        </main>
        {/* ---------- Barra inferior (celular) ---------- */}
        {bottomItems.length > 0 && (
          <nav
            className="feed-bottom-nav md:hidden"
            aria-label="Navegacao principal"
          >
            {(() => {
              // O botao de criar fica no meio: itens antes | criar | itens depois.
              const createIdx = bottomItems.findIndex((i) => i.key === 'compose');
              const antes = createIdx === -1 ? bottomItems : bottomItems.slice(0, createIdx);
              const depois = createIdx === -1 ? [] : bottomItems.slice(createIdx + 1);
              const createItem = createIdx === -1 ? null : bottomItems[createIdx];
              const Node = ({ item }) => {
                if (!item) return null;
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    onClick={() => runItem(item)}
                    aria-label={item.label}
                    className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-gray-300"
                  >
                    <span className="relative">
                      {Icon ? <Icon size={21} /> : null}
                      {renderBadge(item.key === 'messages' ? chatUnread : item.badge)}
                    </span>
                    <span className="max-w-full truncate px-0.5 text-[9px] font-semibold leading-none">
                      {item.label}
                    </span>
                  </button>
                );
              };
              return (
                <>
                  {antes.map((i) => <Node key={`b-${i.key}`} item={i} />)}
                  {createItem && (
                    <button
                      type="button"
                      onClick={() => runItem(createItem)}
                      aria-label={createItem.label}
                      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-gray-300"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-beatwap-gold text-black shadow-[0_0_18px_rgba(245,197,66,0.35)]">
                        <Plus size={18} />
                      </span>
                      <span className="max-w-full truncate px-0.5 text-[9px] font-semibold leading-none">
                        {createItem.label}
                      </span>
                    </button>
                  )}
                  {depois.map((i) => <Node key={`b-${i.key}`} item={i} />)}
                </>
              );
            })()}
          </nav>
        )}
      </div>

      {/* ---------- Menu de acoes (todas as telas) ---------- */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-[100]">
            <motion.button
              type="button"
              aria-label="Fechar menu"
              className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMenu}
            />

            <motion.div
              ref={panelRef}
              role="menu"
              aria-label="Menu do Feed"
              className="absolute inset-y-0 left-0 flex w-[82%] max-w-[320px] flex-col border-r border-white/10 bg-[#0d0d0d] shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
                <div className="text-lg font-bold tracking-wide">
                  <span className="text-beatwap-gold">Beat</span>Wap
                </div>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Fechar menu"
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      onClick={() => selectItem(item)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-gray-200 transition hover:bg-white/5 hover:text-white"
                    >
                      {Icon && <Icon size={17} className="shrink-0 text-beatwap-gold" />}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge > 0 && (
                        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* O chat administrativo NAO existe dentro do Feed. Quem conversa aqui e
          o Chat Social (painel acima), alimentado por `context=social`.
          O ChatButton/ChatWindow de atendimento ficam so no Admin/Dashboard. */}
      <FeedChatPanel
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatTarget(null); }}
        meId={currentUserId}
        startChatWith={chatTarget}
      />
    </div>
  );
};
