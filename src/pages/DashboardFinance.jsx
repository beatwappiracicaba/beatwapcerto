import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { api } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { DollarSign, Calendar, Clock, CheckCircle, AlertTriangle, FileText, FolderOpen, ExternalLink, User } from 'lucide-react';
import { FinanceDistributionModal } from '../components/finance/FinanceDistributionModal';

const DashboardFinance = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.get('/artist/finance/events');
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDistribution = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <DollarSign className="text-beatwap-gold" size={32} />
              Financeiro
            </h1>
            <p className="text-gray-400 mt-2">Gerencie pagamentos e distribuições dos seus shows.</p>
          </div>
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-sm text-yellow-200">
            ⚠️ Todos os valores recebidos pelas vendas e shows são pagos primeiro na conta da produtora, 
            que centraliza os recebimentos, confere contratos e comprovantes e só então faz os repasses 
            para artistas e vendedores, conforme os percentuais combinados em cada contrato. 
            A produtora retém uma parte do valor para manutenção da plataforma, impostos e custos operacionais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-l-4 border-l-green-500">
            <h3 className="text-gray-400 text-sm font-medium uppercase mb-1">Total Recebido</h3>
            <div className="text-3xl font-bold text-white">
              {formatCurrency(events.reduce((acc, curr) => acc + (curr.artist_share || 0), 0))}
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-l-yellow-500">
            <h3 className="text-gray-400 text-sm font-medium uppercase mb-1">Pendente Distribuição</h3>
            <div className="text-3xl font-bold text-white">
              {events.filter(e => !e.status || e.status !== 'pago').length} Shows
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-l-blue-500">
            <h3 className="text-gray-400 text-sm font-medium uppercase mb-1">Shows Realizados</h3>
            <div className="text-3xl font-bold text-white">{events.length}</div>
          </Card>
        </div>

        {/* Payments Folder Section */}
        {events.filter(e => e.receipt_artist || e.status === 'pago').length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderOpen className="text-beatwap-gold" size={24} />
              Comprovantes de Pagamento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events
                .filter(e => e.receipt_artist || e.status === 'pago')
                .map((event) => (
                  <div 
                    key={`receipt-${event.id}`}
                    className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-green-500/10 rounded-lg text-green-500 group-hover:bg-green-500/20 transition-colors">
                        <FileText size={24} />
                      </div>
                      {event.receipt_artist ? (
                        <a 
                          href={event.receipt_artist} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Abrir Comprovante"
                        >
                          <ExternalLink size={20} />
                        </a>
                      ) : (
                        <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">Sem Anexo</span>
                      )}
                    </div>
                    
                    <h3 className="font-bold text-white mb-1 truncate" title={event.title}>{event.title}</h3>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Data do Show:</span>
                        <span className="text-white">{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Valor Pago:</span>
                        <span className="text-green-400 font-bold">{formatCurrency(event.artist_share)}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Histórico de Shows e Pagamentos</h2>
          
          {loading ? (
            <div className="text-center py-12 text-gray-500">Carregando...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-gray-400">Nenhum show registrado para distribuição.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <div key={event.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.07] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-lg text-white truncate">{event.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        event.status === 'pago' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {event.status === 'pago' ? 'Pago / Distribuído' : 'Pendente'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                      {event.revenue > 0 && (
                        <span className="flex items-center gap-1.5 text-white font-medium">
                          <DollarSign size={14} className="text-beatwap-gold" />
                          Faturamento: {formatCurrency(event.revenue)}
                        </span>
                      )}
                      {event.seller && (
                        <span className="flex items-center gap-1.5">
                          <User size={14} />
                          Vendedor: {event.seller.nome}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {event.status === 'pago' && (
                       <div className="hidden md:flex flex-col items-end text-xs text-gray-500 mr-2">
                         <span>Sua Parte: {formatCurrency(event.artist_share)}</span>
                         <span>Produtora: {formatCurrency(event.house_cut)}</span>
                       </div>
                    )}
                    
                    {event.status === 'pago' ? (
                      <AnimatedButton 
                        onClick={() => handleOpenDistribution(event)}
                        variant="secondary"
                        className="whitespace-nowrap w-full md:w-auto"
                        icon={FileText}
                      >
                        Ver Comprovantes
                      </AnimatedButton>
                    ) : (
                      <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded-lg text-sm font-medium">
                        <Clock size={16} />
                        <span>Aguardando Pagamento</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FinanceDistributionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        event={selectedEvent}
        onUpdate={fetchEvents}
        userRole="artist"
      />
    </DashboardLayout>
  );
};

export default DashboardFinance;
