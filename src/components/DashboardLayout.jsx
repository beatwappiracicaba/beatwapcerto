import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Upload, Settings, LogOut, Music, Shield, Users, Bell, BarChart2, Edit2, Camera } from 'lucide-react';
import { clsx } from 'clsx';
import logo from '../assets/images/beatwap-logo.png';
import { NotificationBell } from './Notifications/NotificationBell';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { useAuth } from '../context/AuthContext';
import { ProfileEditModal } from './ui/ProfileEditModal';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const SidebarItem = ({ icon: Icon, label, to, active }) => (
  <Link to={to}>
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

export const DashboardLayout = ({ children, isAdmin = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const currentUserId = user?.id;
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Force profile completion
  useEffect(() => {
    if (!profile) return;
    
    // Check if name or avatar is missing
    if (!profile.name || !profile.avatar_url) {
      // Small delay to ensure loading isn't happening
      const timer = setTimeout(() => {
        setIsProfileModalOpen(true);
        if (!profile.name || !profile.avatar_url) {
           addToast('Por favor, complete seu perfil com foto e nome.', 'info');
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile, addToast]);

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
        const updates = {
            updated_at: new Date().toISOString(),
        };

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
    <div className="flex min-h-screen bg-beatwap-black text-white font-sans selection:bg-beatwap-gold selection:text-black">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/5 p-6 flex flex-col fixed h-full bg-beatwap-black z-20">
        <div className="mb-10 flex items-center gap-2 px-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <img src={logo} alt="BeatWap Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-xl tracking-tight">BeatWap</span>
        </div>

        <nav className="space-y-2 flex-1">
          {isAdmin ? (
            // Admin Menu
            <>
              <SidebarItem 
                icon={LayoutDashboard} 
                label="Visão Geral" 
                to="/admin" 
                active={location.pathname === '/admin'} 
              />
              <SidebarItem 
                icon={Users} 
                label="Artistas" 
                to="/admin/artists" 
                active={location.pathname.includes('/admin/artists')} 
              />
              <SidebarItem 
                icon={Music} 
                label="Músicas" 
                to="/admin/music" 
                active={location.pathname.includes('/admin/music')} 
              />
              <SidebarItem 
                icon={BarChart2} 
                label="Métricas" 
                to="/admin/metrics" 
                active={location.pathname.includes('/admin/metrics')} 
              />
              <SidebarItem 
                icon={Bell} 
                label="Notificações" 
                to="/admin/notifications" 
                active={location.pathname.includes('/admin/notifications')} 
              />
              <SidebarItem 
                icon={Settings} 
                label="Configurações" 
                to="/admin/settings" 
                active={location.pathname.includes('/admin/settings')} 
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
              />
              <SidebarItem 
                icon={Upload} 
                label="Meus Lançamentos" 
                to="/dashboard/uploads" 
                active={location.pathname.includes('uploads')} 
              />
              <SidebarItem 
                icon={Settings} 
                label="Configurações" 
                to="/settings" 
                active={location.pathname === '/settings'} 
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

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-beatwap-black/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="font-bold text-lg text-gray-400">
            {isAdmin ? 'Painel Administrativo' : 'Área do Artista'}
          </h2>
          <div className="flex items-center gap-4">
            <NotificationBell userId={currentUserId} />
            <div className="flex items-center gap-3 pl-4 border-l border-white/10 group cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
              <div className="text-right hidden md:block group-hover:opacity-80 transition-opacity">
                <div className="text-sm font-bold text-white">{profile?.name || user?.email?.split('@')[0] || 'Usuário'}</div>
                <div className="text-xs text-gray-400 flex items-center justify-end gap-1">
                  {isAdmin ? 'Admin' : 'Artista'} <Edit2 size={10} />
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

        <div className="p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {user && (
        <>
          <ChatButton isAdmin={isAdmin} currentUserId={currentUserId} />
          <ChatWindow isAdmin={isAdmin} currentUserId={currentUserId} />
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
