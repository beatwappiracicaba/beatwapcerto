import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layouts
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

// UI
import { LoadingScreen } from '../components/LoadingScreen';

// DashboardLayout removido durante reconstrução

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import RegisterInvite from '../pages/RegisterInvite';
import InviteInvalid from '../pages/InviteInvalid';
import ResetPassword from '../pages/ResetPassword';
import ForgotPassword from '../pages/ForgotPassword';
import AuthCallback from '../pages/AuthCallback';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';
import Copyright from '../pages/Copyright';
import LegalAll from '../pages/LegalAll';
import { DashboardArtistHome, DashboardArtistMusics, DashboardArtistChat } from '../pages/DashboardArtist';
import { DashboardMarketing } from '../pages/DashboardMarketing';
import DashboardWork from '../pages/DashboardWork';
import { DashboardArtistProfile, DashboardPublicProfile } from '../pages/DashboardArtistProfile';
import AllCompositions from '../pages/AllCompositions';
import { AdminHome, AdminArtists, AdminComposers, AdminMusics, AdminChat, AdminProfile, AdminPublicProfile } from '../pages/AdminDashboard';
import { AdminSellers } from '../pages/AdminSellers';
import { AdminFinance } from '../pages/AdminFinance';
import { AdminCompositions } from '../pages/AdminCompositions';
import { AdminSponsors } from '../pages/AdminDashboard';
import { AdminSettings } from '../pages/AdminSettings';
import { DashboardCompositions } from '../pages/DashboardCompositions';
import DashboardFinance from '../pages/DashboardFinance';
import PublicProfile from '../pages/PublicProfile';
import AlbumPage from '../pages/AlbumPage';
import SellerDashboard from '../pages/SellerDashboard';
import SellerArtists from '../pages/SellerArtists';
import SellerAgenda from '../pages/SellerAgenda';
import SellerLeads from '../pages/SellerLeads';
import SellerFinance from '../pages/SellerFinance';
import SellerProposals from '../pages/SellerProposals';
import SellerCommunications from '../pages/SellerCommunications';
import NotificationDetails from '../pages/NotificationDetails';

// Admin temporariamente desativado

export const AppRoutes = () => {
  const location = useLocation();
  const [splashMounted, setSplashMounted] = useState(true);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const auth = useAuth() || {};
  const profile = auth.profile || null;
  const loading = auth.loading || false;
  
  useEffect(() => {
    const id = setTimeout(() => setSplashMinDone(true), 3500);
    return () => clearTimeout(id);
  }, []);

  const normalizeRole = (r) => {
    if (!r) return r;
    const s = String(r).trim();
    if (s === 'Produtor') return 'Produtor';
    if (s === 'Vendedor') return 'Vendedor';
    if (s === 'Artista') return 'Artista';
    if (s === 'Compositor') return 'Compositor';
    return s;
  };

  const routeForRole = (role) => {
    const r = normalizeRole(role);
    if (r === 'Produtor') return '/dashboard-produtor';
    if (r === 'Vendedor') return '/dashboard-vendedor';
    if (r === 'Artista') return '/dashboard-artista';
    if (r === 'Compositor') return '/dashboard-compositor';
    return '/';
  };

  const ProtectedRoute = ({ element }) => {
    if (loading) return null;
    if (!profile) return <Navigate to="/login" replace />;
    return element;
  };

  const RoleBasedRoute = ({ roles, element }) => {
    if (loading) return null;
    const userRole = normalizeRole(profile?.cargo);
    if (!profile) return <Navigate to="/login" replace />;
    if (!roles.includes(userRole)) return <Navigate to={routeForRole(userRole)} replace />;
    return element;
  };
  
  const splashActive = !splashMinDone || loading;

  useEffect(() => {
    if (!splashActive) {
      const id = setTimeout(() => setSplashMounted(false), 900);
      return () => clearTimeout(id);
    }
  }, [splashActive]);

  if (splashMounted) {
    return <LoadingScreen active={splashActive} onComplete={() => setSplashMounted(false)} />;
  }

  const isArtista = profile?.cargo === 'Artista';
  const isProdutor = profile?.cargo === 'Produtor';
  const isCompositor = profile?.cargo === 'Compositor';
  const isVendedor = profile?.cargo === 'Vendedor';
  const planNorm = String(profile?.plano || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const isAvulsoPlan = planNorm.includes('avulso');

  return (
      <Routes location={location}>
        {/* Public Route - Landing Page */}
        <Route path="/" element={profile ? <Navigate to={routeForRole(profile?.cargo)} replace /> : <Home />} />
        <Route path="/composicoes" element={<AllCompositions />} />
        <Route path="/profile/:id" element={<PublicProfile />} />
        <Route path="/album/:id" element={<AlbumPage />} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/invite" element={<RegisterInvite />} />
          <Route path="/register/invite-invalid" element={<InviteInvalid />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
        
        {/* Rota de Callback para Confirmação de Email */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route path="/dashboard" element={<ProtectedRoute element={<Navigate to={routeForRole(profile?.cargo)} replace />} />} />
        <Route path="/dashboard/musics" element={isArtista ? <DashboardArtistMusics /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/compositions" element={(isArtista || isCompositor) ? <DashboardCompositions /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/profile" element={(isArtista || isCompositor || isVendedor) ? <DashboardArtistProfile /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/gestao/perfil-publico" element={((isArtista || isCompositor) && !isAvulsoPlan) || isVendedor ? <DashboardPublicProfile /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/chat" element={(isArtista || isCompositor) ? <DashboardArtistChat /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/work" element={isArtista ? <DashboardWork /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/marketing" element={(isArtista || isCompositor) ? <DashboardMarketing /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/finance" element={(isArtista || isCompositor) ? <DashboardFinance /> : <Navigate to="/" replace />} />

        {/* Seller Routes */}
        <Route path="/seller/artists" element={isVendedor ? <SellerArtists /> : <Navigate to="/" replace />} />
        <Route path="/seller/calendar" element={isVendedor ? <SellerAgenda /> : <Navigate to="/" replace />} />
        <Route path="/seller/leads" element={isVendedor ? <SellerLeads /> : <Navigate to="/" replace />} />
        <Route path="/seller/finance" element={isVendedor ? <SellerFinance /> : <Navigate to="/" replace />} />
        <Route path="/seller/proposals" element={isVendedor ? <SellerProposals /> : <Navigate to="/" replace />} />
        <Route path="/seller/communications" element={isVendedor ? <SellerCommunications /> : <Navigate to="/" replace />} />

        <Route path="/admin" element={<ProtectedRoute element={<Navigate to={routeForRole(profile?.cargo)} replace />} />} />
        <Route path="/admin/profile" element={isProdutor ? <AdminProfile /> : <Navigate to="/" replace />} />
        <Route path="/admin/public-profile" element={isProdutor ? <AdminPublicProfile /> : <Navigate to="/" replace />} />
        <Route path="/admin/artists" element={isProdutor ? <AdminArtists /> : <Navigate to="/" replace />} />
        <Route path="/admin/composers" element={isProdutor ? <AdminComposers /> : <Navigate to="/" replace />} />
        <Route path="/admin/sellers" element={isProdutor ? <AdminSellers /> : <Navigate to="/" replace />} />
        <Route path="/admin/finance" element={isProdutor ? <AdminFinance /> : <Navigate to="/" replace />} />
        <Route path="/admin/musics" element={isProdutor ? <AdminMusics /> : <Navigate to="/" replace />} />
        <Route path="/admin/compositions" element={isProdutor ? <AdminCompositions /> : <Navigate to="/" replace />} />
        <Route path="/admin/chat" element={isProdutor ? <AdminChat /> : <Navigate to="/" replace />} />
        <Route path="/admin/sponsors" element={isProdutor ? <AdminSponsors /> : <Navigate to="/" replace />} />
        <Route path="/admin/settings" element={isProdutor ? <AdminSettings /> : <Navigate to="/" replace />} />
        <Route path="/legal/termos" element={<Terms />} />
        <Route path="/legal/privacidade" element={<Privacy />} />
        <Route path="/legal/direitos" element={<Copyright />} />
        <Route path="/legal/todos" element={<LegalAll />} />
        
        <Route path="/notifications/:id" element={profile ? <NotificationDetails /> : <Navigate to="/" replace />} />

        <Route path="/dashboard-produtor" element={<RoleBasedRoute roles={['Produtor']} element={<AdminHome />} />} />
        <Route path="/dashboard-vendedor" element={<RoleBasedRoute roles={['Vendedor']} element={<SellerDashboard />} />} />
        <Route path="/dashboard-artista" element={<RoleBasedRoute roles={['Artista']} element={<DashboardArtistHome />} />} />
        <Route path="/dashboard-compositor" element={<RoleBasedRoute roles={['Compositor']} element={<DashboardCompositions />} />} />

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};
