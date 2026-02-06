import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layouts
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

// UI
import { SplashScreen } from '../components/ui/SplashScreen';

// DashboardLayout removido durante reconstrução

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Terms from '../pages/Terms';
import Privacy from '../pages/Privacy';
import Copyright from '../pages/Copyright';
import { DashboardArtistHome, DashboardArtistMusics, DashboardArtistChat } from '../pages/DashboardArtist';
import { DashboardMarketing } from '../pages/DashboardMarketing';
import DashboardWork from '../pages/DashboardWork';
import { DashboardArtistProfile } from '../pages/DashboardArtistProfile';
import { AdminHome, AdminArtists, AdminMusics, AdminChat, AdminProfile } from '../pages/AdminDashboard';
import { AdminSellers } from '../pages/AdminSellers';
import { AdminCompositions } from '../pages/AdminCompositions';
import { AdminSponsors } from '../pages/AdminDashboard';
import { AdminSettings } from '../pages/AdminSettings';
import { DashboardCompositions } from '../pages/DashboardCompositions';
import PublicProfile from '../pages/PublicProfile';
import SellerDashboard from '../pages/SellerDashboard';
import SellerArtists from '../pages/SellerArtists';
import SellerAgenda from '../pages/SellerAgenda';
import SellerLeads from '../pages/SellerLeads';
import SellerFinance from '../pages/SellerFinance';
import SellerProposals from '../pages/SellerProposals';
import SellerCommunications from '../pages/SellerCommunications';

// Admin temporariamente desativado

export const AppRoutes = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const { profile, loading } = useAuth();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const isArtista = profile?.cargo === 'Artista';
  const isProdutor = profile?.cargo === 'Produtor';
  const isCompositor = profile?.cargo === 'Compositor';
  const isVendedor = profile?.cargo === 'Vendedor';

  return (
      <Routes location={location}>
        {/* Public Route - Landing Page */}
        <Route path="/" element={loading ? <SplashScreen onComplete={() => {}} /> : (isProdutor ? <Navigate to="/admin" replace /> : (isVendedor ? <Navigate to="/dashboard" replace /> : ((isArtista || isCompositor) ? <Navigate to="/dashboard" replace /> : <Home />)))} />
        <Route path="/profile/:id" element={<PublicProfile />} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="/dashboard" element={isVendedor ? <SellerDashboard /> : (isArtista || isCompositor) ? <DashboardArtistHome /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/musics" element={isArtista ? <DashboardArtistMusics /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/compositions" element={isCompositor ? <DashboardCompositions /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/profile" element={(isArtista || isCompositor) ? <DashboardArtistProfile /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/chat" element={(isArtista || isCompositor) ? <DashboardArtistChat /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/work" element={isArtista ? <DashboardWork /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/marketing" element={(isArtista || isCompositor) ? <DashboardMarketing /> : <Navigate to="/" replace />} />

        {/* Seller Routes */}
        <Route path="/seller/artists" element={isVendedor ? <SellerArtists /> : <Navigate to="/" replace />} />
        <Route path="/seller/calendar" element={isVendedor ? <SellerAgenda /> : <Navigate to="/" replace />} />
        <Route path="/seller/leads" element={isVendedor ? <SellerLeads /> : <Navigate to="/" replace />} />
        <Route path="/seller/finance" element={isVendedor ? <SellerFinance /> : <Navigate to="/" replace />} />
        <Route path="/seller/proposals" element={isVendedor ? <SellerProposals /> : <Navigate to="/" replace />} />
        <Route path="/seller/communications" element={isVendedor ? <SellerCommunications /> : <Navigate to="/" replace />} />

        <Route path="/admin" element={isProdutor ? <AdminHome /> : (loading ? <SplashScreen onComplete={() => {}} /> : <Navigate to="/" replace />)} />
        <Route path="/admin/profile" element={isProdutor ? <AdminProfile /> : <Navigate to="/" replace />} />
        <Route path="/admin/artists" element={isProdutor ? <AdminArtists /> : <Navigate to="/" replace />} />
        <Route path="/admin/sellers" element={isProdutor ? <AdminSellers /> : <Navigate to="/" replace />} />
        <Route path="/admin/musics" element={isProdutor ? <AdminMusics /> : <Navigate to="/" replace />} />
        <Route path="/admin/compositions" element={isProdutor ? <AdminCompositions /> : <Navigate to="/" replace />} />
        <Route path="/admin/chat" element={isProdutor ? <AdminChat /> : <Navigate to="/" replace />} />
        <Route path="/admin/sponsors" element={isProdutor ? <AdminSponsors /> : <Navigate to="/" replace />} />
        <Route path="/admin/settings" element={isProdutor ? <AdminSettings /> : <Navigate to="/" replace />} />
        <Route path="/legal/termos" element={<Terms />} />
        <Route path="/legal/privacidade" element={<Privacy />} />
        <Route path="/legal/direitos" element={<Copyright />} />

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};
