import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { authApi } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'verify'
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
    
    if (!agreeLegal) {
      addToast('Você precisa aceitar os Termos, Privacidade e Direitos Autorais.', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    setLoading(true);
    
    try {
      if (!formData.nome_completo || !formData.email || !formData.celular || !formData.genero_musical || !formData.cidade || !formData.estado) {
        addToast('Preencha os campos obrigatórios.', 'error');
        return;
      }

      if (step === 'register') {
        await authApi.requestRegisterCode(formData.email);
        addToast('Enviamos um código de verificação para seu email.', 'success');
        setStep('verify');
        return;
      }

      const capitalizedName = formData.name.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
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
              onClick={() => setStep('register')}
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

          <AnimatedButton 
            fullWidth 
            type="submit" 
            isLoading={loading}
          >
            Enviar código
          </AnimatedButton>
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
