import { tamixApi } from './tamixApi';

/**
 * Qué se deja subir, y hasta cuánto — copiado de
 * `services/social-api/src/domain/subidas.ts` en Tamix-social-media.
 *
 * El servidor es quien de verdad lo hace cumplir: esto es sólo para que un
 * archivo que ya se sabe que va a rebotar se diga aquí mismo, antes de
 * gastar la subida entera contra el bucket para enterarse al final.
 */
export const TIPOS_PERMITIDOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'm4a',
  'video/mp4': 'mp4',
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/ogg': 'ogg',
};

export const LIMITE = { imagen: 12_000_000, audio: 200_000_000, video: 300_000_000 };

export function familiaDe(contentType: string): 'imagen' | 'audio' | 'video' | null {
  if (contentType.startsWith('image/')) return 'imagen';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('video/')) return 'video';
  return null;
}

/** Por qué no se puede subir este archivo, o `null` si se puede. */
export function porQueNoSePuedeSubir(archivo: File): string | null {
  if (!(archivo.type in TIPOS_PERMITIDOS)) {
    return `${archivo.type || 'Ese formato'} no se admite. Prueba con jpg, png, webp, mp3, m4a, mp4, webm o ogg.`;
  }
  const familia = familiaDe(archivo.type);
  const limite = familia ? LIMITE[familia] : null;
  if (limite && archivo.size > limite) {
    return `Pesa ${formatoMB(archivo.size)} y el tope para ${familia} es ${formatoMB(limite)}.`;
  }
  return null;
}

function formatoMB(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/**
 * Sube un archivo directo al bucket y devuelve su dirección pública.
 *
 * En dos pasos, como hace la app: primero se pide permiso —una URL firmada,
 * de un solo uso y con quince minutos de vida— y luego se manda el archivo
 * a esa URL, no a este API. Así el archivo nunca pasa por la Lambda: un
 * vídeo de trescientos megas atravesándola sería pagar de más y arriesgarse
 * al tope de tiempo de la función por nada que la Lambda tenga que hacer.
 */
export async function subirArchivo(
  archivo: File,
  alAvanzar?: (fraccion: number) => void
): Promise<string> {
  const problema = porQueNoSePuedeSubir(archivo);
  if (problema) throw new Error(problema);

  const permiso = await tamixApi.permisoDeSubida(archivo.type, archivo.size);
  await subirConProgreso(permiso.uploadUrl, archivo, permiso.headers, alAvanzar);

  if (!permiso.publicUrl) {
    throw new Error('El archivo se subió, pero el servidor no dejó una dirección pública.');
  }
  return permiso.publicUrl;
}

/**
 * El `PUT` de verdad, con `XMLHttpRequest` y no `fetch`.
 *
 * Es lo único de las dos que avisa del avance mientras sube: `fetch` no
 * tiene un evento de progreso de subida, y un vídeo de doscientos megas sin
 * una barra que se mueva parece una pestaña colgada.
 */
function subirConProgreso(
  url: string,
  archivo: File,
  headers: Record<string, string>,
  alAvanzar?: (fraccion: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    for (const [nombre, valor] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(nombre, valor);
    }
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && alAvanzar) alAvanzar(evento.loaded / evento.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`La subida falló (${xhr.status}). Inténtalo de nuevo.`));
    };
    xhr.onerror = () => reject(new Error('La subida falló. Revisa tu conexión e inténtalo de nuevo.'));
    xhr.send(archivo);
  });
}

/** El ancho y el alto de una imagen o un vídeo, leídos del propio archivo. */
export function medirArchivo(archivo: File): Promise<{ ancho: number; alto: number; duracionSegundos?: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const limpiar = () => URL.revokeObjectURL(url);

    if (archivo.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        resolve({ ancho: img.naturalWidth, alto: img.naturalHeight });
        limpiar();
      };
      img.onerror = () => {
        limpiar();
        reject(new Error('No se pudo leer la imagen.'));
      };
      img.src = url;
      return;
    }

    if (archivo.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve({ ancho: video.videoWidth, alto: video.videoHeight, duracionSegundos: video.duration });
        limpiar();
      };
      video.onerror = () => {
        limpiar();
        reject(new Error('No se pudo leer el vídeo.'));
      };
      video.src = url;
      return;
    }

    limpiar();
    reject(new Error('Este archivo no tiene ancho ni alto que medir.'));
  });
}
