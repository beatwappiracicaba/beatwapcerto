import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { DashboardLayout } from '../components/DashboardLayout';
import { CompositionsUploadModal } from '../components/artist/CompositionsUploadModal';
import { Plus, Music } from 'lucide-react';

export const DashboardCompositions = () => {
  const { user } = useAuth();
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [compMetrics, setCompMetrics] = useState({});
  const [summaryMetrics, setSummaryMetrics] = useState({
    plays: 0,
    listeners: 0,
    time: 0,
    profile_views: 0,
    social_clicks: 0
  });

  const fetchCompositions = useCallback(async () => {
    setLoading(true);
    const data = await api.get('/composer/compositions');
    setCompositions(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCompositions();
  }, [user, fetchCompositions]);

  useEffect(() => {
    const loadMetrics = async () => {
      if (!user) return;
      const ev = await api.get(`/analytics/artist/${user.id}/events`);
      
      const agg = {};
      const summary = {
        plays: 0,
        listeners: new Set(),
        time: 0,
        profile_views: 0,
        social_clicks: 0
      };

      (ev || []).forEach(e => {
        // Summary Metrics
        if (e.type === 'music_play') {
          summary.plays++;
          summary.time += Number(e.duration_seconds || 0);
          if (e.ip_hash) summary.listeners.add(e.ip_hash);
        } else if (e.type === 'profile_view') {
          summary.profile_views++;
        } else if (e.type && e.type.startsWith('artist_click_')) {
          summary.social_clicks++;
        }

        // Individual Composition Metrics
        const mid = e.music_id || 'unknown';
        if (!agg[mid]) agg[mid] = { plays: 0, totalSeconds: 0 };
        if (e.type === 'music_play') {
          agg[mid].plays += 1;
          agg[mid].totalSeconds += Number(e.duration_seconds || 0);
        }
      });

      setCompMetrics(agg);
      setSummaryMetrics({
        plays: summary.plays,
        listeners: summary.listeners.size,
        time: summary.time,
        profile_views: summary.profile_views,
        social_clicks: summary.social_clicks
      });
    };
    loadMetrics();
  }, [user]);

  return (
    <DashboardLayout>
      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-sm text-gray-400"><span>Total de Plays</span></div>
          <div className="text-3xl font-bold"><span>{loading ? '...' : summaryMetrics.plays}</span></div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400"><span>Ouvintes</span></div>
          <div className="text-3xl font-bold"><span>{loading ? '...' : summaryMetrics.listeners}</span></div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400"><span>Tempo Ouvido</span></div>
          <div className="text-3xl font-bold">
            <span>
            {loading ? '...' : (() => {
               const s = summaryMetrics.time || 0;
               const h = Math.floor(s / 3600);
               const m = Math.floor((s % 3600) / 60);
               return `${h}h ${m}m`;
            })()}
            </span>
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="text-sm text-gray-400"><span>Visitas no Perfil</span></div>
          <div className="text-3xl font-bold"><span>{loading ? '...' : summaryMetrics.profile_views}</span></div>
        </Card>
        <Card>
          <div className="text-sm text-gray-400"><span>Cliques Sociais</span></div>
          <div className="text-3xl font-bold"><span>{loading ? '...' : summaryMetrics.social_clicks}</span></div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
          <div className="text-xl font-semibold text-white"><span>Minhas Composições</span></div>
          <AnimatedButton 
            onClick={() => setIsUploadModalOpen(true)}
            icon={Plus}
          >
            Nova Composição
          </AnimatedButton>
        </div>

        <div className="space-y-3">
          {loading && <div className="text-gray-400"><span>Carregando...</span></div>}
          {!loading && compositions.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p><span>Nenhuma composição encontrada.</span></p>
              <p className="text-sm mt-2"><span>Clique em &quot;Nova Composição&quot; para enviar.</span></p>
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
                <div className="font-bold text-white"><span>{comp.title}</span></div>
                <div className="text-xs text-gray-400"><span>{comp.genre} • {new Date(comp.created_at).toLocaleDateString()}</span></div>
                {comp.status === 'approved' && (
                  <div className="mt-1 text-xs text-gray-300">
                    <span>
                    {(() => {
                      const mm = compMetrics[comp.id] || { plays: 0, totalSeconds: 0 };
                      const hh = Math.floor(mm.totalSeconds / 3600);
                      const mmn = Math.floor((mm.totalSeconds % 3600) / 60);
                      const ss = mm.totalSeconds % 60;
                      const totalFmt = `${hh}h ${mmn}m ${ss}s`;
                      return `Plays: ${mm.plays} • Tempo total: ${totalFmt}`;
                    })()}
                    </span>
                  </div>
                )}
                {comp.price && (
                    <div className="text-xs text-beatwap-gold mt-1 font-bold"><span>R$ {comp.price}</span></div>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                  comp.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                  comp.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                  'bg-yellow-500/20 text-yellow-500'
                }`}>
                  <span>{comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}</span>
                </div>
                {comp.admin_feedback && (
                  <div className="text-xs text-red-400 max-w-[150px] truncate" title={comp.admin_feedback}>
                    <span>{comp.admin_feedback}</span>
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
