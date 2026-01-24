import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import { LoadingScreen } from './components/LoadingScreen';
import { AuthLayout } from './components/AuthLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardArtist from './pages/DashboardArtist';
import DashboardAdmin from './pages/DashboardAdmin';
import UploadMusic from './pages/UploadMusic';
import MyUploads from './pages/MyUploads'; // Assuming this exists based on route
import MusicDetails from './pages/MusicDetails';
import Settings from './pages/Settings'; // Assuming this exists based on route
import Home from './pages/Home';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Simulate initial loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <DataProvider>
          <AnimatePresence mode="wait">
            {isLoading && (
              <LoadingScreen key="splash" />
            )}
          </AnimatePresence>

          {!isLoading && (
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Route>

                {/* Protected Routes Logic can be added here or inside components */}
                <Route path="/dashboard" element={<DashboardArtist />} />
                <Route path="/dashboard/upload" element={<UploadMusic />} />
                <Route path="/dashboard/uploads" element={<MyUploads />} />
                <Route path="/dashboard/music/:id" element={<MusicDetails />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<DashboardAdmin />} />
              </Routes>
            </AnimatePresence>
          )}
        </DataProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
