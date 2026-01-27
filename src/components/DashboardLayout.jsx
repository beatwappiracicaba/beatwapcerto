import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Upload, Settings, LogOut, Music, Shield, Users, Bell, BarChart2, Edit2, Camera, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import logo from '../assets/images/beatwap-logo.png';
import { NotificationBell } from './Notifications/NotificationBell';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { useAuth } from '../context/AuthContext';
import { ProfileEditModal } from './ui/ProfileEditModal';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const SidebarItem = ({ icon: Icon, label, to, active, onClick }) => (
  <Link to={to} onClick={onClick}>
    <motion.div 
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors relative overflow-hidden",
        active ? "text-beatwap-black font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.95 }}
    >
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-beatwap-gold z-0"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <div className="relative z-10 flex items-center gap-3">
        <Icon size={20} />
        <span>{label}</span>
      </div>
    </motion.div>
  </Link>
);

export const DashboardLayout = ({ children, isAdmin = false, isSeller = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const currentUserId = user?.id;
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Force profile completion
  useEffect(() => {
    if (!profile) return;
    
    // Check if name or avatar is missing
    if (!profile.name || !profile.avatar_url) {
      // Small delay to ensure loading isn't happening
      const timer = setTimeout(() => {
        navigate('/dashboard/account');
        if (!profile.name || !profile.avatar_url) {
           addToast('Por favor, complete seu perfil com foto e nome.', 'info');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, addToast, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSaveProfile = async (data) => {
    const { name, bio, blob } = data;
    
    if (!name && !blob && !bio) {
        setIsProfileModalOpen(false);
        return;
    }

    setUploading(true);
    try {
        let publicUrl = null;

        if (blob) {
            const fileName = `${user.id}/${Date.now()}.jpg`;
            
            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl: url } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);
            publicUrl = url;
        }

        // 3. Update Profile
        const updates = {};

        if (publicUrl) updates.avatar_url = publicUrl;
        if (name) {
             // Capitalize first letter of each word
             updates.name = name.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
        }
        if (bio !== undefined) updates.bio = bio;

        console.log('Sending updates to Supabase:', updates);

        const { error: updateError } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (updateError) throw updateError;

        addToast('Perfil atualizado com sucesso!', 'success');
        setIsProfileModalOpen(false);
        
        // Refresh context
        await refreshProfile();

    } catch (error) {
        console.error('Error updating profile:', JSON.stringify(error, null, 2));
        addToast(`Erro ao atualizar perfil: ${error.message || error.details || 'Erro desconhecido'}`, 'error');
    } finally {
        setUploading(false);
    }
  };

  return (
    <div className="flex h-screen bg-beatwap-black text-white font-sans selection:bg-beatwap-gold selection:text-black overflow-hidden">
      
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        "flex flex-col w-64 border-r border-white/5 bg-beatwap-black z-50 transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex flex-col h-full">
            <div className="mb-10 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center">
                  <img src={logo} alt="BeatWap Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl tracking-tight">BeatWap</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
              {isAdmin ? (
                // Admin Menu
                <>
                  <SidebarItem 
                    icon={LayoutDashboard} 
                    label="Visão Geral" 
                    to="/admin" 
                    active={location.pathname === '/admin'}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={Users} 
                    label="Artistas" 
                    to="/admin/artists" 
                    active={location.pathname.includes('/admin/artists')}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={Music} 
                    label="Músicas" 
                    to="/admin/music" 
                    active={location.pathname.includes('/admin/music')}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={BarChart2} 
                    label="Métricas" 
                    to="/admin/metrics" 
                    active={location.pathname.includes('/admin/metrics')}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={Bell} 
                    label="Notificações" 
                    to="/admin/notifications" 
                    active={location.pathname.includes('/admin/notifications')}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={Settings} 
                    label="Configurações" 
                    to="/admin/settings" 
                    active={location.pathname.includes('/admin/settings')}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                </>
              ) : isSeller ? (
                <>
                  <SidebarItem 
                    icon={LayoutDashboard} 
                    label="Visão Geral" 
                    to="/seller" 
                    active={location.pathname === '/seller'}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                </>
              ) : (
                // Artist Menu
                <>
                  <SidebarItem 
                    icon={LayoutDashboard} 
                    label="Visão Geral" 
                    to="/dashboard" 
                    active={location.pathname === '/dashboard'}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={Upload} 
                    label="Meus Lançamentos" 
                    to="/dashboard/uploads" 
                    active={location.pathname.includes('uploads')}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                  <SidebarItem 
                    icon={Settings} 
                    label="Configurações" 
                    to="/settings" 
                    active={location.pathname === '/settings'}
                    onClick={() => setIsSidebarOpen(false)}
                  />
                </>
              )}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5">
              <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 w-full rounded-xl transition-colors">
                <LogOut size={20} />
                <span>Sair</span>
              </button>
            </div>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-beatwap-black/50 backdrop-blur-md flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white">
                <Menu size={24} />
            </button>
            <h2 className="font-bold text-lg text-gray-400 truncate">
                {isAdmin ? 'Área do Produtor' : isSeller ? 'Área do Vendedor' : 'Área do Artista'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell userId={currentUserId} />
            <div className="flex items-center gap-3 pl-4 border-l border-white/10 group cursor-pointer" onClick={() => navigate('/dashboard/account')}>
              <div className="text-right hidden md:block group-hover:opacity-80 transition-opacity">
                <div className="text-sm font-bold text-white">{profile?.name || user?.email?.split('@')[0] || 'Usuário'}</div>
                <div className="text-xs text-gray-400 flex items-center justify-end gap-1">
                  {isAdmin ? 'Produtor' : isSeller ? 'Vendedor' : 'Artista'} <Edit2 size={10} />
                </div>
              </div>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-beatwap-gold to-yellow-300 border-2 border-black flex items-center justify-center text-black font-bold overflow-hidden">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        profile?.name?.charAt(0).toUpperCase() || 'U'
                    )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={14} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto w-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {user && (
        <>
          <ChatButton isAdmin={isAdmin || isSeller} currentUserId={currentUserId} />
          <ChatWindow isAdmin={isAdmin || isSeller} currentUserId={currentUserId} />
        </>
      )}

      <ProfileEditModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        currentAvatar={profile?.avatar_url}
        currentName={profile?.name}
        currentBio={profile?.bio}
        onSave={handleSaveProfile}
        uploading={uploading}
      />
    </div>
  );
};
