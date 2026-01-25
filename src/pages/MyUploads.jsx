import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Music, Plus, Search } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';

const MyUploads = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simulating data fetch
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const releases = [
    { id: 1, title: 'O Mundo é Nosso', status: 'approved' },
    { id: 'rejected', title: 'Trap do Futuro', status: 'rejected' },
    { id: 3, title: 'Love Song', status: 'review' },
    { id: 4, title: 'Vibe de Verão', status: 'approved' },
    { id: 5, title: 'Noite em Claro', status: 'review' },
  ];

  const filteredReleases = releases.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Meus Lançamentos</h1>
          <p className="text-gray-400">Gerencie todas as suas músicas enviadas.</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
             <div className="w-full md:w-64">
                <AnimatedInput 
                  placeholder="Buscar música..." 
                  icon={Search} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
            <AnimatedButton onClick={() => navigate('/dashboard/upload')}>
            <Plus size={18} />
            Novo
            </AnimatedButton>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading ? (
            <div className="p-4">
                <TableSkeleton rows={5} />
            </div>
        ) : filteredReleases.length > 0 ? (
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 text-gray-400 text-sm uppercase">
            <tr>
              <th className="p-4 font-medium">Capa</th>
              <th className="p-4 font-medium">Título</th>
              <th className="p-4 font-medium">Preview</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">UPC/ISRC</th>
              <th className="p-4 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredReleases.map((item, index) => (
              <tr 
                key={item.id} 
                onClick={() => navigate(`/dashboard/music/${item.id}`)}
                className="hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <td className="p-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music size={16} className="text-gray-500" />
                    )}
                  </div>
                </td>
                <td className="p-4 font-medium text-white">{item.title}</td>
                <td className="p-4 w-48">
                  {item.audio_url && <AudioPlayer src={item.audio_url} minimal />}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    item.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                    item.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                    'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {item.status === 'approved' ? 'Aprovado' :
                     item.status === 'rejected' ? 'Recusado' : 'Em Análise'}
                  </span>
                </td>
                <td className="p-4 text-gray-400 font-mono text-xs">
                  {item.upc || item.isrc || 'Pendente'}
                </td>
                <td className="p-4">
                  <Link 
                    to={`/dashboard/music/${item.id}`}
                    className="text-sm text-beatwap-gold hover:underline font-medium"
                  >
                    Ver Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
            <EmptyState 
                icon={Music}
                title={searchTerm ? "Nenhuma música encontrada" : "Nenhum lançamento ainda"}
                description={searchTerm ? "Tente buscar por outro termo." : "Você ainda não enviou nenhuma música."}
                action={
                    !searchTerm && (
                        <AnimatedButton onClick={() => navigate('/dashboard/upload')}>
                            Enviar Primeira Música
                        </AnimatedButton>
                    )
                }
            />
        )}
      </Card>
    </DashboardLayout>
  );
};

export default MyUploads;
