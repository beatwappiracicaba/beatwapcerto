import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Music, User, MessageCircle, LogOut } from 'lucide-react';
import { Card } from './ui/Card';
import { AnimatedButton } from './ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { NotificationBell } from './notifications/NotificationBell';

export const DashboardLayout = ({ children }) => {
  const { signOut, user, profile } = useAuth();
  const isAdmin = profile?.cargo === 'Produtor';
  const currentUserId = user?.id;
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className="w-64 p-6 space-y-4 border-r border-white/10 bg-white/[0.02] backdrop-blur-md">
        <div className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span>Wap
        </div>
        <nav className="space-y-2">
          <NavLink to="/dashboard" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <LayoutGrid size={18} /> Visão Geral
          </NavLink>
          <NavLink to="/dashboard/musics" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <Music size={18} /> Minhas Músicas
          </NavLink>
          <NavLink to="/dashboard/profile" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <User size={18} /> Meu Perfil
          </NavLink>
          <NavLink to="/dashboard/chat" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
            <MessageCircle size={18} /> Chat
          </NavLink>
        </nav>
        <Card className="mt-8 bg-white/[0.03] border-white/10">
          <AnimatedButton onClick={signOut} icon={LogOut}>Sair</AnimatedButton>
        </Card>
      </aside>
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs text-gray-400">Bem-vindo</div>
            <div className="text-2xl font-bold">
              {profile?.nome || 'Artista'}
            </div>
          </div>
          {currentUserId && <NotificationBell userId={currentUserId} />}
        </div>
        <div className="space-y-6">{children}</div>
      </main>
      <ChatButton isAdmin={isAdmin} currentUserId={currentUserId} />
      <ChatWindow isAdmin={isAdmin} currentUserId={currentUserId} />
    </div>
  );
};
