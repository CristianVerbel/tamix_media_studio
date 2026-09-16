import { emitSessionExpired } from './authEvents';

/**
 * Autenticación: 3 llamadas directas a la API real de Tamix, sin SDK de
 * Cognito en el cliente. El mismo access token sirve para Tamix y para el
 * Studio (verifican contra el mismo user pool), así que se guarda una sola
 * vez aquí y ambos clientes lo piden con `getValidAccessToken()`.
 */

const TAMIX_API_URL = (import.meta.env.VITE_TAMIX_API_URL ?? '').replace(/\/+$/, '');

const STORAGE = {
  access: 'tamix.accessToken',
  refresh: 'tamix.refreshToken',
  id: 'tamix.idToken',
  expiresAt: 'tamix.expiresAt',
} as const;

// Refresca un poco antes de que expire de verdad, para no perder una
// llamada en vuelo justo en el filo.
const MARGEN_REFRESH_MS = 60_000;

export type IniciarSesionRespuesta = { session: string; nueva: boolean };
export type VerificarCodigoOk = {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  nueva: boolean;
};
export type VerificarCodigoError = { error: string; vencido: boolean; session?: string };

export class CodigoInvalidoError extends Error {
  readonly vencido: boolean;
  readonly sessionNueva: string | undefined;

  constructor(payload: VerificarCodigoError) {
    super(payload.error);
    this.name = 'CodigoInvalidoError';
    this.vencido = payload.vencido;
    this.sessionNueva = payload.session;
  }
}

function urlDe(path: string): string {
  if (!TAMIX_API_URL) {
    throw new Error('VITE_TAMIX_API_URL no está configurado; revisa el .env de este proyecto.');
  }
  return `${TAMIX_API_URL}${path}`;
}

async function leerJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function startLogin(email: string): Promise<IniciarSesionRespuesta> {
  const res = await fetch(urlDe('/auth/start'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = await leerJson(res);
  if (!res.ok) {
    const mensaje = (body as { error?: string } | null)?.error ?? 'No se pudo enviar el código. Inténtalo de nuevo.';
    throw new Error(mensaje);
  }
  return body as IniciarSesionRespuesta;
}

export async function verifyCode(email: string, code: string, session: string): Promise<VerificarCodigoOk> {
  const res = await fetch(urlDe('/auth/verify'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, code, session }),
  });
  const body = await leerJson(res);

  if (!res.ok) {
    if (res.status === 401 && body && typeof body === 'object') {
      throw new CodigoInvalidoError(body as VerificarCodigoError);
    }
    const mensaje = (body as { error?: string } | null)?.error ?? 'No se pudo verificar el código.';
    throw new Error(mensaje);
  }

  const ok = body as VerificarCodigoOk;
  guardarSesion(ok);
  return ok;
}

function guardarSesion(tokens: { accessToken: string; refreshToken: string; idToken: string; expiresIn: number }): void {
  const expiresAt = Date.now() + tokens.expiresIn * 1000;
  localStorage.setItem(STORAGE.access, tokens.accessToken);
  localStorage.setItem(STORAGE.refresh, tokens.refreshToken);
  localStorage.setItem(STORAGE.id, tokens.idToken);
  localStorage.setItem(STORAGE.expiresAt, String(expiresAt));
}

function limpiarSesion(): void {
  localStorage.removeItem(STORAGE.access);
  localStorage.removeItem(STORAGE.refresh);
  localStorage.removeItem(STORAGE.id);
  localStorage.removeItem(STORAGE.expiresAt);
}

export function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem(STORAGE.access) && localStorage.getItem(STORAGE.refresh));
}

export function logout(): void {
  limpiarSesion();
}

let refrescoEnVuelo: Promise<string> | null = null;

async function refrescarTokens(): Promise<string> {
  const refreshToken = localStorage.getItem(STORAGE.refresh);
  if (!refreshToken) {
    emitSessionExpired();
    throw new Error('No hay sesión: vuelve a entrar.');
  }

  const res = await fetch(urlDe('/auth/refresh'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await leerJson(res);

  if (!res.ok) {
    limpiarSesion();
    emitSessionExpired();
    const mensaje = (body as { error?: string } | null)?.error ?? 'La sesión venció.';
    throw new Error(mensaje);
  }

  const tokens = body as { idToken: string; accessToken: string; refreshToken: string; expiresIn: number };
  guardarSesion(tokens);
  return tokens.accessToken;
}

/**
 * Devuelve un access token válido, refrescando de forma transparente si
 * está por vencer. Si el refresh token también está muerto, limpia todo,
 * avisa por `authEvents` y lanza — quien llama debe dejar que el shell
 * mande a /entrar.
 */
export async function getValidAccessToken(): Promise<string> {
  const access = localStorage.getItem(STORAGE.access);
  const expiresAtRaw = localStorage.getItem(STORAGE.expiresAt);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0;

  if (!access || !expiresAtRaw || Date.now() >= expiresAt - MARGEN_REFRESH_MS) {
    if (!refrescoEnVuelo) {
      refrescoEnVuelo = refrescarTokens().finally(() => {
        refrescoEnVuelo = null;
      });
    }
    return refrescoEnVuelo;
  }

  return access;
}
