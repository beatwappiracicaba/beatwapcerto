import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';
import { Plus, Music } from 'lucide-react';

export const DashboardCompositions = () => {
  const { user } = useAuth();
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [compMetrics, setCompMetrics] = useState({});

  const fetchCompositions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('compositions')
      .select('*')
      .eq('composer_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setCompositions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCompositions();
  }, [user, fetchCompositions]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      const { data: ev } = await supabase
        .from('analytics_events')
        .select('type,music_id,duration_seconds')
        .eq('artist_id', user.id)
        .in('type', ['music_play']);
      
      const agg = {};
      (ev || []).forEach(e => {
        const mid = e.music_id || 'unknown';
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0 };
        if (e.type === 'music_play') {
          agg[mid].plays += 1;
          agg[mid].totalSeconds += Number(e.duration_seconds || 0);
        }
      });
      setCompMetrics(agg);
    };
    loadMetrics();
  }, [user]);

  return (
    <DashboardLayout>
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div className="text-xl font-semibold text-white">Minhas Composições</div>
          <AnimatedButton 
            onClick={() => setIsUploadModalOpen(true)}
            icon={Plus}
          >
            Nova Composição
          </AnimatedButton>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-gray-400">Carregando...</div>}
          {!loading && compositions.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p>Nenhuma composição encontrada.</p>
              <p className="text-sm mt-2">Clique em &quot;Nova Composição&quot; para enviar.</p>
            </div>
          )}
          {!loading && compositions.map((comp) => (
            <div key={comp.id} className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                {comp.cover_url ? (
                  <img src={comp.cover_url} alt={comp.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    <Music size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white">{comp.title}</div>
                <div className="text-xs text-gray-400">{comp.genre} • {new Date(comp.created_at).toLocaleDateString()}</div>
                {comp.status === 'approved' && (
                  <div className="mt-1 text-xs text-gray-300">
                    {(() => {
                      const mm = compMetrics[comp.id] || { plays: 0, totalSeconds: 0 };
                      const hh = Math.floor(mm.totalSeconds / 3600);
                      const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
                      const ss = mm.totalSeconds % 60;
                      const totalFmt = `${hh}h ${mmn}m ${ss}s`;
                      return `Plays: ${mm.plays} • Tempo total: ${totalFmt}`;
                    })()}
                  </div>
                )}
                {comp.price && (
                    <div className="text-xs text-beatwap-gold mt-1 font-bold">R$ {comp.price}</div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  comp.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                  comp.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  {comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}
                </div>
                {comp.admin_feedback && (
                  <div className="text-xs text-red-400 max-w-[150px] truncate" title={comp.admin_feedback}>
                    {comp.admin_feedback}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <CompositionsUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchCompositions}
      />
    </DashboardLayout>
  );
};

export default DashboardCompositions;
