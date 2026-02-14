import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Users, Music, LogOut, Menu, X, Settings, DollarSign } from 'lucide-react';
import { Card } from './ui/Card';
import { AnimatedButton } from './ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';

export const AdminLayout = ({ children }) => {
  const { signOut, user, profile } = useAuth();
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Default permissions for admin (all enabled if not set)
  const permissions = profile?.access_control || {
    admin_artists: true,
    admin_musics: true,
    admin_compositions: true,
    admin_sponsors: true,
    admin_settings: true,
    admin_sellers: true
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 p-6 space-y-4 border-r border-white/10 bg-black/95 backdrop-blur-md transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-[60]`}>
        <div className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span>Wap
        </div>
        <button className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <nav className="space-y-2">
          <NavLink to="/admin" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <LayoutGrid size={18} /> Visão Geral
          </NavLink>
          
          {permissions.admin_artists !== false && (
            <NavLink to="/admin/artists" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Users size={18} /> Artistas
            </NavLink>
          )}

          {permissions.admin_sellers !== false && (
            <NavLink to="/admin/sellers" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Users size={18} /> Vendedores
            </NavLink>
          )}

          <NavLink to="/admin/finance" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <DollarSign size={18} /> Financeiro
          </NavLink>

          {permissions.admin_musics !== false && (
            <NavLink to="/admin/musics" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Music size={18} /> Músicas
            </NavLink>
          )}

          {permissions.admin_compositions !== false && (
            <NavLink to="/admin/compositions" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Music size={18} /> Composições
            </NavLink>
          )}

          {permissions.admin_sponsors !== false && (
            <NavLink to="/admin/sponsors" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Users size={18} /> Patrocinadores/Parcerias
            </NavLink>
          )}

          {permissions.admin_settings !== false && (
            <NavLink to="/admin/settings" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
              <Settings size={18} /> Configurações
            </NavLink>
          )}
          {/* Chat removido do menu, manter apenas flutuante */}
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 md:ml-0 ml-0 w-full min-w-0">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400">Painel do Produtor</div>
              <div className="text-lg md:text-2xl font-bold truncate">
                {profile?.nome || 'Produtor'}
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
          <div className="space-y-6">{children}</div>
        </div>
      </main>
      <ChatButton isAdmin={true} currentUserId={currentUserId} />
      <ChatWindow isAdmin={true} currentUserId={currentUserId} />
    </div>
  );
};
