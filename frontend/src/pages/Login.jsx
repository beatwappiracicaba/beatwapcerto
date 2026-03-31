import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, MessageCircle } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { authApi } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { addToast } = useToast(); // Assuming ToastContext provides addToast
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const routeForRole = (role) => {
    if (!role) return '/';
    const s = String(role).toLowerCase();
    if (s === 'produtor' || s === 'admin') return '/dashboard-produtor';
    if (s === 'vendedor' || s === 'seller') return '/dashboard-vendedor';
    if (s === 'artista' || s === 'artist') return '/dashboard-artista';
    if (s === 'compositor' || s === 'composer') return '/dashboard-compositor';
    return '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      addToast('Informe e-mail e senha.', 'error');
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.login(formData.email, formData.password);
      await refreshProfile();
      const user = authApi.getUser();
      const cargo = user?.role ?? user?.cargo ?? null;
      addToast('Login realizado com sucesso!', 'success');
      const target = routeForRole(cargo) || result?.redirect || '/';
      navigate(target, { replace: true });
    } catch (err) {
      addToast(err.message || 'Credenciais inválidas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Bem-vindo de volta</h1>
        <p className="text-gray-400">Entre com sua conta para acessar seu painel.</p>
      </div>

      <div className="text-center mb-4">
        <Link to="/" className="text-sm text-gray-500 hover:text-white transition-colors">
          ← Voltar para o início
        </Link>
      </div>

      <Card className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatedInput
            label="E-mail"
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
          
          <div className="flex justify-end">
            <Link to="/forgot" className="text-xs text-beatwap-gold hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          <AnimatedButton fullWidth type="submit" isLoading={loading}>
            Entrar na BeatWap
          </AnimatedButton>
        </form>
      </Card>

      <div className="text-center text-sm text-gray-500">
        Não tem uma conta?{' '}
        <Link to="/cadastro" className="text-beatwap-gold font-bold hover:underline">
          Cadastre-se
        </Link>
        <span className="mx-2 text-gray-600">|</span>
        <a 
          href="https://wa.me/5519981880590?text=Ol%C3%A1%2C%20gostaria%20de%20criar%20uma%20conta%20de%20artista%20na%20BeatWap." 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-beatwap-gold font-bold hover:underline inline-flex items-center gap-1"
        >
          Solicitar acesso <MessageCircle size={14} />
        </a>
      </div>
    </div>
  );
};

export default Login;
