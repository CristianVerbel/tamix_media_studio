import type { Access, Circulo } from '@/types/tamix';

/**
 * El composer: mismos formatos, mismos textos, mismos topes que el de la
 * app real (`mobile/app/componer.tsx` en Tamix-social-media), verificados
 * contra el código de ese repositorio y contra la validación real del
 * servidor (`services/social-api/src/domain/{apunte,duracion,carrusel,audio}.ts`)
 * — no adivinados. Lo que el servidor exige siempre (por ejemplo, un cuerpo
 * no vacío en cualquier pieza que vaya a `POST /posts`) se pide aquí también,
 * aunque el cliente móvil sea más laxo en ese punto: mejor pedirlo antes que
 * dejar que el servidor lo rechace después de subir un archivo entero.
 *
 * `boletin` y `obra` existen como `ContentKind` en Tamix pero no se ofrecen
 * desde ningún composer —el primero porque hoy produce el mismo texto que un
 * artículo, el segundo porque lo escribe solo el estudio de libros— así que
 * tampoco se ofrecen aquí.
 */

export type Formato = 'nota' | 'articulo' | 'hilo' | 'encuesta' | 'pregunta' | 'audio' | 'video' | 'envivo';

export const TOPE_DE_APUNTE = 500;
export const AVISA_DESDE = TOPE_DE_APUNTE - 50;
export const TOPE_VIDEO_SEGUNDOS = 90;
export const TOPE_DE_VIDEO_SEGUNDOS_CARRUSEL = 60;
export const TOPE_AUDIO_SEGUNDOS = 5 * 60;
export const TOPE_DE_PIEZAS = 10;
export const TOPE_OPCIONES_ENCUESTA = 5;
export const MINIMO_OPCIONES_ENCUESTA = 2;
export const TOPE_PARTES_HILO = 10;

export const FORMATOS: { clave: Formato; corto: string; detalle: string }[] = [
  { clave: 'nota', corto: 'Apunte', detalle: 'Texto corto. Lo que se lee de un vistazo.' },
  { clave: 'articulo', corto: 'Artículo', detalle: 'Pieza larga con titular y entradilla.' },
  { clave: 'hilo', corto: 'Hilo', detalle: 'Una idea en varias partes, encadenadas.' },
  { clave: 'encuesta', corto: 'Encuesta', detalle: 'Una pregunta con opciones para votar.' },
  { clave: 'pregunta', corto: 'Pregunta', detalle: 'Abres una duda y la comunidad responde.' },
  { clave: 'video', corto: 'Video', detalle: `Súbelo desde tu equipo, hasta ${TOPE_VIDEO_SEGUNDOS} segundos.` },
  {
    clave: 'audio',
    corto: 'Audio',
    detalle: `Súbelo desde tu equipo, hasta ${TOPE_AUDIO_SEGUNDOS / 60} minutos. Un podcast entero va en el estudio.`,
  },
  { clave: 'envivo', corto: 'En vivo', detalle: 'Transmite por YouTube y pega aquí el enlace. Se ve dentro de la app.' },
];

export const ALCANCE: { clave: Access; etiqueta: string; detalle: string }[] = [
  { clave: 'publico', etiqueta: 'Cualquiera', detalle: 'Se ve dentro y fuera de la app.' },
  { clave: 'suscriptores', etiqueta: 'Quien te sigue', detalle: 'Solo lo ve tu audiencia.' },
  { clave: 'pago', etiqueta: 'De pago', detalle: 'Lo abren tus suscriptores, o quien compre esta pieza suelta.' },
];

export const CIRCULOS: { id: Circulo; label: string; ayuda: string; frase: string }[] = [
  { id: 'todos', label: 'Cualquiera', ayuda: 'Como hasta ahora.', frase: 'Cualquiera puede responder' },
  {
    id: 'seguidores',
    label: 'Quien te sigue',
    ayuda: 'Los demás pueden leer, no escribir.',
    frase: 'Solo quien te sigue puede responder',
  },
  {
    id: 'suscriptores',
    label: 'Quien te paga',
    ayuda: 'La conversación queda para tu comunidad.',
    frase: 'Solo quien te paga puede responder',
  },
  {
    id: 'mencionados',
    label: 'Solo a quien menciones',
    ayuda: 'Para cerrar un hilo sin borrarlo.',
    frase: 'Solo responde quien menciones',
  },
  { id: 'nadie', label: 'Nadie', ayuda: 'Se lee, no se responde.', frase: 'Nadie puede responder' },
];

export function esApunte(formato: Formato): boolean {
  return formato === 'nota';
}

export function esHilo(formato: Formato): boolean {
  return formato === 'hilo';
}

/** Formatos que se guardan como nota en Tamix (`POST /notes`), no como post. */
export function esDeNota(formato: Formato): boolean {
  return esApunte(formato) || esHilo(formato);
}

/** Formatos que piden titular — todo menos apunte e hilo. */
export function pideTitular(formato: Formato): boolean {
  return !esDeNota(formato);
}

export function pideEntradilla(formato: Formato): boolean {
  return formato === 'articulo';
}

/** Formatos con un único archivo de audio/vídeo (no el carrusel). */
export function pideArchivoUnico(formato: Formato): 'audio' | 'video' | null {
  if (formato === 'audio') return 'audio';
  if (formato === 'video') return 'video';
  return null;
}

/** Sólo apunte e hilo llevan el carrusel de hasta diez fotos/vídeos. */
export function permiteCarrusel(formato: Formato): boolean {
  return esDeNota(formato);
}

/** «Quién puede verlo» sólo aplica a lo que no es apunte ni hilo — esos siempre son públicos. */
export function permiteAlcance(formato: Formato): boolean {
  return !esDeNota(formato);
}

/** «Quién puede responder» sólo aplica a lo que se guarda como nota. */
export function permiteCirculo(formato: Formato): boolean {
  return esDeNota(formato);
}

/** El tope de 500 caracteres y su contador sólo aplican a apunte e hilo. */
export function cuentaComoApunte(formato: Formato): boolean {
  return esDeNota(formato);
}

export function placeholderDeTitular(formato: Formato): string {
  if (formato === 'encuesta') return '¿Qué preguntas?';
  if (formato === 'pregunta') return 'Tu pregunta';
  if (formato === 'audio' || formato === 'video' || formato === 'envivo') return 'Título';
  return 'Titular';
}

/**
 * El cuerpo es obligatorio en todos los formatos que se guardan como post:
 * `POST /posts` en Tamix lo exige siempre (`content.ts`, «El cuerpo no
 * puede ir vacío»), aunque el composer de la app sea más permisivo con
 * audio/video/en vivo — mejor pedirlo aquí que dejar que el servidor
 * rechace después de subir el archivo entero.
 */
export function placeholderDeCuerpo(formato: Formato): string {
  if (esApunte(formato)) return 'Comparte una idea que valga la pena.';
  if (esHilo(formato)) return 'Empieza el hilo por aquí';
  if (formato === 'audio' || formato === 'video') return 'Descríbelo';
  return 'Escribe aquí. Deja una línea en blanco entre párrafos.';
}

/** Cuántos caracteres quedan del tope de un apunte (negativo si se pasó). */
export function quedanDeApunte(texto: string): number {
  return TOPE_DE_APUNTE - [...texto].length;
}

/** Todas las partes de un hilo caben en el tope, una por una. */
export function hiloCabe(partes: string[]): boolean {
  return partes.every((parte) => quedanDeApunte(parte) >= 0);
}

/** Las partes con texto, en orden — las vacías se descartan al publicar. */
export function trozosDelHilo(partes: string[]): string[] {
  return partes.map((p) => p.trim()).filter((p) => p.length > 0);
}

export type EntradaDeComposer = {
  formato: Formato;
  titular: string;
  cuerpo: string;
  /** Sólo se revisan si `formato === 'hilo'`. */
  partes: string[];
  /** Sólo se revisan si `formato === 'encuesta'`. */
  opciones: string[];
  /** Cuántas piezas lleva el carrusel — sólo importa el conteo aquí. */
  piezas: number;
  tieneArchivo: boolean;
  tieneCaratula: boolean;
  enlaceDelDirecto: string;
};

/**
 * Por qué esto no se puede publicar todavía, o `null` si está listo.
 *
 * Mismo criterio que `hayContenido`/`cabeLoEscrito` del composer real,
 * formato por formato — con el cuerpo siempre exigido en lo que es un post,
 * ver `placeholderDeCuerpo`.
 */
export function porQueNoSePuedePublicar(entrada: EntradaDeComposer): string | null {
  const { formato } = entrada;

  if (esApunte(formato)) {
    if (!entrada.cuerpo.trim() && entrada.piezas === 0) return 'Escribe algo, o adjunta una foto.';
    if (quedanDeApunte(entrada.cuerpo) < 0) return `Te pasaste por ${-quedanDeApunte(entrada.cuerpo)} caracteres`;
    return null;
  }

  if (esHilo(formato)) {
    if (!entrada.cuerpo.trim()) return 'Empieza el hilo por aquí';
    if (quedanDeApunte(entrada.cuerpo) < 0) return `Te pasaste por ${-quedanDeApunte(entrada.cuerpo)} caracteres`;
    if (!hiloCabe(entrada.partes)) return 'Una de las partes del hilo se pasó de 500 caracteres';
    return null;
  }

  if (formato === 'envivo') {
    if (!entrada.titular.trim()) return 'Falta el título';
    if (!entrada.enlaceDelDirecto.trim()) return 'Pega el enlace de tu transmisión';
    if (!entrada.cuerpo.trim()) return 'Falta el cuerpo';
    return null;
  }

  if (formato === 'audio' || formato === 'video') {
    if (!entrada.titular.trim()) return 'Falta el título';
    if (!entrada.tieneArchivo) return formato === 'audio' ? 'Falta subir el audio' : 'Falta subir el video';
    if (formato === 'audio' && !entrada.tieneCaratula) {
      return 'Un audio necesita una foto de portada: es lo único que se ve de él en el muro';
    }
    if (!entrada.cuerpo.trim()) return 'Falta el cuerpo';
    return null;
  }

  if (formato === 'encuesta') {
    if (!entrada.titular.trim()) return 'Falta la pregunta';
    const validas = entrada.opciones.filter((o) => o.trim()).length;
    if (validas < MINIMO_OPCIONES_ENCUESTA) return `Hacen falta al menos ${MINIMO_OPCIONES_ENCUESTA} opciones`;
    if (!entrada.cuerpo.trim()) return 'Falta el cuerpo';
    return null;
  }

  // articulo, pregunta
  if (!entrada.titular.trim()) return 'Falta el titular';
  if (!entrada.cuerpo.trim()) return 'Falta el cuerpo';
  return null;
}
