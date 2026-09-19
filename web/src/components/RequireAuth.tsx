import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { autenticado } = useAuth();
  const location = useLocation();

  if (!autenticado) {
    // Con la ruta entera y no sólo `pathname`: un enlace a
    // `/panel/integraciones?conectar=1` perdía el `?conectar=1` al pasar por
    // aquí, y `LoginPage` volvía justo a la pantalla sin abrir el diálogo
    // que se había pedido.
    return (
      <Navigate to="/entrar" replace state={{ desde: location.pathname + location.search }} />
    );
  }

  return <>{children}</>;
}
