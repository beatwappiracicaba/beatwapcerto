import React, { useState, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Users, Search, MessageCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

const SellerArtists = () => {
  const { artists, loading } = useData();
  const { setIsOpen, createChat, setActiveChatId } = useChat();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return (artists || [])
      .filter(a => ['artist', 'artista'].includes(String(a.role).toLowerCase()))
      .filter(a => 
        (a.name || '').toLowerCase().includes(term) ||
        (a.email || '').toLowerCase().includes(term)
      );
  }, [artists, searchTerm]);

  const openChatWithArtist = async (artistId) => {
    const chatId = await createChat(artistId);
    if (chatId) {
      setActiveChatId(chatId);
      setIsOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Artistas</h1>
          <p className="text-gray-400">Gerencie conversas e acompanhe artistas.</p>
        </div>
        <div className="w-full md:w-64">
          <AnimatedInput 
            icon={Search} 
            placeholder="Buscar artista..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card className="p-6 text-gray-400">Carregando artistas...</Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-gray-400">Nenhum artista encontrado.</Card>
        ) : (
          filtered.map(artist => (
            <Card key={artist.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center">
                  {artist.avatar_url ? (
                    <img src={artist.avatar_url} alt={artist.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 font-bold text-lg">{artist.name?.charAt(0)?.toUpperCase() || 'A'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{artist.name || 'Artista'}</h3>
                  <p className="text-sm text-gray-400">{artist.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <AnimatedButton onClick={() => openChatWithArtist(artist.id)}>
                  <MessageCircle size={18} />
                  Abrir Chat
                </AnimatedButton>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SellerArtists;
