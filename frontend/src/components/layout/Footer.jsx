
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Music, Mail, Phone, MapPin } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0A0A0A] border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-beatwap-gold to-yellow-600 flex items-center justify-center text-black font-bold text-xl shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                B
              </div>
              <span className="text-2xl font-bold text-white tracking-tight">BeatWap</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              BeatWap Produções<br/>
              Produção Musical e Marketing Digital<br/>
              CNPJ: 53.206.273/0001-53<br/>
              Razão Social: Paulo Alan de Godoy Roncato Junior
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-beatwap-gold hover:text-black transition-all duration-300">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-beatwap-gold hover:text-black transition-all duration-300">
                <Youtube size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-beatwap-gold hover:text-black transition-all duration-300">
                <Twitter size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Plataforma</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/artists" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Artistas
                </Link>
              </li>
              <li>
                <Link to="/producers" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Produtores
                </Link>
              </li>
              <li>
                <Link to="/releases" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Lançamentos
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Planos
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/copyright" className="text-gray-400 hover:text-beatwap-gold transition-colors text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-beatwap-gold/50"></span>
                  Direitos Autorais
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6">Contato</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <MapPin className="text-beatwap-gold shrink-0 mt-1" size={18} />
                <span>
                  Piracicaba - SP | Brasil<br/>
                </span>
              </li>
              <li className="flex items-start gap-3 text-gray-400 text-sm">
                <Mail className="text-beatwap-gold shrink-0 mt-1" size={18} />
                <a href="mailto:contato@beatwap.com.br" className="hover:text-white transition-colors">
                  contato@beatwap.com.br
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {currentYear} BeatWap Produções. Todos os direitos reservados.</p>
          <p className="flex items-center gap-1">
            Feito com <Music size={14} className="text-beatwap-gold" /> para a música
          </p>
        </div>
      </div>
    </footer>
  );
};
