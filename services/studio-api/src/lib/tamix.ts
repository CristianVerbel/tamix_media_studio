import { HttpError } from './auth.js';

/**
 * El único sitio donde el Studio habla con la red de verdad.
 *
 * Todo lo que el Studio necesita saber de una cuenta —su rol, su contenido,
 * su audiencia, su caja— vive en `services/social-api` (Tamix-social-media)
 * y se pide aquí, en vivo, con la sesión de quien está usando el Studio. No
 * hay copia local: si Tamix no responde, el Studio tampoco puede decir nada
 * de esa cuenta, y eso es correcto — inventar un número sería mentir.
 */

const TAMIX_API_URL = (process.env.TAMIX_API_URL ?? '').replace(/\/+$/, '');

export type RolDeEquipo = 'propietario' | 'editor' | 'redactor' | 'analista';
const ESCALA: RolDeEquipo[] = ['analista', 'redactor', 'editor', 'propietario'];
export function alcanza(rol: RolDeEquipo, minimo: RolDeEquipo): boolean {
  return ESCALA.indexOf(rol) >= ESCALA.indexOf(minimo);
}

export async function tamixFetch<T>(
  path: string,
  options: { token: string; method?: string; body?: unknown }
): Promise<T> {
  if (!TAMIX_API_URL) throw new HttpError(500, 'TAMIX_API_URL no está configurado en este entorno');

  let res: Response;
  try {
    res = await fetch(`${TAMIX_API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        authorization: `Bearer ${options.token}`,
        ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new HttpError(502, 'Tamix no respondió. Inténtalo de nuevo en un momento.');
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Sin cuerpo (por ejemplo un 204) no es un fallo.
  }

  if (!res.ok) {
    const mensaje =
      (payload as { error?: string } | null)?.error ?? `Tamix respondió ${res.status}`;
    throw new HttpError(res.status === 401 ? 401 : res.status === 403 ? 403 : 502, mensaje);
  }

  return payload as T;
}

export type Gestion = {
  handle: string;
  nombre: string;
  verificada: boolean;
  tipoDeCuenta: string;
  tuRol: RolDeEquipo | null;
  eresDueno: boolean;
  automatizacion: { disponible: boolean; activa?: boolean; publicadas?: number; ultimoUso?: string | null; url?: string | null };
};

/**
 * Comprueba, contra Tamix, que quien llama gestiona esta cuenta y con qué
 * papel — y corta con 403 si no llega al mínimo. Es la autoridad: el Studio
 * no guarda su propia copia de quién puede qué, porque en cuanto Tamix
 * cambiara un papel esa copia mentiría hasta el siguiente sincronismo.
 */
export async function exigirGestion(
  handle: string,
  token: string,
  minimo: RolDeEquipo
): Promise<Gestion> {
  const gestion = await tamixFetch<Gestion>(`/publicaciones/${encodeURIComponent(handle)}/gestion`, {
    token,
  });
  if (!gestion.tuRol || !alcanza(gestion.tuRol, minimo)) {
    throw new HttpError(403, `Para esto hace falta ser ${minimo} de la cuenta en Tamix`);
  }
  return gestion;
}
