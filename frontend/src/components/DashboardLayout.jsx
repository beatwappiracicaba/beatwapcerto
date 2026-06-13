import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Music, Menu, X, TrendingUp, Lock, Users, User, Calendar, Target, FileText, MessageCircle, DollarSign, Search, Home, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';

export const DashboardLayout = ({ children }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isProdutor = profile?.cargo?.toLowerCase() === 'produtor';
  const isVendedor = profile?.cargo?.toLowerCase() === 'vendedor';
  const isAdmin = isProdutor || isVendedor; // Treat Vendor as Admin for Chat purposes
  const isCompositor = profile?.cargo?.toLowerCase() === 'compositor';
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState({});

  const plan = String(profile?.plano || '');
  const normalizedPlan = plan.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const planAllowsPublicProfile =
    normalizedPlan.includes('mensal') ||
    normalizedPlan.includes('anual') ||
    normalizedPlan.includes('vitalicio') ||
    normalizedPlan.includes('lifetime');
  const isLifetime = normalizedPlan.includes('vitalicio') || normalizedPlan.includes('lifetime');
  const planOverride = !!profile?.access_control?.plan_override;
  const defaultPermissions = { 
    musics: !isCompositor, 
    compositions: isCompositor,
    work: !isCompositor, 
    marketing: true, 
    chat: true,
    finance: true,
    public_profile: true
  };
  let permissions = { ...defaultPermissions, ...(profile?.access_control || {}) };
  let allowAI = true;
  if (!isProdutor && !isVendedor && !planOverride) {
    if (isLifetime) {
      permissions = { ...permissions, musics: true, compositions: true, work: true, marketing: true, chat: true, finance: true };
      allowAI = true;
    } else if (normalizedPlan.includes('sem') || normalizedPlan === '' || normalizedPlan.includes('sem plano')) {
      permissions = { ...permissions, musics: false, compositions: false, work: false, marketing: false, chat: false, finance: false };
      allowAI = false;
    } else if (normalizedPlan.includes('avulso')) {
      if (isCompositor) {
        permissions = { ...permissions, musics: false, compositions: true, work: false, marketing: false, finance: false, chat: true, public_profile: false };
      } else {
        permissions = { ...permissions, musics: true, compositions: false, work: false, marketing: false, finance: false, chat: true, public_profile: false };
      }
      allowAI = false;
    } else if (normalizedPlan.includes('mensal')) {
      if (isCompositor) {
        permissions = { ...permissions, musics: false, compositions: true, chat: true, public_profile: true };
        allowAI = false;
      } else {
        permissions = { ...permissions, musics: true, compositions: true, work: true, marketing: true, chat: true, finance: true, public_profile: true };
        allowAI = false;
      }
    } else if (normalizedPlan.includes('anual')) {
      if (isCompositor) {
        permissions = { ...permissions, musics: false, compositions: true, chat: true, public_profile: true };
      } else {
        permissions = { ...permissions, musics: true, compositions: true, work: true, marketing: true, chat: true, finance: true, public_profile: true };
      }
      allowAI = true;
    }
  } else {
    allowAI = true;
  }

  const location = useLocation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const openUpgradeModal = () => setShowUpgradeModal(true);
  const closeUpgradeModal = () => setShowUpgradeModal(false);

  const hasAccess = () => {
    if (isVendedor) return true; // Vendedor has access to their specific routes (handled by router)
    const path = location.pathname;
    if (path.includes('/dashboard/musics') && permissions.musics === false) return false;
    if (path.includes('/dashboard/compositions') && permissions.compositions === false) return false;
    if (path.includes('/dashboard/work') && permissions.work === false) return false;
    if (path.includes('/dashboard/marketing') && permissions.marketing === false) return false;
    if (path.includes('/dashboard/chat') && permissions.chat === false) return false;
    if (path.includes('/dashboard/finance') && permissions.finance === false) return false;
    if (path.includes('/dashboard/gestao/perfil-publico') && (!planAllowsPublicProfile || permissions.public_profile === false)) return false;
    return true;
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
      isActive ? 'bg-white/10 text-beatwap-gold ring-1 ring-white/10' : 'text-gray-300 hover:bg-white/5'
    }`;

  const sectionTitleClass = 'px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500';

  const profilePublicItem = (permissions.public_profile !== false) && (planAllowsPublicProfile || planOverride)
    ? { type: 'link', to: '/dashboard/gestao/perfil-publico', label: 'Perfil Publico', icon: Users }
    : { type: 'button', label: 'Perfil Publico', icon: Users, onClick: openUpgradeModal };

  const commonViewItems = [
    { type: 'link', to: '/dashboard/painel', label: 'Painel', icon: LayoutGrid },
    { type: 'link', to: '/dashboard/feed', label: 'Feed', icon: TrendingUp },
    { type: 'link', to: '/dashboard/pesquisar', label: 'Pesquisar', icon: Search }
  ];

  const sidebarSections = useMemo(() => {
    const accountItems = [
      { type: 'link', to: '/dashboard/profile', label: 'Perfil', icon: User },
      profilePublicItem,
      { type: 'link', to: '/', label: 'Voltar ao site', icon: Home }
    ];

    if (isVendedor) {
      return [
        { title: 'Visao', items: commonViewItems },
        {
          title: 'Pipeline',
          items: [
            permissions.seller_leads !== false ? { type: 'link', to: '/seller/leads', label: 'Leads', icon: Target } : null,
            permissions.seller_proposals !== false ? { type: 'link', to: '/seller/proposals', label: 'Propostas', icon: FileText } : null,
            permissions.seller_communications !== false ? { type: 'link', to: '/seller/communications', label: 'Comunicacao', icon: MessageCircle } : null
          ].filter(Boolean)
        },
        {
          title: 'Operacao',
          items: [
            permissions.seller_artists !== false ? { type: 'link', to: '/seller/artists', label: 'Artistas', icon: Users } : null,
            permissions.seller_calendar !== false ? { type: 'link', to: '/seller/calendar', label: 'Agenda', icon: Calendar } : null
          ].filter(Boolean)
        },
        {
          title: 'Financeiro',
          items: [
            permissions.seller_finance !== false ? { type: 'link', to: '/seller/finance', label: 'Comissoes', icon: DollarSign } : null
          ].filter(Boolean)
        },
        { title: 'Conta', items: accountItems }
      ];
    }

    if (isCompositor) {
      return [
        { title: 'Visao', items: commonViewItems },
        {
          title: 'Oportunidades',
          items: [
            { type: 'link', to: '/audicoes', label: 'Audicoes', icon: Target },
            permissions.chat !== false ? { type: 'link', to: '/dashboard/chat', label: 'Chat', icon: MessageCircle } : null
          ].filter(Boolean)
        },
        {
          title: 'Catalogo',
          items: [
            permissions.compositions !== false ? { type: 'link', to: '/dashboard/compositions', label: 'Minhas composicoes', icon: Music } : null
          ].filter(Boolean)
        },
        {
          title: 'Carreira',
          items: [
            permissions.marketing !== false ? { type: 'link', to: '/dashboard/marketing', label: 'Carreira e negocios', icon: TrendingUp } : null,
            permissions.finance !== false ? { type: 'link', to: '/dashboard/finance', label: 'Financeiro', icon: DollarSign } : null
          ].filter(Boolean)
        },
        { title: 'Conta', items: accountItems }
      ];
    }

    return [
      { title: 'Visao', items: commonViewItems },
      {
        title: 'Criacao',
        items: [
          permissions.musics !== false ? { type: 'link', to: '/dashboard/musics', label: 'Minhas musicas', icon: Music } : null,
          permissions.compositions !== false ? { type: 'link', to: '/dashboard/compositions', label: 'Composicoes', icon: FileText } : null
        ].filter(Boolean)
      },
      {
        title: 'Relacionamento',
        items: [
          permissions.chat !== false ? { type: 'link', to: '/dashboard/chat', label: 'Chat', icon: MessageCircle } : null
        ].filter(Boolean)
      },
      {
        title: 'Carreira',
        items: [
          permissions.work !== false ? { type: 'link', to: '/dashboard/work', label: 'Agenda e afazeres', icon: Calendar } : null,
          permissions.marketing !== false ? { type: 'link', to: '/dashboard/marketing', label: 'Marketing e mentoria', icon: TrendingUp } : null,
          permissions.finance !== false ? { type: 'link', to: '/dashboard/finance', label: 'Financeiro', icon: DollarSign } : null
        ].filter(Boolean)
      },
      { title: 'Conta', items: accountItems }
    ];
  }, [commonViewItems, isCompositor, isVendedor, permissions.chat, permissions.compositions, permissions.finance, permissions.musics, permissions.public_profile, permissions.seller_artists, permissions.seller_calendar, permissions.seller_communications, permissions.seller_finance, permissions.seller_leads, permissions.seller_proposals, permissions.work, permissions.marketing, planAllowsPublicProfile, planOverride, profilePublicItem]);

  const isSectionActive = (section) =>
    section.items.some((item) => {
      if (item.type !== 'link' || !item.to) return false;
      if (item.to === '/dashboard/painel') return location.pathname === item.to;
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setOpenSections((prev) => {
      const next = { ...prev };
      let changed = false;

      sidebarSections.forEach((section, index) => {
        const shouldOpenByDefault = index === 0 || isSectionActive(section);
        if (typeof next[section.title] === 'undefined') {
          next[section.title] = shouldOpenByDefault;
          changed = true;
        } else if (isSectionActive(section) && !next[section.title]) {
          next[section.title] = true;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [location.pathname, sidebarSections]);

  const toggleSection = (title) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderNavItem = (item) => {
    const Icon = item.icon;
    if (item.type === 'button') {
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            setSidebarOpen(false);
            item.onClick?.();
          }}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-300 transition-colors hover:bg-white/5"
        >
          <Icon size={18} />
          <span>{item.label}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/dashboard/painel' || item.to === '/'}
        className={navLinkClass}
        onClick={() => {
          setSidebarOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 p-6 space-y-4 border-r border-white/10 bg-black/95 backdrop-blur-md transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-[60]`}>
        <NavLink to="/" className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span><span>Wap</span>
        </NavLink>
        <button className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <nav className="space-y-4 text-sm">
          {sidebarSections.filter((section) => section.items.length > 0).map((section) => (
            <div key={section.title} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                  isSectionActive(section) ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className={sectionTitleClass}>{section.title}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform ${openSections[section.title] ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openSections[section.title] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="space-y-1 pt-1">
                  {section.items.map(renderNavItem)}
                </div>
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 w-full px-4 sm:px-6 py-6 md:ml-0 ml-0">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400">Bem-vindo</div>
              <div className="text-lg md:text-2xl font-bold truncate">
                {profile?.nome || profile?.cargo || 'Usuário'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6 shrink-0">
            <div className="relative z-50">
              {currentUserId && <NotificationBell userId={currentUserId} />}
            </div>
            <div className="h-6 w-px bg-white/10 hidden md:block"></div>
            <ProfileButton profile={profile} />
          </div>
        </div>
        <div className="space-y-6 max-w-7xl mx-auto w-full">
          {hasAccess() ? children : (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
              <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                <Lock size={48} />
              </div>
              <h2 className="text-2xl font-bold"><span>Acesso Restrito</span></h2>
              <p className="text-gray-400 max-w-md">
                <span>Você não tem permissão para acessar esta seção. Entre em contato com seu produtor para solicitar acesso.</span>
              </p>
            </div>
          )}
        </div>
      </main>
      
      {permissions.chat !== false && (
        <>
          <ChatButton isAdmin={isAdmin} currentUserId={currentUserId} />
          <ChatWindow currentUserId={currentUserId} allowAI={allowAI} />
        </>
      )}
      
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeUpgradeModal} />
          <div className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="text-lg font-bold text-white">Recurso exclusivo de planos</div>
            <div className="text-sm text-gray-300">
              O Perfil Público está disponível nos planos Mensal e Anual. Faça upgrade para ativar sua página pública e aparecer na Home.
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={closeUpgradeModal}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => { closeUpgradeModal(); navigate('/dashboard/profile'); }}
                className="px-4 py-2 rounded-xl bg-beatwap-gold text-beatwap-black font-bold hover:brightness-95"
              >
                Ir para Plano
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
