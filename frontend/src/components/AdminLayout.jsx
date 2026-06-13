import { useMemo, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Users, User, Music, Menu, X, Settings, DollarSign, ClipboardList, Ticket, Search, MessageCircle, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';

export const AdminLayout = ({ children }) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
 
  // Default permissions for admin (all enabled if not set)
  const permissions = profile?.access_control || {
    admin_artists: true,
    admin_composers: true,
    admin_musics: true,
    admin_compositions: true,
    admin_sponsors: true,
    admin_settings: true,
    admin_sellers: true,
    admin_finance: true,
    chat: true
  };
 
  // Expose a global helper to close the mobile sidebar from deep components
  // Avoids prop drilling for simple UX adjustments
  useEffect(() => {
    try {
      window.__closeAdminSidebar = () => setSidebarOpen(false);
    } catch { /* ignore */ }
    return () => {
      try { delete window.__closeAdminSidebar; } catch { /* ignore */ }
    };
  }, []);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
      isActive ? 'bg-white/10 text-beatwap-gold ring-1 ring-white/10' : 'text-gray-300 hover:bg-white/5'
    }`;

  const sectionTitleClass = 'px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500';

  const sidebarSections = useMemo(() => ([
    {
      title: 'Visao',
      items: [
        { to: '/admin', label: 'Painel', icon: LayoutGrid },
        { to: '/dashboard/feed', label: 'Feed', icon: Music },
        { to: '/dashboard/pesquisar', label: 'Pesquisar', icon: Search }
      ]
    },
    {
      title: 'Operacao',
      items: [
        { to: '/admin/eventos', label: 'Eventos', icon: Ticket },
        { to: '/admin/eventos/portaria', label: 'Portaria', icon: Ticket },
        { to: '/admin/auditions', label: 'Audicoes', icon: ClipboardList },
        permissions.chat !== false ? { to: '/admin/chat', label: 'Chat Admin', icon: MessageCircle } : null
      ].filter(Boolean)
    },
    {
      title: 'Gestao',
      items: [
        permissions.admin_artists !== false ? { to: '/admin/artists', label: 'Artistas', icon: Users } : null,
        permissions.admin_composers !== false ? { to: '/admin/composers', label: 'Compositores', icon: Music } : null,
        permissions.admin_sellers !== false ? { to: '/admin/sellers', label: 'Vendedores', icon: Users } : null,
        permissions.admin_sponsors !== false ? { to: '/admin/sponsors', label: 'Patrocinadores e parcerias', icon: Users } : null
      ].filter(Boolean)
    },
    {
      title: 'Catalogo',
      items: [
        permissions.admin_musics !== false ? { to: '/admin/musics', label: 'Musicas', icon: Music } : null,
        permissions.admin_compositions !== false ? { to: '/admin/compositions', label: 'Composicoes', icon: Music } : null
      ].filter(Boolean)
    },
    {
      title: 'Financeiro',
      items: [
        permissions.admin_finance !== false ? { to: '/admin/finance', label: 'Financeiro', icon: DollarSign } : null
      ].filter(Boolean)
    },
    {
      title: 'Conta',
      items: [
        { to: '/admin/profile', label: 'Perfil', icon: User },
        { to: '/admin/public-profile', label: 'Perfil Publico', icon: Users },
        permissions.admin_settings !== false ? { to: '/admin/settings', label: 'Configuracoes', icon: Settings } : null,
        { to: '/', label: 'Voltar ao site', icon: Home }
      ].filter(Boolean)
    }
  ]), [permissions.admin_artists, permissions.admin_composers, permissions.admin_finance, permissions.admin_musics, permissions.admin_compositions, permissions.admin_settings, permissions.admin_sellers, permissions.admin_sponsors, permissions.chat]);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/admin' || item.to === '/'}
        className={navLinkClass}
        onClick={() => setSidebarOpen(false)}
      >
        <Icon size={18} />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 p-6 space-y-4 border-r border-white/10 bg-black/95 backdrop-blur-md transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-[60]`}>
        <div className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span>Wap
        </div>
        <button className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <nav className="space-y-4 text-sm">
          {sidebarSections.filter((section) => section.items.length > 0).map((section) => (
            <div key={section.title} className="space-y-2">
              <div className={sectionTitleClass}>{section.title}</div>
              <div className="space-y-1">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 md:ml-0 ml-0 w-full min-w-0">
        <div className="container max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400">Painel do Produtor</div>
              <div className="text-lg md:text-2xl font-bold truncate">
                {profile?.nome || 'Produtor'}
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
          <div className="space-y-6">{children}</div>
        </div>
      </main>
      {permissions.chat !== false && <ChatButton isAdmin={true} currentUserId={currentUserId} />}
      {permissions.chat !== false && <ChatWindow isAdmin={true} currentUserId={currentUserId} />}
    </div>
  );
};
