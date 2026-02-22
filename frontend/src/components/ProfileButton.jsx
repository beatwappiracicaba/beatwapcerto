import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfileButton = ({ profile }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
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
    </div>
  );
};
