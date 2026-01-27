import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, CreditCard, FileText, Lock, Save, Download, Moon, Sun, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';

export const DashboardArtistProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('detalhes');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Detalhes
    nome_completo_razao_social: '',
    email: '',
    cpf_cnpj: '',
    celular: '',
    tema: 'dark',
    // Endereço
    cep: '',
    logradouro: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Plano
    plano: 'Gratuito',
    // Senha
    nova_senha: '',
    confirmar_senha: ''
  });

  const [mandatoryMissing, setMandatoryMissing] = useState(false);

  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        nome_completo_razao_social: profile.nome_completo_razao_social || '',
        email: user.email || '',
        cpf_cnpj: profile.cpf_cnpj || '',
        celular: profile.celular || '',
        tema: profile.tema || 'dark',
        cep: profile.cep || '',
        logradouro: profile.logradouro || '',
        complemento: profile.complemento || '',
        bairro: profile.bairro || '',
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        plano: profile.plano || 'Gratuito'
      }));
      
      // Check mandatory fields
      const missing = !profile.nome_completo_razao_social || !profile.cpf_cnpj || !profile.celular || !profile.cep || !profile.logradouro || !profile.cidade || !profile.estado;
      setMandatoryMissing(missing);
    }
  }, [user, profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          nome_completo_razao_social: formData.nome_completo_razao_social,
          cpf_cnpj: formData.cpf_cnpj,
          celular: formData.celular,
          tema: formData.tema,
          cep: formData.cep,
          logradouro: formData.logradouro,
          complemento: formData.complemento,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      addToast('Perfil atualizado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (formData.nova_senha !== formData.confirmar_senha) {
      addToast('As senhas não coincidem.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.nova_senha });
      if (error) throw error;
      addToast('Senha atualizada com sucesso!', 'success');
      setFormData(prev => ({ ...prev, nova_senha: '', confirmar_senha: '' }));
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar senha: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateContract = () => {
    // Simple text file generation for now
    const text = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS MUSICAIS\n\nCONTRATANTE: ${formData.nome_completo_razao_social || '____________'}\nCPF/CNPJ: ${formData.cpf_cnpj || '____________'}\n\nEste contrato tem como objeto a distribuição digital de obras musicais...\n\n(Texto padrão de contrato aqui)\n\nData: ${new Date().toLocaleDateString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Contrato_BeatWap.txt';
    a.click();
  };

  const tabs = [
    { id: 'detalhes', label: 'Detalhes', icon: User },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    { id: 'plano', label: 'Plano', icon: CreditCard },
    { id: 'contrato', label: 'Contrato', icon: FileText },
    { id: 'senha', label: 'Minha Senha', icon: Lock },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
          {mandatoryMissing && (
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-lg text-sm">
              <AlertTriangle size={16} />
              <span>Complete seu cadastro para ter acesso total.</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-beatwap-gold text-beatwap-black font-bold' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'detalhes' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatedInput 
                      label="Nome Completo / Razão Social" 
                      value={formData.nome_completo_razao_social} 
                      onChange={(e) => setFormData({...formData, nome_completo_razao_social: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Email" 
                      value={formData.email} 
                      onChange={() => {}} 
                      disabled={true} // Read-only
                    />
                    <AnimatedInput 
                      label="CPF / CNPJ" 
                      value={formData.cpf_cnpj} 
                      onChange={(e) => setFormData({...formData, cpf_cnpj: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Celular" 
                      value={formData.celular} 
                      onChange={(e) => setFormData({...formData, celular: e.target.value})} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 mt-4">
                    <span className="text-gray-300">Tema da Interface</span>
                    <button 
                      onClick={() => setFormData({...formData, tema: formData.tema === 'dark' ? 'light' : 'dark'})}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/20"
                    >
                      {formData.tema === 'dark' ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-yellow-400" />}
                      <span className="text-sm capitalize">{formData.tema}</span>
                    </button>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <AnimatedButton onClick={handleSave} isLoading={loading} icon={Save}>Salvar Detalhes</AnimatedButton>
                  </div>
                </div>
              )}

              {activeTab === 'endereco' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatedInput 
                      label="CEP" 
                      value={formData.cep} 
                      onChange={(e) => setFormData({...formData, cep: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Logradouro" 
                      value={formData.logradouro} 
                      onChange={(e) => setFormData({...formData, logradouro: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Complemento" 
                      value={formData.complemento} 
                      onChange={(e) => setFormData({...formData, complemento: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Bairro" 
                      value={formData.bairro} 
                      onChange={(e) => setFormData({...formData, bairro: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Cidade" 
                      value={formData.cidade} 
                      onChange={(e) => setFormData({...formData, cidade: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Estado (UF)" 
                      value={formData.estado} 
                      onChange={(e) => setFormData({...formData, estado: e.target.value})} 
                    />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <AnimatedButton onClick={handleSave} isLoading={loading} icon={Save}>Salvar Endereço</AnimatedButton>
                  </div>
                </div>
              )}

              {activeTab === 'plano' && (
                <div className="space-y-6 text-center py-8">
                  <div className="w-20 h-20 bg-beatwap-gold/20 rounded-full flex items-center justify-center mx-auto text-beatwap-gold mb-4">
                    <CreditCard size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Seu Plano Atual</h3>
                  <p className="text-4xl font-bold text-beatwap-gold">{formData.plano}</p>
                  <p className="text-gray-400 max-w-md mx-auto">
                    Aproveite todos os recursos do seu plano atual. Você pode fazer o upgrade a qualquer momento para liberar mais funcionalidades.
                  </p>
                  <div className="flex justify-center gap-4 mt-8">
                    <AnimatedButton variant="secondary">Ver Detalhes</AnimatedButton>
                    <AnimatedButton>Renovar / Upgrade</AnimatedButton>
                  </div>
                </div>
              )}

              {activeTab === 'contrato' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white mb-4">Contrato de Serviço</h3>
                  <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">Contrato de Distribuição Digital</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          Este é o contrato padrão que rege nossa parceria. Baixe, leia e mantenha uma cópia para seus registros.
                        </p>
                        <div className="mt-4">
                          <button 
                            onClick={generateContract}
                            className="flex items-center gap-2 text-beatwap-gold hover:underline text-sm"
                          >
                            <Download size={16} />
                            Baixar Contrato (PDF)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'senha' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white mb-4">Alterar Senha</h3>
                  <div className="max-w-md space-y-4">
                    <AnimatedInput 
                      label="Nova Senha" 
                      type="password"
                      value={formData.nova_senha} 
                      onChange={(e) => setFormData({...formData, nova_senha: e.target.value})} 
                    />
                    <AnimatedInput 
                      label="Confirmar Nova Senha" 
                      type="password"
                      value={formData.confirmar_senha} 
                      onChange={(e) => setFormData({...formData, confirmar_senha: e.target.value})} 
                    />
                    <div className="pt-4">
                      <AnimatedButton onClick={handlePasswordChange} isLoading={loading} icon={Lock}>
                        Atualizar Senha
                      </AnimatedButton>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </DashboardLayout>
  );
};
