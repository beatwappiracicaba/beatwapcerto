import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Music, LogOut, Menu, X, TrendingUp, Lock, Users, Calendar, Target, FileText, MessageCircle, DollarSign } from 'lucide-react';
import { Card } from './ui/Card';
import { AnimatedButton } from './ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';

export const DashboardLayout = ({ children }) => {
  const { signOut, user, profile } = useAuth();
  const isProdutor = profile?.cargo?.toLowerCase() === 'produtor';
  const isVendedor = profile?.cargo?.toLowerCase() === 'vendedor';
  const isAdmin = isProdutor || isVendedor; // Treat Vendor as Admin for Chat purposes
  const isCompositor = profile?.cargo?.toLowerCase() === 'compositor';
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Default permissions (all enabled) if not set
  const permissions = profile?.access_control || { 
    musics: !isCompositor, 
    compositions: isCompositor,
    work: !isCompositor, 
    marketing: true, 
    chat: true,
    finance: true
  };

  const location = useLocation();

  const hasAccess = () => {
    if (isVendedor) return true; // Vendedor has access to their specific routes (handled by router)
    const path = location.pathname;
    if (path.includes('/dashboard/musics') && permissions.musics === false) return false;
    if (path.includes('/dashboard/compositions') && permissions.compositions === false) return false;
    if (path.includes('/dashboard/work') && permissions.work === false) return false;
    if (path.includes('/dashboard/marketing') && permissions.marketing === false) return false;
    if (path.includes('/dashboard/finance') && permissions.finance === false) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 p-6 space-y-4 border-r border-white/10 bg-black/95 backdrop-blur-md transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-[60]`}>
        <NavLink to="/dashboard" className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span><span>Wap</span>
        </NavLink>
        <button className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <nav className="space-y-2">
          <NavLink to="/dashboard" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <LayoutGrid size={18} /> <span>Visão Geral</span>
          </NavLink>
          
          {isVendedor && (
            <>
              {permissions.seller_artists !== false && (
                <NavLink to="/seller/artists" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                  <Users size={18} /> <span>Artistas</span>
                </NavLink>
              )}
              {permissions.seller_calendar !== false && (
                <NavLink to="/seller/calendar" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                  <Calendar size={18} /> <span>Agenda</span>
                </NavLink>
              )}
              {permissions.seller_leads !== false && (
                <NavLink to="/seller/leads" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                  <Target size={18} /> <span>Oportunidades</span>
                </NavLink>
              )}
              {permissions.seller_finance !== false && (
                <NavLink to="/seller/finance" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                  <DollarSign size={18} /> <span>Comissões</span>
                </NavLink>
              )}
              {permissions.seller_proposals !== false && (
                <NavLink to="/seller/proposals" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                  <FileText size={18} /> <span>Propostas</span>
                </NavLink>
              )}
              {permissions.seller_communications !== false && (
                <NavLink to="/seller/communications" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                  <MessageCircle size={18} /> <span>Comunicação</span>
                </NavLink>
              )}
            </>
          )}
          
          {!isVendedor && permissions.musics !== false && !isCompositor && (
            <NavLink to="/dashboard/musics" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Music size={18} /> <span>Minhas Músicas</span>
            </NavLink>
          )}

          {!isVendedor && permissions.compositions !== false && isCompositor && (
            <NavLink to="/dashboard/compositions" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Music size={18} /> <span>Minhas Composições</span>
            </NavLink>
          )}
          
          {!isVendedor && permissions.work !== false && !isCompositor && (
            <NavLink to="/dashboard/work" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <LayoutGrid size={18} /> <span>Trabalho</span>
            </NavLink>
          )}
          
          {!isVendedor && permissions.finance !== false && (
            <NavLink to="/dashboard/finance" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <DollarSign size={18} /> <span>Financeiro</span>
            </NavLink>
          )}
          
          {!isVendedor && permissions.marketing !== false && (
            <NavLink to="/dashboard/marketing" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <TrendingUp size={18} /> <span>{isCompositor ? 'Carreira & Negócios' : 'Mentoria/Marketing'}</span>
            </NavLink>
          )}
        </nav>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 w-full px-4 sm:px-6 py-6 md:ml-0 ml-0">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400">Bem-vindo</div>
              <div className="text-lg md:text-2xl font-bold truncate">
                {profile?.nome || profile?.cargo || 'Usuário'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="relative z-50">
              {currentUserId && <NotificationBell userId={currentUserId} />}
            </div>
            <div className="h-6 w-px bg-white/10 hidden md:block"></div>
            <ProfileButton profile={profile} />
          </div>
        </div>
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {hasAccess() ? children : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                <Lock size={48} />
              </div>
              <h2 className="text-2xl font-bold"><span>Acesso Restrito</span></h2>
              <p className="text-gray-400 max-w-md">
                <span>Você não tem permissão para acessar esta seção. Entre em contato com seu produtor para solicitar acesso.</span>
              </p>
            </div>
          )}
        </div>
      </main>
      
      {permissions.chat !== false && (
        <>
          <ChatButton isAdmin={isAdmin} currentUserId={currentUserId} />
          <ChatWindow isAdmin={isAdmin} currentUserId={currentUserId} />
        </>
      )}
    </div>
  );
};
