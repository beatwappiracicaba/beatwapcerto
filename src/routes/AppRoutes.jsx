import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

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
import UploadMusic from '../pages/UploadMusic';
import MyUploads from '../pages/MyUploads';
import MusicDetails from '../pages/MusicDetails';
import NotificationsPage from '../pages/NotificationsPage';
import MyAccount from '../pages/MyAccount';
import Settings from '../pages/Settings';
import SellerOverview from '../pages/seller/SellerOverview';
import SellerArtists from '../pages/seller/SellerArtists';
import SellerShows from '../pages/seller/SellerShows';
import SellerChat from '../pages/seller/SellerChat';

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
        <Outlet />
      </DashboardLayout>
    );
  };

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public Route - Landing Page */}
        <Route path="/" element={<Home />} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          {/* Register removed as per user request - redirect to login */}
          <Route path="/register" element={<Navigate to="/login" replace />} />
        </Route>

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardArtist />} />
        <Route path="/dashboard/upload" element={<UploadMusic />} />
        <Route path="/dashboard/uploads" element={<MyUploads />} />
        <Route path="/dashboard/music/:id" element={<MusicDetails />} />
        <Route path="/dashboard/notifications" element={<NotificationsPage />} />
        <Route path="/dashboard/account" element={<MyAccount />} />
        
        {/* User Settings */}
        <Route path="/settings" element={<Settings />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <DashboardLayout isAdmin>
            <Outlet />
          </DashboardLayout>
        }>
          <Route index element={<AdminOverview />} />
          <Route path="artists" element={<AdminArtists />} />
          <Route path="music" element={<AdminMusic />} />
          <Route path="metrics" element={<AdminMetrics />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Seller Routes */}
        <Route path="/seller" element={<SellerRoute />}>
          <Route index element={<SellerOverview />} />
          <Route path="artists" element={<SellerArtists />} />
          <Route path="shows" element={<SellerShows />} />
          <Route path="chat" element={<SellerChat />} />
        </Route>

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};
