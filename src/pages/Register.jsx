import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, CheckCircle } from 'lucide-react';
import { AnimatedInput } from '../components/ui/AnimatedInput';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Card } from '../components/ui/Card';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const Register = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
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
      // 1. Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // 2. Create Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            role: 'artist', // Default role
            status: 'pending' // Default status
          }]);
        
        if (profileError) {
          console.error('Profile creation failed:', profileError);
          // If RLS blocks this, we rely on triggers. 
          // Assuming public insert or auth.uid() = id policy allows it.
        }
        
        // 3. Create Metrics (empty)
        const { error: metricsError } = await supabase
          .from('metrics')
          .insert([{
            artist_id: authData.user.id
          }]);
          
        if (metricsError) {
             console.error('Metrics creation failed:', metricsError);
        }

        addToast('Conta criada com sucesso!', 'success');
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Registration error:', error);
      addToast(error.message || 'Erro ao criar conta.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
