import React from 'react';
import { useAuth } from '../../context/AuthContext';

const SellerOverview = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Área do Vendedor</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-beatwap-graphite rounded-2xl border border-white/5">
          <h2 className="font-bold mb-2">Oportunidades</h2>
          <p className="text-sm text-gray-400">Em breve</p>
        </div>
        <div className="p-6 bg-beatwap-graphite rounded-2xl border border-white/5">
          <h2 className="font-bold mb-2">Conversas</h2>
          <p className="text-sm text-gray-400">Use o chat para atender artistas</p>
        </div>
        <div className="p-6 bg-beatwap-graphite rounded-2xl border border-white/5">
          <h2 className="font-bold mb-2">Perfil</h2>
          <p className="text-sm text-gray-400">Atualize seu perfil no canto superior</p>
        </div>
      </div>
    </div>
  );
};

export default SellerOverview;
