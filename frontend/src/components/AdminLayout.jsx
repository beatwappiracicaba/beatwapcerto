import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Users, User, Music, Menu, X, Settings, DollarSign, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';

export const AdminLayout = ({ children }) => {
  const { user, profile } = useAuth();
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    gestao: false,
    catalogo: false,
    financeiro: false,
    sistema: false
  });
  const location = useLocation();
 
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
 
  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
 
  const gestaoActive = ['/admin/artists', '/admin/composers', '/admin/sellers', '/admin/sponsors'].some((p) =>
    location.pathname.startsWith(p)
  );
  const catalogoActive = ['/admin/musics', '/admin/compositions'].some((p) =>
    location.pathname.startsWith(p)
  );
  const financeiroActive = location.pathname.startsWith('/admin/finance');
  const sistemaActive = location.pathname.startsWith('/admin/settings');
  const publicProfileActive = location.pathname.startsWith('/admin/public-profile');

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
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-xs uppercase tracking-wide ${
                isActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-400 hover:bg-white/5'
              }`
            }
          >
            <LayoutGrid size={16} />
            <span>Painel</span>
          </NavLink>

          <NavLink
            to="/dashboard/feed"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-xs uppercase tracking-wide ${
                isActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-400 hover:bg-white/5'
              }`
            }
          >
            <Music size={16} />
            <span>🔥 Feed</span>
          </NavLink>

          <NavLink
            to="/admin/public-profile"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-xs uppercase tracking-wide ${
                isActive || publicProfileActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-400 hover:bg-white/5'
              }`
            }
          >
            <User size={16} />
            <span>Perfil Público</span>
          </NavLink>

          {(permissions.admin_artists !== false ||
            permissions.admin_composers !== false ||
            permissions.admin_sellers !== false ||
            permissions.admin_sponsors !== false) && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection('gestao')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  gestaoActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users size={16} />
                  <span>Gestão</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openSections.gestao ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openSections.gestao ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="mt-1 space-y-1">
                  {permissions.admin_artists !== false && (
                    <NavLink
                      to="/admin/artists"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                        }`
                      }
                    >
                      <span>Artistas</span>
                    </NavLink>
                  )}
                  {permissions.admin_composers !== false && (
                    <NavLink
                      to="/admin/composers"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                        }`
                      }
                    >
                      <span>Compositores</span>
                    </NavLink>
                  )}
                  {permissions.admin_sellers !== false && (
                    <NavLink
                      to="/admin/sellers"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                        }`
                      }
                    >
                      <span>Vendedores</span>
                    </NavLink>
                  )}
                  {permissions.admin_sponsors !== false && (
                    <NavLink
                      to="/admin/sponsors"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                        }`
                      }
                    >
                      <span>Patrocinadores / Parcerias</span>
                    </NavLink>
                  )}
                </div>
              </div>
            </div>
          )}

          {(permissions.admin_musics !== false || permissions.admin_compositions !== false) && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection('catalogo')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  catalogoActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Music size={16} />
                  <span>Catálogo</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openSections.catalogo ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openSections.catalogo ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="mt-1 space-y-1">
                  {permissions.admin_musics !== false && (
                    <NavLink
                      to="/admin/musics"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                        }`
                      }
                    >
                      <span>Músicas</span>
                    </NavLink>
                  )}
                  {permissions.admin_compositions !== false && (
                    <NavLink
                      to="/admin/compositions"
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                          isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                        }`
                      }
                    >
                      <span>Composições</span>
                    </NavLink>
                  )}
                </div>
              </div>
            </div>
          )}

          {permissions.admin_finance !== false && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection('financeiro')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  financeiroActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <DollarSign size={16} />
                  <span>Financeiro</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openSections.financeiro ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openSections.financeiro ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="mt-1 space-y-1">
                  <NavLink
                    to="/admin/finance"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                        isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                      }`
                    }
                  >
                    <span>Financeiro</span>
                  </NavLink>
                </div>
              </div>
            </div>
          )}

          {permissions.admin_settings !== false && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection('sistema')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                  sistemaActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Settings size={16} />
                  <span>Sistema</span>
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${openSections.sistema ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openSections.sistema ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="mt-1 space-y-1">
                  <NavLink
                    to="/admin/settings"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                        isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                      }`
                    }
                  >
                    <span>Configurações</span>
                  </NavLink>
                </div>
              </div>
            </div>
          )}
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
