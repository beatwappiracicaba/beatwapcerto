import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X, Music } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import logo from '../../assets/images/beatwap-logo.png';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { label: 'Início', id: 'home' },
    { label: 'Como funciona', id: 'how-it-works' },
    { label: 'Vantagens', id: 'benefits' },
    { label: 'Contato', id: 'contact' },
  ];

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-beatwap-dark/90 backdrop-blur-md py-4 shadow-lg' : 'bg-transparent py-6'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
          <div className="w-10 h-10 flex items-center justify-center">
             <img src={logo} alt="BeatWap Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">BeatWap</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="text-gray-300 hover:text-beatwap-gold transition-colors font-medium text-sm uppercase tracking-wide"
            >
              {item.label}
            </button>
          ))}
          <AnimatedButton onClick={() => navigate('/login')} className="px-6">
            Área do Artista
          </AnimatedButton>
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Sheet from top */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 z-50 md:hidden bg-beatwap-dark/95 backdrop-blur-xl border-b border-white/10 shadow-2xl"
          >
            <div className="flex flex-col p-6 gap-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-left text-gray-300 hover:text-beatwap-gold py-2 font-medium"
                >
                  {item.label}
                </button>
              ))}
              <AnimatedButton onClick={() => navigate('/login')} className="w-full justify-center">
                Área do Artista
              </AnimatedButton>
            </div>
          </motion.div>
        </>
      )}
    </motion.header>
  );
};

export default Header;
