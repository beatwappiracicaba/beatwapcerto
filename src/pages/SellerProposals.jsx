import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, ExternalLink, Check, X as XIcon, Clock } from 'lucide-react';

const SellerProposals = () => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    lead_id: '', // Optional linkage
    value: '',
    status: 'rascunho',
    file_url: '',
    observations: ''
  });

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          leads (contractor_name, event_name)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProposal = async () => {
    try {
      const { error } = await supabase
        .from('proposals')
        .insert([{
          ...formData,
          seller_id: user.id,
          value: parseFloat(formData.value) || 0,
          lead_id: formData.lead_id || null
        }]);

      if (error) throw error;
      setIsModalOpen(false);
      fetchProposals();
      setFormData({ lead_id: '', value: '', status: 'rascunho', file_url: '', observations: '' });
    } catch (error) {
      console.error('Error saving proposal:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aceito': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'rejeitado': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'enviado': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Propostas & Contratos</h1>
            <p className="text-gray-400">Organize seus envios e fechamentos</p>
          </div>
          <AnimatedButton onClick={() => setIsModalOpen(true)} icon={Plus}>Nova Proposta</AnimatedButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposals.map(prop => (
            <Card key={prop.id} className="p-6 relative group hover:border-beatwap-gold/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl text-beatwap-gold">
                  <FileText size={24} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(prop.status)} uppercase`}>
                  {prop.status}
                </span>
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="text-lg font-bold text-white truncate">
                  {prop.leads?.contractor_name || 'Cliente Avulso'}
                </h3>
                <p className="text-sm text-gray-400">{prop.leads?.event_name || 'Proposta Geral'}</p>
                <div className="text-xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.value)}
                </div>
              </div>

              <div className="flex gap-2 text-xs text-gray-500 mb-4">
                <Clock size={14} />
                {new Date(prop.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2">
                {prop.file_url && (
                  <a href={prop.file_url} target="_blank" rel="noreferrer" className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors">
                    Ver Arquivo
                  </a>
                )}
                {!prop.file_url && (
                  <button disabled className="flex-1 py-2 bg-white/5 rounded-lg text-sm text-gray-600 cursor-not-allowed">
                    Sem Arquivo
                  </button>
                )}
              </div>
            </Card>
          ))}

          {proposals.length === 0 && !loading && (
             <div className="col-span-full text-center py-20 text-gray-500">
               Nenhuma proposta registrada.
             </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] w-full max-w-md rounded-3xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6">Registrar Proposta</h2>
            <div className="space-y-4">
              <AnimatedInput 
                label="Valor (R$)" 
                type="number" 
                value={formData.value} 
                onChange={(e) => setFormData({...formData, value: e.target.value})} 
              />
              <AnimatedInput 
                label="Link do Arquivo/Proposta (Google Drive/PDF)" 
                value={formData.file_url} 
                onChange={(e) => setFormData({...formData, file_url: e.target.value})} 
              />
              <div className="space-y-1">
                <label className="text-xs text-gray-400 ml-1">Status</label>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors appearance-none"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="rascunho" className="bg-black">Rascunho</option>
                  <option value="enviado" className="bg-black">Enviado</option>
                  <option value="aceito" className="bg-black">Aceito</option>
                  <option value="rejeitado" className="bg-black">Rejeitado</option>
                </select>
              </div>
              <textarea 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-beatwap-gold/50 resize-none"
                rows={3}
                placeholder="Observações..."
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
              />
              <div className="flex gap-3 pt-4">
                <AnimatedButton onClick={handleSaveProposal} className="flex-1">Salvar</AnimatedButton>
                <AnimatedButton onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1">Cancelar</AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SellerProposals;
