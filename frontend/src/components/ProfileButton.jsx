import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { ProfileEditModal } from './ui/ProfileEditModal';

export const ProfileButton = ({ profile }) => {
  const navigate = useNavigate();
  const { signOut, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef(null);
  const isProdutor = profile?.cargo === 'Produtor';

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setIsOpen(false);
    navigate(isProdutor ? '/admin/profile' : '/dashboard/profile');
  };

  const handleEditClick = () => {
    setIsOpen(false);
    setIsEditOpen(true);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
  };

  const handleSaveProfile = async ({ name, bio, genre, socials, blob }) => {
    try {
      setIsSaving(true);
      let avatar_url = null;

      if (blob) {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const resp = await apiClient.post('/profile/avatar', { dataUrl });
        avatar_url = resp?.avatar_url || null;
      }

      const updateData = {};
      const clean = (v) => v != null && String(v).trim() !== '' ? String(v) : null;
      if (typeof name === 'string' && clean(name)) updateData.nome = clean(name);
      if (typeof bio === 'string' && clean(bio)) updateData.bio = clean(bio);
      if (typeof genre === 'string' && clean(genre)) updateData.genero_musical = clean(genre);
      if (socials && typeof socials === 'object') {
        const y = clean(socials.youtube); if (y) updateData.youtube_url = y;
        const s = clean(socials.spotify); if (s) updateData.spotify_url = s;
        const d = clean(socials.deezer); if (d) updateData.deezer_url = d;
        const t = clean(socials.tiktok); if (t) updateData.tiktok_url = t;
        const i = clean(socials.instagram); if (i) updateData.instagram_url = i;
        const site = clean(socials.site); if (site) updateData.site_url = site;
      }
      if (avatar_url) updateData.avatar_url = avatar_url;

      if (Object.keys(updateData).length) {
        await apiClient.put('/profile', updateData);
        await refreshProfile();
        addToast('Perfil atualizado!', 'success');
      } else {
        addToast('Nada para atualizar.', 'warning');
      }

      setIsEditOpen(false);
    } catch (e) {
      console.error('Falha ao atualizar perfil:', e);
      addToast('Falha ao atualizar perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity ml-4 outline-none"
      >
        <div className="text-right hidden md:block">
          <div className="text-sm font-bold text-white">{profile?.nome || profile?.nome_completo_razao_social || 'Usuário'}</div>
          <div className="text-xs text-beatwap-gold">{profile?.cargo || 'Artista'}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center relative ring-2 ring-transparent hover:ring-beatwap-gold/50 transition-all">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={20} className="text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#161616] border border-white/10 rounded-xl shadow-2xl py-2 z-50">
            <button 
                onClick={handleProfileClick}
                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors"
            >
                <User size={16} />
                Meu Perfil
            </button>
            <button
                onClick={handleEditClick}
                className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors"
            >
                <Camera size={16} />
                Modificar foto
            </button>
            <div className="h-px bg-white/10 my-1 mx-2"></div>
            <button 
                onClick={handleSignOut}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-3 transition-colors"
            >
                <LogOut size={16} />
                Sair
            </button>
        </div>
      )}

      <ProfileEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentAvatar={profile?.avatar_url || null}
        currentName={profile?.nome || profile?.nome_completo_razao_social || ''}
        currentBio={profile?.bio || ''}
        currentGenre={profile?.genero_musical || ''}
        currentSocials={{
          youtube: profile?.youtube_url || null,
          spotify: profile?.spotify_url || null,
          deezer: profile?.deezer_url || null,
          tiktok: profile?.tiktok_url || null,
          instagram: profile?.instagram_url || null,
          site: profile?.site_url || null,
        }}
        onSave={handleSaveProfile}
        uploading={isSaving}
      />
    </div>
  );
};
