import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Timeline } from '../components/ui/Timeline';
import { AudioPlayer } from '../components/ui/AudioPlayer';
import { AdjustmentsCenter } from '../components/ui/AdjustmentsCenter';
import { ArrowLeft, Calendar, User, Hash, Clock, History as HistoryIcon, LayoutDashboard, AlertTriangle, FileAudio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabaseClient';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';

const MusicDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [musicData, setMusicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchMusicDetails();
  }, [id]);

  const fetchMusicDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('musics')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        navigate('/dashboard/uploads');
        return;
      }

      setMusicData({
        id: data.id,
        title: data.title,
        artist: data.artist_name || 'Artista',
        cover: data.cover_url,
        status: data.status,
        upc: data.upc || 'Pendente',
        isrc: data.isrc || 'Pendente',
        genre: data.genre || 'N/A',
        uploadDate: new Date(data.created_at).toLocaleDateString('pt-BR'),
        audioUrl: data.audio_url,
        // Mock history based on available dates
        history: [
          { 
            date: new Date(data.created_at).toLocaleString('pt-BR'), 
            action: "Upload realizado", 
            user: data.artist_name || "Artista" 
          },
          ...(data.status !== 'pending' ? [{
             date: new Date(data.created_at).toLocaleString('pt-BR'), // Using created_at as proxy if updated_at not available on music table, actually music table doesn't have updated_at in my schema? I should check.
             // Schema check: created_at exists. updated_at is missing in musics table in my memory, let me check schema again. 
             // musics table: created_at only.
             // I should probably rely on created_at or just show current status.
             action: data.status === 'approved' ? "Aprovado" : "Em análise",
             user: "Sistema"
          }] : [])
        ],
        feedback: data.rejection_reason ? {
          comment: data.rejection_reason,
          issues: [] // Supabase doesn't store issues array separately in my simple schema
        } : null
      });
    } catch (error) {
      console.error('Error fetching music details:', error);
      addToast('Erro ao carregar detalhes da música.', 'error');
      navigate('/dashboard/uploads');
    } finally {
      setLoading(false);
    }
  };

  const getMotivationalQuote = (status) => {
    switch (status) {
      case 'review': return "Estamos cuidando da sua música com todo carinho! 🎧";
      case 'approved': return "Tudo certo! Sua música está pronta para voar. 🚀";
      case 'rejected': return "Não desanime! Pequenos ajustes para um grande lançamento. 💪";
      case 'published': return "Parabéns! Sua arte já está no mundo. 🌍";
      default: return "Sua jornada musical continua aqui.";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-8">
           <Skeleton height={200} />
           <Skeleton height={400} />
        </div>
      </DashboardLayout>
    );
  }

  if (!musicData) return null;

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'history', label: 'Histórico', icon: HistoryIcon },
    ...(musicData.status === 'rejected' ? [{ id: 'adjustments', label: 'Ajustes Pendentes', icon: AlertTriangle, alert: true }] : [])
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <button onClick={() => navigate('/dashboard/uploads')} className="mt-2 p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          
          <div className="w-32 h-32 bg-gray-800 rounded-2xl shrink-0 shadow-2xl overflow-hidden relative">
             {musicData.cover ? (
               <img src={musicData.cover} alt="Cover" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-black text-gray-500">
                 <span className="text-xs font-bold">COVER</span>
               </div>
             )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                musicData.status === 'rejected' ? 'bg-red-500/20 text-red-500' : 
                musicData.status === 'approved' ? 'bg-green-500/20 text-green-500' : 
                'bg-yellow-500/20 text-yellow-500'
              }`}>
                {musicData.status === 'review' || musicData.status === 'pending' ? 'Em Análise' : 
                 musicData.status === 'rejected' ? 'Recusado' : 
                 musicData.status === 'approved' ? 'Aprovado' : 'Enviado'}
              </span>
              <span className="text-gray-500 text-sm flex items-center gap-1">
                <Calendar size={14} /> {musicData.uploadDate}
              </span>
            </div>
            
            <h1 className="text-4xl font-bold text-white">{musicData.title}</h1>
            <p className="text-xl text-gray-400">{musicData.artist}</p>
            
            <p className="text-beatwap-gold font-medium italic pt-2">
              "{getMotivationalQuote(musicData.status)}"
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 flex items-center gap-2 transition-all relative ${
                activeTab === tab.id ? 'text-beatwap-gold' : 'text-gray-500 hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              <span className="font-bold text-sm">{tab.label}</span>
              {tab.alert && <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 w-full h-0.5 bg-beatwap-gold" 
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Timeline */}
                <Card className="p-8">
                  <h3 className="text-lg font-bold mb-8 text-white">Progresso do Lançamento</h3>
                  <Timeline currentStatus={musicData.status === 'pending' ? 'review' : musicData.status} />
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Metadata */}
                  <Card>
                    <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                      <Hash size={20} className="text-beatwap-gold" /> Metadados
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">UPC/EAN</span>
                        <span className="font-mono text-white">{musicData.upc}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">Gênero</span>
                        <span className="text-white">{musicData.genre}</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-gray-500">ISRC</span>
                        <span className="font-mono text-gray-600">{musicData.isrc}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Player */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileAudio size={20} className="text-beatwap-gold" /> Preview de Áudio
                    </h3>
                    <AudioPlayer 
                      title={musicData.title} 
                      artist={musicData.artist}
                      audioUrl={musicData.audioUrl}
                    />
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-sm text-blue-300">
                      <p>ℹ️ Este é o arquivo original enviado. O arquivo final nas plataformas pode sofrer normalização de volume.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <Card>
                <div className="space-y-8 relative pl-4">
                  <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-800" />
                  
                  {musicData.history.map((event, index) => (
                    <motion.div 
                      key={index} 
                      className="relative flex gap-6 items-start"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="w-10 h-10 rounded-full bg-beatwap-graphite border border-gray-700 flex items-center justify-center z-10 shrink-0">
                        <Clock size={16} className="text-beatwap-gold" />
                      </div>
                      <div className="flex-1 bg-white/5 p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-white">{event.action}</h4>
                          <span className="text-xs text-gray-500">{event.date}</span>
                        </div>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <User size={12} /> {event.user}
                        </p>
                        {event.comment && (
                          <div className="mt-3 p-3 bg-black/30 rounded-lg text-sm italic text-gray-300 border-l-2 border-beatwap-gold">
                            "{event.comment}"
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === 'adjustments' && (
              <AdjustmentsCenter 
                feedback={musicData.feedback} 
                onResubmit={() => {
                  alert('Funcionalidade de reenvio em desenvolvimento.');
                  setActiveTab('overview');
                }} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default MusicDetails;
