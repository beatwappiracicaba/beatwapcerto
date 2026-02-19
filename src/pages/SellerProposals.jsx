import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { api } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { FileText, Plus, ExternalLink, Check, X as XIcon, Clock, Edit2, Upload, Trash2 } from 'lucide-react';

const SellerProposals = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [proposals, setProposals] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentProposal, setCurrentProposal] = useState(null);

  const [formData, setFormData] = useState({
    lead_id: '',
    client_name: '',
    title: '',
    artist_id: '',
    value: '',
    status: 'rascunho',
    file_url: '',
    observations: '',
    file: null // For file upload
  });

  useEffect(() => {
    fetchProposals();
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const data = await api.get('/artists');
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchProposals = async () => {
    try {
      const data = await api.get('/seller/proposals');
      setProposals(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      addToast('Erro ao carregar propostas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (proposal = null) => {
    if (proposal) {
      setCurrentProposal(proposal);
      setFormData({
        lead_id: proposal.lead_id || '',
        client_name: proposal.client_name || '',
        title: proposal.title || '',
        artist_id: proposal.artist_id || '',
        value: proposal.value || '',
        status: proposal.status || 'rascunho',
        file_url: proposal.file_url || '',
        observations: proposal.observations || '',
        file: null
      });
    } else {
      setCurrentProposal(null);
      setFormData({
        lead_id: '',
        client_name: '',
        title: '',
        artist_id: '',
        value: '',
        status: 'rascunho',
        file_url: '',
        observations: '',
        file: null
      });
    }
    setIsModalOpen(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProposal = async () => {
    setUploading(true);
    try {
      let fileUrl = formData.file_url;

      if (formData.file) {
        fileUrl = await handleFileUpload(formData.file);
      }

      const payload = {
        seller_id: user.id,
        lead_id: formData.lead_id || null,
        client_name: formData.client_name,
        title: formData.title,
        artist_id: formData.artist_id || null,
        value: parseFloat(formData.value) || 0,
        status: formData.status,
        file_url: fileUrl,
        observations: formData.observations
      };

      if (currentProposal) {
        await api.put(`/seller/proposals/${currentProposal.id}`, payload);
        addToast('Proposta atualizada com sucesso!', 'success');
      } else {
        await api.post('/seller/proposals', payload);
        addToast('Proposta criada com sucesso!', 'success');
      }

      setIsModalOpen(false);
      fetchProposals();
    } catch (error) {
      console.error('Error saving proposal:', error);
      addToast('Erro ao salvar proposta', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProposal = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta proposta?')) return;
    try {
      await api.del(`/seller/proposals/${id}`);
      addToast('Proposta excluída!', 'success');
      fetchProposals();
    } catch (error) {
      console.error('Error deleting proposal:', error);
      addToast('Erro ao excluir proposta', 'error');
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
          <AnimatedButton onClick={() => handleOpenModal()} icon={Plus}>Nova Proposta</AnimatedButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proposals.map(prop => (
            <Card key={prop.id} className="p-6 relative group hover:border-beatwap-gold/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl text-beatwap-gold">
                  <FileText size={24} />
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => handleOpenModal(prop)}
                    className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProposal(prop.id)}
                    className="p-1 hover:bg-red-500/10 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-start">
                   <h3 className="text-lg font-bold text-white truncate flex-1">
                    {prop.title || prop.leads?.event_name || 'Sem título'}
                  </h3>
                   <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(prop.status)} uppercase ml-2`}>
                    {prop.status}
                  </span>
                </div>
               
                <p className="text-sm text-gray-400">
                  {prop.client_name || prop.leads?.contractor_name || 'Cliente não informado'}
                </p>
                {prop.artist && (
                  <p className="text-xs text-beatwap-gold/80">
                    Artista: {prop.artist.nome}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="text-sm font-medium text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.value || 0)}
                </div>
                {prop.file_url && (
                  <a 
                    href={prop.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-beatwap-gold hover:underline"
                  >
                    <ExternalLink size={12} />
                    Ver Arquivo
                  </a>
                )}
              </div>
            </Card>
          ))}
          
          {proposals.length === 0 && !loading && (
             <div className="col-span-full text-center py-10 text-gray-500">
               Nenhuma proposta encontrada. Crie uma nova!
             </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {currentProposal ? 'Editar Proposta' : 'Nova Proposta'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <XIcon size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <AnimatedInput 
                label="Nome do Cliente" 
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                placeholder="Ex: João Silva / Empresa X"
              />
              
              <AnimatedInput 
                label="Título da Proposta" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Show Casamento - Setembro"
              />

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Artista</label>
                <select
                  value={formData.artist_id}
                  onChange={(e) => setFormData({...formData, artist_id: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold"
                >
                  <option value="">Selecione um Artista</option>
                  {artists.map(artist => (
                    <option key={artist.id} value={artist.id}>{artist.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AnimatedInput 
                  label="Valor (R$)" 
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold"
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="enviado">Enviado</option>
                    <option value="aceito">Aceito</option>
                    <option value="rejeitado">Rejeitado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Arquivo da Proposta (PDF/Imagem)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.png"
                    onChange={(e) => setFormData({...formData, file: e.target.files[0]})}
                    className="hidden"
                    id="proposal-file"
                  />
                  <label 
                    htmlFor="proposal-file"
                    className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
                  >
                    <Upload size={20} />
                    {formData.file ? formData.file.name : (formData.file_url ? 'Alterar Arquivo' : 'Escolher Arquivo')}
                  </label>
                </div>
                {formData.file_url && !formData.file && (
                   <p className="text-xs text-green-400 mt-1">Arquivo atual disponível</p>
                )}
              </div>

              <AnimatedInput 
                label="Observações" 
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                multiline
                rows={3}
              />

              <div className="pt-4 flex gap-3">
                <AnimatedButton 
                  onClick={() => setIsModalOpen(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Cancelar
                </AnimatedButton>
                <AnimatedButton 
                  onClick={handleSaveProposal} 
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? 'Salvando...' : 'Salvar Proposta'}
                </AnimatedButton>
              </div>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SellerProposals;
