import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProducerAuditions from './ProducerAuditions';
import ComposerAuditions from './ComposerAuditions';

export default function Auditions() {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  const cargo = String(profile?.cargo || '').trim();
  if (cargo === 'Produtor') return <ProducerAuditions />;
  if (cargo === 'Compositor') return <ComposerAuditions />;
  return <Navigate to="/" replace />;
}
