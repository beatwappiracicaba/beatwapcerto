import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const navigate = useNavigate();
  const { addToast } = useToast(); // Assuming ToastContext provides addToast
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Check role to redirect
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.session.user.id)
        .single();

      if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      addToast(error.message || 'Erro ao fazer login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white">Bem-vindo de volta</h1>
        <p className="text-gray-400">Entre para gerenciar seus lançamentos</p>
      </div>

      <div className="text-center mb-4">
        <Link to="/" className="text-sm text-gray-500 hover:text-white transition-colors">
          ← Voltar para o início
        </Link>
      </div>

      <Card className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
          
          <div className="flex justify-end">
            <Link to="/forgot" className="text-xs text-beatwap-gold hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          <AnimatedButton 
            fullWidth 
            type="submit" 
            isLoading={loading}
          >
            Entrar na BeatWap
          </AnimatedButton>
        </form>
      </Card>

      <div className="text-center text-sm text-gray-500">
        Não tem uma conta?{' '}
        <Link to="/register" className="text-beatwap-gold font-bold hover:underline">
          Criar conta
        </Link>
      </div>
    </div>
  );
};

export default Login;
