import * as React from 'react';

import { isAuthenticated as checkAuthenticated, logout as clearSession } from '@/lib/auth';
import { onSessionExpired } from '@/lib/authEvents';
import { tamixApi } from '@/lib/tamixApi';
import type { CuentaResumen, Viewer } from '@/types/tamix';

const HANDLE_ACTIVO_KEY = 'tamix.activeHandle';

type AuthContextValue = {
  autenticado: boolean;
  viewer: Viewer | null;
  cuentas: CuentaResumen[];
  cargandoCuentas: boolean;
  errorCuentas: Error | null;
  handleActivo: string | null;
  cuentaActiva: CuentaResumen | null;
  setHandleActivo: (handle: string) => void;
  recargarCuentas: () => void;
  marcarAutenticado: () => void;
  cerrarSesion: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [autenticado, setAutenticado] = React.useState(() => checkAuthenticated());
  const [viewer, setViewer] = React.useState<Viewer | null>(null);
  const [cuentas, setCuentas] = React.useState<CuentaResumen[]>([]);
  const [cargandoCuentas, setCargandoCuentas] = React.useState(false);
  const [errorCuentas, setErrorCuentas] = React.useState<Error | null>(null);
  const [handleActivo, setHandleActivoState] = React.useState<string | null>(() => localStorage.getItem(HANDLE_ACTIVO_KEY));
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => onSessionExpired(() => setAutenticado(false)), []);

  const setHandleActivo = React.useCallback((handle: string) => {
    localStorage.setItem(HANDLE_ACTIVO_KEY, handle);
    setHandleActivoState(handle);
  }, []);

  const marcarAutenticado = React.useCallback(() => setAutenticado(true), []);

  const cerrarSesion = React.useCallback(() => {
    clearSession();
    setAutenticado(false);
    setViewer(null);
    setCuentas([]);
  }, []);

  const recargarCuentas = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    if (!autenticado) return;
    let cancelado = false;
    setCargandoCuentas(true);
    setErrorCuentas(null);

    Promise.all([tamixApi.me(), tamixApi.misCuentas()])
      .then(([me, { cuentas: lista }]) => {
        if (cancelado) return;
        setViewer(me);
        setCuentas(lista);
        // Si no hay cuenta activa guardada (o ya no está en la lista), usa la primera.
        setHandleActivoState((actual) => {
          if (actual && lista.some((c) => c.handle === actual)) return actual;
          const primera = lista[0]?.handle ?? null;
          if (primera) localStorage.setItem(HANDLE_ACTIVO_KEY, primera);
          return primera;
        });
      })
      .catch((err: unknown) => {
        if (!cancelado) setErrorCuentas(err instanceof Error ? err : new Error('No se pudo cargar la cuenta'));
      })
      .finally(() => {
        if (!cancelado) setCargandoCuentas(false);
      });

    return () => {
      cancelado = true;
    };
  }, [autenticado, tick]);

  const cuentaActiva = React.useMemo(() => cuentas.find((c) => c.handle === handleActivo) ?? null, [cuentas, handleActivo]);

  const value: AuthContextValue = {
    autenticado,
    viewer,
    cuentas,
    cargandoCuentas,
    errorCuentas,
    handleActivo,
    cuentaActiva,
    setHandleActivo,
    recargarCuentas,
    marcarAutenticado,
    cerrarSesion,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
