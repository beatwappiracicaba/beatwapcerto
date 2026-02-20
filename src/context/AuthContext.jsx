import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/apiClient';

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
    const u = authApi.getUser();
    if (u) {
      setUser(u);
      fetchProfile(u.id);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {}, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_BACKEND_URL || 'https://beatwapproducoes.onrender.com') + '/profile', {
        headers: { Authorization: `Bearer ${authApi.getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data ? { ...data, cargo: normalizeCargo(data.cargo) } : data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
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
