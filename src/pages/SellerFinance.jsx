import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { api } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, FileText, Calendar, User, FolderOpen, ExternalLink } from 'lucide-react';
import { FinanceDistributionModal } from '../components/finance/FinanceDistributionModal';
import { AnimatedButton } from '../components/ui/AnimatedButton';

const SellerFinance = () => {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalSold: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    paidCommissions: 0
  });

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      const data = await api.get('/seller/finance/summary');
      setEvents(data.events || []);
      setStats({
        totalSold: data.totalSold || 0,
        totalCommissions: data.totalCommissions || 0,
        pendingCommissions: data.pendingCommissions || 0,
        paidCommissions: data.paidCommissions || 0
      });

    } catch (error) {
      console.error('Error fetching finance:', error);
    } finally {
      setLoading(false);
    }

  const handleOpenDistribution = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Comissões & Resultados</h1>
          <p className="text-gray-400">Acompanhe seu desempenho financeiro</p>
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <p className="text-sm text-yellow-200">
            ⚠️ Todos os valores recebidos pelas vendas e shows são pagos primeiro na conta da produtora, 
            que centraliza os recebimentos, confere contratos e comprovantes e só então faz os repasses 
            para artistas e vendedores, conforme os percentuais combinados em cada contrato. 
            A produtora retém uma parte do valor para manutenção da plataforma, impostos e custos operacionais.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><TrendingUp size={20} /></div>
              <span className="text-sm text-gray-400">Vendas Totais</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalSold)}</div>
          </Card>

          <Card className="p-6 border-l-4 border-l-purple-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><DollarSign size={20} /></div>
              <span className="text-sm text-gray-400">Comissões Totais</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalCommissions)}</div>
          </Card>

          <Card className="p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><AlertCircle size={20} /></div>
              <span className="text-sm text-gray-400">Pendente</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.pendingCommissions)}</div>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500"><CheckCircle size={20} /></div>
              <span className="text-sm text-gray-400">Pago</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.paidCommissions)}</div>
          </Card>
        </div>

        {/* Payments Folder Section */}
        {events.filter(e => e.receipt_seller || e.status === 'pago').length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FolderOpen className="text-beatwap-gold" size={24} />
              Comprovantes de Pagamento
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events
                .filter(e => e.receipt_seller || e.status === 'pago')
                .map((event) => (
                  <div 
                    key={`receipt-${event.id}`}
                    className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-green-500/10 rounded-lg text-green-500 group-hover:bg-green-500/20 transition-colors">
                        <FileText size={24} />
                      </div>
                      {event.receipt_seller ? (
                        <a 
                          href={event.receipt_seller} 
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
                        <span className="text-gray-400">Comissão Paga:</span>
                        <span className="text-green-400 font-bold">{formatCurrency(event.seller_commission)}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Shows & Eventos</h3>
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
              <p className="text-gray-400">Nenhum show com comissão registrado.</p>
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
                        {event.status === 'pago' ? 'Pago' : 'Pendente'}
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
                      {event.artist && (
                        <span className="flex items-center gap-1.5">
                          <User size={14} />
                          Artista: {event.artist.nome}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {event.seller_commission > 0 && (
                       <div className="hidden md:flex flex-col items-end text-xs text-gray-500 mr-2">
                         <span>Sua Comissão: {formatCurrency(event.seller_commission)}</span>
                       </div>
                    )}
                    
                    <AnimatedButton 
                      onClick={() => handleOpenDistribution(event)}
                      variant={event.status === 'pago' ? 'secondary' : 'primary'}
                      className="whitespace-nowrap w-full md:w-auto"
                      icon={event.status === 'pago' ? FileText : DollarSign}
                    >
                      {event.status === 'pago' ? 'Ver Comprovantes' : 'Fazer Pagamento'}
                    </AnimatedButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Extrato de Comissões</h3>
          {commissions.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 text-gray-400">
              Nenhuma comissão registrada ainda.
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                  <tr>
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Origem</th>
                    <th className="p-4 font-medium">Valor</th>
                    <th className="p-4 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {commissions.map((comm) => (
                    <tr key={comm.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-sm text-gray-300">
                        {new Date(comm.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-sm text-white font-medium">
                        Show/Lead ID: {comm.lead_id?.slice(0, 8)}...
                      </td>
                      <td className="p-4 text-sm text-white font-bold">
                        {formatCurrency(comm.amount)}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          comm.status === 'pago' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        }`}>
                          {comm.status === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <FinanceDistributionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        event={selectedEvent}
        onUpdate={fetchFinanceData}
        userRole="seller"
      />
    </DashboardLayout>
  );
};

export default SellerFinance;
