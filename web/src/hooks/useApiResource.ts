import * as React from 'react';

import { ApiError } from '@/lib/apiError';

export type RecursoAsync<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | Error | null;
  reload: () => void;
};

/**
 * Carga un recurso async con estados reales de loading/error — nada de
 * datos de relleno mientras carga. `deps` funciona como en `useEffect`: al
 * cambiar, se vuelve a pedir (por ejemplo, al cambiar de cuenta activa).
 */
export function useApiResource<T>(fetcher: () => Promise<T>, deps: React.DependencyList): RecursoAsync<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | Error | null>(null);
  const [tick, setTick] = React.useState(0);
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    let cancelado = false;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => {
        if (!cancelado) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelado) setError(err instanceof Error ? err : new Error('Ocurrió un error inesperado'));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, reload };
}
