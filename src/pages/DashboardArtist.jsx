import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Play, TrendingUp, DollarSign, Plus, Trophy, Globe, Music, Rocket, Info } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, trend, loading }) => (
  <div className="p-6 bg-beatwap-graphite rounded-2xl border border-white/5 shadow-xl">
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
      <h3 className="text-2xl font-bold text-white mt-1">
        {loading ? '...' : value}
      </h3>
    </div>
  </div>
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
        <button
          onClick={() => navigate('/dashboard/upload')}
          className="relative px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 bg-beatwap-gold text-beatwap-black"
        >
          <Plus size={18} />
          Novo Lançamento
        </button>
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
              <div key={i} className="p-4 flex flex-col items-center justify-center text-center bg-beatwap-graphite rounded-2xl border border-white/5 opacity-50">
                <div className="w-10 h-10 rounded-full bg-white/5 mb-3" />
                <div className="w-4/5 h-4 bg-white/5 rounded mb-2" />
                <div className="w-2/5 h-3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${artistMusic.length > 0 ? 'bg-beatwap-gold/10 border-beatwap-gold/30' : 'bg-white/5 border-transparent'}`}>
              <div className={`p-3 rounded-full ${artistMusic.length > 0 ? 'bg-beatwap-gold text-beatwap-black' : 'bg-gray-800 text-gray-500'}`}>
                <Music size={24} />
              </div>
              <span className={`text-xs font-bold text-center ${artistMusic.length > 0 ? 'text-beatwap-gold' : 'text-gray-500'}`}>
                Primeiro Lançamento
              </span>
            </div>
            <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${artistMusic.length >= 5 ? 'bg-beatwap-gold/10 border-beatwap-gold/30' : 'bg-white/5 border-transparent'}`}>
              <div className={`p-3 rounded-full ${artistMusic.length >= 5 ? 'bg-beatwap-gold text-beatwap-black' : 'bg-gray-800 text-gray-500'}`}>
                <Rocket size={24} />
              </div>
              <span className={`text-xs font-bold text-center ${artistMusic.length >= 5 ? 'text-beatwap-gold' : 'text-gray-500'}`}>
                5 Músicas Enviadas
              </span>
            </div>
            <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${artistMusic.some(m => m.status === 'approved') ? 'bg-beatwap-gold/10 border-beatwap-gold/30' : 'bg-white/5 border-transparent'}`}>
              <div className={`p-3 rounded-full ${artistMusic.some(m => m.status === 'approved') ? 'bg-beatwap-gold text-beatwap-black' : 'bg-gray-800 text-gray-500'}`}>
                <Globe size={24} />
              </div>
              <span className={`text-xs font-bold text-center ${artistMusic.some(m => m.status === 'approved') ? 'text-beatwap-gold' : 'text-gray-500'}`}>
                Primeira Publicação
              </span>
            </div>
            <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${parseInt((artistMetrics?.plays || '0').replace(/\D/g, '')) >= 10000 ? 'bg-beatwap-gold/10 border-beatwap-gold/30' : 'bg-white/5 border-transparent'}`}>
              <div className={`p-3 rounded-full ${parseInt((artistMetrics?.plays || '0').replace(/\D/g, '')) >= 10000 ? 'bg-beatwap-gold text-beatwap-black' : 'bg-gray-800 text-gray-500'}`}>
                <TrendingUp size={24} />
              </div>
              <span className={`text-xs font-bold text-center ${parseInt((artistMetrics?.plays || '0').replace(/\D/g, '')) >= 10000 ? 'text-beatwap-gold' : 'text-gray-500'}`}>
                10k Plays
              </span>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-4">Lançamentos Recentes</h2>
      <div className="overflow-hidden p-0 bg-beatwap-graphite rounded-2xl border border-white/5">
        {loading ? (
          <div className="p-4 text-gray-400 text-sm">Carregando...</div>
        ) : artistMusic.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
            <div className="w-20 h-20 bg-beatwap-gold/10 rounded-full flex items-center justify-center mb-6 text-beatwap-gold">
              <Music size={40} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Nenhum lançamento ainda</h3>
            <p className="text-gray-400 max-w-md mb-6">Envie sua primeira música para começar sua jornada.</p>
            <button
              onClick={() => navigate('/dashboard/upload')}
              className="px-5 py-2 rounded-xl font-bold text-sm bg-beatwap-gold text-beatwap-black"
            >
              Novo Lançamento
            </button>
          </div>
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
                        {release.audioFile ? (
                          <audio src={release.audioFile} controls className="w-full" />
                        ) : (
                          <span className="text-xs text-gray-500">Sem áudio</span>
                        )}
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
        )}
      </div>
    </DashboardLayout>
  );
};


export default DashboardArtist;
