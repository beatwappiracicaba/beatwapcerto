import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, FileText, Lock, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/apiClient';
import { AnimatedButton } from '../ui/AnimatedButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { encryptData, decryptData } from '../../utils/security';

const plans = {
  'avulso': {
    name: 'Plano Avulso',
    price: 'R$ 100,00',
    link: 'https://mpago.la/1bNzgUz'
  },
  'mensal': {
    name: 'Plano Mensal',
    price: 'R$ 200,00',
    link: 'https://mpago.la/13HdzTe'
  },
  'anual': {
    name: 'Plano Anual',
    price: 'R$ 1.200,00',
    link: 'https://mpago.la/13wuYRF'
  }
};

const CheckoutModal = ({ isOpen, onClose, planType, customData }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Form, 2: Terms
  
  const [formData, setFormData] = useState({
    fullName: '',
    cpfCnpj: '',
    phone: '',
    email: '',
    address: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: ''
    }
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Determine plan details
  const selectedPlan = customData || plans[planType] || plans['avulso'];

  useEffect(() => {
    if (isOpen && user) {
      // Pre-fill with user data if available
      // Attempt to get data from user_metadata first
      const meta = user.user_metadata || {};
      const addr = meta.address || {};

      setFormData({
        fullName: meta.full_name || meta.name || '',
        cpfCnpj: decryptData(meta.cpf_cnpj || ''),
        phone: decryptData(meta.phone || ''),
        email: user.email || '',
        address: {
          cep: decryptData(addr.cep || ''),
          street: decryptData(addr.street || ''),
          number: decryptData(addr.number || ''),
          complement: decryptData(addr.complement || ''),
          neighborhood: decryptData(addr.neighborhood || ''),
          city: addr.city || '',
          state: addr.state || ''
        }
      });
    }
  }, [isOpen, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDownloadContract = () => {
    const contractText = `
CONTRATO DE LICENCIAMENTO MUSICAL - BEATWAP PRODUÇÕES

1. PARTES
Contratante: BEATWAP PRODUÇÕES
Contratado: ${formData.fullName} (CPF/CNPJ: ${formData.cpfCnpj})

2. OBJETO
O presente contrato tem por objeto o licenciamento de obras musicais para distribuição digital.

3. ROYALTIES
3.1. O Artista receberá 75% (setenta e cinco por cento) dos royalties líquidos gerados pela exploração digital.
3.2. A Plataforma reterá 25% (vinte e cinco por cento) a título de taxa de administração e suporte.

4. PRAZO
Este contrato vigora por prazo indeterminado, podendo ser rescindido a qualquer momento por ambas as partes.

5. EXCLUSIVIDADE
Não há cláusula de exclusividade, exceto para obras específicas acordadas à parte.

Data: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([contractText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Contrato_BeatWap.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      addToast('Você precisa aceitar os termos para continuar.', 'error');
      return;
    }

    setLoading(true);

    try {
      // 1. Update User Profile
      if (user) {
        // Encrypt sensitive data
        const encryptedAddress = {
          ...formData.address,
          cep: encryptData(formData.address.cep),
          street: encryptData(formData.address.street),
          number: encryptData(formData.address.number),
          complement: encryptData(formData.address.complement),
          neighborhood: encryptData(formData.address.neighborhood),
          // city and state are kept unencrypted for search/filter purposes
        };

        await apiClient.put('/profile', {
          full_name: formData.fullName,
          cpf_cnpj: encryptData(formData.cpfCnpj),
          phone: encryptData(formData.phone),
          address: encryptedAddress
        });
      }

      // 2. Log purchase attempt (optional, create a table if needed)
      // await apiClient.post('/purchase_attempts', {...})

      // 3. Open WhatsApp
      const plan = selectedPlan;
      const message = `Olá, acabei de contratar o ${plan.name} na BeatWap! Meu email é ${formData.email}. Gostaria de confirmar o pagamento.`;
      const whatsappUrl = `https://wa.me/5519981083497?text=${encodeURIComponent(message)}`;
      const a1 = document.createElement('a');
      a1.href = whatsappUrl;
      a1.target = '_blank';
      a1.rel = 'noopener,noreferrer';
      document.body.appendChild(a1);
      a1.click();
      
      if (plan.link) {
        const a2 = document.createElement('a');
        a2.href = plan.link;
        a2.target = '_blank';
        a2.rel = 'noopener,noreferrer';
        document.body.appendChild(a2);
        a2.click();
        a2.remove();
      }
      
      a1.remove();
      onClose();
      addToast('Redirecionando para pagamento...', 'success');

    } catch (error) {
      console.error('Error processing checkout:', error);
      addToast('Erro ao processar dados. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#121212] w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div>
              <h2 className="text-xl font-bold text-white">Finalizar Contratação</h2>
              <p className="text-beatwap-gold text-sm font-medium">{selectedPlan.name} - {selectedPlan.price}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Personal Data */}
              <div className="space-y-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Lock size={18} className="text-beatwap-gold" />
                  Dados Pessoais
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nome Completo</label>
                    <AnimatedInput 
                      name="fullName" 
                      value={formData.fullName} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CPF ou CNPJ</label>
                    <AnimatedInput 
                      name="cpfCnpj" 
                      value={formData.cpfCnpj} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <AnimatedInput 
                      name="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                      type="email"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Celular (WhatsApp)</label>
                    <AnimatedInput 
                      name="phone" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FileText size={18} className="text-beatwap-gold" />
                  Endereço
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <label className="block text-xs text-gray-400 mb-1">CEP</label>
                    <AnimatedInput 
                      name="address.cep" 
                      value={formData.address.cep} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="00000-000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Rua</label>
                    <AnimatedInput 
                      name="address.street" 
                      value={formData.address.street} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="Nome da rua"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Número</label>
                    <AnimatedInput 
                      name="address.number" 
                      value={formData.address.number} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Bairro</label>
                    <AnimatedInput 
                      name="address.neighborhood" 
                      value={formData.address.neighborhood} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cidade/UF</label>
                    <AnimatedInput 
                      name="address.city" 
                      value={formData.address.city} 
                      onChange={handleInputChange} 
                      required 
                      placeholder="Cidade - UF"
                    />
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-bold text-sm">Contrato de Licenciamento</h4>
                    <button 
                      type="button"
                      onClick={handleDownloadContract}
                      className="text-xs text-beatwap-gold hover:underline flex items-center gap-1"
                    >
                      <FileText size={14} />
                      Baixar Contrato
                    </button>
                  </div>
                  <div className="h-32 overflow-y-auto text-xs text-gray-400 custom-scrollbar bg-black/20 p-2 rounded">
                    <p className="mb-2"><strong>1. PARTES:</strong> BEATWAP PRODUÇÕES e VOCÊ.</p>
                    <p className="mb-2"><strong>2. OBJETO:</strong> Licenciamento para distribuição digital.</p>
                    <p className="mb-2"><strong>3. ROYALTIES:</strong> 75% Artista / 25% Plataforma.</p>
                    <p className="mb-2"><strong>4. PRAZO:</strong> Indeterminado.</p>
                    <p>Ao aceitar, você concorda com todas as cláusulas do contrato completo disponível para download.</p>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        id="terms" 
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/20 bg-white/5 transition-all checked:border-beatwap-gold checked:bg-beatwap-gold hover:border-white/40"
                      />
                      <Check size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-black opacity-0 peer-checked:opacity-100" />
                    </div>
                    <label htmlFor="terms" className="text-sm text-gray-300 cursor-pointer select-none">
                      Li e aceito os termos do contrato
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex justify-end gap-4">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <AnimatedButton 
                  type="submit"
                  disabled={loading || !acceptedTerms}
                  className={`${loading || !acceptedTerms ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader size={18} className="animate-spin" /> Processando...
                    </span>
                  ) : (
                    'Ir para Pagamento'
                  )}
                </AnimatedButton>
              </div>

            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CheckoutModal;
