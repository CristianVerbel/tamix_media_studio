import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { autenticado } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    return <Navigate to="/entrar" replace state={{ desde: location.pathname }} />;
  }

  return <>{children}</>;
}
