import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { Lock } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

export default function ResetPassword() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('code') || '';
    setCode(c);
  }, []);

  const submit = async () => {
    if (!password || password.length < 6) {
      addToast('A senha deve ter pelo menos 6 caracteres', 'error');
      return;
    }
    if (password !== confirm) {
      addToast('As senhas não conferem', 'error');
      return;
    }
    try {
      setLoading(true);
      const resp = await apiClient.post('/auth/reset-password', { code, newPassword: password });
      if (resp?.success) {
        addToast('Senha redefinida com sucesso', 'success');
        navigate('/login');
      } else {
        addToast(resp?.message || 'Código inválido ou expirado', 'error');
      }
    } catch (e) {
      addToast(e?.message || 'Código inválido ou expirado', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-md mx-auto">
        <Card className="space-y-5">
          <div className="text-center text-xl font-extrabold text-white">Redefinir senha</div>
          <div className="text-xs text-gray-400 text-center -mt-3">Insira sua nova senha</div>
          <AnimatedInput
            label="Nova senha"
            type="password"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
          <AnimatedInput
            label="Confirmar senha"
            type="password"
            icon={Lock}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repita a senha"
          />
          <AnimatedButton onClick={submit} isLoading={loading} className="w-full justify-center">
            Redefinir Senha
          </AnimatedButton>
        </Card>
      </div>
    </AuthLayout>
  );
}
