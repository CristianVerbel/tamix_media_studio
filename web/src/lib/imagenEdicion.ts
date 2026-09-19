/**
 * Edición y compresión de imagen, igual que el composer real:
 *
 * - Compresión automática antes de subir cualquier imagen —lado largo a
 *   2048 px, calidad 0.82, JPEG— igual que `lib/aligerar-imagen.ts` de la
 *   app (rama web: `createImageBitmap` + `canvas.toBlob`). Se aplica a toda
 *   imagen que suba, la haya editado o no, igual que allá.
 * - Edición manual —girar, voltear, recortar a una proporción fija— igual
 *   que `EditorDeImagen.tsx` de la app: cuatro proporciones (original,
 *   cuadrada, vertical 4:5, horizontal 16:9), sin lienzo de arrastre libre,
 *   calidad 0.9 al exportar.
 *
 * Sólo se usa en el carrusel de un apunte/hilo: un archivo único (portada,
 * carátula) no se recorta aquí, tal como tampoco lo hace la app en el
 * navegador — sólo su selector nativo del teléfono, que esta web no tiene.
 */

export const LADO_MAXIMO_COMPRIMIDO = 2048;
export const CALIDAD_COMPRIMIDA = 0.82;
export const CALIDAD_EDITADA = 0.9;

export type Proporcion = 'original' | 'cuadrada' | 'vertical' | 'horizontal';

export const PROPORCIONES: { clave: Proporcion; etiqueta: string; relacion: number | null }[] = [
  { clave: 'original', etiqueta: 'Original', relacion: null },
  { clave: 'cuadrada', etiqueta: 'Cuadrada', relacion: 1 },
  { clave: 'vertical', etiqueta: 'Vertical', relacion: 4 / 5 },
  { clave: 'horizontal', etiqueta: 'Horizontal', relacion: 16 / 9 },
];

export type Rectangulo = { x: number; y: number; ancho: number; alto: number };

/** El rectángulo centrado más grande con esa proporción que cabe dentro de `ancho`x`alto`. */
export function calcularRecorte(ancho: number, alto: number, relacion: number | null): Rectangulo {
  if (relacion === null || ancho <= 0 || alto <= 0) return { x: 0, y: 0, ancho, alto };
  const relacionOriginal = ancho / alto;
  let w = ancho;
  let h = alto;
  if (relacionOriginal > relacion) {
    w = alto * relacion;
  } else {
    h = ancho / relacion;
  }
  return { x: (ancho - w) / 2, y: (alto - h) / 2, ancho: w, alto: h };
}

/** El tamaño de salida si hay que achicar la imagen para que quepa en `ladoMaximo`. */
export function medidaComprimida(
  ancho: number,
  alto: number,
  ladoMaximo: number = LADO_MAXIMO_COMPRIMIDO
): { ancho: number; alto: number } {
  if (ancho <= ladoMaximo && alto <= ladoMaximo) return { ancho, alto };
  const escala = ladoMaximo / Math.max(ancho, alto);
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

export type AjusteDeImagen = { rotacion: 0 | 90 | 180 | 270; espejo: boolean; proporcion: Proporcion };

async function cargarBitmap(archivo: File): Promise<ImageBitmap> {
  return createImageBitmap(archivo);
}

function canvasATexto(canvas: HTMLCanvasElement, calidad: number, nombre: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        const nombreJpg = nombre.replace(/\.[^./]+$/, '') + '.jpg';
        resolve(new File([blob], nombreJpg, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      calidad
    );
  });
}

/**
 * Comprime una imagen para subirla — lado largo a 2048px, calidad 0.82.
 * Si algo falla, o el archivo no es una imagen, devuelve el original tal
 * cual: nunca bloquea una subida por no poder comprimir, igual que la app.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith('image/')) return archivo;
  try {
    const bitmap = await cargarBitmap(archivo);
    const { ancho, alto } = medidaComprimida(bitmap.width, bitmap.height, LADO_MAXIMO_COMPRIMIDO);
    if (ancho === bitmap.width && alto === bitmap.height && archivo.type === 'image/jpeg') {
      bitmap.close();
      return archivo;
    }
    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return archivo;
    }
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();
    return await canvasATexto(canvas, CALIDAD_COMPRIMIDA, archivo.name);
  } catch {
    return archivo;
  }
}

/** Aplica rotación, espejo y recorte a proporción fija, y exporta a JPEG calidad 0.9. */
export async function aplicarEdicion(archivo: File, ajuste: AjusteDeImagen): Promise<File> {
  const bitmap = await cargarBitmap(archivo);
  try {
    const rotado90 = ajuste.rotacion === 90 || ajuste.rotacion === 270;
    const anchoRotado = rotado90 ? bitmap.height : bitmap.width;
    const altoRotado = rotado90 ? bitmap.width : bitmap.height;

    const previo = document.createElement('canvas');
    previo.width = anchoRotado;
    previo.height = altoRotado;
    const ctxPrevio = previo.getContext('2d');
    if (!ctxPrevio) throw new Error('No se pudo editar esta imagen.');

    ctxPrevio.translate(anchoRotado / 2, altoRotado / 2);
    ctxPrevio.rotate((ajuste.rotacion * Math.PI) / 180);
    ctxPrevio.scale(ajuste.espejo ? -1 : 1, 1);
    ctxPrevio.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const proporcion = PROPORCIONES.find((p) => p.clave === ajuste.proporcion) ?? PROPORCIONES[0]!;
    const recorte = calcularRecorte(anchoRotado, altoRotado, proporcion.relacion);

    const final = document.createElement('canvas');
    final.width = Math.round(recorte.ancho);
    final.height = Math.round(recorte.alto);
    const ctxFinal = final.getContext('2d');
    if (!ctxFinal) throw new Error('No se pudo editar esta imagen.');
    ctxFinal.drawImage(previo, recorte.x, recorte.y, recorte.ancho, recorte.alto, 0, 0, final.width, final.height);

    return await canvasATexto(final, CALIDAD_EDITADA, archivo.name);
  } finally {
    bitmap.close();
  }
}
