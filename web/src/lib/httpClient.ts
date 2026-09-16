import { shapeApiError } from './apiError';
import { getValidIdToken } from './auth';

type Query = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
};

/**
 * Cliente HTTP mínimo compartido por `tamixApi.ts` y `studioApi.ts`: añade
 * el bearer token vigente, arma la query string y convierte cualquier
 * respuesta no-2xx en un `ApiError` tipado con el mensaje del servidor. Las
 * dos APIs devuelven exactamente la misma forma de error (`{error: string}`),
 * así que este mismo cliente sirve para ambas — sólo cambia la base URL.
 */
export function createApiClient(baseUrl: string, etiqueta: string) {
  const base = baseUrl.replace(/\/+$/, '');

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!base) {
      throw new Error(`${etiqueta} no está configurado; falta la variable de entorno en este despliegue.`);
    }

    const token = await getValidIdToken();
    const url = new URL(`${base}${path}`);
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers: {
        authorization: `Bearer ${token}`,
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // Sin cuerpo (204, por ejemplo) no es un fallo.
    }

    if (!res.ok) throw shapeApiError(res.status, payload);
    return payload as T;
  }

  return {
    get: <T>(path: string, query?: Query) => request<T>(path, { query }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}
