import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Fuentes e integraciones del Studio.
 *
 * Dos clases, igual que pide `docs/PRODUCT_SPEC.md` del paquete original:
 * una **fuente RSS** que el Studio lee para proponer contenido, y un
 * **webhook saliente** que el Studio llama para avisar de lo que hizo. Las
 * dos son del Studio, no de Tamix: la red no sabe que existen.
 */

export type TipoDeIntegracion = 'rss' | 'webhook_saliente';

export type EventoWebhook =
  | 'planificador.programado'
  | 'planificador.publicado'
  | 'planificador.fallido'
  | 'integracion.sync.completado'
  | 'integracion.sync.fallido';

export const EVENTOS_DISPONIBLES: EventoWebhook[] = [
  'planificador.programado',
  'planificador.publicado',
  'planificador.fallido',
  'integracion.sync.completado',
  'integracion.sync.fallido',
];

export type IntegracionRss = {
  tipo: 'rss';
  url: string;
  activa: boolean;
  ultimoSync?: string | null;
  ultimoError?: string | null;
};

export type IntegracionWebhook = {
  tipo: 'webhook_saliente';
  url: string;
  eventos: EventoWebhook[];
  secreto: string;
  activa: boolean;
};

export function revisarFuenteRss(
  entrada: Partial<IntegracionRss>
): { ok: true; url: string } | { ok: false; motivo: string } {
  const url = entrada.url?.trim() ?? '';
  if (!url) return { ok: false, motivo: 'Falta la dirección del RSS' };
  try {
    const analizada = new URL(url);
    if (analizada.protocol !== 'https:') {
      return { ok: false, motivo: 'El RSS tiene que servirse por HTTPS' };
    }
  } catch {
    return { ok: false, motivo: 'Esa no es una dirección válida' };
  }
  return { ok: true, url };
}

export function revisarWebhookSaliente(
  entrada: Partial<IntegracionWebhook>
): { ok: true; url: string; eventos: EventoWebhook[] } | { ok: false; motivo: string } {
  const url = entrada.url?.trim() ?? '';
  if (!url) return { ok: false, motivo: 'Falta la URL del webhook' };
  try {
    if (new URL(url).protocol !== 'https:') {
      return { ok: false, motivo: 'El webhook tiene que recibirse por HTTPS' };
    }
  } catch {
    return { ok: false, motivo: 'Esa no es una URL válida' };
  }

  const eventos = (entrada.eventos ?? []).filter((e) => EVENTOS_DISPONIBLES.includes(e));
  if (eventos.length === 0) {
    return { ok: false, motivo: 'Elige al menos un evento al que suscribirte' };
  }
  return { ok: true, url, eventos };
}

/**
 * Firma y comprobación de webhooks salientes.
 *
 * Mismo esquema que `x-tamix-firma` en `services/social-api/src/routes/hooks.ts`
 * de Tamix: HMAC-SHA256 sobre el cuerpo crudo, comparado en tiempo
 * constante para no filtrar por cuánto tardó la comparación.
 */
export function firmarPayload(cuerpoCrudo: string, secreto: string): string {
  return createHmac('sha256', secreto).update(cuerpoCrudo).digest('hex');
}

export function firmaValida(cuerpoCrudo: string, firma: string, secreto: string): boolean {
  if (!firma) return false;
  const esperada = Buffer.from(firmarPayload(cuerpoCrudo, secreto));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return false;
  return timingSafeEqual(esperada, recibida);
}
