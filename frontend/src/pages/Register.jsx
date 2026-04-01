import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { apiClient, authApi } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { MP_CHECKOUT_ENABLED } from '../config/apiConfig';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [formStep, setFormStep] = useState(0);
  const [formData, setFormData] = useState({ 
    name: '', 
    nome_completo: '',
    razao_social: '',
    email: '', 
    password: '', 
    confirmPassword: '',
    cpf: '',
    cnpj: '',
    celular: '',
    telefone: '',
    genero_musical: '',
    cep: '',
    logradouro: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    role: 'Artista',
    code: ''
  });
  const [agreeLegal, setAgreeLegal] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [roleParam, setRoleParam] = useState(null);
  const [planParam, setPlanParam] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token') || '';
    if (token) {
      const tipo = params.get('tipo') || '';
      const tipoQuery = tipo ? `&tipo=${encodeURIComponent(tipo)}` : '';
      navigate(`/register/invite?token=${encodeURIComponent(token)}${tipoQuery}`, { replace: true });
      return;
    }
    const name = params.get('name') || '';
    const email = params.get('email') || '';
    const role = params.get('role') || '';
    const plano = params.get('plano') || '';
    if (name || email || role) {
      setFormData(prev => ({ ...prev, name, email }));
      setRoleParam(role);
    }
    if (plano) setPlanParam(plano);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    
    try {
      if (step === 'register') {
        const requiredMissingByFormStep = () => {
          if (formStep === 0) {
            if (!String(formData.name || '').trim()) return true;
            if (!String(formData.nome_completo || '').trim()) return true;
            if (!String(formData.email || '').trim()) return true;
            return false;
          }
          if (formStep === 1) {
            if (!String(formData.password || '').trim()) return true;
            if (!String(formData.confirmPassword || '').trim()) return true;
            if (formData.password !== formData.confirmPassword) return true;
            return false;
          }
          if (formStep === 2) {
            if (!String(formData.celular || '').trim()) return true;
            if (!String(formData.genero_musical || '').trim()) return true;
            return false;
          }
          if (formStep === 3) {
            if (!String(formData.cidade || '').trim()) return true;
            if (!String(formData.estado || '').trim()) return true;
            if (!agreeLegal) return true;
            if (!String(formData.role || '').trim()) return true;
            return false;
          }
          return false;
        };

        if (requiredMissingByFormStep()) {
          addToast('Preencha os campos obrigatórios.', 'error');
          return;
        }

        if (formStep < 3) {
          setFormStep((s) => Math.min(3, s + 1));
          return;
        }

        if (!formData.nome_completo || !formData.email || !formData.celular || !formData.genero_musical || !formData.cidade || !formData.estado || !agreeLegal) {
          addToast('Preencha os campos obrigatórios.', 'error');
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          addToast('As senhas não coincidem.', 'error');
          return;
        }

        await authApi.requestRegisterCode(formData.email);
        addToast('Enviamos um código de verificação para seu email.', 'success');
        setStep('verify');
        return;
      }

      if (!agreeLegal) {
        addToast('Você precisa aceitar os Termos, Privacidade e Direitos Autorais.', 'error');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        addToast('As senhas não coincidem.', 'error');
        return;
      }
      if (!formData.nome_completo || !formData.email || !formData.celular || !formData.genero_musical || !formData.cidade || !formData.estado) {
        addToast('Preencha os campos obrigatórios.', 'error');
        return;
      }
      if (!String(formData.code || '').trim()) {
        addToast('Digite o código enviado por email.', 'error');
        return;
      }

      const capitalizedName = String(formData.name || '').trim();
      const role = roleParam ? (roleParam.charAt(0).toUpperCase() + roleParam.slice(1).toLowerCase()) : (formData.role || 'Artista');
      const params = new URLSearchParams(location.search);
      const getFlag = (k) => params.get(k) === '1';
      let access_control = {};
      const chat = getFlag('p_chat');
      if (chat) access_control.chat = true;
      if (role === 'Produtor') {
        if (getFlag('p_admin_artists')) access_control.admin_artists = true;
        if (getFlag('p_admin_composers')) access_control.admin_composers = true;
        if (getFlag('p_admin_sellers')) access_control.admin_sellers = true;
        if (getFlag('p_admin_musics')) access_control.admin_musics = true;
        if (getFlag('p_admin_compositions')) access_control.admin_compositions = true;
        if (getFlag('p_admin_sponsors')) access_control.admin_sponsors = true;
        if (getFlag('p_admin_settings')) access_control.admin_settings = true;
        if (getFlag('p_admin_finance')) access_control.admin_finance = true;
        if (getFlag('p_marketing')) access_control.marketing = true;
      } else if (role === 'Vendedor') {
        if (getFlag('p_seller_artists')) access_control.seller_artists = true;
        if (getFlag('p_seller_calendar')) access_control.seller_calendar = true;
        if (getFlag('p_seller_leads')) access_control.seller_leads = true;
        if (getFlag('p_seller_finance')) access_control.seller_finance = true;
        if (getFlag('p_seller_proposals')) access_control.seller_proposals = true;
        if (getFlag('p_seller_communications')) access_control.seller_communications = true;
      } else if (role === 'Compositor') {
        if (getFlag('p_compositions')) access_control.compositions = true;
        if (getFlag('p_marketing')) access_control.marketing = true;
        if (getFlag('p_finance')) access_control.finance = true;
      } else {
        if (getFlag('p_musics')) access_control.musics = true;
        if (getFlag('p_work')) access_control.work = true;
        if (getFlag('p_marketing')) access_control.marketing = true;
        if (getFlag('p_finance')) access_control.finance = true;
      }
      const res = await authApi.register({
        name: capitalizedName,
        nome_completo: formData.nome_completo,
        razao_social: formData.razao_social,
        email: formData.email,
        password: formData.password,
        code: formData.code,
        role,
        plano: planParam,
        access_control,
        cpf: formData.cpf,
        cnpj: formData.cnpj,
        celular: formData.celular,
        telefone: formData.telefone,
        genero_musical: formData.genero_musical,
        cep: formData.cep,
        logradouro: formData.logradouro,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        agreeLegal: true
      });

      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user || null));
      }
      await refreshProfile();
      addToast('Conta criada com sucesso!', 'success');
      try {
        const params = new URLSearchParams(location.search);
        const shouldCheckout = params.get('checkout') === '1';
        const pendingRaw = localStorage.getItem('bw_pending_checkout') || '';
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
        const customData = pending?.customData || null;
        if (shouldCheckout && customData) {
          if (!MP_CHECKOUT_ENABLED) {
            const type = String(customData?.product_type || '').toLowerCase().trim();
            const planKey = String(customData?.plan_key || '').toLowerCase().trim();
            const qty = Number(customData?.quantity || 0);
            const who = String(customData?.user_type || '').toLowerCase().trim() === 'composer' ? 'Compositor' : 'Artista';
            let msg = `Olá! Quero comprar um plano na BeatWap (${who}).`;
            if (type === 'plan') msg = `Olá! Quero contratar o plano ${planKey || '(plano)'} (${who}).`;
            if (type === 'credits_upload') msg = `Olá! Quero contratar Avulso (${Number.isFinite(qty) && qty > 0 ? `${qty} envios` : 'envios'}).`;
            if (type === 'credits_hit') msg = `Olá! Quero comprar créditos Hit da Semana (${Number.isFinite(qty) && qty > 0 ? qty : 1}).`;
            localStorage.removeItem('bw_pending_checkout');
            window.open(`https://wa.me/5519981083497?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
          } else {
          const payload = {
            nome: String(formData.nome_completo || formData.name || '').trim(),
            email: String(formData.email || '').trim(),
            user_type: customData?.user_type || undefined,
            product_type: customData?.product_type || undefined,
            plan_key: customData?.plan_key || undefined,
            quantity: customData?.quantity || undefined,
            descricao: customData?.display_name || undefined
          };
          const data = await apiClient.post('/criar-pagamento', payload);
          const url = data?.checkout_url || data?.init_point || data?.sandbox_init_point || null;
          if (url) {
            const isAnnual =
              String(payload.product_type || '').toLowerCase().trim() === 'plan'
              && String(payload.plan_key || '').toLowerCase().trim() === 'anual';
            if (isAnnual) {
              const msg = `Olá! Iniciei o pagamento do plano anual. Email: ${payload.email}. Pedido: ${data?.external_reference || data?.order_id || ''}`;
              const wa = `https://wa.me/5519981083497?text=${encodeURIComponent(msg)}`;
              window.open(wa, '_blank', 'noopener,noreferrer');
            }
            localStorage.removeItem('bw_pending_checkout');
            window.location.href = url;
            return;
          }
          }
        }
      } catch (e) { void e; }

      navigate(res?.redirect || '/dashboard/painel', { replace: true });
    } catch (error) {
      console.error('Registration error:', error);
      addToast(error.message || 'Erro ao criar conta.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Verificar Email</h1>
          <p className="text-gray-400">
            Enviamos um código de confirmação para {formData.email}.<br/>
            Digite o código para concluir seu cadastro.
          </p>
        </div>

        <Card className="space-y-6">
          <div className="space-y-4">
            <AnimatedInput
              label="Código"
              type="text"
              placeholder="000000"
              icon={CheckCircle}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <AnimatedButton 
              fullWidth 
              onClick={handleSubmit}
              isLoading={loading}
            >
              Concluir cadastro
            </AnimatedButton>
            <button
              type="button"
              onClick={() => { setStep('register'); setFormStep(3); }}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              Voltar para cadastro
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Crie sua conta</h1>
        <p className="text-gray-400">Comece a distribuir sua música hoje</p>
      </div>

      <Card className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formStep === 0 && (
            <>
              <AnimatedInput
                label="Nome Artístico"
                type="text"
                placeholder="Ex: MC Future"
                icon={User}
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <AnimatedInput
                label="Nome completo"
                type="text"
                placeholder="Seu nome completo"
                icon={User}
                value={formData.nome_completo}
                onChange={(e) => setFormData({...formData, nome_completo: e.target.value})}
              />
              <AnimatedInput
                label="Razão social"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.razao_social}
                onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
              />
              <AnimatedInput
                label="Email"
                type="email"
                placeholder="seu@email.com"
                icon={Mail}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </>
          )}

          {formStep === 1 && (
            <>
              <AnimatedInput
                label="Senha"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
              <AnimatedInput
                label="Confirmar Senha"
                type="password"
                placeholder="••••••••"
                icon={CheckCircle}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </>
          )}

          {formStep === 2 && (
            <>
              <AnimatedInput
                label="CPF"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.cpf}
                onChange={(e) => setFormData({...formData, cpf: e.target.value})}
              />
              <AnimatedInput
                label="CNPJ"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.cnpj}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
              />
              <AnimatedInput
                label="Celular"
                type="text"
                placeholder="(WhatsApp)"
                icon={User}
                value={formData.celular}
                onChange={(e) => setFormData({...formData, celular: e.target.value})}
              />
              <AnimatedInput
                label="Telefone"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              />
              <AnimatedInput
                label="Gênero Musical"
                type="text"
                placeholder="Ex: Trap"
                icon={User}
                value={formData.genero_musical}
                onChange={(e) => setFormData({...formData, genero_musical: e.target.value})}
              />
            </>
          )}

          {formStep === 3 && (
            <>
              <AnimatedInput
                label="CEP"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.cep}
                onChange={(e) => setFormData({...formData, cep: e.target.value})}
              />
              <AnimatedInput
                label="Logradouro"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.logradouro}
                onChange={(e) => setFormData({...formData, logradouro: e.target.value})}
              />
              <AnimatedInput
                label="Complemento"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.complemento}
                onChange={(e) => setFormData({...formData, complemento: e.target.value})}
              />
              <AnimatedInput
                label="Bairro"
                type="text"
                placeholder="(opcional)"
                icon={User}
                value={formData.bairro}
                onChange={(e) => setFormData({...formData, bairro: e.target.value})}
              />
              <AnimatedInput
                label="Cidade"
                type="text"
                placeholder="Sua cidade"
                icon={User}
                value={formData.cidade}
                onChange={(e) => setFormData({...formData, cidade: e.target.value})}
              />
              <AnimatedInput
                label="Estado"
                type="text"
                placeholder="UF"
                icon={User}
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value})}
              />
              <div className="space-y-2">
                <div className="text-sm text-gray-300">Eu sou:</div>
                <div className="relative">
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-beatwap-gold outline-none"
                  >
                    <option value="Artista" className="bg-[#121212]">Artista</option>
                    <option value="Compositor" className="bg-[#121212]">Compositor</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeLegal}
                    onChange={(e) => setAgreeLegal(e.target.checked)}
                    className="mt-1 accent-beatwap-gold"
                  />
                  <span className="text-sm text-gray-300">
                    Declaro que li e concordo com os{' '}
                    <Link to="/legal/termos" className="text-beatwap-gold hover:underline">Termos de Uso</Link>,{' '}
                    <Link to="/legal/privacidade" className="text-beatwap-gold hover:underline">Política de Privacidade</Link>{' '}
                    e{' '}
                    <Link to="/legal/direitos" className="text-beatwap-gold hover:underline">Direitos Autorais</Link>.{' '}
                    <Link to="/legal/todos" className="text-gray-400 hover:text-beatwap-gold underline ml-1">Ver tudo</Link>
                  </span>
                </label>
                <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-1 accent-beatwap-gold"
                  />
                  <span className="text-sm text-gray-300">
                    Quero receber mensagens sobre promoções e novidades da BeatWap (opcional).
                  </span>
                </label>
              </div>
            </>
          )}

          <AnimatedButton 
            fullWidth 
            type="submit" 
            isLoading={loading}
          >
            {formStep === 3 ? 'Enviar código' : 'Continuar'}
          </AnimatedButton>

          {formStep > 0 && (
            <button
              type="button"
              onClick={() => setFormStep((s) => Math.max(0, s - 1))}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              Voltar
            </button>
          )}
        </form>
      </Card>

      <div className="text-center text-sm text-gray-500">
        Já tem uma conta?{' '}
        <Link to="/login" className="text-beatwap-gold font-bold hover:underline">
          Fazer Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
