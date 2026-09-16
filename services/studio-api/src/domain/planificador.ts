/**
 * Reglas de la cola de programación.
 *
 * Sin dependencias, igual que `domain/roles.ts` en Tamix-social-media: se
 * pueden probar sin levantar DynamoDB ni EventBridge.
 */

export type EstadoDeItem =
  | 'programado'
  | 'publicando'
  | 'publicado'
  | 'fallido'
  | 'cancelado';

export type ItemDeCola = {
  itemId: string;
  handle: string;
  kind: 'articulo' | 'audio' | 'video' | 'envivo' | 'obra_ignorada';
  title: string;
  subtitle?: string | null;
  bodyHtml: string;
  coverUrl?: string | null;
  access: 'publico' | 'suscriptores' | 'pago';
  topics?: string[];
  enlaceExterno?: string | null;
  publishAt: string;
  estado: EstadoDeItem;
  intentos: number;
  ultimoError?: string | null;
  creadoPor: string;
  createdAt: string;
  updatedAt: string;
};

export type EntradaDeItem = Pick<
  ItemDeCola,
  'kind' | 'title' | 'subtitle' | 'bodyHtml' | 'coverUrl' | 'access' | 'topics' | 'enlaceExterno' | 'publishAt'
>;

/**
 * Qué hace falta para poder programar algo.
 *
 * El mínimo es el mismo que exige `POST /posts` en Tamix —título y cuerpo—
 * más una fecha futura: programar en el pasado no es programar, es publicar
 * ahora con un paso de más, y confunde a quien mira el calendario.
 */
export function revisarEntrada(
  entrada: Partial<EntradaDeItem>,
  ahora: Date = new Date()
): { ok: true; entrada: EntradaDeItem } | { ok: false; motivo: string } {
  if (!entrada.title?.trim()) return { ok: false, motivo: 'Falta el titular' };
  if (!entrada.bodyHtml?.trim()) return { ok: false, motivo: 'Falta el cuerpo' };
  if (!entrada.publishAt) return { ok: false, motivo: 'Falta la fecha de publicación' };

  const fecha = new Date(entrada.publishAt);
  if (Number.isNaN(fecha.getTime())) return { ok: false, motivo: 'Esa fecha no es válida' };
  if (fecha.getTime() <= ahora.getTime()) {
    return { ok: false, motivo: 'Programar en el pasado no publica nada: elige una hora futura' };
  }

  return {
    ok: true,
    entrada: {
      kind: entrada.kind ?? 'articulo',
      title: entrada.title.trim(),
      subtitle: entrada.subtitle?.trim() || null,
      bodyHtml: entrada.bodyHtml,
      coverUrl: entrada.coverUrl ?? null,
      access: entrada.access ?? 'publico',
      topics: entrada.topics ?? [],
      enlaceExterno: entrada.enlaceExterno?.trim() || null,
      publishAt: fecha.toISOString(),
    },
  };
}

/** Quién puede tocar la cola. Ver la escala de papeles en Tamix (roles.ts). */
export const PAPEL_MINIMO_PARA_VER = 'redactor' as const;
export const PAPEL_MINIMO_PARA_PROGRAMAR = 'editor' as const;

/**
 * Hasta cuándo se puede reprogramar o cancelar sin más.
 *
 * En `publicando` el intento ya salió hacia Tamix: cancelarlo ahí no
 * deshace una publicación a medias, sólo confunde a quien mira la cola.
 */
export function editable(estado: EstadoDeItem): boolean {
  return estado === 'programado' || estado === 'fallido';
}

/**
 * Los reintentos de un webhook saliente fallido, en minutos desde el fallo.
 * Mismos siete pasos que documenta `docs/API_CONTRACT.md` del paquete
 * original: inmediato, 1 min, 5 min, 30 min, 2 h, 12 h y 24 h; después,
 * dead-letter.
 */
export const REINTENTOS_MINUTOS = [0, 1, 5, 30, 120, 720, 1440] as const;

export function proximoReintento(intento: number, ahora: Date = new Date()): Date | null {
  if (intento >= REINTENTOS_MINUTOS.length) return null;
  return new Date(ahora.getTime() + REINTENTOS_MINUTOS[intento]! * 60_000);
}
