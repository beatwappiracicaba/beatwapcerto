import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';

export const ProfileButton = ({ profile }) => {
  const navigate = useNavigate();
  const isProdutor = profile?.cargo === 'Produtor';
  return (
    <button 
      onClick={() => navigate(isProdutor ? '/admin/profile' : '/dashboard/profile')}
      className="flex items-center gap-3 pl-4 border-l border-white/10 hover:opacity-80 transition-opacity ml-4"
    >
      <div className="text-right hidden md:block">
        <div className="text-sm font-bold text-white">{profile?.nome || profile?.nome_completo_razao_social || 'Artista'}</div>
        <div className="text-xs text-beatwap-gold">{profile?.cargo || 'Artista'}</div>
      </div>
      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User size={20} className="text-gray-400" />
        )}
      </div>
    </button>
  );
};
