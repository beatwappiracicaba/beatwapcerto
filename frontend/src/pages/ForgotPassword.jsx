import { useState } from 'react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { useToast } from '../context/ToastContext';
import { apiClient } from '../services/apiClient';
import { Mail } from 'lucide-react';
 

export default function ForgotPassword() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    try {
      setLoading(true);
      const resp = await apiClient.post('/auth/forgot-password', { email });
      if (resp?.success) {
        addToast('Verifique seu email', 'success');
        setSent(true);
      } else {
        addToast(resp?.message || 'Email não cadastrado', 'error');
      }
    } catch (e) {
      const msg = e?.message || 'Email não cadastrado';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <Card className="space-y-5">
        <div className="text-center text-xl font-extrabold text-white">Esqueci minha senha</div>
        <div className="text-xs text-gray-400 text-center -mt-3">Informe seu email para receber o link</div>
        <AnimatedInput
          label="Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
        />
        <AnimatedButton onClick={submit} isLoading={loading} className="w-full justify-center">
          Enviar link de redefinição
        </AnimatedButton>
        {sent && (
          <div className="text-center text-green-400 text-sm">Se o email existir, você receberá o link em instantes.</div>
        )}
      </Card>
    </div>
  );
}
