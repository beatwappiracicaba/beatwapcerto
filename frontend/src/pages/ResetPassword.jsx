import { useState } from 'react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { Mail, Hash, Lock, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';

export default function ResetPassword() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    try {
      setLoading(true);
      await apiClient.post('/auth/forgot-password', { email });
      addToast('Enviamos um código para seu email, se existir uma conta.', 'success');
      setStep(2);
    } catch (e) {
      addToast(e?.message || 'Erro ao solicitar código', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = requestCode;

  const verifyAndReset = async () => {
    try {
      setLoading(true);
      await apiClient.post('/auth/verify-reset-code', { email, code });
      await apiClient.post('/auth/reset-password', { email, code, password });
      addToast('Senha alterada com sucesso!', 'success');
      setStep(3);
    } catch (e) {
      addToast(e?.message || 'Código inválido', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="max-w-md mx-auto">
        <Card className="space-y-5">
          <div className="text-center text-xl font-extrabold text-white">Recuperar senha</div>
          {step === 1 && (
            <>
              <AnimatedInput
                label="Email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <AnimatedButton onClick={requestCode} isLoading={loading} className="w-full justify-center">
                Enviar código
              </AnimatedButton>
            </>
          )}
          {step === 2 && (
            <>
              <AnimatedInput
                label="Código"
                icon={Hash}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6 dígitos"
              />
              <AnimatedInput
                label="Nova senha"
                type="password"
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <div className="flex gap-2">
                <AnimatedButton onClick={verifyAndReset} isLoading={loading} className="flex-1 justify-center">
                  Trocar senha
                </AnimatedButton>
                <AnimatedButton onClick={resendCode} variant="secondary" isLoading={loading} className="flex-1 justify-center">
                  <RefreshCw size={16} className="mr-2" /> Reenviar código
                </AnimatedButton>
              </div>
            </>
          )}
          {step === 3 && (
            <div className="text-center text-green-400">
              Senha alterada. Faça login com sua nova senha.
            </div>
          )}
        </Card>
      </div>
    </AuthLayout>
  );
}
