import React from 'react';
import { useAuth } from '../../context/AuthContext';

const SellerOverview = () => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Área do Vendedor (em reconstrução)</h1>
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
        <p className="text-gray-400 text-sm">
          Estamos reconstruindo a experiência do vendedor. Em breve você verá ferramentas novas aqui.
        </p>
      </div>
    </div>
  );
};

export default SellerOverview;
