import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Heart } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import logo from '../../assets/images/beatwap-logo.png';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 flex items-center justify-center">
                 <img src={logo} alt="BeatWap Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">BeatWap</span>
            </div>
            <p className="text-gray-400 max-w-sm mb-8">
              A plataforma definitiva para artistas independentes levarem sua música para o mundo. 
              Simples, transparente e feita para você.
            </p>
            <AnimatedButton onClick={() => navigate('/login')}>
              Acessar Área do Artista
            </AnimatedButton>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Plataforma</h4>
            <ul className="space-y-4">
              <li><a href="#how-it-works" className="text-gray-400 hover:text-beatwap-gold transition-colors">Como funciona</a></li>
              <li><a href="#benefits" className="text-gray-400 hover:text-beatwap-gold transition-colors">Vantagens</a></li>
              <li><a href="/login" className="text-gray-400 hover:text-beatwap-gold transition-colors">Login</a></li>
              <li><a href="/register" className="text-gray-400 hover:text-beatwap-gold transition-colors">Cadastro</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-400 hover:text-beatwap-gold transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="text-gray-400 hover:text-beatwap-gold transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="text-gray-400 hover:text-beatwap-gold transition-colors">Direitos Autorais</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-beatwap-gold transition-colors">Suporte</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} BeatWap. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Feito com <Heart size={14} className="text-red-500 fill-red-500" /> para a música.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
