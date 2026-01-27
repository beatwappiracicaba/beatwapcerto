import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle, Key } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const Register = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // 'register' | 'verify'
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '' 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      addToast('As senhas não coincidem.', 'error');
      return;
    }

    setLoading(true);
    
    try {
      // 1. Sign Up with Metadata
      const capitalizedName = formData.name.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: capitalizedName,
          },
          emailRedirectTo: `${window.location.origin}/login`, // Redirect to login or dashboard after confirmation
        }
      });
      
      if (authError) throw authError;
      
      if (authData.session) {
        // Logged in immediately (Email confirmation disabled)
        addToast('Conta criada com sucesso!', 'success');
        navigate('/dashboard');
      } else if (authData.user) {
        // Needs verification
        setStep('verify');
        addToast('Verifique seu email para confirmar a conta.', 'info');
      }

    } catch (error) {
      console.error('Registration error:', error);
      addToast(error.message || 'Erro ao criar conta.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otp,
        type: 'signup'
      });

      if (error) throw error;

      if (data.session) {
        addToast('Email verificado com sucesso!', 'success');
        navigate('/');
      }
    } catch (error) {
      console.error('Verification error:', error);
      addToast(error.message || 'Código inválido ou expirado.', 'error');
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
            Enviamos um link de confirmação para {formData.email}.<br/>
            Clique no link enviado ou insira o código abaixo se houver.
          </p>
        </div>

        <Card className="space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <AnimatedInput
              label="Código de Verificação"
              type="text"
              placeholder="123456"
              icon={Key}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            <AnimatedButton 
              fullWidth 
              type="submit" 
              isLoading={loading}
            >
              Verificar Código
            </AnimatedButton>
            
            <button
              type="button"
              onClick={() => setStep('register')}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              Voltar para cadastro
            </button>
          </form>
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
