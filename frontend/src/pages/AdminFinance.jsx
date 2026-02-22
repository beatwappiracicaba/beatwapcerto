import React from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { ShowRevenueDistributor } from '../components/admin/ShowRevenueDistributor';

export const AdminFinance = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Financeiro</h1>
          <p className="text-gray-400">Distribuição de faturamento de shows e eventos</p>
        </div>
        <ShowRevenueDistributor />
      </div>
    </AdminLayout>
  );
};
