import React from 'react';
import { Card } from '../../components/ui/Card';
import { ChatWindow } from '../../components/FloatingChat/ChatWindow';
import { ChatButton } from '../../components/FloatingChat/ChatButton';
import { useAuth } from '../../context/AuthContext';

const SellerOverview = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Área do Vendedor</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="font-bold mb-2">Oportunidades</h2>
          <p className="text-sm text-gray-400">Em breve</p>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold mb-2">Conversas</h2>
          <p className="text-sm text-gray-400">Use o chat para atender artistas</p>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold mb-2">Perfil</h2>
          <p className="text-sm text-gray-400">Atualize seu perfil no canto superior</p>
        </Card>
      </div>
      <ChatButton isAdmin={true} currentUserId={currentUserId} />
      <ChatWindow isAdmin={true} currentUserId={currentUserId} />
    </div>
  );
};

export default SellerOverview;
