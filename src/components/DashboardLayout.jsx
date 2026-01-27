import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Music, User, MessageCircle, LogOut } from 'lucide-react';
import { Card } from './ui/Card';
import { AnimatedButton } from './ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout = ({ children }) => {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="w-64 border-r border-gray-800 p-6 space-y-4">
        <div className="text-xl font-bold">BeatWap</div>
        <nav className="space-y-2">
          <NavLink to="/dashboard" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-gray-800' : 'hover:bg-gray-900'}`}>
            <LayoutGrid size={18} /> Visão Geral
          </NavLink>
          <NavLink to="/dashboard/musics" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-gray-800' : 'hover:bg-gray-900'}`}>
            <Music size={18} /> Minhas Músicas
          </NavLink>
          <NavLink to="/dashboard/profile" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-gray-800' : 'hover:bg-gray-900'}`}>
            <User size={18} /> Meu Perfil
          </NavLink>
          <NavLink to="/dashboard/chat" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-md ${isActive ? 'bg-gray-800' : 'hover:bg-gray-900'}`}>
            <MessageCircle size={18} /> Chat
          </NavLink>
        </nav>
        <Card className="mt-8">
          <AnimatedButton onClick={signOut} icon={LogOut}>Sair</AnimatedButton>
        </Card>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};
