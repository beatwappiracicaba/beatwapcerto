import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { ProfileButton } from '../ProfileButton';
import { ChatButton } from '../FloatingChat/ChatButton';
import { ChatWindow } from '../FloatingChat/ChatWindow';

/**
 * Pagina independente de Configuracoes.
 *
 * Reproduz apenas a casca que o AdminLayout fornecia (notificacoes, perfil e
 * chat flutuante) e adiciona o botao de voltar. Nao ha sidebar aqui de
 * proposito: as configuracoes ocupam a area principal inteira e a navegacao
 * volta pelo historico.
 */
export const SettingsShell = ({ onBack, children }) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const chatAllowed = profile?.access_control?.chat !== false;

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white">
      <header className="sticky top-0 z-[70] border-b border-white/10 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:border-beatwap-gold/50 hover:bg-white/10 hover:text-beatwap-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-beatwap-gold/60"
            aria-label="Voltar para o Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>

          <div className="min-w-0 flex-1 truncate text-lg sm:text-xl font-bold tracking-wide">
            <span className="text-beatwap-gold">Beat</span>Wap
            <span className="ml-2 hidden text-sm font-normal text-gray-400 sm:inline">Configuracoes</span>
          </div>

          <div className="relative z-50 shrink-0">
            {currentUserId && <NotificationBell userId={currentUserId} context="admin" />}
          </div>
          <ProfileButton profile={profile} />
        </div>
      </header>

      <main className="min-h-0 w-full flex-1">
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-5 py-6 sm:py-10">{children}</div>
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
