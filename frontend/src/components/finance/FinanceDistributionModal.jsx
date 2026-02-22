import React, { useState, useEffect } from 'react';
import { X, Upload, Check, FileText, DollarSign, User, Briefcase, Building } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../context/ToastContext';

export const FinanceDistributionModal = ({ isOpen, onClose, event, onUpdate, userRole = 'artist' }) => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  
  // Determine which sections are visible and editable based on role
  const isArtist = userRole === 'artist';
  const isSeller = userRole === 'seller';
  const isProducer = userRole === 'producer';
  
  // State for files
  const [files, setFiles] = useState({
    receipt_artist: null,
    receipt_seller: null,
    receipt_house: null,
    receipt_manager: null,
    contract_file: null
  });

  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [hasContract, setHasContract] = useState(false);

  useEffect(() => {
    if (event) {
      setMarkAsPaid(event.status === 'pago');
      setHasContract(event.has_contract || false);
    }
  }, [event, isOpen]);

  if (!isOpen || !event) return null;

  const canEdit = isSeller || isProducer;

  const handleFileChange = (e, field) => {
    if (!canEdit) return; 
    
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({ ...prev, [field]: file }));
    }
  };

  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        receipt_artist: await toDataUrl(files.receipt_artist),
        receipt_seller: await toDataUrl(files.receipt_seller),
        receipt_house: await toDataUrl(files.receipt_house),
        receipt_manager: await toDataUrl(files.receipt_manager),
        contract_file: await toDataUrl(files.contract_file),
        markAsPaid,
        hasContract
      };

      const changed =
        payload.receipt_artist ||
        payload.receipt_seller ||
        payload.receipt_house ||
        payload.receipt_manager ||
        payload.contract_file ||
        markAsPaid !== (event.status === 'pago') ||
        hasContract !== (event.has_contract || false);

      if (!changed) {
        addToast('Nenhuma alteração para salvar.', 'info');
        setLoading(false);
        return;
      }

      await apiClient.post(`/artist/finance/events/${event.id}/receipts`, payload);
      addToast('Atualização realizada com sucesso!', 'success');
      onUpdate && onUpdate();
      onClose();

    } catch (error) {
      console.error('Error uploading receipts:', error);
      addToast('Erro ao atualizar informações financeiras.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#111] z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-beatwap-gold" />
            Pagamento e Distribuição
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <h3 className="font-bold text-lg mb-2">{event.title}</h3>
            <p className="text-gray-400 text-sm mb-4">
              Data: {new Date(event.date).toLocaleDateString()}
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-black/20 p-3 rounded-lg">
                <span className="block text-gray-500 text-xs uppercase">Faturamento Total</span>
                <span className="font-bold text-green-400 text-lg">{formatCurrency(event.revenue)}</span>
              </div>
              <div className="bg-black/20 p-3 rounded-lg">
                <span className="block text-gray-500 text-xs uppercase">Status</span>
                <span className={`font-bold ${event.status === 'pago' ? 'text-green-500' : 'text-yellow-500'}`}>
                  {event.status || 'Pendente'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-white border-b border-white/10 pb-2">Contrato e Documentação</h4>
             <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="text-beatwap-gold" size={18} />
                    <div>
                      <div className="font-bold">Contrato do Show</div>
                      <div className="text-xs text-gray-400">{hasContract ? 'Contrato Assinado' : 'Pendente de Assinatura'}</div>
                    </div>
                  </div>
                  {event.contract_url ? (
                    <a href={event.contract_url} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:underline flex items-center gap-1">
                      <Check size={12} /> Ver Contrato
                    </a>
                  ) : (
                    <span className="text-yellow-500 text-xs">Sem Contrato</span>
                  )}
                </div>
                {canEdit && (
                  <div className="space-y-3">
                     <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="has-contract"
                        checked={hasContract}
                        onChange={(e) => setHasContract(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-black/20 text-beatwap-gold focus:ring-beatwap-gold focus:ring-offset-0"
                      />
                      <label htmlFor="has-contract" className="text-white text-sm cursor-pointer select-none">
                        Marcar como &quot;Contrato Assinado&quot; (Impede exclusão se cancelado)
                      </label>
                    </div>

                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileChange(e, 'contract_file')}
                        className="hidden" 
                        id="file-contract"
                      />
                      <label htmlFor="file-contract" className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors text-sm text-gray-400">
                        <Upload size={16} />
                        {files.contract_file ? files.contract_file.name : 'Anexar Contrato (PDF)'}
                      </label>
                    </div>
                  </div>
                )}
              </div>

            <h4 className="font-bold text-white border-b border-white/10 pb-2">Comprovantes de Pagamento</h4>
            
            {/* Artist Receipt */}
            {(isArtist || isProducer) && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="text-beatwap-gold" size={18} />
                    <div>
                      <div className="font-bold">Artista (Você)</div>
                      <div className="text-xs text-gray-400">Valor: {formatCurrency(event.artist_share)}</div>
                    </div>
                  </div>
                  {event.receipt_artist ? (
                    <a href={event.receipt_artist} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:underline flex items-center gap-1">
                      <Check size={12} /> Ver Comprovante
                    </a>
                  ) : (
                    <span className="text-yellow-500 text-xs">Pendente</span>
                  )}
                </div>
                {canEdit && (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'receipt_artist')}
                      className="hidden" 
                      id="file-artist"
                    />
                    <label htmlFor="file-artist" className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors text-sm text-gray-400">
                      <Upload size={16} />
                      {files.receipt_artist ? files.receipt_artist.name : 'Anexar Comprovante (PDF/Img)'}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Seller Receipt */}
            {(event.seller_id && (isArtist || isSeller || isProducer)) && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Briefcase className="text-blue-400" size={18} />
                    <div>
                      <div className="font-bold">Vendedor ({event.seller?.nome || 'Vendedor'})</div>
                      <div className="text-xs text-gray-400">Comissão: {formatCurrency(event.seller_commission)}</div>
                    </div>
                  </div>
                  {event.receipt_seller ? (
                    <a href={event.receipt_seller} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:underline flex items-center gap-1">
                      <Check size={12} /> Ver Comprovante
                    </a>
                  ) : (
                    <span className="text-yellow-500 text-xs">Pendente</span>
                  )}
                </div>
                {canEdit && (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'receipt_seller')}
                      className="hidden" 
                      id="file-seller"
                    />
                    <label htmlFor="file-seller" className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors text-sm text-gray-400">
                      <Upload size={16} />
                      {files.receipt_seller ? files.receipt_seller.name : 'Anexar Comprovante (PDF/Img)'}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* House/Producer Receipt */}
            {(isArtist || isProducer) && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Building className="text-purple-400" size={18} />
                    <div>
                      <div className="font-bold">Produtora/Manutenção</div>
                      <div className="text-xs text-gray-400">Valor: {formatCurrency(event.house_cut)}</div>
                    </div>
                  </div>
                  {event.receipt_house ? (
                    <a href={event.receipt_house} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:underline flex items-center gap-1">
                      <Check size={12} /> Ver Comprovante
                    </a>
                  ) : (
                    <span className="text-yellow-500 text-xs">Pendente</span>
                  )}
                </div>
                {canEdit && (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'receipt_house')}
                      className="hidden" 
                      id="file-house"
                    />
                    <label htmlFor="file-house" className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors text-sm text-gray-400">
                      <Upload size={16} />
                      {files.receipt_house ? files.receipt_house.name : 'Anexar Comprovante (PDF/Img)'}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Manager Receipt */}
            {(event.manager_id && (isArtist || isProducer)) && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <User className="text-orange-400" size={18} />
                    <div>
                      <div className="font-bold">Empresário</div>
                      <div className="text-xs text-gray-400">Valor: {formatCurrency(event.manager_cut)}</div>
                    </div>
                  </div>
                  {event.receipt_manager ? (
                    <a href={event.receipt_manager} target="_blank" rel="noopener noreferrer" className="text-green-400 text-xs hover:underline flex items-center gap-1">
                      <Check size={12} /> Ver Comprovante
                    </a>
                  ) : (
                    <span className="text-yellow-500 text-xs">Pendente</span>
                  )}
                </div>
                {canEdit && (
                  <div className="relative">
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'receipt_manager')}
                      className="hidden" 
                      id="file-manager"
                    />
                    <label htmlFor="file-manager" className="flex items-center justify-center gap-2 w-full p-3 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors text-sm text-gray-400">
                      <Upload size={16} />
                      {files.receipt_manager ? files.receipt_manager.name : 'Anexar Comprovante (PDF/Img)'}
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex items-center justify-between sticky bottom-0 bg-[#111] z-10 gap-4">
          {canEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mark-paid"
                checked={markAsPaid}
                onChange={(e) => setMarkAsPaid(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-black/20 text-beatwap-gold focus:ring-beatwap-gold focus:ring-offset-0"
              />
              <label htmlFor="mark-paid" className="text-white text-sm cursor-pointer select-none">
                Marcar como Pago
              </label>
            </div>
          )}
          <div className="flex gap-3 ml-auto">
            <AnimatedButton onClick={onClose} variant="secondary">
              Cancelar
            </AnimatedButton>
            {canEdit && (
              <AnimatedButton onClick={handleSubmit} variant="primary" loading={loading} icon={Check}>
                Salvar
              </AnimatedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
