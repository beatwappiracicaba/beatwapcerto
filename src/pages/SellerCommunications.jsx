import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Bell, User } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const SellerCommunications = () => {
  const { user } = useAuth();
  const { toggleChat, selectContact } = useChat(); // Assuming context exposes these
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('cargo', 'Artista')
        .order('nome', { ascending: true });

      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (artist) => {
    // This assumes ChatContext handles opening chat. 
    // If not, we might need to adapt. For now, we simulate opening the chat window.
    if (selectContact) selectContact(artist);
    if (toggleChat) toggleChat(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Comunicação</h1>
          <p className="text-gray-400">Fale com os artistas e receba avisos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Artist List for Chat */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="text-beatwap-gold" />
              Conversas Diretas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artists.map(artist => (
                <Card key={artist.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => handleStartChat(artist)}>
                  <div className="w-12 h-12 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.nome} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{artist.nome}</h4>
                    <p className="text-xs text-gray-400">Clique para enviar mensagem</p>
                  </div>
                  <AnimatedButton size="sm" variant="secondary" icon={MessageCircle} />
                </Card>
              ))}
            </div>
          </div>

          {/* Right: Notifications/System Notices (Mock for now) */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="text-red-400" />
              Avisos do Sistema
            </h3>
            <Card className="p-4 bg-red-500/5 border-red-500/20">
              <h4 className="font-bold text-white mb-1">Aprovação Pendente</h4>
              <p className="text-sm text-gray-400">Você tem 2 propostas aguardando aprovação de cache.</p>
            </Card>
            <Card className="p-4">
              <h4 className="font-bold text-white mb-1">Atualização de Agenda</h4>
              <p className="text-sm text-gray-400">O artista "MC Exemplo" bloqueou a data 15/11.</p>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerCommunications;
