import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, X, AlertTriangle, Music, Download, FileText, Calendar, Disc, Eye, Link as LinkIcon, Wand2, Lock as LockIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { useToast } from '../../context/ToastContext';
import { useNotification } from '../../context/NotificationContext';
import { useData } from '../../context/DataContext';

export const AdminMusic = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { music, updateMusicStatus } = useData();
  const [rejectionModalOpen, setRejectionModalOpen] = useState(null); // ID of music to reject
  const [approvalModalOpen, setApprovalModalOpen] = useState(null); // ID of music to approve
  const [detailsModalOpen, setDetailsModalOpen] = useState(null); // ID of music to view details
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [approvalData, setApprovalData] = useState({ upc: '', preSaveLink: '', isArtistProvidedUPC: false });
  const { addToast } = useToast();
  const { addNotification } = useNotification();

  const rejectionTemplates = [
    { label: 'Qualidade de Áudio', text: 'O arquivo de áudio enviado não atende aos padrões de qualidade (mínimo 320kbps).' },
    { label: 'Capa Incorreta', text: 'A capa não está nas dimensões exigidas (3000x3000px) ou contém textos proibidos.' },
    { label: 'Metadados Incompletos', text: 'Faltam informações obrigatórias nos metadados da faixa.' }
  ];

  const filteredMusic = music.filter(m => 
    (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.artist_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApproveClick = (musicItem) => {
    setApprovalData({
      upc: musicItem.upc || '',
      preSaveLink: '',
      isArtistProvidedUPC: !!musicItem.upc
    });
    setApprovalModalOpen(musicItem.id);
  };

  const generateUPC = () => {
    // Simulação de geração de UPC
    const randomNum = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    const newUPC = `${randomNum}`;
    setApprovalData(prev => ({ ...prev, upc: newUPC }));
  };

  const confirmApproval = () => {
    if (!approvalData.upc || !approvalData.preSaveLink) {
      addToast('Por favor, preencha o UPC e o Link de Pré-Save.', 'error');
      return;
    }

    updateMusicStatus(approvalModalOpen, 'approved', {
      upc: approvalData.upc,
      preSaveLink: approvalData.preSaveLink
    });
    
    // Find the music object to get details
    const musicItem = music.find(m => m.id === approvalModalOpen);
    if (musicItem) {
      addNotification({
        recipientId: musicItem.artist_id,
        title: 'Música Aprovada! 🚀',
        message: `Sua música "${musicItem.title}" foi aprovada e já está sendo distribuída.`,
        type: 'success',
        link: `/dashboard/music/${musicItem.id}`
      });
    }

    addToast('Música aprovada com sucesso!', 'success');
    setApprovalModalOpen(null);
    if (detailsModalOpen) setDetailsModalOpen(null);
  };

  const handleReject = () => {
    if (!selectedReason) {
      addToast('Selecione um motivo para rejeição.', 'error');
      return;
    }

    updateMusicStatus(rejectionModalOpen, 'rejected', { rejectionReason: selectedReason });

    // Find the music object to get details
    const musicItem = music.find(m => m.id === rejectionModalOpen);
    if (musicItem) {
      addNotification({
        recipientId: musicItem.artist_id,
        title: 'Música Rejeitada ⚠️',
        message: `Sua música "${musicItem.title}" precisa de ajustes. Motivo: ${selectedReason}`,
        type: 'error',
        link: `/dashboard/music/${musicItem.id}`
      });
    }

    addToast('Música rejeitada.', 'info');
    setRejectionModalOpen(null);
    setSelectedReason('');
    if (detailsModalOpen) setDetailsModalOpen(null);
  };


  const openDetails = (music) => {
    setSelectedMusic(music);
    setDetailsModalOpen(music.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Gerenciar Músicas</h1>
          <p className="text-gray-400">Aprove ou rejeite os lançamentos enviados.</p>
        </div>
        <div className="w-full md:w-64">
          <AnimatedInput 
            icon={Search} 
            placeholder="Buscar música..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredMusic.map((music) => (
          <motion.div 
            key={music.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-800 flex-shrink-0 group cursor-pointer" onClick={() => openDetails(music)}>
                  <img src={music.cover} alt={music.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={20} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 cursor-pointer" onClick={() => openDetails(music)}>
                  <h3 className="font-bold text-lg hover:text-beatwap-gold transition-colors">{music.title}</h3>
                  <p className="text-sm text-gray-400">{music.artist} • {music.genre}</p>
                  <p className="text-xs text-gray-500 mt-1">{music.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                 <button 
                  onClick={() => openDetails(music)}
                  className="p-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  title="Ver Detalhes"
                >
                  <FileText size={18} />
                  <span className="hidden md:inline">Detalhes</span>
                </button>
                
                {['pending', 'review'].includes(music.status) ? (
                  <>
                    <button 
                      onClick={() => handleApproveClick(music)}
                      className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors flex items-center gap-2"
                      title="Aprovar"
                    >
                      <Check size={18} />
                      <span className="hidden md:inline">Aprovar</span>
                    </button>
                    <button 
                      onClick={() => setRejectionModalOpen(music.id)}
                      className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-2"
                      title="Rejeitar"
                    >
                      <X size={18} />
                      <span className="hidden md:inline">Rejeitar</span>
                    </button>
                  </>
                ) : (
                  <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                    music.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {music.status === 'approved' ? <Check size={14} /> : <X size={14} />}
                    {music.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {detailsModalOpen && selectedMusic && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border border-white/10 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Disc className="text-beatwap-gold" />
                  Detalhes do Lançamento
                </h2>
                <button onClick={() => setDetailsModalOpen(null)} className="text-gray-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="w-full md:w-1/3 space-y-4">
                  <div className="aspect-square rounded-xl overflow-hidden border border-white/10 relative group">
                    <img src={selectedMusic.cover} alt={selectedMusic.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <a 
                        href={selectedMusic.coverFile} 
                        download 
                        target="_blank"
                        className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                      >
                        <Download size={16} />
                        Baixar Capa
                      </a>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Status Atual</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      selectedMusic.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                      selectedMusic.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {selectedMusic.status === 'approved' ? 'Aprovado' : 
                       selectedMusic.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-2/3 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{selectedMusic.title}</h3>
                    <p className="text-beatwap-gold text-lg">{selectedMusic.artist}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Gênero</p>
                      <p className="text-white font-medium">{selectedMusic.genre}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">Data de Lançamento</p>
                      <div className="flex items-center gap-2 text-white font-medium">
                        <Calendar size={14} className="text-beatwap-gold" />
                        {selectedMusic.releaseDate}
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">ISRC</p>
                      <p className="text-white font-medium font-mono text-sm">{selectedMusic.isrc}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">UPC/EAN</p>
                      <p className="text-white font-medium font-mono text-sm">{selectedMusic.upc}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        <Music size={16} className="text-beatwap-gold" />
                        Arquivo de Áudio
                      </span>
                      <a 
                        href={selectedMusic.audioFile} 
                        download
                        target="_blank"
                        className="text-xs text-beatwap-gold hover:underline flex items-center gap-1"
                      >
                        <Download size={12} />
                        Baixar Original
                      </a>
                    </div>
                    <AudioPlayer 
                      src={selectedMusic.audioFile} 
                      title={selectedMusic.title} 
                      artist={selectedMusic.artist} 
                    />
                  </div>
                </div>
              </div>

              {selectedMusic.status === 'pending' && (
                <div className="flex gap-4 pt-6 border-t border-white/10">
                  <AnimatedButton 
                    variant="outline" 
                    className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                    onClick={() => {
                      setRejectionModalOpen(selectedMusic.id);
                    }}
                  >
                    <X size={18} className="mr-2" />
                    Rejeitar Lançamento
                  </AnimatedButton>
                  <AnimatedButton 
                    variant="primary" 
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none"
                    onClick={() => handleApproveClick(selectedMusic)}
                  >
                    <Check size={18} className="mr-2" />
                    Aprovar Lançamento
                  </AnimatedButton>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {approvalModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#121212] border border-green-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Check className="text-green-500" />
                Aprovar Lançamento
              </h2>
              
              <div className="space-y-4 mb-6">
                <p className="text-gray-400 text-sm">
                  Preencha os dados finais para concluir a aprovação da música.
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white flex justify-between items-center">
                    Código UPC
                    {approvalData.isArtistProvidedUPC && (
                      <span className="text-xs text-green-500 flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-full">
                        <LockIcon size={10} /> Fornecido pelo Artista
                      </span>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <AnimatedInput
                      placeholder="789XXXXXXXXXX"
                      value={approvalData.upc}
                      onChange={(e) => setApprovalData({...approvalData, upc: e.target.value})}
                      className={`font-mono flex-1 ${approvalData.isArtistProvidedUPC ? 'opacity-80' : ''}`}
                      disabled={approvalData.isArtistProvidedUPC}
                    />
                    {!approvalData.isArtistProvidedUPC && (
                      <AnimatedButton onClick={generateUPC} className="bg-beatwap-gold/10 text-beatwap-gold hover:bg-beatwap-gold/20 whitespace-nowrap">
                        <Wand2 size={16} className="mr-2" />
                        Gerar UPC
                      </AnimatedButton>
                    )}
                  </div>
                  {!approvalData.isArtistProvidedUPC && (
                    <p className="text-xs text-gray-500">Insira ou gere o UPC automaticamente.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Link do Pré-Save</label>
                  <AnimatedInput
                    icon={LinkIcon}
                    placeholder="https://presave.beatwap.com/..."
                    value={approvalData.preSaveLink}
                    onChange={(e) => setApprovalData({...approvalData, preSaveLink: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <AnimatedButton 
                  variant="outline" 
                  onClick={() => setApprovalModalOpen(null)}
                  className="flex-1"
                >
                  Cancelar
                </AnimatedButton>
                <AnimatedButton 
                  variant="primary" 
                  onClick={confirmApproval}
                  className="flex-1 bg-green-600 hover:bg-green-700 border-none"
                >
                  Confirmar Aprovação
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}

        {rejectionModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#121212] border border-red-500/30 rounded-2xl p-6 max-w-md w-full"
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-red-500" />
                Rejeitar Lançamento
              </h2>
              
              <div className="space-y-3 mb-6">
                <p className="text-gray-400 text-sm">Selecione o motivo da rejeição:</p>
                {rejectionTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedReason(template.text)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedReason === template.text
                        ? 'bg-red-500/20 border-red-500 text-white'
                        : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-bold text-sm mb-1">{template.label}</div>
                    <div className="text-xs opacity-80">{template.text}</div>
                  </button>
                ))}
                
                <textarea
                  placeholder="Ou digite um motivo personalizado..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-red-500 focus:outline-none transition-colors mt-2"
                  rows={3}
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <AnimatedButton 
                  variant="outline" 
                  onClick={() => setRejectionModalOpen(null)}
                  className="flex-1"
                >
                  Cancelar
                </AnimatedButton>
                <AnimatedButton 
                  variant="primary" 
                  onClick={handleReject}
                  className="flex-1 bg-red-600 hover:bg-red-700 border-none"
                >
                  Confirmar Rejeição
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
