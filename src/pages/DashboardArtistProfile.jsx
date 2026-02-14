import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, CreditCard, FileText, Lock, Save, Download, Moon, Sun, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ProfileEditModal } from '../components/ui/ProfileEditModal';
import { GalleryManager } from '../components/profile/GalleryManager';
import { buildDistributionContractHTML } from '../utils/contractTemplate';
import { encryptFormFields, decryptData } from '../utils/security';

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
    plano: 'Gratuito',
    // Senha
    nova_senha: '',
    confirmar_senha: ''
  });

  const [mandatoryMissing, setMandatoryMissing] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [remainingUploads, setRemainingUploads] = useState(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('');

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
        plano: profile.plano || 'Gratuito'
      }));
      
      // Check mandatory fields
      const missing = !profile.nome_completo_razao_social || !profile.cpf_cnpj || !profile.celular || !profile.cep || !profile.logradouro || !profile.cidade || !profile.estado;
      setMandatoryMissing(missing);
    }
  }, [user, profile]);

  useEffect(() => {
    const computeQuota = async () => {
      if (!user || !profile) return;
      const plan = (profile.plano || 'Gratuito').toLowerCase();
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
      } else if (plan.includes('vitalicio')) {
        setIsUnlimited(true);
        setPeriodLabel('Vitalício (ilimitado)');
        setRemainingUploads(null);
        return;
      } else if (plan.includes('mensal')) {
        base = 2;
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
        setPeriodLabel('Gratuito');
      }

      let q;
      if (profile.cargo === 'Compositor') {
        q = supabase
          .from('compositions')
          .select('id', { count: 'exact', head: true })
          .eq('composer_id', user.id);
      } else {
        q = supabase
          .from('musics')
          .select('id', { count: 'exact', head: true })
          .eq('artista_id', user.id);
      }

      if (start) q = q.gte('created_at', start);
      if (end) q = q.lte('created_at', end);
      const { count } = await q;
      const used = Number(count || 0);
      const remaining = Math.max(0, base + bonus - used);
      setRemainingUploads(remaining);
    };
    computeQuota();
  }, [user, profile]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const dataToUpdate = {
        nome: formData.nome,
        nome_completo_razao_social: formData.nome_completo_razao_social,
        cpf_cnpj: formData.cpf_cnpj,
        celular: formData.celular,
        instagram_url: formData.instagram_url,
        site_url: formData.site_url,
        youtube_url: formData.youtube_url,
        spotify_url: formData.spotify_url,
        deezer_url: formData.deezer_url,
        tiktok_url: formData.tiktok_url,
        genero_musical: formData.genero_musical,
        tema: formData.tema,
        cep: formData.cep,
        logradouro: formData.logradouro,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado
      };

      // Criptografar dados sensíveis
      const encryptedData = encryptFormFields(dataToUpdate, [
        'cpf_cnpj', 
        'celular', 
        'cep', 
        'logradouro', 
        'complemento', 
        'bairro'
      ]);

      const { error } = await supabase
        .from('profiles')
        .update(encryptedData)
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

  const handleAvatarSave = async ({ blob }) => {
    if (!blob || !user) return;
    try {
      setUploadingAvatar(true);
      const fileName = `${user.id}/${Date.now()}_avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = await supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;
      await refreshProfile();
      addToast('Foto de perfil atualizada!', 'success');
      setAvatarModalOpen(false);
    } catch (error) {
      console.error(error);
      addToast('Erro ao atualizar foto de perfil.', 'error');
    } finally {
      setUploadingAvatar(false);
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
    { id: 'plano', label: 'Plano', icon: CreditCard },
    { id: 'contrato', label: 'Contrato', icon: FileText },
    { id: 'senha', label: 'Minha Senha', icon: Lock },
    { id: 'artista', label: 'Meu Perfil Público', icon: User },
  ];

  const handleSavePublicProfile = async ({ name, bio, genre, socials, blob }) => {
    try {
      let avatar_url = null;
      if (blob) {
        const fileName = `${user.id}/${Date.now()}_avatar.png`;
        const { data: uploadRes, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, blob, { contentType: 'image/png', upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(uploadRes.path);
        avatar_url = publicUrl.publicUrl;
      }
      
      const updateData = {
        nome: name,
        bio: bio,
        genero_musical: genre,
        youtube_url: socials?.youtube || null,
        spotify_url: socials?.spotify || null,
        deezer_url: socials?.deezer || null,
        tiktok_url: socials?.tiktok || null,
        instagram_url: socials?.instagram || null,
        site_url: socials?.site || null,
      };

      if (avatar_url) updateData.avatar_url = avatar_url;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
      if (error) throw error;
      
      await refreshProfile();
      addToast('Perfil público atualizado', 'success');
      setAvatarModalOpen(false); // Reuse this state or add new one? I'll use a new state 'isProfileEditOpen'
      setIsProfileEditOpen(false);
    } catch (e) {
      console.error(e);
      addToast('Falha ao atualizar perfil', 'error');
    }
  };

  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

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
                    <AnimatedButton onClick={() => setIsProfileEditOpen(true)} variant="secondary">
                      Modificar Foto
                    </AnimatedButton>
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
                        <AnimatedButton onClick={() => window.open('/#planos', '_self')}>
                          Contratar mais plano
                        </AnimatedButton>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 max-w-md mx-auto">
                      Aproveite todos os recursos do seu plano atual. Você pode fazer o upgrade a qualquer momento para liberar mais funcionalidades.
                    </p>
                  )}
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
                    <AnimatedInput label="Nova Senha" type="password" value={formData.nova_senha} onChange={(e) => setFormData({...formData, nova_senha: e.target.value})} />
                    <AnimatedInput label="Confirmar Nova Senha" type="password" value={formData.confirmar_senha} onChange={(e) => setFormData({...formData, confirmar_senha: e.target.value})} />
                    <div className="pt-4 flex flex-col sm:flex-row justify-end">
                      <AnimatedButton onClick={handlePasswordChange} isLoading={loading} icon={Lock} className="w-full sm:w-auto justify-center">Atualizar Senha</AnimatedButton>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'artista' && (
                <Card className="space-y-6">
                    <div>
                    <div className="font-bold text-xl text-white">Meu Perfil Público</div>
                    <p className="text-gray-400 text-sm mt-1">
                        Gerencie as informações que aparecem na sua página de perfil público e na Home.
                        Adicione fotos, links e biografia para atrair mais visibilidade.
                    </p>
                    </div>

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
                    <AnimatedButton onClick={() => setIsProfileEditOpen(true)} icon={User}>
                        Editar Perfil Completo
                    </AnimatedButton>
                    </div>
                    
                    <div className="pt-6 border-t border-white/10">
                      <GalleryManager userId={profile?.id} />
                    </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
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
          onSave={handleSavePublicProfile}
          uploading={false}
        />
      </div>
    </DashboardLayout>
  );
};
