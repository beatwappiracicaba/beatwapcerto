import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Music, LogOut, Menu, X, TrendingUp } from 'lucide-react';
import { Card } from './ui/Card';
import { AnimatedButton } from './ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';

export const DashboardLayout = ({ children }) => {
  const { signOut, user, profile } = useAuth();
  const isAdmin = profile?.cargo === 'Produtor';
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 p-6 space-y-4 border-r border-white/10 bg-white/[0.02] backdrop-blur-md transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50`}>
        <div className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span>Wap
        </div>
        <button className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <nav className="space-y-2">
          <NavLink to="/dashboard" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <LayoutGrid size={18} /> Visão Geral
          </NavLink>
          <NavLink to="/dashboard/musics" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <Music size={18} /> Minhas Músicas
          </NavLink>
          <NavLink to="/dashboard/work" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <LayoutGrid size={18} /> Trabalho
          </NavLink>
          <NavLink to="/dashboard/marketing" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <TrendingUp size={18} /> Mentoria/Marketing
          </NavLink>
          {/* Chat removido do menu, manter apenas flutuante */}
        </nav>
        <Card className="mt-8 bg-white/[0.03] border-white/10">
          <AnimatedButton onClick={signOut} icon={LogOut}>Sair</AnimatedButton>
        </Card>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 w-full px-4 sm:px-6 py-6 md:ml-0 ml-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="text-xs text-gray-400">Bem-vindo</div>
            <div className="text-2xl font-bold">
              {profile?.nome || 'Artista'}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentUserId && <NotificationBell userId={currentUserId} />}
            <ProfileButton profile={profile} />
          </div>
        </div>
        <div className="space-y-6 max-w-7xl mx-auto w-full">{children}</div>
      </main>
      <ChatButton isAdmin={isAdmin} currentUserId={currentUserId} />
      <ChatWindow isAdmin={isAdmin} currentUserId={currentUserId} />
    </div>
  );
};
