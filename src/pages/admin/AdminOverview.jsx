import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Music, Play, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { useData } from '../../context/DataContext';

const StatCard = ({ icon: Icon, label, value, colorClass, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className={`p-6 border-l-4 ${colorClass} hover:shadow-lg hover:shadow-beatwap-gold/10 transition-all duration-300`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${colorClass.replace('border-', 'text-').replace('text-', 'bg-').replace('500', '500/20').replace('beatwap-gold', 'beatwap-gold/20')}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <h3 className="text-3xl font-bold mt-1">{value}</h3>
        </div>
      </div>
    </Card>
  </motion.div>
);

export const AdminOverview = () => {
  const { artists, music, loading: dataLoading } = useData();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeArtists: 0,
    uploadedMusic: 0,
    pendingMusic: 0,
    totalPlays: '2.5M' // Mocked manual value
  });

  useEffect(() => {
    if (!dataLoading) {
      // Filter out admins
      const artistList = artists.filter(a => a.role !== 'admin');

      // Calculate total plays from all artists
      const totalPlaysCount = artistList.reduce((acc, artist) => {
        const plays = artist.metrics?.plays || '0';
        // Simple parser for K/M suffixes
        let count = 0;
        const str = plays.toString().toUpperCase();
        if (str.includes('M')) count = parseFloat(str) * 1000000;
        else if (str.includes('K')) count = parseFloat(str) * 1000;
        else count = parseFloat(str) || 0;
        return acc + count;
      }, 0);

      // Format back to string
      let formattedPlays = '0';
      if (totalPlaysCount >= 1000000) formattedPlays = (totalPlaysCount / 1000000).toFixed(1) + 'M';
      else if (totalPlaysCount >= 1000) formattedPlays = (totalPlaysCount / 1000).toFixed(1) + 'K';
      else formattedPlays = totalPlaysCount.toString();

      setStats({
        activeArtists: artistList.filter(a => a.status === 'active').length,
        uploadedMusic: music.length,
        pendingMusic: music.filter(m => m.status === 'pending').length,
        totalPlays: formattedPlays
      });
      setLoading(false);
    }
  }, [dataLoading, artists, music]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={120} className="rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Visão Geral</h1>
        <p className="text-gray-400">Acompanhe os principais indicadores da plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Users} 
          label="Artistas Ativos" 
          value={stats.activeArtists} 
          colorClass="border-beatwap-gold text-beatwap-gold" 
          delay={0.1}
        />
        <StatCard 
          icon={Music} 
          label="Músicas Enviadas" 
          value={stats.uploadedMusic} 
          colorClass="border-blue-500 text-blue-500" 
          delay={0.2}
        />
        <StatCard 
          icon={AlertCircle} 
          label="Pendentes" 
          value={stats.pendingMusic} 
          colorClass="border-yellow-500 text-yellow-500" 
          delay={0.3}
        />
        <StatCard 
          icon={Play} 
          label="Total de Plays" 
          value={stats.totalPlays} 
          colorClass="border-green-500 text-green-500" 
          delay={0.4}
        />
      </div>

      {/* Recent Activity Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Atividade Recente</h2>
          <div className="space-y-4">
            {music.slice(0, 3).map((musicItem, index) => (
              <div key={musicItem.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <img src={musicItem.cover} alt={musicItem.title} className="w-12 h-12 rounded bg-gray-800 object-cover" />
                  <div>
                    <h4 className="font-bold">{musicItem.title}</h4>
                    <p className="text-sm text-gray-400">{musicItem.artist} • {musicItem.date || new Date(musicItem.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium 
                  ${musicItem.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                    musicItem.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 
                    'bg-red-500/20 text-red-500'}`}>
                  {musicItem.status === 'approved' ? 'Aprovado' : musicItem.status === 'pending' ? 'Pendente' : 'Recusado'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
