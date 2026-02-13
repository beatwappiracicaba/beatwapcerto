import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { supabase } from '../../services/supabaseClient';
import { DollarSign, Check, X, Calendar, User, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ShowRevenueDistributor = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [distributeForm, setDistributeForm] = useState({
    revenue: '',
    artist_share: '',
    house_cut: '',
    seller_commission: ''
  });
  const { addToast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Fetch events with artist info
      // Using maybeSingle logic or explicit join if FK exists.
      // Assuming 'artist_work_events.artista_id' references 'profiles.id'
      const { data, error } = await supabase
        .from('artist_work_events')
        .select(`
          *,
          artist:profiles!artist_work_events_artista_id_fkey(nome, avatar_url),
          seller:profiles!seller_id(nome)
        `)
        .order('date', { ascending: false });

      // Fallback if FK name is different or relation needs inference
      if (error) {
        // Try simple select and manual join if complex query fails
        console.warn('Complex select failed, trying simple', error);
        const { data: simpleData, error: simpleError } = await supabase
          .from('artist_work_events')
          .select('*')
          .order('date', { ascending: false });
          
        if (simpleError) throw simpleError;
        
        // Manual join (less efficient but safer if FK names are unknown)
        const userIds = [...new Set(simpleData.map(e => e.artista_id).filter(Boolean))];
        const sellerIds = [...new Set(simpleData.map(e => e.seller_id).filter(Boolean))];
        const allIds = [...new Set([...userIds, ...sellerIds])];
        
        if (allIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, nome, avatar_url').in('id', allIds);
            const profileMap = {};
            profiles?.forEach(p => profileMap[p.id] = p);
            
            const enriched = simpleData.map(e => ({
                ...e,
                artist: profileMap[e.artista_id],
                seller: profileMap[e.seller_id]
            }));
            setEvents(enriched);
            setLoading(false);
            return;
        }
        setEvents(simpleData || []);
      } else {
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      // addToast('Erro ao buscar eventos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setDistributeForm({
      revenue: event.revenue || '',
      artist_share: event.artist_share || '',
      house_cut: event.house_cut || '',
      seller_commission: event.seller_commission || ''
    });
  };

  const handleDistribute = async () => {
    if (!selectedEvent) return;
    
    const revenue = parseFloat(distributeForm.revenue) || 0;
    const artist_share = parseFloat(distributeForm.artist_share) || 0;
    const house_cut = parseFloat(distributeForm.house_cut) || 0;
    const seller_commission = parseFloat(distributeForm.seller_commission) || 0;

    try {
      const { error } = await supabase
        .from('artist_work_events')
        .update({
          revenue,
          artist_share,
          house_cut,
          seller_commission,
          status: 'pago'
        })
        .eq('id', selectedEvent.id);

      if (error) throw error;

      addToast('Distribuição salva com sucesso!', 'success');
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error('Error distributing:', error);
      addToast('Erro ao salvar distribuição', 'error');
    }
  };

  const formatCurrency = (val) => {
      const num = parseFloat(val) || 0;
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List of Events */}
        <Card className="p-4 space-y-4">
            <h3 className="font-bold text-white mb-4">Shows & Eventos</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {events.map(event => (
                    <div 
                        key={event.id}
                        onClick={() => handleSelectEvent(event)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedEvent?.id === event.id 
                            ? 'bg-beatwap-gold/10 border-beatwap-gold' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <div className="font-bold text-white">{event.title}</div>
                            <div className={`text-xs px-2 py-0.5 rounded-full ${
                                event.status === 'pago' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                            }`}>
                                {event.status || 'Pendente'}
                            </div>
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(event.date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                            <User size={14} />
                            {event.artist?.nome || 'Artista Desconhecido'}
                        </div>
                        {event.revenue > 0 && (
                            <div className="mt-2 text-sm font-bold text-green-400">
                                {formatCurrency(event.revenue)}
                            </div>
                        )}
                    </div>
                ))}
                {events.length === 0 && !loading && (
                    <div className="text-gray-400 text-center py-4">Nenhum evento encontrado.</div>
                )}
            </div>
        </Card>

        {/* Distribution Form */}
        <Card className="p-6">
            {!selectedEvent ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 py-10">
                    <DollarSign size={48} className="mb-4 opacity-20" />
                    <p>Selecione um evento para distribuir os ganhos</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Distribuir Faturamento</h3>
                        <p className="text-sm text-gray-400">Show: {selectedEvent.title} ({new Date(selectedEvent.date).toLocaleDateString()})</p>
                    </div>

                    <div className="space-y-4">
                        <AnimatedInput 
                            label="Faturamento Total (Bruto)"
                            type="number"
                            prefix="R$"
                            value={distributeForm.revenue}
                            onChange={e => setDistributeForm({...distributeForm, revenue: e.target.value})}
                        />

                        <div className="p-4 bg-white/5 rounded-xl space-y-4 border border-white/10">
                            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Repasses</h4>
                            
                            <AnimatedInput 
                                label={`Artista: ${selectedEvent.artist?.nome || 'Artista'}`}
                                type="number"
                                prefix="R$"
                                value={distributeForm.artist_share}
                                onChange={e => setDistributeForm({...distributeForm, artist_share: e.target.value})}
                            />
                            
                            <AnimatedInput 
                                label="Manutenção / Produtora (House)"
                                type="number"
                                prefix="R$"
                                value={distributeForm.house_cut}
                                onChange={e => setDistributeForm({...distributeForm, house_cut: e.target.value})}
                            />

                            {selectedEvent.seller_id && (
                                <AnimatedInput 
                                    label={`Vendedor: ${selectedEvent.seller?.nome || 'Vendedor'}`}
                                    type="number"
                                    prefix="R$"
                                    value={distributeForm.seller_commission}
                                    onChange={e => setDistributeForm({...distributeForm, seller_commission: e.target.value})}
                                />
                            )}
                        </div>

                        {/* Summary */}
                        <div className="flex justify-between items-center text-sm p-3 bg-black/20 rounded-lg">
                            <span className="text-gray-400">Total Distribuído:</span>
                            <span className={`font-bold ${
                                Math.abs((parseFloat(distributeForm.revenue)||0) - ((parseFloat(distributeForm.artist_share)||0) + (parseFloat(distributeForm.house_cut)||0) + (parseFloat(distributeForm.seller_commission)||0))) < 1 
                                ? 'text-green-500' : 'text-red-500'
                            }`}>
                                {formatCurrency(
                                    (parseFloat(distributeForm.artist_share)||0) + 
                                    (parseFloat(distributeForm.house_cut)||0) + 
                                    (parseFloat(distributeForm.seller_commission)||0)
                                )}
                            </span>
                        </div>

                        <AnimatedButton 
                            onClick={handleDistribute} 
                            className="w-full"
                            variant="primary"
                            icon={Check}
                        >
                            Salvar Distribuição
                        </AnimatedButton>
                    </div>
                </div>
            )}
        </Card>
      </div>
    </div>
  );
};
