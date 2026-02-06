import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AdminLayout } from '../components/AdminLayout';
import { useToast } from '../context/ToastContext';
import { Mail, User, Settings, Shield, Search, Save, Check, Loader } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const AdminSettings = () => {
  const { addToast } = useToast();
  
  // Invite Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Artista',
    p_chat: true,
    p_musics: true,
    p_compositions: true,
    p_work: true,
    p_marketing: true,
    // Admin permissions
    p_admin_artists: true,
    p_admin_musics: true,
    p_admin_compositions: true,
    p_admin_sponsors: true,
    p_admin_settings: true,
    // Seller permissions
    p_seller_artists: true,
    p_seller_calendar: true,
    p_seller_leads: true,
    p_seller_finance: true,
    p_seller_proposals: true,
    p_seller_communications: true
  });
  const [inviteLink, setInviteLink] = useState('');
  
  // Artists Management State
  const [artists, setArtists] = useState([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Artista');
  const [savingId, setSavingId] = useState(null);

  const validEmail = String(form.email).trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoadingArtists(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('cargo', ['Artista', 'Produtor', 'Compositor', 'Vendedor']) 
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Normalize permissions
      const formatted = (data || []).map(artist => ({
        ...artist,
        access_control: artist.access_control || {
          chat: true,
          musics: true,
          work: true,
          marketing: true,
          admin_artists: true,
          admin_musics: true,
          admin_compositions: true,
          admin_sponsors: true,
          admin_settings: true,
          seller_artists: true,
          seller_calendar: true,
          seller_leads: true,
          seller_finance: true,
          seller_proposals: true,
          seller_communications: true
        }
      }));
      
      setArtists(formatted);
    } catch (error) {
      console.error('Error fetching artists:', error);
      addToast('Erro ao carregar artistas', 'error');
    } finally {
      setLoadingArtists(false);
    }
  };

  const checkSchema = async () => {
    const { error } = await supabase.from('compositions').select('id').limit(1);
    if (error && error.code === '42P01') { // undefined_table
      addToast('ATENÇÃO: Tabela "compositions" não existe. Execute o script SQL!', 'error');
    }
  };

  useEffect(() => {
    checkSchema();
  }, []);

  const migrateRoles = async () => {
    if (!confirm('Isso irá renomear todos os perfis "Vendedor" para "Compositor". Continuar?')) return;
    
    try {
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('cargo', 'Vendedor');
        
      if (fetchError) throw fetchError;
      
      if (!profiles || profiles.length === 0) {
        addToast('Nenhum perfil "Vendedor" encontrado.', 'info');
        return;
      }

      // Update strictly via ID to avoid RLS issues if possible, but standard update should work
      // Note: updating in a loop or batch.
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cargo: 'Compositor' })
        .eq('cargo', 'Vendedor');

      if (updateError) throw updateError;
      
      addToast(`Perfis migrados com sucesso!`, 'success');
      fetchArtists();
    } catch (error) {
      console.error('Migration error:', error);
      addToast('Erro ao migrar: ' + error.message, 'error');
    }
  };

  // Auto-update link when form changes
  useEffect(() => {
    if (form.name.trim() && validEmail) {
      const params = new URLSearchParams();
      params.set('name', form.name.trim());
      params.set('email', form.email.trim());
      params.set('role', form.role);
      params.set('p_chat', form.p_chat ? '1' : '0');
      
      if (form.role === 'Produtor') {
        params.set('p_admin_artists', form.p_admin_artists ? '1' : '0');
        params.set('p_admin_musics', form.p_admin_musics ? '1' : '0');
        params.set('p_admin_compositions', form.p_admin_compositions ? '1' : '0');
        params.set('p_admin_sponsors', form.p_admin_sponsors ? '1' : '0');
        params.set('p_admin_settings', form.p_admin_settings ? '1' : '0');
      } else if (form.role === 'Vendedor') {
        params.set('p_seller_artists', form.p_seller_artists ? '1' : '0');
        params.set('p_seller_calendar', form.p_seller_calendar ? '1' : '0');
        params.set('p_seller_leads', form.p_seller_leads ? '1' : '0');
        params.set('p_seller_finance', form.p_seller_finance ? '1' : '0');
        params.set('p_seller_proposals', form.p_seller_proposals ? '1' : '0');
        params.set('p_seller_communications', form.p_seller_communications ? '1' : '0');
      } else if (form.role === 'Compositor') {
        params.set('p_compositions', form.p_compositions ? '1' : '0');
        params.set('p_marketing', form.p_marketing ? '1' : '0');
      } else {
        params.set('p_musics', form.p_musics ? '1' : '0');
        params.set('p_work', form.p_work ? '1' : '0');
        params.set('p_marketing', form.p_marketing ? '1' : '0');
      }
      
      const url = `${window.location.origin}/register?${params.toString()}`;
      setInviteLink(url);
    } else {
      setInviteLink('');
    }
  }, [form, validEmail]);

  const copyLink = () => {
    if (!inviteLink) {
      addToast('Preencha nome e email para gerar o link.', 'error');
      return;
    }
    navigator.clipboard.writeText(inviteLink).then(() => {
      addToast('Link de convite copiado.', 'success');
    }).catch(() => {
      addToast('Não foi possível copiar o link.', 'error');
    });
  };

  const sendEmail = () => {
    if (!inviteLink) {
      addToast('Gere o link primeiro.', 'error');
      return;
    }
    const subject = encodeURIComponent('Convite BeatWap');
    const body = encodeURIComponent(`Olá,\n\nUse este link para criar sua conta:\n${inviteLink}\n\nSelecione seu cargo e conclua o cadastro.`);
    window.location.href = `mailto:${form.email}?subject=${subject}&body=${body}`;
  };

  const handlePermissionChange = (artistId, key, value) => {
    setArtists(artists.map(a => {
      if (a.id === artistId) {
        return {
          ...a,
          access_control: {
            ...a.access_control,
            [key]: value
          }
        };
      }
      return a;
    }));
  };

  const savePermissions = async (artist) => {
    setSavingId(artist.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ access_control: artist.access_control })
        .eq('id', artist.id);

      if (error) throw error;
      addToast('Permissões atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving permissions:', error);
      addToast('Erro ao salvar permissões', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filteredArtists = artists.filter(a => 
    a.cargo === activeTab &&
    ((a.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
     (a.nome_completo_razao_social || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
     (a.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Card className="space-y-6">
          <div className="flex items-center gap-2 text-xl font-bold">
            <Settings size={20} className="text-beatwap-gold" />
            Configurações e Convites
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="space-y-4 bg-white/5 border-white/10">
              <div className="text-lg font-bold flex items-center gap-2">
                <User size={18} /> Criar novo convite
              </div>
              <AnimatedInput
                label="Nome"
                icon={User}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: MC Future"
              />
              <AnimatedInput
                label="Email"
                type="email"
                icon={Mail}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@email.com"
              />
              <div className="space-y-2">
                <div className="text-sm text-gray-300">Cargo</div>
                <select
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-beatwap-gold outline-none"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="Artista" className="bg-[#121212]">Artista</option>
                  <option value="Compositor" className="bg-[#121212]">Compositor</option>
                  <option value="Vendedor" className="bg-[#121212]">Vendedor</option>
                  <option value="Produtor" className="bg-[#121212]">Produtor</option>
                </select>
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="text-sm text-gray-300 font-bold">Permissões Iniciais</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.p_chat}
                      onChange={(e) => setForm({ ...form, p_chat: e.target.checked })}
                      className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                    />
                    <span className="text-sm">Chat</span>
                  </label>

                  {form.role === 'Produtor' ? (
                    // Admin Permissions
                    [
                      { key: 'p_admin_artists', label: 'Artistas' },
                      { key: 'p_admin_musics', label: 'Músicas' },
                      { key: 'p_admin_compositions', label: 'Composições' },
                      { key: 'p_admin_sponsors', label: 'Patrocinadores' },
                      { key: 'p_admin_settings', label: 'Configurações' }
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={form[perm.key]}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))
                  ) : form.role === 'Vendedor' ? (
                    // Seller Permissions
                    [
                      { key: 'p_seller_artists', label: 'Artistas' },
                      { key: 'p_seller_calendar', label: 'Agenda' },
                      { key: 'p_seller_leads', label: 'Oportunidades' },
                      { key: 'p_seller_finance', label: 'Comissões' },
                      { key: 'p_seller_proposals', label: 'Propostas' },
                      { key: 'p_seller_communications', label: 'Comunicação' }
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={form[perm.key]}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))
                  ) : (
                    // Artist & Composer Permissions
                    (form.role === 'Compositor' ? [
                      { key: 'p_compositions', label: 'Composições' },
                      { key: 'p_marketing', label: 'Marketing' }
                    ] : [
                      { key: 'p_musics', label: 'Músicas' },
                      { key: 'p_work', label: 'Trabalho' },
                      { key: 'p_marketing', label: 'Marketing' }
                    ]).map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/10 cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={form[perm.key]}
                          onChange={(e) => setForm({ ...form, [perm.key]: e.target.checked })}
                          className="rounded border-gray-600 text-beatwap-gold focus:ring-beatwap-gold bg-transparent"
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <AnimatedButton onClick={copyLink} className="w-full sm:flex-1" disabled={!inviteLink}>
                  {inviteLink ? 'Copiar Link' : 'Preencha os dados'}
                </AnimatedButton>
                <AnimatedButton onClick={sendEmail} variant="outline" className="w-full sm:flex-1" disabled={!inviteLink}>
                  Enviar Email
                </AnimatedButton>
              </div>
              
              {inviteLink && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="text-xs text-green-400 break-all font-mono">{inviteLink}</div>
                </div>
              )}
            </Card>

            <Card className="space-y-4 bg-white/5 border-white/10">
              <div className="text-lg font-bold">Instruções</div>
              <ul className="space-y-3 text-sm text-gray-400 list-disc list-inside">
                <li>Use este formulário para convidar novos artistas ou produtores.</li>
                <li>Defina as permissões iniciais que o usuário terá ao se cadastrar.</li>
                <li>O link gerado contém todas as configurações e expira apenas se o email mudar.</li>
                <li>Para usuários existentes, use a seção "Gerenciar Permissões" abaixo.</li>
              </ul>
            </Card>
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 text-xl font-bold">
              <Shield size={20} className="text-beatwap-gold" />
              Gerenciar Permissões
            </div>
            <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
              <AnimatedButton onClick={migrateRoles} variant="outline" className="text-xs w-full md:w-auto">
                 Migrar Vendedores
              </AnimatedButton>
              <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white focus:border-beatwap-gold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2 border-b border-white/10 pb-4 overflow-x-auto">
              {['Artista', 'Compositor', 'Produtor', 'Vendedor'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-beatwap-gold text-black' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {tab === 'Artista' ? 'Artistas' : tab === 'Compositor' ? 'Compositores' : tab === 'Produtor' ? 'Produtores' : 'Vendedores'}
                </button>
              ))}
            </div>

            {loadingArtists ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : filteredArtists.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhum usuário encontrado nesta categoria.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredArtists.map(artist => (
                  <div key={artist.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                          {artist.avatar_url ? (
                            <img src={artist.avatar_url} alt={artist.nome || artist.nome_completo_razao_social} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-beatwap-gold to-yellow-600 flex items-center justify-center text-black font-bold">
                              {(artist.nome || artist.nome_completo_razao_social || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{artist.nome || artist.nome_completo_razao_social || 'Sem Nome'}</div>
                          <div className="text-xs text-gray-400 truncate">{artist.email}</div>
                          <div className="text-xs text-beatwap-gold mt-1">{artist.cargo}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end flex-1">
                        {artist.cargo === 'Produtor' ? (
                          // Producer Permissions
                          [
                            { key: 'admin_artists', label: 'Gerenciar Artistas' },
                            { key: 'admin_musics', label: 'Gerenciar Músicas' },
                            { key: 'admin_sponsors', label: 'Patrocinadores' },
                            { key: 'admin_settings', label: 'Configurações' },
                            { key: 'marketing', label: 'Marketing' },
                            { key: 'chat', label: 'Chat' },
                            { key: 'admin_compositions', label: 'Composições' }
                          ].map(perm => (
                            <button
                              key={perm.key}
                              onClick={() => handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                artist.access_control[perm.key] !== false
                                  ? 'bg-beatwap-gold/20 border-beatwap-gold text-beatwap-gold'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {perm.label}
                            </button>
                          ))
                        ) : artist.cargo === 'Vendedor' ? (
                          // Seller Permissions
                          [
                            { key: 'seller_artists', label: 'Artistas' },
                            { key: 'seller_calendar', label: 'Agenda' },
                            { key: 'seller_leads', label: 'Oportunidades' },
                            { key: 'seller_finance', label: 'Comissões' },
                            { key: 'seller_proposals', label: 'Propostas' },
                            { key: 'seller_communications', label: 'Comunicação' },
                            { key: 'chat', label: 'Chat' }
                          ].map(perm => (
                            <button
                              key={perm.key}
                              onClick={() => handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                artist.access_control[perm.key] !== false
                                  ? 'bg-beatwap-gold/20 border-beatwap-gold text-beatwap-gold'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {perm.label}
                            </button>
                          ))
                        ) : activeTab === 'Compositor' ? (
                          // Compositor Permissions
                          [
                            { key: 'compositions', label: 'Minhas Composições' },
                            { key: 'marketing', label: 'Marketing' },
                            { key: 'chat', label: 'Chat' }
                          ].map(perm => (
                            <button
                              key={perm.key}
                              onClick={() => handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                artist.access_control[perm.key] !== false
                                  ? 'bg-beatwap-gold/20 border-beatwap-gold text-beatwap-gold'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {perm.label}
                            </button>
                          ))
                        ) : (
                          // Artist Permissions
                          [
                            { key: 'musics', label: 'Músicas' },
                            { key: 'work', label: 'Trabalho' },
                            { key: 'marketing', label: 'Marketing' },
                            { key: 'chat', label: 'Chat' }
                          ].map(perm => (
                            <button
                              key={perm.key}
                              onClick={() => handlePermissionChange(artist.id, perm.key, !artist.access_control[perm.key])}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                artist.access_control[perm.key] !== false
                                  ? 'bg-beatwap-gold/20 border-beatwap-gold text-beatwap-gold'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              {perm.label}
                            </button>
                          ))
                        )}
                      </div>

                      <div className="flex justify-end lg:w-auto w-full">
                        <AnimatedButton 
                          onClick={() => savePermissions(artist)} 
                          disabled={savingId === artist.id}
                          className="w-full lg:w-auto"
                        >
                          {savingId === artist.id ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                          <span className="lg:hidden ml-2">Salvar</span>
                        </AnimatedButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};
