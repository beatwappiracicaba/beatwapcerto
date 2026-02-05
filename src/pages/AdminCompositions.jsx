import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { AdminLayout } from '../components/AdminLayout';
import { Play, Pause, Check, X, Music } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AdminCompositions = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [compositions, setCompositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState(null);
  const [audio, setAudio] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchCompositions = useCallback(async () => {
    setLoading(true);
    // Join with profiles to get composer name
    const { data, error } = await supabase
      .from('compositions')
      .select('*, profiles:composer_id(nome, nome_completo_razao_social)')
      .order('created_at', { ascending: false });
    
    if (!error) {
        setCompositions(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompositions();
    return () => {
        if (audio) {
            audio.pause();
        }
    }
  }, [fetchCompositions]);

  const togglePlay = (url, id) => {
    if (playingId === id && audio) {
      audio.pause();
      setPlayingId(null);
      setAudio(null);
    } else {
      if (audio) audio.pause();
      const newAudio = new Audio(url);
      newAudio.play();
      newAudio.onended = () => {
        setPlayingId(null);
        setAudio(null);
      };
      setAudio(newAudio);
      setPlayingId(id);
    }
  };

  const handleStatusChange = async (id, status, feedback = null) => {
    try {
        const { error } = await supabase
            .from('compositions')
            .update({ status, admin_feedback: feedback })
            .eq('id', id);
        
        if (error) throw error;
        
        addToast(`Composição ${status === 'approved' ? 'aprovada' : 'recusada'}!`, 'success');
        fetchCompositions();
        setRejectingId(null);
        setRejectReason('');
    } catch (error) {
        console.error(error);
        addToast('Erro ao atualizar status', 'error');
    }
  };

  return (
    <AdminLayout>
      <Card>
        <div className="text-xl font-semibold text-white mb-6">Gerenciar Composições</div>

        <div className="space-y-4">
          {loading && <div className="text-gray-400">Carregando...</div>}
          {!loading && compositions.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p>Nenhuma composição encontrada.</p>
            </div>
          )}
          {!loading && compositions.map((comp) => (
            <div key={comp.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div 
                    className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden shrink-0 relative cursor-pointer group"
                    onClick={() => togglePlay(comp.audio_url, comp.id)}
                >
                    {comp.cover_url ? (
                    <img src={comp.cover_url} alt={comp.title} className="w-full h-full object-cover" />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <Music size={24} />
                    </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {playingId === comp.id ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white" />}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-lg truncate">{comp.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                        comp.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                        comp.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                        'bg-yellow-500/20 text-yellow-500'
                    }`}>
                        {comp.status === 'approved' ? 'Aprovado' : comp.status === 'rejected' ? 'Recusado' : 'Pendente'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Por: <span className="text-white">{comp.profiles?.nome || comp.profiles?.nome_completo_razao_social || 'Desconhecido'}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {comp.genre} • {new Date(comp.created_at).toLocaleDateString()} • {comp.price ? `R$ ${comp.price}` : 'Sem preço'}
                  </div>
                  {comp.description && (
                      <div className="text-sm text-gray-400 mt-2 bg-black/20 p-2 rounded-lg">
                          {comp.description}
                      </div>
                  )}
                  {comp.admin_feedback && (
                      <div className="text-xs text-red-400 mt-2">
                          Motivo recusa: {comp.admin_feedback}
                      </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                    {comp.status === 'pending' && (
                        <>
                            <AnimatedButton 
                                onClick={() => handleStatusChange(comp.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700 border-none text-white w-full justify-center"
                            >
                                <Check size={16} className="mr-2" /> Aprovar
                            </AnimatedButton>
                            
                            {rejectingId === comp.id ? (
                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Motivo da recusa..." 
                                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white"
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleStatusChange(comp.id, 'rejected', rejectReason)}
                                            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded flex-1"
                                        >
                                            Confirmar
                                        </button>
                                        <button 
                                            onClick={() => setRejectingId(null)}
                                            className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-1 rounded flex-1"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <AnimatedButton 
                                    onClick={() => { setRejectingId(comp.id); setRejectReason(''); }}
                                    className="bg-red-600/20 hover:bg-red-600/30 border-red-600 text-red-500 w-full justify-center"
                                >
                                    <X size={16} className="mr-2" /> Recusar
                                </AnimatedButton>
                            )}
                        </>
                    )}
                    <a 
                        href={comp.audio_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-xs text-center text-gray-500 hover:text-white transition-colors"
                    >
                        Baixar Áudio
                    </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
};

export default AdminCompositions;
