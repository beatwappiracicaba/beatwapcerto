import { ArrowLeft, Lock } from 'lucide-react';
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
 * chat flutuante. Nao ha sidebar nem hamburger aqui de proposito: o Feed
 * ocupa a tela inteira e a volta para a tela anterior usa o historico.
 */
export const FeedShell = ({ onBack, canAccess = true, children }) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const chatAllowed = profile?.access_control?.chat !== false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex flex-col">
      <header className="sticky top-0 z-[70] border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:border-beatwap-gold/50 hover:bg-white/10 hover:text-beatwap-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-beatwap-gold/60"
            aria-label="Voltar"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <div className="min-w-0 flex-1 truncate text-lg sm:text-xl font-bold tracking-wide">
            <span className="text-beatwap-gold">Beat</span>Wap
            <span className="ml-2 hidden text-sm font-normal text-gray-400 sm:inline">Feed</span>
          </div>

          <div className="relative z-50 shrink-0">
            {currentUserId && <NotificationBell userId={currentUserId} />}
          </div>
          <ProfileButton profile={profile} />
        </div>
      </header>

      <main className="flex-1 w-full min-w-0">
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
          <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 py-4 sm:py-6">{children}</div>
        )}
      </main>

      {chatAllowed && (
        <>
          <ChatButton />
          <ChatWindow currentUserId={currentUserId} allowAI />
        </>
      )}
    </div>
  );
};
