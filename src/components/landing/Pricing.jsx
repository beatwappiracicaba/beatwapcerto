import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Music, CreditCard, Star, User } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useAuth } from '../../context/AuthContext';
import CheckoutModal from './CheckoutModal';

const Pricing = () => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const openPlan = (planLabel, url) => {
    window.open(url, '_blank');
    const artistName = profile?.nome || profile?.nome_completo_razao_social || '';
    const msg = artistName ? `Comprei o ${planLabel} - ${artistName}` : `Comprei o ${planLabel}`;
    setTimeout(() => {
      window.open('https://wa.me/5519981083497?text=' + encodeURIComponent(msg), '_blank');
    }, 300);
  };

  const handleSelectPlan = (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-beatwap-black to-black relative overflow-hidden">
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        planType={selectedPlan} 
      />
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-beatwap-gold/30 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Planos de Distribuição Musical</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Escolha o plano ideal para sua carreira. Sem taxas escondidas, sem contratos abusivos.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {/* Plano Avulso */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-beatwap-gold/50 transition-all duration-300 group">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Plano Avulso</h3>
              <p className="text-gray-400 text-sm">Ideal para lançamentos pontuais</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-beatwap-gold">R$ 100</span>
              <span className="text-gray-400">/música</span>
            </div>
            <p className="text-sm text-gray-300 mb-6 border-b border-white/10 pb-6">
              Músicas adicionais no mesmo envio: <span className="text-white font-bold">R$ 50,00</span> cada
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> Distribuição digital completa
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> Cadastro de metadados e ISRC
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> Suporte básico ao artista
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> 75% Royalties para você
              </li>
            </ul>
            <AnimatedButton variant="outline" className="w-full" onClick={() => openPlan('Plano por música', 'https://mpago.la/1bNzgUz')}>Comprar Plano por Música</AnimatedButton>
          </div>

          {/* Plano Mensal */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-beatwap-gold/50 transition-all duration-300 group relative">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Plano Mensal</h3>
              <p className="text-gray-400 text-sm">Para artistas em atividade constante</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-beatwap-gold">R$ 200</span>
              <span className="text-gray-400">/mês</span>
            </div>
            <p className="text-sm text-gray-300 mb-6 border-b border-white/10 pb-6">
              Até <span className="text-white font-bold">4 músicas</span> por mês. Extras: R$ 40,00 cada.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> Gestão de lançamentos
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> Organização de catálogo
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> Suporte durante o mês
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-300">
                <Check size={18} className="text-beatwap-gold" /> 75% Royalties para você
              </li>
            </ul>
            <AnimatedButton variant="outline" className="w-full" onClick={() => openPlan('Plano mensal', 'https://mpago.la/13HdzTe')}>Assinar Plano Mensal</AnimatedButton>
          </div>

          {/* Plano Anual */}
          <div className="bg-gradient-to-b from-beatwap-gold/10 to-transparent border border-beatwap-gold rounded-3xl p-8 relative transform md:-translate-y-4 shadow-xl shadow-beatwap-gold/10">
            <div className="absolute top-0 right-0 bg-beatwap-gold text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
              MELHOR CUSTO-BENEFÍCIO ⭐
            </div>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Plano Anual</h3>
              <p className="text-gray-400 text-sm">Equivalente a R$ 100,00/mês</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-beatwap-gold">R$ 1.200</span>
              <span className="text-gray-400">/ano</span>
            </div>
            <p className="text-sm text-gray-300 mb-6 border-b border-white/10 pb-6">
              Até <span className="text-white font-bold">4 músicas</span> por mês. Extras: R$ 30,00 cada.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-white font-medium">
                <Star size={18} className="text-beatwap-gold fill-beatwap-gold" /> Distribuição digital completa
              </li>
              <li className="flex items-center gap-3 text-sm text-white font-medium">
                <Star size={18} className="text-beatwap-gold fill-beatwap-gold" /> Gestão contínua do catálogo
              </li>
              <li className="flex items-center gap-3 text-sm text-white font-medium">
                <Star size={18} className="text-beatwap-gold fill-beatwap-gold" /> Prioridade no suporte
              </li>
              <li className="flex items-center gap-3 text-sm text-white font-medium">
                <Star size={18} className="text-beatwap-gold fill-beatwap-gold" /> Acompanhamento anual
              </li>
            </ul>
            <AnimatedButton className="w-full bg-beatwap-gold text-black hover:bg-white" onClick={() => openPlan('Plano anual', 'https://mpago.la/13wuYRF')}>Assinar Plano Anual</AnimatedButton>
          </div>
        </div>

        {/* General Conditions & Services */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Conditions */}
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Shield className="text-beatwap-gold" /> Condições Gerais
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="text-green-500" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Sem contratos abusivos</h4>
                  <p className="text-gray-400 text-sm">Contrato simples, claro e transparente. Sem letras miúdas.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-beatwap-gold/20 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="text-beatwap-gold" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Divisão Justa de Royalties</h4>
                  <p className="text-gray-400 text-sm">75% para o artista e 25% para a plataforma. A porcentagem da plataforma cobre suporte, estrutura e auxílio nos lançamentos.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="text-blue-500" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">Sem Exclusividade</h4>
                  <p className="text-gray-400 text-sm">Você é livre para gerir sua carreira (salvo acordo específico).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Services */}
          <div className="space-y-8">
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Music className="text-beatwap-gold" /> Serviços Adicionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-1">Criação de Capa Oficial</h4>
                   <p className="text-beatwap-gold font-bold text-xl mb-2">R$ 50,00</p>
                   <p className="text-xs text-gray-400">Arte nos padrões exigidos pelas plataformas.</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                   <h4 className="font-bold text-white mb-1">Posicionamento</h4>
                   <p className="text-beatwap-gold font-bold text-xl mb-2">Consultar</p>
                   <p className="text-xs text-gray-400">Estratégias fortes para site e Instagram.</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-beatwap-gold/20 to-beatwap-gold/5 rounded-3xl p-8 border border-beatwap-gold/20 text-center">
              <p className="text-lg md:text-xl font-medium text-white italic">
                Cobramos menos no lançamento e trabalhamos em parceria: o artista fica com 75% dos ganhos e a plataforma com 25%, de forma clara e sem taxas escondidas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
