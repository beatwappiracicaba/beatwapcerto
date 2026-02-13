import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AnimatedButton } from '../components/ui/AnimatedButton';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verificando suas credenciais...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // O cliente Supabase processa automaticamente o hash da URL para obter a sessão.
        // Apenas verificamos se a sessão foi estabelecida com sucesso.
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          setStatus('success');
          setMessage('Email confirmado com sucesso! Você será redirecionado para o login.');
          
          // Aguarda um pouco para o usuário ver a mensagem de sucesso
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
          // Se não há sessão, verifica se há erro no hash da URL (ex: error_description)
          const params = new URLSearchParams(window.location.hash.substring(1)); // Remove o #
          const errorDescription = params.get('error_description');
          
          if (errorDescription) {
            throw new Error(decodeURIComponent(errorDescription));
          } else {
             // Caso não tenha sessão nem erro explícito, mas caiu aqui
             // Pode ser que o link expirou ou é inválido
             throw new Error('Link de confirmação inválido ou expirado.');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Ocorreu um erro ao confirmar seu email.');
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center space-y-6 p-8 border border-white/10">
        {status === 'verifying' && (
            <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-beatwap-gold mx-auto"></div>
                <h2 className="text-xl font-bold">Verificando...</h2>
                <p className="text-gray-400">{message}</p>
            </>
        )}
        
        {status === 'success' && (
            <>
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-500/20 p-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-green-500">Email Confirmado!</h2>
                <p className="text-gray-300">{message}</p>
                <AnimatedButton onClick={() => navigate('/login')} fullWidth>
                    Ir para Login
                </AnimatedButton>
            </>
        )}

        {status === 'error' && (
            <>
                <div className="flex justify-center">
                  <div className="rounded-full bg-red-500/20 p-4">
                    <AlertTriangle className="h-12 w-12 text-red-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-red-500">Erro na Verificação</h2>
                <p className="text-gray-300">{message}</p>
                <AnimatedButton onClick={() => navigate('/login')} fullWidth>
                    Ir para Login
                </AnimatedButton>
            </>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;
