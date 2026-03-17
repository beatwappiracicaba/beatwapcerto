import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { apiClient, authApi } from '../services/apiClient';
import { Mail, Lock, User, Shield } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

export default function RegisterInvite() {
  const nav = useNavigate();
  const { search } = useLocation();
  const { addToast } = useToast();
  const params = new URLSearchParams(search);
  const token = String(params.get('token') || '').trim();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('Artista');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!token) { nav('/register/invite-invalid', { replace: true }); return; }
      try {
        const data = await apiClient.get(`/auth/invite/${token}`);
        setEmail(String(data?.email || ''));
        setExpiresAt(data?.expires_at || null);
      } catch {
        nav('/register/invite-invalid', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  const submit = async () => {
    try {
      setSubmitting(true);
      if (!nome || !email || !password) {
        addToast('Preencha todos os campos', 'error');
        return;
      }
      const res = await apiClient.post('/auth/register-with-invite', { token, email, password, nome, cargo });
      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user || null));
      }
      addToast('Conta criada com sucesso!', 'success');
      const role = String(res?.user?.cargo || cargo);
      const map = { Produtor: '/dashboard-produtor', Vendedor: '/dashboard-vendedor', Artista: '/dashboard-artista', Compositor: '/dashboard-compositor' };
      nav(map[role] || '/');
    } catch (e) {
      addToast(e?.message || 'Falha ao criar conta', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <AuthLayout><div className="min-h-[60vh] flex items-center justify-center text-gray-400">Validando convite...</div></AuthLayout>;

  return (
    <AuthLayout>
      <div className="max-w-md mx-auto">
        <Card className="space-y-5">
          <div className="text-center space-y-1">
            <div className="text-xl font-extrabold text-white">Criar conta por convite</div>
            {expiresAt && <div className="text-xs text-gray-400">Convite válido até {new Date(expiresAt).toLocaleString()}</div>}
          </div>
          <AnimatedInput
            label="Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled
          />
          <AnimatedInput
            label="Nome"
            icon={User}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: MC Future"
          />
          <AnimatedInput
            label="Senha"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <div className="space-y-2">
            <div className="text-sm text-gray-300">Cargo</div>
            <div className="relative">
              <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-sm text-white focus:border-beatwap-gold outline-none"
              >
                <option value="Artista" className="bg-[#121212]">Artista</option>
                <option value="Compositor" className="bg-[#121212]">Compositor</option>
                <option value="Vendedor" className="bg-[#121212]">Vendedor</option>
                <option value="Produtor" className="bg-[#121212]">Produtor</option>
              </select>
            </div>
          </div>

          <AnimatedButton onClick={submit} isLoading={submitting} className="w-full justify-center">
            Criar conta
          </AnimatedButton>
          <div className="text-xs text-center text-gray-500">
            Convite inválido? <Link className="text-beatwap-gold hover:underline" to="/register/invite-invalid">Ver ajuda</Link>
          </div>
        </Card>
      </div>
    </AuthLayout>
  );
}
