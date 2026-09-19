import type { Access, CrearNotaEntrada, CrearPostEntrada } from '@/types/tamix';
import type { EntradaDeItem } from '@/types/studio';

/**
 * Reglas de la subida masiva: puro cálculo y validación, sin `fetch`. La
 * subida real de cada fila (crear en Tamix, o programar en el Studio) la
 * hace la página con los mismos clientes (`tamixApi`, `studioApi`) que ya
 * usa el resto de Contenido y el Planificador — esto no inventa un tercer
 * camino hacia Tamix, sólo repite el existente muchas veces.
 */

export type TipoDeFilaMasiva = 'apunte' | 'articulo';

export type FilaMasiva = {
  id: string;
  tipo: TipoDeFilaMasiva;
  title: string;
  texto: string;
  fotos: string[];
  access: Access;
  topics: string[];
};

export function filaVacia(id: string, tipo: TipoDeFilaMasiva = 'apunte'): FilaMasiva {
  return { id, tipo, title: '', texto: '', fotos: [], access: 'publico', topics: [] };
}

export type PlanDeProgramacion =
  | { modo: 'ahora' }
  | { modo: 'unica'; publishAt: string }
  | { modo: 'escalonada'; desde: string; separacionMinutos: number };

/**
 * La hora de publicación de la fila en la posición `indice` (0-based) del
 * lote. `null` significa publicar de inmediato: esa fila no pasa por el
 * planificador, se crea directo en Tamix.
 */
export function calcularPublishAt(plan: PlanDeProgramacion, indice: number): string | null {
  if (plan.modo === 'ahora') return null;
  if (plan.modo === 'unica') return new Date(plan.publishAt).toISOString();
  const base = new Date(plan.desde).getTime();
  return new Date(base + indice * plan.separacionMinutos * 60_000).toISOString();
}

/**
 * Por qué este plan no sirve, o `null` si es válido. Mismo criterio que
 * `revisarEntrada` del planificador: programar en el pasado no es programar.
 */
export function porQueElPlanNoSirve(plan: PlanDeProgramacion, ahora: Date = new Date()): string | null {
  if (plan.modo === 'ahora') return null;

  const fechaBase = plan.modo === 'unica' ? plan.publishAt : plan.desde;
  const fecha = new Date(fechaBase);
  if (Number.isNaN(fecha.getTime())) return 'Esa fecha no es válida';
  if (fecha.getTime() <= ahora.getTime()) {
    return 'Programar en el pasado no publica nada: elige una hora futura';
  }
  if (plan.modo === 'escalonada' && !(plan.separacionMinutos > 0)) {
    return 'La separación entre publicaciones debe ser mayor que cero';
  }
  return null;
}

/**
 * Por qué esta fila no se puede enviar, o `null` si está lista.
 *
 * Un apunte no se puede programar: el planificador del Studio sólo tiene
 * contrato con Tamix para piezas con título y cuerpo (`kind` de post, ver
 * `docs/DATA_MODEL.md`) — publicarlo de inmediato sigue funcionando siempre,
 * así que esto no bloquea la fila, sólo el modo «programar».
 */
export function porQueNoSePuedeEnviar(fila: FilaMasiva, programando: boolean): string | null {
  if (!fila.texto.trim()) return fila.tipo === 'articulo' ? 'Falta el cuerpo' : 'Falta el texto';
  if (fila.tipo === 'articulo' && !fila.title.trim()) return 'Falta el titular';
  if (fila.fotos.length > 10) return 'Hasta diez fotos por elemento';
  if (programando && fila.tipo === 'apunte') {
    return 'Los apuntes se publican de inmediato: el planificador todavía no programa apuntes, sólo piezas largas';
  }
  return null;
}

export function aCrearPostEntrada(fila: FilaMasiva): CrearPostEntrada {
  return {
    kind: 'articulo',
    title: fila.title.trim(),
    bodyHtml: fila.texto,
    access: fila.access,
    coverUrl: fila.fotos[0] ?? undefined,
    topics: fila.topics,
  };
}

export function aCrearNotaEntrada(fila: FilaMasiva): CrearNotaEntrada {
  return {
    body: fila.texto,
    medios: fila.fotos.length > 0 ? fila.fotos.map((url) => ({ tipo: 'imagen' as const, url })) : undefined,
  };
}

export function aEntradaDeItem(fila: FilaMasiva, publishAt: string): EntradaDeItem {
  return {
    kind: 'articulo',
    title: fila.title.trim(),
    subtitle: undefined,
    bodyHtml: fila.texto,
    coverUrl: fila.fotos[0] ?? undefined,
    access: fila.access,
    topics: fila.topics,
    enlaceExterno: undefined,
    publishAt,
  };
}

/* ------------------------- Plantilla CSV ------------------------- */

const ENCABEZADO_CSV = ['tipo', 'titulo', 'texto', 'acceso', 'temas'];

/**
 * Un CSV con las columnas que `parsearCsv` sabe leer, y una fila de ejemplo
 * de cada tipo. Las fotos no viajan en el CSV —un texto no carga binarios—
 * se añaden aparte en la página, una vez importadas las filas.
 */
export function generarPlantillaCsv(): string {
  const filas = [
    ENCABEZADO_CSV.join(','),
    'apunte,,"Un texto corto para acompañar una o varias fotos",publico,',
    'articulo,"Un titular de ejemplo","El cuerpo del artículo",publico,"tema uno, tema dos"',
  ];
  return filas.join('\r\n') + '\r\n';
}

export type FilaCsv = Pick<FilaMasiva, 'tipo' | 'title' | 'texto' | 'access' | 'topics'>;

/** Parte un CSV en líneas de campos, con comillas dobles al estilo RFC 4180. */
function parsearLineasCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let enComillas = false;
  const normalizado = texto.replace(/\r\n/g, '\n');

  for (let i = 0; i < normalizado.length; i++) {
    const c = normalizado[i];
    if (enComillas) {
      if (c === '"') {
        if (normalizado[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((v) => v.trim() !== ''));
}

/**
 * Lee un CSV con la forma de `generarPlantillaCsv`. Cada fila con problema
 * se descarta y se explica en `errores` en vez de romper el resto del lote
 * — un CSV de doscientas filas con una mal escrita no se tira entero.
 */
export function parsearCsv(texto: string): { filas: FilaCsv[]; errores: string[] } {
  const lineas = parsearLineasCsv(texto);
  if (lineas.length === 0) return { filas: [], errores: ['El archivo está vacío'] };

  const [encabezado, ...resto] = lineas;
  const columnas = encabezado.map((h) => h.trim().toLowerCase());
  const indice = (nombre: string) => columnas.indexOf(nombre);
  const iTipo = indice('tipo');
  const iTitulo = indice('titulo');
  const iTexto = indice('texto');
  const iAcceso = indice('acceso');
  const iTemas = indice('temas');

  if (iTexto === -1) return { filas: [], errores: ['Falta la columna "texto" en el CSV'] };

  const filas: FilaCsv[] = [];
  const errores: string[] = [];

  resto.forEach((cols, i) => {
    const numeroDeFila = i + 2; // la fila 1 es el encabezado
    const texto = (cols[iTexto] ?? '').trim();
    if (!texto) {
      errores.push(`Fila ${numeroDeFila}: falta el texto`);
      return;
    }
    const tipoBruto = (iTipo >= 0 ? cols[iTipo] : '')?.trim().toLowerCase();
    const tipo: TipoDeFilaMasiva = tipoBruto === 'articulo' ? 'articulo' : 'apunte';
    const title = (iTitulo >= 0 ? (cols[iTitulo] ?? '') : '').trim();
    if (tipo === 'articulo' && !title) {
      errores.push(`Fila ${numeroDeFila}: un artículo necesita titular`);
      return;
    }
    const accesoBruto = (iAcceso >= 0 ? cols[iAcceso] : '')?.trim().toLowerCase();
    const access: Access = accesoBruto === 'suscriptores' || accesoBruto === 'pago' ? accesoBruto : 'publico';
    const topics =
      iTemas >= 0
        ? (cols[iTemas] ?? '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    filas.push({ tipo, title, texto, access, topics });
  });

  return { filas, errores };
}
