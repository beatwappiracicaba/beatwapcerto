import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Music, CreditCard, Star, User, PenTool } from 'lucide-react';
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
  const [avulsoQuantity, setAvulsoQuantity] = useState('0'); // permitir limpar e digitar; exige >=1 para continuar

  // Determine user type from profile if logged in
  useEffect(() => {
    if (profile?.cargo === 'Compositor') {
      setUserType('composer');
    }
  }, [profile]);

  // Vendedor/Produtor check
  const isEmployee = profile?.cargo === 'Vendedor' || profile?.cargo === 'Produtor' || profile?.cargo === 'Admin';

  const calculateAvulsoPrice = (qty, type) => {
    const q = parseInt(qty, 10);
    if (!q || q < 1) return 0;
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
    const q = parseInt(avulsoQuantity, 10);
    if (!q || q < 1) {
      window.alert('Informe a quantidade de músicas para continuar.');
      return;
    }
    const price = calculateAvulsoPrice(q, userType);
    const itemName = userType === 'artist' ? 'música(s)' : 'composição(ões)';
    
    setCustomCheckoutData({
      display_name: `Plano Avulso (${q} ${itemName})`,
      display_price: `R$ ${price.toFixed(2).replace('.', ',')}`,
      product_type: 'credits_upload',
      quantity: q,
      user_type: userType
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

    if (userType === 'artist') {
        if (planKey === 'mensal') { price = 'R$ 100,00'; name = 'Plano Profissional (Artista)'; }
        if (planKey === 'anual') { price = 'R$ 600,00'; name = 'Plano Elite (Artista)'; }
    } else {
        if (planKey === 'mensal') { price = 'R$ 100,00'; name = 'Plano Destaque (Compositor)'; }
        if (planKey === 'anual') { price = 'R$ 600,00'; name = 'Plano Pro (Compositor)'; }
    }

    setCustomCheckoutData({
        display_name: name,
        display_price: price,
        product_type: 'plan',
        plan_key: planKey,
        user_type: userType
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
    <section id="planos" className="py-20 px-6 bg-gradient-to-b from-beatwap-black to-black relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-beatwap-gold/30 to-transparent"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
            Escolha seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Plano Ideal</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            {userType === 'artist'
              ? 'Lance suas músicas, conecte com profissionais e leve sua carreira para o próximo nível'
              : 'Mostre suas músicas, conecte com artistas e transforme ideias em lançamentos'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 max-w-6xl mx-auto">
          
          {/* 1. PLANO AVULSO */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-purple-500/50 transition-all duration-300 flex flex-col">
            <div className="mb-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400">
                <Music size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">{userType === 'artist' ? 'Iniciante' : 'Descoberta'}</h3>
              <p className="text-gray-400 text-sm mt-1">{userType === 'artist' ? 'Pague apenas quando quiser lançar' : 'Mostre suas músicas quando quiser'}</p>
            </div>

            <div className="mb-6 bg-black/40 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Quantidade:</span>
                <input 
                  type="number" 
                  min="0"
                  max="100"
                  value={avulsoQuantity}
                  onChange={(e) => setAvulsoQuantity(e.target.value)}
                  className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-center outline-none focus:border-beatwap-gold"
                />
              </div>
              {(!parseInt(avulsoQuantity, 10) || parseInt(avulsoQuantity, 10) < 1) && (
                <div className="text-xs text-red-400 text-right mb-2">Informe a quantidade para continuar</div>
              )}
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
                <span>{userType === 'artist' ? 'Lance sua música na plataforma' : 'Publique sua composição'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-yellow-500 flex-shrink-0" />
                <span>Chat com produtores</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-yellow-500 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Distribuição opcional para plataformas digitais' : 'Visibilidade dentro da plataforma'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-yellow-500 flex-shrink-0" />
                <span>Ideal para testar a plataforma</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-yellow-500 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Música adicional: R$ 50' : 'Composição adicional: R$ 10'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-500">
                <User size={16} className="text-gray-600 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Capa profissional: R$ 50' : 'Capa: R$ 50'}</span>
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
            <div className="mb-4 text-center sm:text-left">
              <div className="w-12 h-12 bg-beatwap-gold/20 rounded-xl flex items-center justify-center mb-4 text-beatwap-gold">
                <Star size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">{userType === 'artist' ? 'Profissional' : 'Destaque'}</h3>
              <p className="text-gray-400 text-sm mt-1">{userType === 'artist' ? 'Visibilidade + lançamentos constantes' : 'Seja encontrado por artistas'}</p>
            </div>

            <div className="mb-6 flex items-end justify-center sm:justify-start gap-2">
              <span className="text-4xl font-bold text-white leading-none">
                R$ {userType === 'artist' ? '100' : '100'}
              </span>
              <span className="text-gray-400 text-sm pb-1">/mês</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>
                  {userType === 'artist'
                    ? 'Lance até 2 músicas por mês'
                    : 'Publique até 2 composições por mês'}
                </span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>
                  {userType === 'artist'
                    ? 'Converse com artistas, produtores e compositores'
                    : 'Converse direto com artistas e produtores'}
                </span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>Acesso à mentoria e direcionamento</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>{userType === 'artist' ? 'Capas gratuitas para suas músicas' : 'Capas gratuitas'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>{userType === 'artist' ? 'Seu perfil em destaque para ser encontrado' : 'Perfil em destaque para artistas te encontrarem'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>{userType === 'artist' ? 'Mais chances de conexão e parcerias' : 'Mais visibilidade'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-beatwap-gold flex-shrink-0" />
                <span>{userType === 'artist' ? 'Ideal pra quem quer crescer de verdade' : 'Perfeito pra quem quer ter música gravada'}</span>
              </li>
            </ul>

            <AnimatedButton className="w-full bg-beatwap-gold text-black hover:bg-white" onClick={() => openPlan('mensal')}>
              Assinar Mensal
            </AnimatedButton>
          </div>

          {/* 3. PLANO ANUAL */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-blue-500/50 transition-all duration-300 flex flex-col">
            <div className="mb-4 text-center sm:text-left">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 text-blue-400">
                <CreditCard size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">{userType === 'artist' ? 'Elite' : 'Pro'}</h3>
              <p className="text-gray-400 text-sm mt-1">{userType === 'artist' ? 'Foco total em crescimento e oportunidades' : 'Máxima visibilidade e oportunidades'}</p>
            </div>

            <div className="mb-6 flex items-end justify-center sm:justify-start gap-2">
              <span className="text-4xl font-bold text-white leading-none">
                R$ {userType === 'artist' ? '600' : '600'}
              </span>
              <span className="text-gray-400 text-sm pb-1">/ano</span>
            </div>

            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>
                  {userType === 'artist'
                    ? 'Lance até 24 músicas por ano'
                    : 'Publique até 24 composições por ano'}
                </span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Acesso completo ao chat (network total)' : 'Chat liberado com todos'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Mentoria completa + marketing' : 'Mentoria completa + estratégia'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>Assistente IA incluso</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>Capas profissionais gratuitas</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Perfil com máxima visibilidade' : 'Perfil com destaque máximo'}</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-300">
                <Check size={16} className="text-blue-400 flex-shrink-0" />
                <span>{userType === 'artist' ? 'Pra quem quer viver da música' : 'Pra quem quer transformar composição em carreira'}</span>
              </li>
            </ul>

            <AnimatedButton variant="outline" className="w-full" onClick={() => openPlan('anual')}>
              Assinar Anual
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
                  <h4 className="font-bold text-white text-lg">Royalties e Distribuição</h4>
                  <p className="text-gray-400 text-sm">
                    Planos pagos: não cobramos percentual de royalties. Podemos ouvir sua música e, se gostarmos,
                    distribuímos nas plataformas sem custo e ficamos com 50% dos royalties.
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Royalties são valores pagos pelas plataformas pelo uso da sua música (streams, downloads, execuções),
                    repassados aos detentores dos direitos.
                  </p>
                  <div className="mt-3">
                    <AnimatedButton 
                      onClick={() => window.open('https://wa.me/5519981083497?text=Quero%20enviar%20minha%20m%C3%BAsica%20para%20an%C3%A1lise', '_blank')}
                      className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
                    >
                      Envie sua música para análise
                    </AnimatedButton>
                  </div>
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
                Planos pagos: 0% de royalties para a plataforma. Distribuição opcional por curadoria: 50/50 sobre os royalties.
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
