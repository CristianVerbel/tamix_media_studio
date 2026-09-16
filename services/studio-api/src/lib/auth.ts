import { CognitoJwtVerifier } from 'aws-jwt-verify';
import type { Context, Next } from 'hono';

/**
 * Autenticación del Studio: el mismo Cognito, sin cuenta propia.
 *
 * El Studio no tiene su propia tabla de usuarios ni su propio inicio de
 * sesión. Quien entra ya tiene cuenta en Tamix —la app pide el correo, envía
 * el código y guarda la sesión llamando directo a `/auth/start` y
 * `/auth/verify` de `services/social-api`, nunca a este servicio—, y este
 * servicio se limita a comprobar el mismo token contra el mismo user pool.
 *
 * `TAMIX_COGNITO_USER_POOL_ID` / `TAMIX_COGNITO_CLIENT_ID` son, a propósito,
 * los mismos valores que `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` en
 * Tamix-social-media: no se crea ningún cliente ni ningún pool nuevo.
 */

const USER_POOL_ID = process.env.TAMIX_COGNITO_USER_POOL_ID ?? '';
const CLIENT_ID = process.env.TAMIX_COGNITO_CLIENT_ID ?? '';

const verifier =
  USER_POOL_ID && CLIENT_ID
    ? CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: null, clientId: CLIENT_ID })
    : null;

function correoDel(payload: Record<string, unknown>): string | null {
  const candidatos = [payload.email, payload.username, payload['cognito:username']];
  for (const c of candidatos) {
    if (typeof c === 'string' && c.includes('@')) return c;
  }
  return null;
}

/** Quién llama: el `sub` de Cognito, su correo y el token crudo para reenviarlo a Tamix. */
export type Viewer = { userId: string; email: string; token: string };

export type AppEnv = { Variables: { viewer: Viewer } };

export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503,
    message: string
  ) {
    super(message);
  }
}

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) throw new HttpError(401, 'Falta el token de sesión');
  if (!verifier) throw new HttpError(500, 'Cognito no está configurado en este entorno');

  let email: string;
  let sub: string;
  try {
    const payload = (await verifier.verify(token)) as unknown as Record<string, unknown>;
    const encontrado = correoDel(payload);
    if (!encontrado) throw new HttpError(401, 'El token no identifica la cuenta; vuelve a entrar');
    email = encontrado;
    sub = String(payload.sub ?? '');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Sesión vencida o inválida');
  }

  c.set('viewer', { userId: sub, email, token });
  await next();
}

export function viewerOf(c: Context<AppEnv>): Viewer {
  const viewer = c.get('viewer');
  if (!viewer) throw new HttpError(401, 'Necesitas iniciar sesión');
  return viewer;
}
