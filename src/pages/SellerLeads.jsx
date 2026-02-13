import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotification } from '../context/NotificationContext';
import { Plus, Phone, MessageCircle, MoreHorizontal, Calendar, DollarSign, MapPin, X, Save } from 'lucide-react';

const SellerLeads = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotification();
  const [leads, setLeads] = useState([]);
  const [artists, setArtists] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null); // For editing/viewing
  const [history, setHistory] = useState([]);
  const [newHistoryNote, setNewHistoryNote] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    contractor_name: '',
    event_name: '',
    city: '',
    event_date: '',
    budget: '',
    status: 'novo',
    artist_id: '',
    whatsapp: '',
    contractor_id: ''
  });

  // Auto-fill WhatsApp when artist is selected
  useEffect(() => {
    if (formData.artist_id && artists.length > 0) {
      const selectedArtist = artists.find(a => a.id === formData.artist_id);
      if (selectedArtist && selectedArtist.celular && !formData.whatsapp) {
        setFormData(prev => ({ ...prev, whatsapp: selectedArtist.celular }));
      }
    }
  }, [formData.artist_id, artists]);

  // Auto-fill WhatsApp and Name when contractor is selected
  useEffect(() => {
    if (formData.contractor_id && contractors.length > 0) {
      const selectedContractor = contractors.find(c => c.id === formData.contractor_id);
      if (selectedContractor) {
        setFormData(prev => ({ 
          ...prev, 
          contractor_name: selectedContractor.nome || selectedContractor.nome_completo_razao_social || '',
          whatsapp: selectedContractor.celular || prev.whatsapp 
        }));
      }
    }
  }, [formData.contractor_id, contractors]);

  useEffect(() => {
    fetchLeads();
    fetchArtists();
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social, celular')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      setContractors(data || []);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, nome_completo_razao_social, celular')
        .eq('cargo', 'Artista')
        .order('nome', { ascending: true });
      
      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, artist:artist_id(nome, nome_completo_razao_social)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (leadId) => {
    const { data } = await supabase
      .from('negotiation_history')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    setHistory(data || []);
  };

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setCurrentLead(lead);
      setFormData({
        ...lead,
        artist_id: lead.artist_id || '',
        contractor_id: lead.contractor_id || ''
      });
      fetchHistory(lead.id);
    } else {
      setCurrentLead(null);
      setFormData({
        contractor_name: '',
        event_name: '',
        city: '',
        event_date: '',
        budget: '',
        status: 'novo',
        artist_id: '',
        whatsapp: '',
        contractor_id: ''
      });
      setHistory([]);
    }
    setIsModalOpen(true);
  };

  const handleSaveLead = async () => {
    try {
      if (!formData.artist_id) {
        addToast('Por favor, selecione um artista.', 'error');
        return;
      }

      // Remover campos que não pertencem à tabela leads (como o objeto artist expandido)
      const { artist, id, created_at, ...leadData } = formData;

      const payload = {
        ...leadData,
        seller_id: user.id,
        budget: parseFloat(formData.budget) || 0,
        // Convert empty string to null for optional UUIDs
        contractor_id: formData.contractor_id || null
      };

      let leadId = currentLead?.id;

      if (currentLead) {
        const { error } = await supabase
          .from('leads')
          .update(payload)
          .eq('id', currentLead.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('leads')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        leadId = data.id;
      }
      
      // Update calendar based on lead status
      if (leadId) {
        try {
          const { data: existingEvent } = await supabase
            .from('artist_work_events')
            .select('id')
            .eq('lead_id', leadId)
            .maybeSingle();

          if (formData.status === 'perdido') {
            // Delete event from calendar
            if (existingEvent) {
              await supabase
                .from('artist_work_events')
                .delete()
                .eq('id', existingEvent.id);
              
              // Send notification for canceled show
              await addNotification({
                recipientId: formData.artist_id,
                title: 'Show Cancelado',
                message: `O show ${formData.event_name} foi cancelado pois o lead foi perdido.`,
                type: 'warning'
              });
            }
          } else {
            // Map lead status to event status
            let eventStatus = 'pendente';
            if (formData.status === 'novo') eventStatus = 'proposta';
            else if (formData.status === 'negociacao') eventStatus = 'negociacao';
            else if (formData.status === 'fechado') eventStatus = 'fechado';
            else if (formData.status === 'cancelado') eventStatus = 'cancelado';

            const eventPayload = {
              artista_id: formData.artist_id,
              title: formData.event_name || 'Show Confirmado',
              date: formData.event_date ? new Date(formData.event_date).toISOString() : new Date().toISOString(),
              type: 'show',
              notes: `Lead ${formData.status} com ${formData.contractor_name}. Valor: R$ ${formData.budget}`,
              revenue: parseFloat(formData.budget) || 0,
              seller_id: user.id,
              status: eventStatus,
              lead_id: leadId,
              city: formData.city
            };

            if (existingEvent) {
              await supabase
                .from('artist_work_events')
                .update(eventPayload)
                .eq('id', existingEvent.id);
            } else {
              await supabase
                .from('artist_work_events')
                .insert({
                  ...eventPayload,
                  created_by: user.id
                });
            }

            // Send notification for new lead if it's new
            if (!currentLead) {
               await addNotification({
                 recipientId: formData.artist_id, 
                 title: 'Novo Lead', 
                 message: `Um novo lead foi aberto para você: ${formData.event_name}`,
                 type: 'info'
               });
            } else if (formData.status === 'cancelado' && currentLead.status !== 'cancelado') {
               // Send notification for cancellation
               await addNotification({
                 recipientId: formData.artist_id, 
                 title: 'Show Cancelado', 
                 message: `O show ${formData.event_name} foi cancelado.`,
                 type: 'error'
               });
            }
          }
          addToast('Lead salvo e agenda atualizada!', 'success');
        } catch (eventError) {
          console.error('Erro ao atualizar agenda:', eventError);
          addToast('Lead salvo, mas houve erro ao atualizar agenda (verifique colunas).', 'warning');
        }
      }

      setIsModalOpen(false);
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      addToast(`Erro ao salvar lead: ${error.message || 'Verifique o console'}`, 'error');
    }
  };

  const handleAddHistory = async () => {
    if (!newHistoryNote.trim() || !currentLead) return;

    try {
      const { error } = await supabase
        .from('negotiation_history')
        .insert([{
          lead_id: currentLead.id,
          seller_id: user.id,
          notes: newHistoryNote,
          contact_date: new Date().toISOString()
        }]);

      if (error) throw error;
      
      setNewHistoryNote('');
      fetchHistory(currentLead.id);
    } catch (error) {
      console.error('Error adding history:', error);
    }
  };

  const columns = [
    { id: 'novo', label: 'Novo', color: 'bg-blue-500' },
    { id: 'negociacao', label: 'Em Negociação', color: 'bg-yellow-500' },
    { id: 'fechado', label: 'Fechado', color: 'bg-green-500' },
    { id: 'perdido', label: 'Perdido', color: 'bg-red-500' },
    { id: 'cancelado', label: 'Cancelado', color: 'bg-gray-500' }
  ];

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white"><span>Oportunidades (Leads)</span></h1>
            <p className="text-gray-400"><span>Gerencie seu funil de vendas</span></p>
          </div>
          <AnimatedButton onClick={() => handleOpenModal()} icon={Plus}>Novo Lead</AnimatedButton>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-w-[1000px] h-full">
            {columns.map(col => (
              <div key={col.id} className="flex-1 bg-white/5 rounded-2xl border border-white/10 flex flex-col">
                <div className={`p-4 border-b border-white/10 flex items-center gap-2`}>
                  <div className={`w-3 h-3 rounded-full ${col.color}`} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-wider"><span>{col.label}</span></h3>
                  <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">
                    {leads.filter(l => l.status === col.id).length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {leads.filter(l => l.status === col.id).map(lead => (
                    <div 
                      key={lead.id} 
                      onClick={() => handleOpenModal(lead)}
                      className="bg-[#181818] p-4 rounded-xl border border-white/5 hover:border-beatwap-gold/50 cursor-pointer transition-all group shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-white truncate"><span>{lead.contractor_name}</span></h4>
                          <span className="text-xs text-beatwap-gold font-medium">
                            {lead.artist?.nome || lead.artist?.nome_completo_razao_social || 'Artista não definido'}
                          </span>
                        </div>
                        {lead.event_date && (
                          <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(lead.event_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-3 truncate">{lead.event_name || 'Evento sem nome'}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                        <MapPin size={12} /> {lead.city || 'N/D'}
                        <span className="mx-1">•</span>
                        <DollarSign size={12} /> R$ {lead.budget}
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button 
                          className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/?text=Olá ${lead.contractor_name}`, '_blank');
                          }}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                        <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400">
                          <Phone size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Lead Detail */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Side: Form */}
            <div className="w-full md:w-1/2 p-6 border-r border-white/10 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">{currentLead ? 'Editar Lead' : 'Novo Lead'}</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 ml-1">Artista *</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors appearance-none"
                    value={formData.artist_id}
                    onChange={(e) => setFormData({...formData, artist_id: e.target.value})}
                  >
                    <option value="" className="bg-black">Selecione um artista...</option>
                    {artists.map(artist => (
                      <option key={artist.id} value={artist.id} className="bg-black">
                        {artist.nome || artist.nome_completo_razao_social || 'Artista sem nome'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatedInput 
                    label="Nome do Contratante" 
                    value={formData.contractor_name} 
                    onChange={(e) => setFormData({...formData, contractor_name: e.target.value})} 
                  />
                  <AnimatedInput 
                    label="WhatsApp (Contato)" 
                    value={formData.whatsapp} 
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="5511999999999" 
                  />
                </div>
                <AnimatedInput 
                  label="Nome do Evento" 
                  value={formData.event_name} 
                  onChange={(e) => setFormData({...formData, event_name: e.target.value})} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <AnimatedInput 
                    label="Cidade" 
                    value={formData.city} 
                    onChange={(e) => setFormData({...formData, city: e.target.value})} 
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 ml-1">Data do Evento</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors"
                      value={formData.event_date ? new Date(formData.event_date).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <AnimatedInput 
                    label="Orçamento Estimado (R$)" 
                    type="number"
                    value={formData.budget} 
                    onChange={(e) => setFormData({...formData, budget: e.target.value})} 
                  />
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 ml-1">Status</label>
                    <select 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-beatwap-gold/50 transition-colors appearance-none"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="novo" className="bg-black">Novo</option>
                      <option value="negociacao" className="bg-black">Em Negociação</option>
                      <option value="fechado" className="bg-black">Fechado</option>
                      <option value="perdido" className="bg-black">Perdido</option>
                      <option value="cancelado" className="bg-black">Cancelado</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <AnimatedButton onClick={handleSaveLead} className="flex-1" icon={Save}>Salvar</AnimatedButton>
                  <AnimatedButton onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1">Cancelar</AnimatedButton>
                </div>
              </div>
            </div>

            {/* Right Side: History (Only visible if editing) */}
            {currentLead ? (
              <div className="w-full md:w-1/2 p-6 bg-white/[0.02] flex flex-col h-full">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <MessageCircle size={20} className="text-beatwap-gold" />
                  Histórico de Negociação
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                  {history.length === 0 && <p className="text-gray-500 text-center py-10">Nenhum registro.</p>}
                  {history.map((item) => (
                    <div key={item.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] text-gray-400">{new Date(item.contact_date).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-200">{item.notes}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 border-t border-white/10">
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-beatwap-gold/50 outline-none resize-none"
                    rows={3}
                    placeholder="Adicionar nota sobre a negociação..."
                    value={newHistoryNote}
                    onChange={(e) => setNewHistoryNote(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <AnimatedButton size="sm" onClick={handleAddHistory} disabled={!newHistoryNote.trim()}>Adicionar Nota</AnimatedButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full md:w-1/2 p-6 flex items-center justify-center text-gray-500 bg-white/[0.02]">
                <p>Salve o lead para adicionar histórico.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SellerLeads;
