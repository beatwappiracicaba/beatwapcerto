import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Badge } from '../components/ui/Badge';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Play, TrendingUp, DollarSign, Plus, Trophy, Globe, Music, Rocket, Info } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, trend, loading }) => (
  <Card className="p-6">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-beatwap-gold/10 rounded-xl text-beatwap-gold">
        <Icon size={24} />
      </div>
      {trend && (
        <span className="text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-gray-400 text-sm">{label}</p>
      {loading ? (
        <Skeleton width="60%" height={32} className="mt-1" />
      ) : (
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      )}
    </div>
  </Card>
);

const DashboardArtist = () => {
  const navigate = useNavigate();
  const { music, getArtistById } = useData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [artistMetrics, setArtistMetrics] = useState(null);

  useEffect(() => {
    if (user) {
      const artist = getArtistById(user.id);
      if (artist) {
        setArtistMetrics(artist.metrics);
      }
      setLoading(false);
    }
  }, [user, getArtistById]);

  // Filter music for the current artist
  const artistMusic = music.filter(m => m.artistId === user?.id);

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Olá, {user?.user_metadata?.name || 'Artista'}</h1>
          <p className="text-gray-400">Aqui está o resumo da sua carreira hoje.</p>
        </div>
        <AnimatedButton onClick={() => navigate('/dashboard/upload')}>
          <Plus size={18} />
          Novo Lançamento
        </AnimatedButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard 
          icon={Play} 
          label="Total de Plays" 
          value={artistMetrics?.plays || '0'} 
          trend="+0%" 
          loading={loading} 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Ouvintes Mensais" 
          value={artistMetrics?.listeners || '0'} 
          trend="+0%" 
          loading={loading} 
        />
        <StatCard 
          icon={DollarSign} 
          label="Receita Estimada" 
          value={artistMetrics?.revenue || 'R$ 0,00'} 
          loading={loading} 
        />
      </div>

      {/* Gamification Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="text-beatwap-gold" size={20} /> Conquistas
        </h2>
        {loading ? (
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-4 flex flex-col items-center justify-center text-center opacity-50">
                        <Skeleton width={40} height={40} rounded="rounded-full" className="mb-3" />
                        <Skeleton width="80%" height={16} className="mb-2" />
                        <Skeleton width="40%" height={12} />
                    </Card>
                ))}
             </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Badge 
                icon={Music} 
                label="Primeiro Lançamento" 
                unlocked={artistMusic.length > 0} 
                delay={0.1} 
              />
              <Badge 
                icon={Rocket} 
                label="5 Músicas Enviadas" 
                unlocked={artistMusic.length >= 5} 
                delay={0.2} 
              />
              <Badge 
                icon={Globe} 
                label="Primeira Publicação" 
                unlocked={artistMusic.some(m => m.status === 'approved')} 
                delay={0.3} 
              />
              <Badge 
                icon={TrendingUp} 
                label="10k Plays" 
                unlocked={parseInt((artistMetrics?.plays || '0').replace(/\D/g, '')) >= 10000}
                delay={0.4} 
              />
            </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4">Lançamentos Recentes</h2>
      <Card className="overflow-hidden p-0">
        {loading ? (
            <div className="p-4">
                <TableSkeleton rows={3} />
            </div>
        ) : (
          artistMusic.length === 0 ? (
            <EmptyState 
              icon={Music} 
              title="Nenhum lançamento ainda" 
              description="Envie sua primeira música para começar sua jornada."
              actionLabel="Novo Lançamento"
              onAction={() => navigate('/dashboard/upload')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-sm">
                    <th className="p-4 font-medium">Capa</th>
                    <th className="p-4 font-medium">Título</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Áudio</th>
                    <th className="p-4 font-medium">Data</th>
                    <th className="p-4 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {artistMusic.map((release) => (
                    <tr key={release.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-800">
                           {release.cover_url ? (
                             <img src={release.cover_url} alt={release.title} className="w-full h-full object-cover" />
                           ) : (
                             <Music className="w-full h-full p-2 text-gray-500" />
                           )}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-white group-hover:text-beatwap-gold transition-colors">
                        <div className="flex items-center gap-2">
                          {release.title}
                          {release.added_by === 'admin' && (
                            <div className="group/tooltip relative">
                              <Info size={14} className="text-beatwap-gold opacity-50 hover:opacity-100 cursor-help" />
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover/tooltip:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
                                Conteúdo inserido pela equipe BeatWap
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          release.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          release.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {release.status === 'approved' ? 'Aprovado' :
                           release.status === 'rejected' ? 'Rejeitado' : 'Em Análise'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="w-32">
                          <AudioPlayer src={release.audioFile} minimal={true} />
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{new Date(release.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4">
                        <Link to={`/dashboard/music/${release.id}`} className="text-sm text-gray-400 hover:text-white hover:underline">
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </DashboardLayout>
  );
};


export default DashboardArtist;
