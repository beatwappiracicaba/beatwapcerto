import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Music, Menu, X, TrendingUp, Lock, Users, Calendar, Target, FileText, MessageCircle, DollarSign, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatButton } from './FloatingChat/ChatButton';
import { ChatWindow } from './FloatingChat/ChatWindow';
import { NotificationBell } from './notifications/NotificationBell';
import { ProfileButton } from './ProfileButton';

export const DashboardLayout = ({ children }) => {
  const { user, profile } = useAuth();
  const isProdutor = profile?.cargo?.toLowerCase() === 'produtor';
  const isVendedor = profile?.cargo?.toLowerCase() === 'vendedor';
  const isAdmin = isProdutor || isVendedor; // Treat Vendor as Admin for Chat purposes
  const isCompositor = profile?.cargo?.toLowerCase() === 'compositor';
  const currentUserId = user?.id;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ trabalhos: true, trabalhoSeller: true, financeiroSeller: true });

  // Default permissions (all enabled) if not set
  const permissions = profile?.access_control || { 
    musics: !isCompositor, 
    compositions: isCompositor,
    work: !isCompositor, 
    marketing: true, 
    chat: true,
    finance: true
  };

  const location = useLocation();

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const trabalhosActive = ['/dashboard/musics', '/dashboard/compositions', '/dashboard/work', '/dashboard/marketing'].some((p) =>
    location.pathname.startsWith(p)
  );
  const trabalhoSellerActive = ['/seller/calendar', '/seller/leads', '/seller/proposals', '/seller/communications'].some((p) =>
    location.pathname.startsWith(p)
  );
  const financeiroSellerActive = location.pathname.startsWith('/seller/finance');

  const hasAccess = () => {
    if (isVendedor) return true; // Vendedor has access to their specific routes (handled by router)
    const path = location.pathname;
    if (path.includes('/dashboard/musics') && permissions.musics === false) return false;
    if (path.includes('/dashboard/compositions') && permissions.compositions === false) return false;
    if (path.includes('/dashboard/work') && permissions.work === false) return false;
    if (path.includes('/dashboard/marketing') && permissions.marketing === false) return false;
    if (path.includes('/dashboard/finance') && permissions.finance === false) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0b0b0b] to-[#161616] text-white flex">
      <aside className={`fixed md:static top-0 left-0 h-full md:h-auto w-64 p-6 space-y-4 border-r border-white/10 bg-black/95 backdrop-blur-md transition-transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-[60]`}>
        <NavLink to="/dashboard" className="text-xl font-bold tracking-wide">
          <span className="text-beatwap-gold">Beat</span><span>Wap</span>
        </NavLink>
        <button className="md:hidden absolute top-4 right-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X size={20} />
        </button>
        <nav className="space-y-4 text-sm">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'
              }`
            }
          >
            <LayoutGrid size={18} /> <span>Painel</span>
          </NavLink>

          {isVendedor && (
            <>
              {permissions.seller_artists !== false && (
                <NavLink
                  to="/seller/artists"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                      isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'
                    }`
                  }
                >
                  <Users size={18} /> <span>Artistas</span>
                </NavLink>
              )}

              {(permissions.seller_calendar !== false ||
                permissions.seller_leads !== false ||
                permissions.seller_proposals !== false ||
                permissions.seller_communications !== false) && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSection('trabalhoSeller')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      trabalhoSellerActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span>Trabalho</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${openSections.trabalhoSeller ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      openSections.trabalhoSeller ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="mt-1 space-y-1">
                      {permissions.seller_calendar !== false && (
                        <NavLink
                          to="/seller/calendar"
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                              isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                            }`
                          }
                        >
                          <Calendar size={14} />
                          <span>Agenda</span>
                        </NavLink>
                      )}
                      {permissions.seller_leads !== false && (
                        <NavLink
                          to="/seller/leads"
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                              isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                            }`
                          }
                        >
                          <Target size={14} />
                          <span>Oportunidades</span>
                        </NavLink>
                      )}
                      {permissions.seller_proposals !== false && (
                        <NavLink
                          to="/seller/proposals"
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                              isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                            }`
                          }
                        >
                          <FileText size={14} />
                          <span>Propostas</span>
                        </NavLink>
                      )}
                      {permissions.seller_communications !== false && (
                        <NavLink
                          to="/seller/communications"
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                              isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                            }`
                          }
                        >
                          <MessageCircle size={14} />
                          <span>Comunicação</span>
                        </NavLink>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {permissions.seller_finance !== false && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSection('financeiroSeller')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                      financeiroSellerActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign size={16} />
                      <span>Financeiro</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${openSections.financeiroSeller ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      openSections.financeiroSeller ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="mt-1 space-y-1">
                      <NavLink
                        to="/seller/finance"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                            isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                          }`
                        }
                      >
                        <DollarSign size={14} />
                        <span>Comissões</span>
                      </NavLink>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!isVendedor && (
            <>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleSection('trabalhos')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors ${
                    trabalhosActive ? 'bg-white/10 text-beatwap-gold' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>Trabalhos</span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${openSections.trabalhos ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    openSections.trabalhos ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="mt-1 space-y-1">
                    {permissions.musics !== false && !isCompositor && (
                      <NavLink
                        to="/dashboard/musics"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                            isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                          }`
                        }
                      >
                        <Music size={14} />
                        <span>Minhas Músicas</span>
                      </NavLink>
                    )}
                    {permissions.compositions !== false && isCompositor && (
                      <NavLink
                        to="/dashboard/compositions"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                            isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                          }`
                        }
                      >
                        <Music size={14} />
                        <span>Minhas Composições</span>
                      </NavLink>
                    )}
                    {permissions.work !== false && !isCompositor && (
                      <NavLink
                        to="/dashboard/work"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                            isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                          }`
                        }
                      >
                        <Calendar size={14} />
                        <span>Agenda / Afazeres</span>
                      </NavLink>
                    )}
                    {permissions.marketing !== false && (
                      <NavLink
                        to="/dashboard/marketing"
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-5 py-2 rounded-xl transition-colors ${
                            isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5 text-gray-300'
                          }`
                        }
                      >
                        <TrendingUp size={14} />
                        <span>{isCompositor ? 'Carreira & Negócios' : 'Marketing / Mentoria'}</span>
                      </NavLink>
                    )}
                  </div>
                </div>
              </div>

              {permissions.finance !== false && (
                <NavLink
                  to="/dashboard/finance"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                      isActive ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'
                    }`
                  }
                >
                  <DollarSign size={18} /> <span>Financeiro</span>
                </NavLink>
              )}
            </>
          )}
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
          <ChatWindow isAdmin={isAdmin} currentUserId={currentUserId} />
        </>
      )}
    </div>
  );
};
