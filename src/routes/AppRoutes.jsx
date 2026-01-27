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
// Dashboard temporariamente desativada

// Admin temporariamente desativado

export const AppRoutes = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const { profile, loading } = useAuth();

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Dashboard e rotas protegidas desativadas durante reconstrução

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

        {/* Rotas de dashboard desativadas */}

        {/* Fallback - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};
