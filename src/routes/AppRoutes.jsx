import React, { useState } from 'react';
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
import DashboardWork from '../pages/DashboardWork';
import { DashboardArtistProfile } from '../pages/DashboardArtistProfile';
import { AdminHome, AdminArtists, AdminMusics, AdminChat, AdminProfile } from '../pages/AdminDashboard';
import { AdminSponsors } from '../pages/AdminDashboard';

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

  return (
      <Routes location={location}>
        {/* Public Route - Landing Page */}
        <Route path="/" element={loading ? <SplashScreen onComplete={() => {}} /> : (isProdutor ? <Navigate to="/admin" replace /> : (isArtista ? <Navigate to="/dashboard" replace /> : <Home />))} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          {/* Register removed as per user request - redirect to login */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
        </Route>

        <Route path="/dashboard" element={isArtista ? <DashboardArtistHome /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/musics" element={isArtista ? <DashboardArtistMusics /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/profile" element={isArtista ? <DashboardArtistProfile /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/chat" element={isArtista ? <DashboardArtistChat /> : <Navigate to="/" replace />} />
        <Route path="/dashboard/work" element={isArtista ? <DashboardWork /> : <Navigate to="/" replace />} />

        <Route path="/admin" element={isProdutor ? <AdminHome /> : (loading ? <SplashScreen onComplete={() => {}} /> : <Navigate to="/" replace />)} />
        <Route path="/admin/profile" element={isProdutor ? <AdminProfile /> : <Navigate to="/" replace />} />
        <Route path="/admin/artists" element={isProdutor ? <AdminArtists /> : <Navigate to="/" replace />} />
        <Route path="/admin/musics" element={isProdutor ? <AdminMusics /> : <Navigate to="/" replace />} />
        <Route path="/admin/chat" element={isProdutor ? <AdminChat /> : <Navigate to="/" replace />} />
        <Route path="/admin/sponsors" element={isProdutor ? <AdminSponsors /> : <Navigate to="/" replace />} />
        <Route path="/legal/termos" element={<Terms />} />
        <Route path="/legal/privacidade" element={<Privacy />} />
        <Route path="/legal/direitos" element={<Copyright />} />

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};
