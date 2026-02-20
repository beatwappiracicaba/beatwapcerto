import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { apiClient } from '../services/apiClient';
import { User, Target, DollarSign, Calendar, FileText, Check, X as XIcon } from 'lucide-react';

export const AdminSellers = () => {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Seller Data
  const [goals, setGoals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [leads, setLeads] = useState([]);

  // Goal Form
  const [goalForm, setGoalForm] = useState({ month_year: '', shows_target: 0, revenue_target: 0 });

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    if (selectedSeller) {
      fetchSellerData(selectedSeller.id);
    }
  }, [selectedSeller]);

  const fetchSellers = async () => {
    try {
      const data = await apiClient.get('/admin/sellers');
      setSellers(data || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchSellerData = async (sellerId) => {
    setLoading(true);
    try {
      const goalsData = await apiClient.get(`/admin/sellers/${sellerId}/goals`);
      setGoals(goalsData || []);

      const commsData = await apiClient.get(`/admin/sellers/${sellerId}/commissions`);
      setCommissions(commsData || []);

      const leadsData = await apiClient.get(`/admin/sellers/${sellerId}/leads`);
      setLeads(leadsData || []);

    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!selectedSeller || !goalForm.month_year) return;
    
    const [year, month] = goalForm.month_year.split('-').map(Number);

    try {
      await apiClient.post(`/admin/sellers/${selectedSeller.id}/goals`, {
        month,
        year,
        shows_target: parseInt(goalForm.shows_target),
        revenue_target: parseFloat(goalForm.revenue_target)
      });
      fetchSellerData(selectedSeller.id);
      setGoalForm({ month_year: '', shows_target: 0, revenue_target: 0 });
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const updateCommissionStatus = async (id, status) => {
    try {
      await apiClient.patch(`/admin/commissions/${id}/status`, { status });
      fetchSellerData(selectedSeller.id);
    } catch (error) {
      console.error('Error updating commission:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Vendedores</h1>
          <p className="text-gray-400">Gerencie metas, comissões e acompanhe o desempenho</p>
        </div>

        {/* Seller Selection */}
        <Card className="p-4">
          <label className="block text-sm text-gray-400 mb-2">Selecione um Vendedor</label>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {sellers.map(seller => (
              <button
                key={seller.id}
                onClick={() => setSelectedSeller(seller)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all min-w-[200px] ${selectedSeller?.id === seller.id ? 'bg-beatwap-gold/10 border-beatwap-gold' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {seller.avatar_url ? <img src={seller.avatar_url} alt={seller.nome} className="w-full h-full object-cover" /> : <User size={20} />}
                </div>
                <div className="text-left">
                  <div className="font-bold text-white text-sm">{seller.nome || 'Sem Nome'}</div>
                  <div className="text-xs text-gray-400">Vendedor</div>
                </div>
              </button>
            ))}
            {sellers.length === 0 && <div className="text-gray-400 text-sm p-2">Nenhum vendedor cadastrado.</div>}
          </div>
        </Card>

        {selectedSeller && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metas */}
            <Card className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="text-beatwap-gold" /> Metas
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <input 
                  type="month" 
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                  value={goalForm.month_year}
                  onChange={e => setGoalForm({...goalForm, month_year: e.target.value})}
                />
                <AnimatedInput 
                  placeholder="Meta Shows" 
                  type="number" 
                  value={goalForm.shows_target} 
                  onChange={e => setGoalForm({...goalForm, shows_target: e.target.value})}
                />
                <AnimatedInput 
                  placeholder="Meta R$" 
                  type="number" 
                  value={goalForm.revenue_target} 
                  onChange={e => setGoalForm({...goalForm, revenue_target: e.target.value})}
                />
              </div>
              <AnimatedButton onClick={handleSaveGoal} className="w-full">Definir Meta</AnimatedButton>
              
              <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                {goals.map(g => (
                  <div key={g.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg text-sm">
                    <span className="text-white font-bold">{g.month}/{g.year}</span>
                    <div className="text-right">
                      <div className="text-beatwap-gold">{g.shows_target} shows</div>
                      <div className="text-gray-400">R$ {g.revenue_target}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Comissões */}
            <Card className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <DollarSign className="text-green-500" /> Comissões Pendentes
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {commissions.filter(c => c.status === 'pendente').map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <div className="font-bold text-white">{c.leads?.contractor_name || 'Venda'}</div>
                      <div className="text-xs text-gray-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.amount)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateCommissionStatus(c.id, 'pago')} className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30">
                        <Check size={16} /> Pagar
                      </button>
                      <button onClick={() => updateCommissionStatus(c.id, 'cancelado')} className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30">
                        <XIcon size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {commissions.filter(c => c.status === 'pendente').length === 0 && (
                  <div className="text-center py-4 text-gray-500">Nenhuma comissão pendente.</div>
                )}
              </div>
            </Card>

            {/* Leads Recentes */}
            <Card className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-blue-400" /> Leads & Oportunidades
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="bg-white/5 text-white uppercase text-xs">
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Evento</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-bold text-white">{lead.contractor_name}</td>
                        <td className="p-3">{lead.event_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs border ${lead.status === 'fechado' ? 'border-green-500 text-green-500' : 'border-gray-500'}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="p-3">R$ {lead.budget}</td>
                        <td className="p-3">{new Date(lead.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
