import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Music, CreditCard, Star, User, Zap, MessageSquare, PenTool } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useAuth } from '../../context/AuthContext';
import CheckoutModal from './CheckoutModal';

const Pricing = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState('avulso');
  const [customCheckoutData, setCustomCheckoutData] = useState(null);
  
  // State for Plan Logic
  const [userType, setUserType] = useState('artist'); // 'artist' | 'composer'
  const [avulsoQuantity, setAvulsoQuantity] = useState(1);

  // Determine user type from profile if logged in
  useEffect(() => {
    if (profile?.cargo === 'Compositor') {
      setUserType('composer');
    }
  }, [profile]);

  // Vendedor/Produtor check
  const isEmployee = profile?.cargo === 'Vendedor' || profile?.cargo === 'Produtor' || profile?.cargo === 'Admin';

  const calculateAvulsoPrice = (qty, type) => {
    const q = Math.max(1, parseInt(qty) || 1);
    if (type === 'artist') {
      // R$ 100 first, R$ 50 others
      if (q === 1) return 100;
      return 100 + (q - 1) * 50;
    } else {
      // R$ 25 first, R$ 10 others
      if (q === 1) return 25;
      return 25 + (q - 1) * 10;
    }
  };

  const handleAvulsoBuy = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const price = calculateAvulsoPrice(avulsoQuantity, userType);
    const itemName = userType === 'artist' ? 'música(s)' : 'composição(ões)';
    
    setCustomCheckoutData({
      planName: `Plano Avulso (${avulsoQuantity} ${itemName})`,
      price: `R$ ${price.toFixed(2).replace('.', ',')}`,
      message: `Olá! Gostaria de adquirir o pacote avulso de ${avulsoQuantity} ${itemName} por R$ ${price.toFixed(2).replace('.', ',')}. Meu email é ${user.email}.`
    });
    setSelectedPlanType('custom');
    setIsCheckoutOpen(true);
  };

  const openPlan = (planKey) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (planKey === 'vitalicio') {
        const msg = `Olá! Tenho interesse no Plano Vitalício (${userType === 'artist' ? 'Artista' : 'Compositor'}). Gostaria de saber como conseguir um convite.`;
        const wa = `https://wa.me/5519981083497?text=${encodeURIComponent(msg)}`;
        window.open(wa, '_blank');
        return;
    }

    let price = '';
    let name = '';
    let link = '';

    if (userType === 'artist') {
        if (planKey === 'mensal') { price = 'R$ 200,00'; name = 'Plano Mensal (Artista)'; link = 'https://mpago.la/13HdzTe'; }
        if (planKey === 'anual') { price = 'R$ 1.200,00'; name = 'Plano Anual (Artista)'; link = 'https://mpago.la/13wuYRF'; }
    } else {
        if (planKey === 'mensal') { price = 'R$ 100,00'; name = 'Plano Mensal (Compositor)'; link = ''; }
        if (planKey === 'anual') { price = 'R$ 600,00'; name = 'Plano Anual (Compositor)'; link = ''; }
    }

    setCustomCheckoutData({
        planName: name,
        price: price,
        link: link, 
        message: `Olá! Quero assinar o ${name} por ${price}. Email: ${user.email}`
    });
    setSelectedPlanType('custom'); 
    setIsCheckoutOpen(true);
  };

  if (isEmployee) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 bg-black">
        <Shield size={64} className="text-beatwap-gold mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Acesso Corporativo</h2>
        <p className="text-gray-400 max-w-md">
          Seu perfil ({profile?.cargo}) é configurado como colaborador interno.
          Você não precisa de planos para acessar o sistema.
        </p>
      </div>
    );
  }

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-beatwap-black to-black relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-beatwap-gold/30 to-transparent"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Escolha seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Plano Ideal</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Potencialize sua carreira com as ferramentas certas.
          </p>

          {/* User Type Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-white/5 p-1 rounded-full flex relative border border-white/10">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-beatwap-gold rounded-full transition-all duration-300 ${userType === 'composer' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`}
              />
              <button 
                onClick={() => setUserType('artist')}
                className={`relative z-10 px-6 md:px-8 py-2 rounded-full font-bold transition-colors text-sm md:text-base flex items-center gap-2 ${userType === 'artist' ? 'text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Music size={16} /> Sou Artista
              </button>
              <button 
                onClick={() => setUserType('composer')}
                className={`relative z-10 px-6 md:px-8 py-2 rounded-full font-bold transition-colors text-sm md:text-base flex items-center gap-2 ${userType === 'composer' ? 'text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <PenTool size={16} /> Sou Compositor
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          
          {/* 1. PLANO AVULSO */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-purple-500/50 transition-all duration-300 flex flex-col">
            <div className="mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400">
                <Music size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Plano Avulso</h3>
              <p className="text-gray-400 text-sm mt-1">Pague apenas pelo que usar</p>
            </div>

            <div className="mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Quantidade:</span>
                <input 
                  type="number" 
                  min="1" 
                  max="100"
                  value={avulsoQuantity}
                  onChange={(e) => setAvulsoQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-center outline-none focus:border-beatwap-gold"
                />
              </div>
              <div className="text-center my-3">
                <span className="text-3xl font-bold text-white">
                  R$ {calculateAvulsoPrice(avulsoQuantity, userType).toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-center text-gray-500">
                {userType === 'artist' 
                  ? '1ª música R$ 100, add. R$ 50' 
                  : '1ª comp. R$ 25, add. R$ 10'}
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-green-500 flex-shrink-0" />
                <span>Upload de {avulsoQuantity} {userType === 'artist' ? 'música(s)' : 'composição(ões)'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-yellow-500 flex-shrink-0" />
                <span>Chat restrito (Apenas Produtores)</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-500">
                <User size={16} className="text-gray-600 flex-shrink-0" />
                <span>Sem acesso a Mentoria</span>
              </li>
            </ul>

            <AnimatedButton variant="outline" className="w-full" onClick={handleAvulsoBuy}>
              Comprar Pacote
            </AnimatedButton>
          </div>

          {/* 2. PLANO MENSAL */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-beatwap-gold/50 transition-all duration-300 flex flex-col relative group">
            <div className="absolute top-0 right-0 bg-beatwap-gold/20 text-beatwap-gold text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
              MAIS POPULAR
            </div>
            <div className="mb-4">
              <div className="w-12 h-12 bg-beatwap-gold/20 rounded-xl flex items-center justify-center mb-4 text-beatwap-gold">
                <Star size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Mensal</h3>
              <p className="text-gray-400 text-sm mt-1">Mentoria e visibilidade constante</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                R$ {userType === 'artist' ? '200' : '100'}
              </span>
              <span className="text-gray-400 text-sm">/mês</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>2 uploads/mês inclusos</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>Adicional: R$ {userType === 'artist' ? '40' : '10'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>Chat Liberado (Todos)</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>Acesso a Mentoria & Marketing</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>Assistente IA incluso</span>
              </li>
            </ul>

            <AnimatedButton className="w-full bg-beatwap-gold text-black hover:bg-white" onClick={() => openPlan('mensal')}>
              Assinar Mensal
            </AnimatedButton>
          </div>

          {/* 3. PLANO ANUAL */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-blue-500/50 transition-all duration-300 flex flex-col">
            <div className="mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400">
                <CreditCard size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Anual</h3>
              <p className="text-gray-400 text-sm mt-1">Economia e longo prazo</p>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-bold text-white">
                R$ {userType === 'artist' ? '1.200' : '600'}
              </span>
              <span className="text-gray-400 text-sm">/ano</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>24 uploads/ano (Total)</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>Todos benefícios do Mensal</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>Chat & Mentoria Full</span>
              </li>
            </ul>

            <AnimatedButton variant="outline" className="w-full" onClick={() => openPlan('anual')}>
              Assinar Anual
            </AnimatedButton>
          </div>

          {/* 4. VITALÍCIO */}
          <div className="bg-gradient-to-b from-gray-800 to-black border border-gray-700 rounded-3xl p-6 hover:border-white/50 transition-all duration-300 flex flex-col">
            <div className="mb-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 text-white">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Vitalício</h3>
              <p className="text-gray-400 text-sm mt-1">Exclusivo para convidados</p>
            </div>

            <div className="mb-6">
              <span className="text-2xl font-bold text-white">
                Sob Consulta
              </span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-white flex-shrink-0" />
                <span>Uploads Ilimitados</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-white flex-shrink-0" />
                <span>IA Ilimitada</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-white flex-shrink-0" />
                <span>Chat Totalmente Liberado</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-white flex-shrink-0" />
                <span>Acesso Vitalício</span>
              </li>
            </ul>

            <AnimatedButton variant="outline" className="w-full border-gray-600 hover:bg-white hover:text-black" onClick={() => openPlan('vitalicio')}>
              Solicitar Convite
            </AnimatedButton>
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
                  <p className="text-gray-400 text-sm">75% para o artista e 25% para a plataforma.</p>
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

        {/* Custom Checkout Modal Handling */}
        <CheckoutModal 
          isOpen={isCheckoutOpen} 
          onClose={() => setIsCheckoutOpen(false)} 
          planType={selectedPlanType}
          customData={customCheckoutData}
        />
      </div>
    </section>
  );
};

export default Pricing;
