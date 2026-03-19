import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { Hash, Lock, Mail } from 'lucide-react';

export default function ResetPassword() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

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
        setTimeout(() => navigate('/login'), 1500);
      } else {
        addToast(resp?.message || 'Código inválido ou expirado', 'error');
      }
    } catch (e) {
      addToast(e?.message || 'Código inválido ou expirado', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!resendEmail) {
      addToast('Informe o seu email', 'error');
      return;
    }
    try {
      setResendLoading(true);
      const r = await apiClient.post('/auth/forgot-password', { email: resendEmail });
      if (r?.success) {
        addToast('Reenviamos o email de redefinição', 'success');
      } else {
        addToast(r?.message || 'Email não cadastrado', 'error');
      }
    } catch (e) {
      addToast(e?.message || 'Falha ao reenviar email', 'error');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <Card className="space-y-5">
        <div className="text-center text-xl font-extrabold text-white">Redefinir senha</div>
        <div className="text-xs text-gray-400 text-center -mt-3">Insira sua nova senha</div>
          <AnimatedInput
            label="Código"
            type="text"
            icon={Hash}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código recebido por email"
          />
          <div className="text-xs text-gray-400 -mt-2">
            Cole o código do link que recebeu no email. Não recebeu?
            <button
              type="button"
              onClick={() => setShowResend(!showResend)}
              className="ml-1 text-beatwap-gold hover:underline"
            >
              Reenviar email
            </button>
          </div>
          {showResend && (
            <div className="space-y-2 p-3 mt-1 rounded-lg bg-white/5 border border-white/10">
              <AnimatedInput
                label="Seu email"
                type="email"
                icon={Mail}
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <AnimatedButton onClick={resend} isLoading={resendLoading} className="w-full justify-center">
                Reenviar email
              </AnimatedButton>
            </div>
          )}
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
  );
}
