import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layouts
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

// UI
import { SplashScreen } from '../components/ui/SplashScreen';

import { DashboardLayout } from '../components/DashboardLayout';

// Pages
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import DashboardArtist from '../pages/DashboardArtist';
import Settings from '../pages/Settings';
import SellerOverview from '../pages/seller/SellerOverview';

// Admin Pages
import { AdminOverview } from '../pages/admin/AdminOverview';
import { AdminArtists } from '../pages/admin/AdminArtists';
import { AdminMusic } from '../pages/admin/AdminMusic';
import { AdminMetrics } from '../pages/admin/AdminMetrics';
import { AdminNotifications } from '../pages/admin/AdminNotifications';
import { AdminSettings } from '../pages/admin/AdminSettings';

export const AppRoutes = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const { profile, loading } = useAuth();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const SellerRoute = () => {
    if (loading) return null;
    const role = profile?.role;
    const isSeller = role === 'seller' || role === 'vendedor' || role === 'vendedo';
    if (!isSeller) return <Navigate to="/" replace />;
    return (
      <DashboardLayout isSeller>
        <SellerOverview />
      </DashboardLayout>
    );
  };

  const ArtistRoute = () => {
    if (loading) return null;
    const role = profile?.role;
    const isAdmin = role === 'admin' || role === 'produtor';
    const isSeller = role === 'seller' || role === 'vendedor' || role === 'vendedo';
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isSeller) return <Navigate to="/seller" replace />;
    return (
      <DashboardLayout>
        <DashboardArtist />
      </DashboardLayout>
    );
  };

  return (
      <Routes location={location}>
        {/* Public Route - Landing Page */}
        <Route path="/" element={<Home />} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          {/* Register removed as per user request - redirect to login */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
        </Route>

        {/* Artist Dashboard */}
        <Route path="/dashboard" element={<ArtistRoute />} />
        
        {/* Settings */}
        <Route path="/settings" element={
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        } />
        
        {/* Seller */}
        <Route path="/seller" element={<SellerRoute />} />

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};
