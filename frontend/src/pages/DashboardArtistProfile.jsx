import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, CreditCard, FileText, Lock, Save, Download, Moon, Sun, AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import CheckoutModal from '../components/landing/CheckoutModal';
import { ProfileEditModal } from '../components/ui/ProfileEditModal';
import { GalleryManager } from '../components/profile/GalleryManager';
import { buildDistributionContractHTML } from '../utils/contractTemplate';
import { encryptFormFields, decryptData } from '../utils/security';
import { MP_CHECKOUT_ENABLED } from '../config/apiConfig';

export const DashboardArtistProfile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('detalhes');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Detalhes
    nome: '',
    nome_completo_razao_social: '',
    email: '',
    cpf_cnpj: '',
    celular: '',
    instagram_url: '',
    site_url: '',
    youtube_url: '',
    spotify_url: '',
    deezer_url: '',
    tiktok_url: '',
    genero_musical: '',
    tema: 'dark',
    // Endereço
    cep: '',
    logradouro: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    // Plano
    plano: 'Sem Plano',
    // Senha
    nova_senha: '',
    confirmar_senha: ''
  });

  const [mandatoryMissing, setMandatoryMissing] = useState(false);
  const [remainingUploads, setRemainingUploads] = useState(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState('custom');
  const [customCheckoutData, setCustomCheckoutData] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [buyHitQty, setBuyHitQty] = useState('1');

  useEffect(() => {
    if (user && profile) {
      setFormData(prev => ({
        ...prev,
        nome: profile.nome || '',
        nome_completo_razao_social: profile.nome_completo_razao_social || '',
        email: user.email || '',
        cpf_cnpj: decryptData(profile.cpf_cnpj || ''),
        celular: decryptData(profile.celular || ''),
        instagram_url: profile.instagram_url || '',
        site_url: profile.site_url || '',
        youtube_url: profile.youtube_url || '',
        spotify_url: profile.spotify_url || '',
        deezer_url: profile.deezer_url || '',
        tiktok_url: profile.tiktok_url || '',
        genero_musical: profile.genero_musical || '',
        tema: profile.tema || 'dark',
        cep: decryptData(profile.cep || ''),
        logradouro: decryptData(profile.logradouro || ''),
        complemento: decryptData(profile.complemento || ''),
        bairro: decryptData(profile.bairro || ''),
        cidade: profile.cidade || '',
        estado: profile.estado || '',
        plano: profile.plano || 'Sem Plano'
      }));
      
      // Check mandatory fields
      const missing = !profile.nome_completo_razao_social || !profile.cpf_cnpj || !profile.celular || !profile.cep || !profile.logradouro || !profile.cidade || !profile.estado;
      setMandatoryMissing(missing);
    }
  }, [user, profile]);

  useEffect(() => {
    const computeQuota = async () => {
      if (!user || !profile) return;
      const plan = String(profile.plano || 'sem plano')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      const bonus = Number(profile.bonus_quota || 0);
      let base = 0;
      let start = null;
      let end = null;
      const now = new Date();
      setIsUnlimited(false);
      if (plan.includes('avulso')) {
        base = 1;
        const ps = profile.plan_started_at ? new Date(profile.plan_started_at) : now;
        start = ps.toISOString();
        end = null;
        setPeriodLabel('Avulso (desde a contratação)');
      } else if (plan.includes('vitalicio') || plan.includes('lifetime')) {
        setIsUnlimited(true);
        setPeriodLabel('Vitalício (ilimitado)');
        setRemainingUploads(null);
        return;
      } else if (plan.includes('mensal')) {
        base = profile.cargo === 'Compositor' ? 4 : 2;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        start = monthStart.toISOString();
        end = monthEnd.toISOString();
        setPeriodLabel('Mensal (mês calendário atual)');
      } else if (plan.includes('anual')) {
        base = 24;
        const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        start = yearStart.toISOString();
        end = yearEnd.toISOString();
        setPeriodLabel('Anual (ano calendário atual)');
      } else {
        base = 0;
        setPeriodLabel('Sem Plano');
      }

      const type = profile.cargo === 'Compositor' ? 'composition' : 'music';
      const rangeStart = start ? new Date(start).getTime() : null;
      const rangeEnd = end ? new Date(end).getTime() : null;
      const withinRange = (createdAtRaw) => {
        const d = new Date(String(createdAtRaw || ''));
        const t = d.getTime();
        if (!Number.isFinite(t)) return true;
        if (rangeStart != null && t < rangeStart) return false;
        if (rangeEnd != null && t > rangeEnd) return false;
        return true;
      };
      let used = 0;
      try {
        if (type === 'composition') {
          const rows = await apiClient.get('/composer/compositions');
          used = (rows || []).filter((r) => withinRange(r.created_at)).length;
        } else {
          const rows = await apiClient.get('/songs/mine');
          used = (rows || []).filter((r) => withinRange(r.created_at)).length;
        }
      } catch {
        used = 0;
      }
      const remaining = Math.max(0, base + bonus - used);
      setRemainingUploads(remaining);
    };
    computeQuota();
  }, [user, profile]);

  const normalizedUserType = profile?.cargo === 'Compositor' ? 'composer' : 'artist';
  const planKeyFromString = (plan) => {
    const s = String(plan || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (s.includes('mensal')) return 'mensal';
    if (s.includes('anual')) return 'anual';
    if (s.includes('vitalicio') || s.includes('lifetime')) return 'vitalicio';
    if (s.includes('avulso')) return 'avulso';
    return '';
  };

  const openPlanCheckout = (planKey) => {
    if (!MP_CHECKOUT_ENABLED) {
      const who = normalizedUserType === 'composer' ? 'Compositor' : 'Artista';
      const k0 = String(planKey || '').toLowerCase().trim();
      const msg = `Olá! Quero contratar o plano ${k0 || '(plano)'} (${who}).`;
      window.open(`https://wa.me/5519981083497?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    const k = String(planKey || '').toLowerCase().trim();
    if (!k) return;
    const name =
      normalizedUserType === 'artist'
        ? (k === 'mensal' ? 'Plano Profissional (Artista)' : k === 'anual' ? 'Plano Elite (Artista)' : `Plano ${k}`)
        : (k === 'mensal' ? 'Plano Destaque (Compositor)' : k === 'anual' ? 'Plano Pro (Compositor)' : `Plano ${k}`);
    const price = k === 'mensal' ? 'R$ 100,00' : k === 'anual' ? 'R$ 600,00' : '';

    setCustomCheckoutData({
      display_name: name,
      display_price: price,
      product_type: 'plan',
      plan_key: k,
      user_type: normalizedUserType
    });
    setSelectedPlanType('custom');
    setIsCheckoutOpen(true);
  };

  const openCreditsCheckout = (type) => {
    if (!MP_CHECKOUT_ENABLED) {
      const parsed = Number(buyHitQty);
      const quantity = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
      const msg = `Olá! Quero comprar créditos Hit da Semana (${quantity}).`;
      window.open(`https://wa.me/5519981083497?text=${encodeURIComponent(msg)}`, '_blank');
      return;
    }
    const t = String(type || '').toLowerCase().trim();
    if (t !== 'credits_hit') return;
    const rawQty = buyHitQty;
    const parsed = Number(rawQty);
    const quantity = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;

    setCustomCheckoutData({
      display_name: `Créditos Hit da Semana (${quantity})`,
      display_price: '',
      product_type: t,
      quantity,
      user_type: normalizedUserType
    });
    setSelectedPlanType('custom');
    setIsCheckoutOpen(true);
  };

  const cancelPlan = async () => {
    const currentKey = planKeyFromString(profile?.plano || formData.plano);
    if (currentKey !== 'mensal' && currentKey !== 'anual') return;
    const ok = window.confirm('Tem certeza que deseja cancelar seu plano?');
    if (!ok) return;
    setCancelLoading(true);
    try {
      await apiClient.post('/profile/cancel-plan', {});
      await refreshProfile();
      addToast('Plano cancelado com sucesso.', 'success');
    } catch (e) {
      addToast(e?.message || 'Erro ao cancelar plano.', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const clean = (v) => v != null && String(v).trim() !== '' ? String(v) : null;
      const dataToUpdate = {};
      const add = (k, v) => { const c = clean(v); if (c != null) dataToUpdate[k] = c; };
      add('nome', formData.nome);
      add('nome_completo_razao_social', formData.nome_completo_razao_social);
      add('cpf_cnpj', formData.cpf_cnpj);
      add('celular', formData.celular);
      add('instagram_url', formData.instagram_url);
      add('site_url', formData.site_url);
      add('youtube_url', formData.youtube_url);
      add('spotify_url', formData.spotify_url);
      add('deezer_url', formData.deezer_url);
      add('tiktok_url', formData.tiktok_url);
      add('genero_musical', formData.genero_musical);
      if (formData.tema) dataToUpdate.tema = formData.tema;
      add('cep', formData.cep);
      add('logradouro', formData.logradouro);
      add('complemento', formData.complemento);
      add('bairro', formData.bairro);
      add('cidade', formData.cidade);
      add('estado', formData.estado);

      // Criptografar dados sensíveis
      const encryptedData = encryptFormFields({ ...dataToUpdate }, [
        'cpf_cnpj', 
        'celular', 
        'cep', 
        'logradouro', 
        'complemento', 
        'bairro'
      ]);

      await apiClient.put('/profile', encryptedData);
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
      await apiClient.post('/auth/change-password', { new_password: formData.nova_senha });
      addToast('Senha atualizada com sucesso!', 'success');
      setFormData(prev => ({ ...prev, nova_senha: '', confirmar_senha: '' }));
    } catch (error) {
      console.error(error);
      addToast(error?.message || 'Erro ao atualizar senha', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateContract = () => {
    const artistName = formData.nome_completo_razao_social || '____________';
    const artistCPF = formData.cpf_cnpj || '____________';
    const artistAddress = `${formData.logradouro || ''}, ${formData.bairro || ''}, ${formData.cidade || ''} - ${formData.estado || ''}, CEP ${formData.cep || ''}`.replace(/(^, | ,)/g, '').trim();
    const html = buildDistributionContractHTML({
      artistName,
      artistCPF,
      artistAddress,
      beatwapCNPJ: 'CNPJ a definir',
      beatwapAddress: 'Endereço a definir',
      vigenciaAnos: 3,
      artistaPercent: 80,
      beatwapPercent: 20,
    });
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
    }
  };

  const tabs = [
    { id: 'detalhes', label: 'Detalhes', icon: User },
    { id: 'endereco', label: 'Endereço', icon: MapPin },
    ...(profile?.cargo !== 'Vendedor' ? [{ id: 'plano', label: 'Plano', icon: CreditCard }] : []),
    { id: 'contrato', label: 'Contrato', icon: FileText },
    { id: 'senha', label: 'Minha Senha', icon: Lock },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">Minha Conta</h1>
          {mandatoryMissing && (
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-lg text-sm">
              <AlertTriangle size={16} />
              <span>Complete seu cadastro para ter acesso total.</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 pb-2 justify-center sm:justify-start">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap text-sm ${
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
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatedInput 
                      label="Nome Artístico / Apelido" 
                      value={formData.nome} 
                      onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                      placeholder="Como você quer ser conhecido na plataforma"
                    />
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
                  <AnimatedInput 
                    label="Gênero Musical" 
                    value={formData.genero_musical} 
                    onChange={(e) => setFormData({...formData, genero_musical: e.target.value})} 
                    placeholder="Ex.: Sertanejo, Funk, Rap..."
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
                  <div className="mt-4 space-y-1">
                    <p className="text-gray-300">Período: {periodLabel}</p>
                    <p className="text-white font-bold">Envios restantes: {isUnlimited ? 'Ilimitado' : (remainingUploads === null ? '...' : remainingUploads)}</p>
                  </div>
                  {!isUnlimited && remainingUploads !== null && remainingUploads <= 0 ? (
                    <div className="mt-6 space-y-4">
                      <p className="text-red-400">Você atingiu o limite de envios do seu plano.</p>
                      <div className="flex justify-center gap-4">
                        <AnimatedButton onClick={() => window.open('https://wa.me/5519981083497?text=Quero%20contratar%20mais%20envios', '_blank')} variant="secondary">
                          Falar no WhatsApp
                        </AnimatedButton>
                        <AnimatedButton onClick={() => (MP_CHECKOUT_ENABLED ? window.open('/#planos', '_self') : window.open('https://wa.me/5519981083497?text=' + encodeURIComponent('Olá! Quero contratar um plano na BeatWap.'), '_blank'))}>
                          {MP_CHECKOUT_ENABLED ? 'Contratar mais plano' : 'Falar no WhatsApp'}
                        </AnimatedButton>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 max-w-md mx-auto">
                      Aproveite todos os recursos do seu plano atual. Você pode fazer o upgrade a qualquer momento para liberar mais funcionalidades.
                    </p>
                  )}
                  <div className="flex flex-col md:flex-row justify-center gap-3 mt-8">
                    {MP_CHECKOUT_ENABLED ? (
                      <>
                        <AnimatedButton
                          className="justify-center"
                          onClick={() => openPlanCheckout('mensal')}
                        >
                          Contratar Mensal
                        </AnimatedButton>
                        <AnimatedButton
                          variant="outline"
                          className="justify-center"
                          onClick={() => openPlanCheckout('anual')}
                        >
                          Contratar Anual (12x)
                        </AnimatedButton>
                        {(planKeyFromString(profile?.plano || formData.plano) === 'mensal' || planKeyFromString(profile?.plano || formData.plano) === 'anual') ? (
                          <AnimatedButton
                            variant="secondary"
                            className="justify-center"
                            isLoading={cancelLoading}
                            onClick={cancelPlan}
                          >
                            Cancelar plano
                          </AnimatedButton>
                        ) : null}
                      </>
                    ) : (
                      <AnimatedButton
                        onClick={() => window.open('https://wa.me/5519981083497?text=' + encodeURIComponent('Olá! Quero contratar um plano na BeatWap.'), '_blank')}
                        variant="secondary"
                        className="justify-center"
                      >
                        Falar no WhatsApp
                      </AnimatedButton>
                    )}
                  </div>

                  {MP_CHECKOUT_ENABLED ? (
                    <div className="max-w-2xl mx-auto pt-6">
                      <div className="p-5 rounded-2xl border border-white/10 bg-white/5 text-left space-y-4">
                        <div className="text-lg font-bold text-white">Comprar créditos</div>

                        <div className="space-y-3 p-4 rounded-xl border border-white/10 bg-black/20">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-white font-bold">Créditos de Hit da Semana</div>
                              <div className="text-sm text-gray-300">
                                Saldo atual: <span className="text-beatwap-gold font-extrabold">{Number(profile?.creditos_hit_semana || 0)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                            <div className="md:col-span-2">
                              <AnimatedInput
                                label="Qtd. créditos"
                                value={String(buyHitQty)}
                                onChange={(e) => setBuyHitQty(e.target.value)}
                                type="number"
                                placeholder="1"
                              />
                            </div>
                            <AnimatedButton className="justify-center" onClick={() => openCreditsCheckout('credits_hit')}>
                              Comprar
                            </AnimatedButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
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
                    <AnimatedInput label="Nova Senha" type="password" value={formData.nova_senha} onChange={(e) => setFormData({...formData, nova_senha: e.target.value})} />
                    <AnimatedInput label="Confirmar Nova Senha" type="password" value={formData.confirmar_senha} onChange={(e) => setFormData({...formData, confirmar_senha: e.target.value})} />
                    <div className="pt-4 flex flex-col sm:flex-row justify-end">
                      <AnimatedButton onClick={handlePasswordChange} isLoading={loading} icon={Lock} className="w-full sm:w-auto justify-center">Atualizar Senha</AnimatedButton>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>

      {MP_CHECKOUT_ENABLED ? (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          planType={selectedPlanType}
          customData={customCheckoutData}
        />
      ) : null}
    </DashboardLayout>
  );
};

export const DashboardPublicProfile = () => {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventForm, setEventForm] = useState({
    event_date: '',
    has_time: false,
    location: '',
    ticket_price: '',
    purchase_contact: '',
    flyerFile: null,
    flyerPreviewUrl: ''
  });

  const isArtist = String(profile?.cargo || '').toLowerCase().trim() === 'artista';
  const planRaw = String(profile?.plano || '');
  const planNorm = planRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const planAllowsPublicProfile = planNorm.includes('mensal') || planNorm.includes('anual') || planNorm.includes('vitalicio') || planNorm.includes('lifetime');
  const planOverride = !!profile?.access_control?.plan_override;
  const permPublicProfile = profile?.access_control?.public_profile !== false;

  const flyerInputRef = useRef(null);
  const [flyerDragOver, setFlyerDragOver] = useState(false);
  const [flyerImageSrc, setFlyerImageSrc] = useState(null);
  const [flyerOriginalFile, setFlyerOriginalFile] = useState(null);
  const [flyerCrop, setFlyerCrop] = useState({ x: 0, y: 0 });
  const [flyerZoom, setFlyerZoom] = useState(1);
  const [flyerCroppedArea, setFlyerCroppedArea] = useState(null);

  const loadEvents = useCallback(async () => {
    if (!isArtist) return;
    try {
      setEventsLoading(true);
      const data = await apiClient.get('/my/events', { cache: false });
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      if (Number(e?.status) === 404 && profile?.id) {
        try {
          const fallback = await apiClient.get(`/profiles/${profile.id}/events`, { cache: false });
          setEvents(Array.isArray(fallback) ? fallback : []);
          return;
        } catch (err) {
          console.error(err);
        }
      }
      console.error(e);
      addToast('Falha ao carregar seus shows', 'error');
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [addToast, isArtist, profile?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  if (!((planAllowsPublicProfile || planOverride) && permPublicProfile) && profile?.cargo !== 'Vendedor') {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="space-y-4 p-6">
            <div className="text-xl font-bold text-white">Ative seu Perfil Público</div>
            <div className="text-sm text-gray-300">
              Recurso disponível nos planos Mensal e Anual. Faça upgrade para publicar sua página e aparecer na Home.
            </div>
            <div className="flex gap-2">
              <AnimatedButton onClick={() => navigate('/dashboard/profile')} className="justify-center">
                Ir para Plano
              </AnimatedButton>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleSavePublicProfile = async ({ name, bio, genre, socials, blob, phone, cep, logradouro, complemento, bairro, cidade, estado }) => {
    try {
      let avatar_url = null;
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const dataUrl = `data:image/png;base64,${base64}`;
        const res = await apiClient.post('/profile/avatar', { dataUrl });
        avatar_url = res?.avatar_url || null;
      }

      const updateData = {};
      if (name) updateData.nome = name;
      if (genre) updateData.genero_musical = genre;
      if (bio) updateData.bio = bio;
      if (socials) {
        if (socials.youtube) updateData.youtube_url = socials.youtube;
        if (socials.spotify) updateData.spotify_url = socials.spotify;
        if (socials.deezer) updateData.deezer_url = socials.deezer;
        if (socials.tiktok) updateData.tiktok_url = socials.tiktok;
        if (socials.instagram) updateData.instagram_url = socials.instagram;
        if (socials.site) updateData.site_url = socials.site;
      }
      if (cidade) updateData.cidade = cidade;
      if (estado) updateData.estado = estado;
      if (avatar_url) updateData.avatar_url = avatar_url;

      const sensitive = {};
      if (phone) sensitive.celular = phone;
      if (cep) sensitive.cep = cep;
      if (logradouro) sensitive.logradouro = logradouro;
      if (complemento) sensitive.complemento = complemento;
      if (bairro) sensitive.bairro = bairro;
      const encrypted = Object.keys(sensitive).length
        ? encryptFormFields(sensitive, ['celular','cep','logradouro','complemento','bairro'])
        : {};
      await apiClient.put('/profile', { ...updateData, ...encrypted });

      await refreshProfile();
      addToast('Perfil público atualizado', 'success');
      setIsProfileEditOpen(false);
    } catch (e) {
      console.error(e);
      addToast('Falha ao atualizar perfil', 'error');
    }
  };

  const openEventModal = () => {
    setEventForm({
      event_date: '',
      has_time: false,
      location: '',
      ticket_price: '',
      purchase_contact: '',
      description: '',
      flyerFile: null,
      flyerPreviewUrl: ''
    });
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    if (eventForm.flyerPreviewUrl) {
      try { URL.revokeObjectURL(eventForm.flyerPreviewUrl); } catch { void 0; }
    }
    setIsEventModalOpen(false);
  };

  const setFlyerFile = (file) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      addToast('Envie uma imagem (JPG/PNG/WebP)', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFlyerImageSrc(String(reader.result || ''));
      setFlyerOriginalFile(file);
      setFlyerZoom(1);
      setFlyerCrop({ x: 0, y: 0 });
      setFlyerCroppedArea(null);
    };
    reader.readAsDataURL(file);
  };

  const handleEventFlyerChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    if (file) setFlyerFile(file);
  };

  const handleCreateEvent = async () => {
    try {
      if (!eventForm.event_date) {
        addToast('Informe a data do show', 'warning');
        return;
      }
      if (!eventForm.location.trim()) {
        addToast('Informe o local do show', 'warning');
        return;
      }
      if (!eventForm.flyerFile) {
        addToast('Envie o flyer do show', 'warning');
        return;
      }

      setEventSaving(true);

      const fileToDataUrl = (file) => new Promise((resolve, reject) => {
        try {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        } catch (e) {
          reject(e);
        }
      });
      const dataUrl = await fileToDataUrl(eventForm.flyerFile);
      const safeName = `${Date.now()}_${(eventForm.flyerFile.name || 'flyer').replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
      const uploadResp = await apiClient.post('/upload/base64', { fileName: safeName, dataUrl }, { timeoutMs: 60000, perAttemptTimeoutMs: 45000 });
      const flyerUrl = uploadResp?.url || null;
      if (!flyerUrl) throw new Error('Falha no upload do flyer');

      const eventDatePayload = eventForm.has_time ? eventForm.event_date : `${eventForm.event_date}T00:00`;

      await apiClient.post('/events', {
        event_date: eventDatePayload,
        location: eventForm.location,
        flyer_url: flyerUrl,
        ticket_price: eventForm.ticket_price,
        purchase_contact: eventForm.purchase_contact,
        description: eventForm.description
      }, { timeoutMs: 60000, perAttemptTimeoutMs: 45000 });

      addToast('Show publicado no seu perfil público!', 'success');
      closeEventModal();
      await loadEvents();
    } catch (e) {
      console.error(e);
      addToast(e?.message || 'Falha ao publicar show', 'error');
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await apiClient.del(`/events/${eventId}`);
      setEvents((prev) => prev.filter((x) => x.id !== eventId));
      addToast('Show removido', 'success');
    } catch (e) {
      console.error(e);
      addToast('Falha ao remover show', 'error');
    }
  };

  const formatTicketPrice = (cents) => {
    if (cents == null || !Number.isFinite(Number(cents))) return null;
    const n = Number(cents) / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatEventDate = (iso) => {
    const d = new Date(String(iso || ''));
    if (Number.isNaN(d.getTime())) return '';
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) return d.toLocaleDateString('pt-BR');
    return d.toLocaleString('pt-BR');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="font-bold text-2xl text-white">Perfil Público</div>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie as informações que aparecem na sua página de perfil público e na Home.
          </p>
        </div>

        <Card className="space-y-6 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white/5 border border-white/10 rounded-xl">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-beatwap-gold/20 bg-gray-800 flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <User size={48} />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <div className="font-bold text-white text-xl">{profile?.nome || profile?.nome_completo_razao_social || 'Sem nome artístico'}</div>
                <div className="text-beatwap-gold text-sm font-medium">{profile?.genero_musical || 'Gênero não definido'}</div>
              </div>
              <p className="text-gray-400 text-sm line-clamp-2 max-w-lg">
                {profile?.bio || 'Sem biografia definida. Clique em editar para adicionar.'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                {profile?.youtube_url && <div className="px-2 py-1 bg-red-500/10 text-red-500 text-xs rounded border border-red-500/20">YouTube</div>}
                {profile?.spotify_url && <div className="px-2 py-1 bg-green-500/10 text-green-500 text-xs rounded border border-green-500/20">Spotify</div>}
                {profile?.instagram_url && <div className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs rounded border border-purple-500/20">Instagram</div>}
              </div>
            </div>
            <AnimatedButton onClick={() => setIsProfileEditOpen(true)} icon={User} className="w-full sm:w-auto justify-center">
              Editar Perfil Completo
            </AnimatedButton>
          </div>

          {isArtist && (
            <div className="pt-6 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <div className="font-bold text-white text-lg">Shows no Perfil Público</div>
                  <div className="text-xs text-gray-400">Depois que a data do evento passar, ele some automaticamente.</div>
                </div>
                <AnimatedButton onClick={openEventModal} icon={Plus} className="w-full sm:w-auto justify-center">
                  Adicionar Show
                </AnimatedButton>
              </div>

              <div className="space-y-3">
                {eventsLoading ? (
                  <div className="text-sm text-gray-400">Carregando shows...</div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhum show publicado ainda.</div>
                ) : (
                  events.map((ev) => (
                    <div key={ev.id} className="flex flex-col md:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-full md:w-40 h-32 rounded-lg overflow-hidden bg-black/30 border border-white/10">
                        <img src={ev.flyer_url} alt="Flyer" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="text-sm font-bold text-white">
                          {formatEventDate(ev.event_date)}
                        </div>
                        <div className="text-sm text-gray-300">{ev.location}</div>
                        {formatTicketPrice(ev.ticket_price_cents) && (
                          <div className="text-xs text-gray-400">Ingresso: {formatTicketPrice(ev.ticket_price_cents)}</div>
                        )}
                        {ev.purchase_contact && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-400 break-words">Contato/Link: {ev.purchase_contact}</div>
                            {(() => {
                              const v = String(ev.purchase_contact || '').trim();
                              const isUrl = /^https?:\/\//i.test(v);
                              const digits = v.replace(/\D/g, '');
                              const isPhone = !isUrl && digits.length >= 10;
                              const waHref = isPhone ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : null;
                              const linkHref = isUrl ? v : null;
                              return waHref ? (
                                <a
                                  href={waHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-colors w-full sm:w-auto"
                                >
                                  WhatsApp
                                </a>
                              ) : linkHref ? (
                                <a
                                  href={linkHref}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors w-full sm:w-auto"
                                >
                                  Abrir link
                                </a>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex md:flex-col gap-2 md:items-end">
                        <AnimatedButton
                          variant="secondary"
                          onClick={() => handleDeleteEvent(ev.id)}
                          icon={Trash2}
                          className="w-full md:w-auto justify-center"
                        >
                          Apagar
                        </AnimatedButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/10">
            <GalleryManager userId={profile?.id} />
          </div>
        </Card>

        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          currentAvatar={profile?.avatar_url}
          currentName={profile?.nome || profile?.nome_completo_razao_social}
          currentBio={profile?.bio}
          currentGenre={profile?.genero_musical}
          currentSocials={{
            youtube: profile?.youtube_url,
            spotify: profile?.spotify_url,
            deezer: profile?.deezer_url,
            tiktok: profile?.tiktok_url,
            instagram: profile?.instagram_url,
            site: profile?.site_url
          }}
          currentPhone={decryptData(profile?.celular || '')}
          currentCep={decryptData(profile?.cep || '')}
          currentLogradouro={decryptData(profile?.logradouro || '')}
          currentComplemento={decryptData(profile?.complemento || '')}
          currentBairro={decryptData(profile?.bairro || '')}
          currentCidade={profile?.cidade || ''}
          currentEstado={profile?.estado || ''}
          onSave={handleSavePublicProfile}
          uploading={false}
        />

        {isEventModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={closeEventModal} />
            <div className="relative w-full max-w-xl bg-[#121212] border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-white text-lg">Adicionar Show</div>
                <button onClick={closeEventModal} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10">
                  <X size={18} className="text-gray-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={eventForm.has_time}
                    onChange={(e) => {
                      const checked = !!e.target.checked;
                      setEventForm((prev) => {
                        const current = String(prev.event_date || '');
                        if (checked) {
                          const nextValue = /^\d{4}-\d{2}-\d{2}$/.test(current) ? `${current}T00:00` : current;
                          return { ...prev, has_time: true, event_date: nextValue };
                        }
                        const nextValue = current.includes('T') ? current.split('T')[0] : current;
                        return { ...prev, has_time: false, event_date: nextValue };
                      });
                    }}
                  />
                  Incluir horário do evento
                </label>
                <AnimatedInput
                  label="Data do Evento"
                  type={eventForm.has_time ? 'datetime-local' : 'date'}
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                />
                <AnimatedInput
                  label="Local do Show"
                  value={eventForm.location}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Ex: Espaço X - São Paulo/SP"
                />
                <AnimatedInput
                  label="Valor do Ingresso"
                  value={eventForm.ticket_price}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, ticket_price: e.target.value }))}
                  placeholder="Ex: R$ 50,00"
                />
                <AnimatedInput
                  label="Contato ou Link para Comprar"
                  value={eventForm.purchase_contact}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, purchase_contact: e.target.value }))}
                  placeholder="Ex: https://... ou WhatsApp (DDD+numero)"
                />
                <div className="text-xs text-gray-500">
                  Se você digitar apenas o número, ele vira um link do WhatsApp automaticamente.
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição do Show (opcional)</div>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Detalhes adicionais, atrações, observações..."
                    className="w-full min-h-[90px] rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-beatwap-gold"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Flyer do Show</div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setFlyerDragOver(true); }}
                    onDragLeave={() => setFlyerDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setFlyerDragOver(false);
                      const file = e.dataTransfer?.files?.[0] || null;
                      if (file) setFlyerFile(file);
                    }}
                    onClick={() => flyerInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                      flyerDragOver ? 'border-beatwap-gold bg-beatwap-gold/10' : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {eventForm.flyerPreviewUrl ? (
                      <div className="w-full h-56 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                        <img src={eventForm.flyerPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        Arraste e solte o flyer aqui, ou clique para selecionar
                      </div>
                    )}
                  </div>
                  <input
                    ref={flyerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEventFlyerChange}
                    className="hidden"
                  />
                </div>

                <div className="sticky bottom-0 bg-[#121212] pt-2">
                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  <AnimatedButton variant="secondary" onClick={closeEventModal} className="w-full sm:w-auto justify-center">
                    Cancelar
                  </AnimatedButton>
                  <AnimatedButton onClick={handleCreateEvent} isLoading={eventSaving} icon={Plus} className="w-full sm:w-auto justify-center">
                    Publicar
                  </AnimatedButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {flyerImageSrc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
            <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <div className="font-bold text-white text-lg">Ajustar flyer (1080 × 1080)</div>
                <button
                  onClick={() => { setFlyerImageSrc(null); setFlyerOriginalFile(null); setFlyerCroppedArea(null); }}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  <X size={18} className="text-gray-300" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div
                  className="relative w-full max-w-sm aspect-square bg-transparent rounded-xl overflow-hidden pointer-events-auto mx-auto"
                  style={{ touchAction: 'none' }}
                >
                  <Cropper
                    image={flyerImageSrc}
                    crop={flyerCrop}
                    zoom={flyerZoom}
                    aspect={1}
                    onCropChange={setFlyerCrop}
                    onZoomChange={setFlyerZoom}
                    onCropComplete={(_, pixels) => setFlyerCroppedArea(pixels)}
                    cropShape="rect"
                    showGrid={true}
                    objectFit="cover"
                    restrictPosition={false}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={flyerZoom}
                    onChange={(e) => setFlyerZoom(parseFloat(e.target.value))}
                    className="w-full accent-beatwap-gold h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setFlyerImageSrc(null); setFlyerOriginalFile(null); setFlyerCroppedArea(null); }}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      if (!flyerImageSrc || !flyerCroppedArea || !flyerOriginalFile) return;
                      try {
                        const blob = await getCroppedImg(flyerImageSrc, flyerCroppedArea, 1080, 1080);
                        const file = new File([blob], (flyerOriginalFile.name || 'flyer_1080.jpg'), { type: blob.type || flyerOriginalFile.type });
                        if (eventForm.flyerPreviewUrl) {
                          try { URL.revokeObjectURL(eventForm.flyerPreviewUrl); } catch { void 0; }
                        }
                        const preview = URL.createObjectURL(blob);
                        setEventForm((prev) => ({ ...prev, flyerFile: file, flyerPreviewUrl: preview }));
                        setFlyerImageSrc(null);
                        setFlyerOriginalFile(null);
                        setFlyerCroppedArea(null);
                      } catch (e) {
                        addToast('Erro ao recortar a imagem.', 'error');
                      }
                    }}
                    className="px-6 py-3 rounded-xl font-bold text-sm bg-beatwap-gold text-beatwap-black"
                  >
                    Confirmar (1080 × 1080)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
