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
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const MyUploads = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { music, loading: dataLoading } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  const myReleases = music.filter(item => 
    item.artist_id === user?.id
  );

  const filteredReleases = myReleases.filter(item => 
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
        {dataLoading ? (
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
                     item.status === 'rejected' ? 'Rejeitado' :
                     'Em Análise'}
                  </span>
                </td>
                <td className="p-4 text-gray-400 text-sm">
                    <div>{item.upc || '-'}</div>
                    <div className="text-xs opacity-50">{item.isrc || '-'}</div>
                </td>
                <td className="p-4">
                    <AnimatedButton variant="outline" size="sm">
                        Detalhes
                    </AnimatedButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        ) : (
            <EmptyState 
                icon={Music}
                title="Nenhuma música encontrada"
                description={searchTerm ? "Tente buscar com outros termos." : "Você ainda não enviou nenhuma música."}
                action={
                    !searchTerm && (
                        <AnimatedButton onClick={() => navigate('/dashboard/upload')}>
                            Enviar Música
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