import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Plus } from 'lucide-react';
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

      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">Resumo</h2>
        <p className="text-gray-400 text-sm">Esta área está sendo reconstruída. Em breve você verá seus dados aqui.</p>
      </div>

      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
        <h2 className="text-xl font-bold mb-2">Conquistas</h2>
        <p className="text-gray-400 text-sm">Em reconstrução. Voltaremos com objetivos e badges estáveis.</p>
      </div>

      <h2 className="text-xl font-bold mb-4">Lançamentos Recentes</h2>
      <div className="overflow-hidden p-0 bg-beatwap-graphite rounded-2xl border border-white/5">
        {loading ? (
          <div className="p-4 text-gray-400 text-sm">Carregando...</div>
        ) : artistMusic.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
            <h3 className="text-xl font-bold text-white mb-2">Nenhum lançamento ainda</h3>
            <p className="text-gray-400 max-w-md mb-6">Em breve você terá ferramentas novas para gerenciar seus lançamentos.</p>
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
                          <div className="w-full h-full bg-white/10" />
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-white group-hover:text-beatwap-gold transition-colors">
                      {release.title}
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
                      <span className="text-sm text-gray-500">Detalhes em breve</span>
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
