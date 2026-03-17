import { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
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
  
  // Filters state
  const [activeTab, setActiveTab] = useState('pending');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterArtist, setFilterArtist] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [composers, setComposers] = useState([]);

  // Fetch composers for dropdown
  useEffect(() => {
    const fetchComposers = async () => {
      try {
        const data = await apiClient.get('/composers');
        if (data) setComposers(data);
      } catch (error) {
        console.error("Erro ao buscar compositores:", error);
        addToast("Não foi possível carregar os compositores.", "error");
      }
    };
    fetchComposers();
  }, []);

  const fetchCompositions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/admin/compositions');
      setCompositions(data || []);
    } catch (error) {
      console.error("Erro ao buscar composições:", error);
      addToast("Não foi possível carregar as composições.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompositions();
    return () => {
        if (audio) {
            audio.pause();
        }
    }
  }, [fetchCompositions]);

  const sanitizeUrl = (u) => {
    const s = String(u || '').trim().replace(/^[`'"]+|[`'"]+$/g, '');
    return s;
  };
  const canPlay = (u) => {
    try {
      const ext = (u.split('?')[0].split('#')[0].split('.').pop() || '').toLowerCase();
      const audio = document.createElement('audio');
      if (ext === 'mp3') return !!audio.canPlayType('audio/mpeg');
      if (ext === 'm4a' || ext === 'aac') return !!audio.canPlayType('audio/mp4');
      if (ext === 'ogg' || ext === 'oga') return !!audio.canPlayType('audio/ogg');
      if (u.startsWith('data:audio/')) return true;
      return true;
    } catch { return true; }
  };
  const togglePlay = (url, id) => {
    const u = sanitizeUrl(url);
    if (!u) return;
    if (playingId === id && audio) {
      audio.pause();
      setPlayingId(null);
      setAudio(null);
    } else {
      if (audio) audio.pause();
      if (!canPlay(u)) {
        addToast('Fonte de áudio não suportada', 'error');
        return;
      }
      const newAudio = new Audio(u);
      newAudio.play().catch(() => {
        addToast('Não foi possível reproduzir o áudio', 'error');
      });
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
        await apiClient.put(`/admin/compositions/${id}/status`, { status, feedback });
        addToast(`Composição ${status === 'approved' ? 'aprovada' : 'recusada'}!`, 'success');
        fetchCompositions();
        setRejectingId(null);
        setRejectReason('');
    } catch (error) {
        console.error(error);
        addToast('Erro ao atualizar status', 'error');
    }
  };

  const filteredCompositions = compositions.filter(comp => {
    if (activeTab === 'approved' && comp.status !== 'approved') return false;
    if (activeTab === 'pending' && comp.status !== 'pending') return false;
    if (filterStatus !== 'todos' && comp.status !== filterStatus) return false;
    if (filterArtist && comp.composer_id !== filterArtist) return false;
    if (startDate && new Date(comp.created_at) < new Date(startDate)) return false;
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (new Date(comp.created_at) > end) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="bg-beatwap-graphite rounded-2xl border border-white/5 shadow-xl space-y-4 p-4 md:p-6">
          <div className="font-bold text-white text-xl">Aprovar / Reprovar</div>
          
          <div className="flex flex-wrap gap-2 pb-2">
            <button 
                onClick={() => setActiveTab('approved')}
                className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${activeTab === 'approved' ? 'bg-beatwap-gold text-beatwap-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
                Músicas Aprovadas
            </button>
            <button 
                onClick={() => setActiveTab('pending')}
                className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${activeTab === 'pending' ? 'bg-beatwap-gold text-beatwap-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
                Pendentes
            </button>
            <button 
                onClick={() => setActiveTab('all')}
                className={`flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-bold ${activeTab === 'all' ? 'bg-beatwap-gold text-beatwap-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
                Todas
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full sm:col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
            >
                <option value="todos" className="bg-beatwap-graphite">Status: Todos</option>
                <option value="pending" className="bg-beatwap-graphite">Pendente</option>
                <option value="approved" className="bg-beatwap-graphite">Aprovado</option>
                <option value="rejected" className="bg-beatwap-graphite">Recusado</option>
            </select>
            <select 
                value={filterArtist}
                onChange={(e) => setFilterArtist(e.target.value)}
                className="w-full sm:col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
            >
                <option value="" className="bg-beatwap-graphite">Artista: Todos</option>
                {composers.map(c => (
                    <option key={c.id} value={c.id} className="bg-beatwap-graphite">{c.nome || c.nome_completo_razao_social || 'Sem nome'}</option>
                ))}
            </select>
            <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
            />
            <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 md:py-2 text-white focus:outline-none focus:border-beatwap-gold/50"
            />
            <div className="w-full sm:col-span-2 md:col-span-1">
                <button 
                    type="button" 
                    onClick={fetchCompositions}
                    className="relative px-6 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 overflow-hidden bg-beatwap-gold text-beatwap-black hover:shadow-[0_0_20px_rgba(245,197,66,0.4)] w-full justify-center py-3 md:py-2"
                >
                    Filtrar
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%]"></div>
                </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {loading && <div className="text-gray-400">Carregando...</div>}
          {!loading && filteredCompositions.length === 0 && (
            <div className="text-center py-10 text-gray-400 border border-dashed border-white/10 rounded-xl">
              <p>Nenhuma composição encontrada.</p>
            </div>
          )}
          {!loading && filteredCompositions.map((comp) => (
            <div key={comp.id} className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div 
                    className="w-16 h-16 rounded-lg bg-gray-800 overflow-hidden shrink-0 relative cursor-pointer group"
                    onClick={() => togglePlay(comp.audio_url, comp.id)}
                >
                    {comp.cover_url ? (
                    <img src={sanitizeUrl(comp.cover_url)} alt={comp.title} className="w-full h-full object-cover" />
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
                    {comp.status === 'approved' && (
                        <AnimatedButton 
                            onClick={async () => {
                                if (window.confirm(`Tem certeza que deseja apagar a composição "${comp.title}"?`)) {
                                    try {
                                        await apiClient.delete(`/admin/compositions/${comp.id}`);
                                        addToast('Composição apagada com sucesso', 'success');
                                        fetchCompositions();
                                    } catch (error) {
                                        addToast('Erro ao apagar composição', 'error');
                                    }
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 border-none text-white w-full justify-center"
                        >
                            <X size={16} className="mr-2" /> Apagar
                        </AnimatedButton>
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
      </div>
    </AdminLayout>
  );
};

export default AdminCompositions;
