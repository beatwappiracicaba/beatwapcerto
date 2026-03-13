import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import logo from '../../assets/images/beatwap-logo.png';
import { Link } from 'react-router-dom';

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 md:justify-items-center">
          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-6 md:justify-center">
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
          <div className="text-center">
            <h4 className="text-white font-bold mb-6">Plataforma</h4>
            <ul className="space-y-4">
              <li><a href="#how-it-works" className="text-gray-400 hover:text-beatwap-gold transition-colors">Como funciona</a></li>
              <li><a href="#benefits" className="text-gray-400 hover:text-beatwap-gold transition-colors">Vantagens</a></li>
              <li><a href="/login" className="text-gray-400 hover:text-beatwap-gold transition-colors">Login</a></li>
            </ul>
          </div>

          <div className="text-center">
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4">
              <li><Link to="/legal/termos" className="text-gray-400 hover:text-beatwap-gold transition-colors">Termos de Uso</Link></li>
              <li><Link to="/legal/privacidade" className="text-gray-400 hover:text-beatwap-gold transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/legal/direitos" className="text-gray-400 hover:text-beatwap-gold transition-colors">Direitos Autorais</Link></li>
              <li><a href="#contact" className="text-gray-400 hover:text-beatwap-gold transition-colors">Suporte</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500 text-center md:text-left">
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-gray-400">BeatWap Produções - Produção Musical e Marketing Digital</p>
            <p>CNPJ: 53.206.273/0001-53 | Razão Social: Paulo Alan de Godoy Roncato Junior</p>
            <p>Piracicaba - SP | Brasil</p>
            <p className="mt-2">&copy; {new Date().getFullYear()} Todos os direitos reservados</p>
          </div>
          <p className="flex items-center gap-1 mt-4 md:mt-0">
            Feito com <Heart size={14} className="text-red-500 fill-red-500" /> para a música.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
