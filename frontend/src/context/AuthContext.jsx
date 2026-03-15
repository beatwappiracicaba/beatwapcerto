import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, apiClient } from '../services/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeCargo = (r) => {
    if (!r) return r;
    const s = String(r).toLowerCase();
    if (s === 'admin' || s === 'produtor') return 'Produtor';
    if (s === 'artist' || s === 'artista') return 'Artista';
    if (['seller', 'vendedor', 'vendedo'].includes(s)) return 'Vendedor';
    return r;
  };

  useEffect(() => {
    const stored = authApi.getUser();
    const token = authApi.getToken();
    if (stored && token) {
      setUser(stored);
      fetchProfile();
    } else {
      if (stored && !token) {
        authApi.logout();
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => {}, [user]);

  const fetchProfile = async () => {
    try {
      const data = await apiClient.get('/dashboard/profile');
      setProfile(data ? { ...data, cargo: normalizeCargo(data.cargo) } : data);
    } catch (error) {
      await authApi.logout();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const stored = authApi.getUser();
    const token = authApi.getToken();
    if (stored && !token) {
      await authApi.logout();
      setUser(null);
      setProfile(null);
      return;
    }
    if (stored && !user) {
      setUser(stored);
    }
    if (stored) {
      await fetchProfile();
    }
  };

  const signOut = async () => {
    await authApi.logout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
