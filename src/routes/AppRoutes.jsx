import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layouts
import { AuthLayout } from '../components/AuthLayout';

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

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

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

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};
