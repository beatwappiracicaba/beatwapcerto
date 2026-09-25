import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { ProfileButton } from '../ProfileButton';
import { ChatButton } from '../FloatingChat/ChatButton';
import { ChatWindow } from '../FloatingChat/ChatWindow';

/**
 * Tela independente do Feed.
 *
 * Reproduz apenas a casca que os layouts (DashboardLayout/AdminLayout)
 * forneciam: cabecalho com notificacoes/perfil, o gate de permissao e o
 * chat flutuante. Nao ha sidebar do sistema aqui de proposito: o Feed
 * ocupa a tela inteira e a volta para a tela anterior usa o historico.
 *
 * `menuItems` recebe { key, label, icon, badge, onSelect }. O item
 * "notifications" e resolvido aqui dentro, porque o sino vive neste cabecalho.
 */
export const FeedShell = ({ onBack, canAccess = true, menuItems = [], rightRail = null, children }) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const chatAllowed = profile?.access_control?.chat !== false;

  const [menuOpen, setMenuOpen] = useState(false);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const burgerRef = useRef(null);

  const closeMenu = () => {
    setMenuOpen(false);
    burgerRef.current?.focus();
  };

  // ESC fecha o menu e devolve o foco ao botao que o abriu.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closeMenu();
        return;
      }
      // Mantem o foco dentro do painel enquanto ele estiver aberto.
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

  // Impede o fundo de rolar enquanto o menu esta aberto no mobile.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  const selectItem = (item) => {
    setMenuOpen(false);
    if (item.key === 'notifications') {
      // Reaproveita o sino que ja existe no cabecalho em vez de criar
      // uma segunda tela de notificacoes.
      requestAnimationFrame(() => {
        bellRef.current?.querySelector('button')?.click();
      });
      return;
    }
    item.onSelect?.();
  };

  return (
    <div className="feed-shell bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white">
      <header className="feed-header border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="flex w-full items-center gap-1.5 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
          {menuItems.length > 0 && (
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-beatwap-gold/50 hover:bg-white/10 hover:text-beatwap-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-beatwap-gold/60 md:h-9 md:w-9"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <Menu size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-bold text-white transition hover:border-beatwap-gold/50 hover:bg-white/10 hover:text-beatwap-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-beatwap-gold/60 md:px-3 md:py-2 md:text-xs"
            aria-label="Voltar"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <div className="min-w-0 flex-1 truncate text-lg font-bold tracking-wide sm:text-xl">
            <span className="text-beatwap-gold">Beat</span>Wap
            <span className="ml-2 hidden text-sm font-normal text-gray-400 sm:inline">Feed</span>
          </div>

          <div ref={bellRef} className="relative z-50 shrink-0">
            {currentUserId && <NotificationBell userId={currentUserId} />}
          </div>
          <ProfileButton profile={profile} />
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
          <div className="mx-auto flex w-full max-w-6xl items-start gap-6 px-2 py-3 sm:px-5 sm:py-6">
            <div className="min-w-0 flex-1">{children}</div>
            {rightRail && (
              <aside className="hidden w-[300px] shrink-0 xl:block">{rightRail}</aside>
            )}
          </div>
        )}
      </main>

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

      {chatAllowed && (
        <>
          <ChatButton />
          <ChatWindow currentUserId={currentUserId} allowAI />
        </>
      )}
    </div>
  );
};
