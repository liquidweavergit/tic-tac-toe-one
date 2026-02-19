import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { screenName, setUser } = useAuthStore();
  const [checking, setChecking] = useState(!screenName);

  useEffect(() => {
    if (screenName) return;
    api.me()
      .then((u) => setUser(u.screenName, u.wins, u.losses))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="min-h-screen bg-gray-900" />;
  if (!screenName) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
