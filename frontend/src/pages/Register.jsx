import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { authApi } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { encryptData } from '../utils/security';

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });
  const [agreeLegal, setAgreeLegal] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [roleParam, setRoleParam] = useState(null);
  const [planParam, setPlanParam] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
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
      const capitalizedName = formData.name.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
      const role = roleParam ? (roleParam.charAt(0).toUpperCase() + roleParam.slice(1).toLowerCase()) : 'Artista';
      await authApi.register({ name: capitalizedName, email: formData.email, password: formData.password, role, plano: planParam });
      addToast('Conta criada com sucesso! Faça login para continuar.', 'success');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      addToast(error.message || 'Erro ao criar conta.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  if (step === 'verify') {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Verificar Email</h1>
          <p className="text-gray-400">
            Enviamos um link de confirmação para {formData.email}.<br/>
            Clique no link enviado para confirmar sua conta e depois faça login.
          </p>
        </div>

        <Card className="space-y-6">
          <div className="space-y-4">
            <AnimatedButton 
              fullWidth 
              onClick={goToLogin}
              isLoading={loading}
            >
              Ir para Login
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
            Criar conta
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
