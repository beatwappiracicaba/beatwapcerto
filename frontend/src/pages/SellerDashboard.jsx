import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { TrendingUp, Calendar, Users, DollarSign, Target, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SellerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const data = await apiClient.get('/seller/dashboard');
      setGoals(data || { shows_target: 10, current_shows: 0, revenue_target: 50000, current_revenue: 0 });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const calculateProgress = (current, target) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  const remainingShows = (goals?.shows_target || 0) - (goals?.current_shows || 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Painel do Vendedor</h1>
            <p className="text-gray-400">Bem-vindo, {profile?.nome || 'Vendedor'}. Vamos bater as metas!</p>
          </div>
          <div className="flex gap-3">
            <AnimatedButton onClick={() => navigate('/seller/leads')} variant="primary" icon={Target}>
              Novas Oportunidades
            </AnimatedButton>
          </div>
        </div>

        {/* Metas Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 relative overflow-hidden group hover:border-beatwap-gold/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Award size={100} className="text-beatwap-gold" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-beatwap-gold/10 text-beatwap-gold">
                <Target size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Meta de Shows</h2>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end">
                <div className="text-4xl font-bold text-white">{goals?.current_shows || 0}</div>
                <div className="text-sm text-gray-400">de {goals?.shows_target || 0} shows</div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-beatwap-gold transition-all duration-1000"
                  style={{ width: `${calculateProgress(goals?.current_shows || 0, goals?.shows_target || 1)}%` }}
                />
              </div>
              <p className="text-sm text-gray-300">
                {remainingShows > 0 
                  ? `Faltam ${remainingShows} shows para bater sua meta 🎯` 
                  : 'Meta batida! Parabéns! 🚀'}
              </p>
            </div>
          </Card>

          <Card className="p-6 relative overflow-hidden group hover:border-green-500/50 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign size={100} className="text-green-500" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Meta de Faturamento</h2>
            </div>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end">
                <div className="text-4xl font-bold text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goals?.current_revenue || 0)}
                </div>
                <div className="text-sm text-gray-400">
                  de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goals?.revenue_target || 0)}
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-1000"
                  style={{ width: `${calculateProgress(goals?.current_revenue || 0, goals?.revenue_target || 1)}%` }}
                />
              </div>
              <p className="text-sm text-gray-300">
                {calculateProgress(goals?.current_revenue || 0, goals?.revenue_target || 1) >= 100 
                  ? 'Faturamento extraordinário! 💸' 
                  : 'Continue prospectando para alcançar o objetivo.'}
              </p>
            </div>
          </Card>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/artists')}>
            <Users className="text-blue-400 mb-3" size={32} />
            <h3 className="font-bold text-white">Artistas</h3>
            <p className="text-xs text-gray-400">Base de trabalho</p>
          </Card>
          <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/calendar')}>
            <Calendar className="text-purple-400 mb-3" size={32} />
            <h3 className="font-bold text-white">Agenda</h3>
            <p className="text-xs text-gray-400">Disponibilidade</p>
          </Card>
          <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/leads')}>
            <Target className="text-red-400 mb-3" size={32} />
            <h3 className="font-bold text-white">Leads</h3>
            <p className="text-xs text-gray-400">Oportunidades</p>
          </Card>
          <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate('/seller/finance')}>
            <DollarSign className="text-green-400 mb-3" size={32} />
            <h3 className="font-bold text-white">Comissões</h3>
            <p className="text-xs text-gray-400">Seus ganhos</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerDashboard;
