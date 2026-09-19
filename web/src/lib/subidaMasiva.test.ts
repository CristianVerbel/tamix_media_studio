import { describe, expect, it } from 'vitest';

import {
  aCrearNotaEntrada,
  aCrearPostEntrada,
  aEntradaDeItem,
  calcularPublishAt,
  filaVacia,
  generarPlantillaCsv,
  parsearCsv,
  porQueElPlanNoSirve,
  porQueNoSePuedeEnviar,
  type FilaMasiva,
} from './subidaMasiva';

function fila(overrides: Partial<FilaMasiva> = {}): FilaMasiva {
  return { ...filaVacia('f1', 'apunte'), texto: 'Un texto', ...overrides };
}

describe('calcularPublishAt', () => {
  it('devuelve null en modo ahora, sin importar el índice', () => {
    expect(calcularPublishAt({ modo: 'ahora' }, 0)).toBeNull();
    expect(calcularPublishAt({ modo: 'ahora' }, 5)).toBeNull();
  });

  it('usa la misma fecha para todas las filas en modo única', () => {
    const plan = { modo: 'unica' as const, publishAt: '2030-01-01T10:00:00.000Z' };
    expect(calcularPublishAt(plan, 0)).toBe('2030-01-01T10:00:00.000Z');
    expect(calcularPublishAt(plan, 7)).toBe('2030-01-01T10:00:00.000Z');
  });

  it('espacia cada fila en modo escalonada', () => {
    const plan = { modo: 'escalonada' as const, desde: '2030-01-01T10:00:00.000Z', separacionMinutos: 30 };
    expect(calcularPublishAt(plan, 0)).toBe('2030-01-01T10:00:00.000Z');
    expect(calcularPublishAt(plan, 1)).toBe('2030-01-01T10:30:00.000Z');
    expect(calcularPublishAt(plan, 4)).toBe('2030-01-01T12:00:00.000Z');
  });
});

describe('porQueElPlanNoSirve', () => {
  const ahora = new Date('2030-01-01T00:00:00.000Z');

  it('el modo ahora siempre sirve', () => {
    expect(porQueElPlanNoSirve({ modo: 'ahora' }, ahora)).toBeNull();
  });

  it('rechaza una fecha en el pasado', () => {
    const plan = { modo: 'unica' as const, publishAt: '2029-12-31T00:00:00.000Z' };
    expect(porQueElPlanNoSirve(plan, ahora)).toMatch(/futura/);
  });

  it('rechaza una fecha inválida', () => {
    const plan = { modo: 'unica' as const, publishAt: 'no-es-una-fecha' };
    expect(porQueElPlanNoSirve(plan, ahora)).toMatch(/no es válida/);
  });

  it('acepta una fecha futura', () => {
    const plan = { modo: 'unica' as const, publishAt: '2030-06-01T00:00:00.000Z' };
    expect(porQueElPlanNoSirve(plan, ahora)).toBeNull();
  });

  it('rechaza una separación de cero o negativa en modo escalonada', () => {
    const plan = { modo: 'escalonada' as const, desde: '2030-06-01T00:00:00.000Z', separacionMinutos: 0 };
    expect(porQueElPlanNoSirve(plan, ahora)).toMatch(/separación/);
  });
});

describe('porQueNoSePuedeEnviar', () => {
  it('exige texto siempre', () => {
    expect(porQueNoSePuedeEnviar(fila({ texto: '' }), false)).toMatch(/texto/);
  });

  it('exige titular sólo para artículos', () => {
    expect(porQueNoSePuedeEnviar(fila({ tipo: 'articulo', title: '' }), false)).toMatch(/titular/);
    expect(porQueNoSePuedeEnviar(fila({ tipo: 'apunte', title: '' }), false)).toBeNull();
  });

  it('un apunte completo, sin programar, está listo', () => {
    expect(porQueNoSePuedeEnviar(fila(), false)).toBeNull();
  });

  it('un apunte no se puede programar, aunque esté completo', () => {
    expect(porQueNoSePuedeEnviar(fila(), true)).toMatch(/planificador todavía no programa apuntes/);
  });

  it('un artículo completo sí se puede programar', () => {
    const f = fila({ tipo: 'articulo', title: 'Un titular' });
    expect(porQueNoSePuedeEnviar(f, true)).toBeNull();
  });

  it('rechaza más de diez fotos', () => {
    const f = fila({ fotos: Array.from({ length: 11 }, (_, i) => `https://x/${i}.jpg`) });
    expect(porQueNoSePuedeEnviar(f, false)).toMatch(/diez/);
  });
});

describe('mapeos hacia las entradas reales de cada API', () => {
  it('arma la entrada de un post con la primera foto como portada', () => {
    const f = fila({ tipo: 'articulo', title: ' Un titular ', texto: '<p>cuerpo</p>', fotos: ['https://x/1.jpg', 'https://x/2.jpg'], topics: ['a'] });
    expect(aCrearPostEntrada(f)).toEqual({
      kind: 'articulo',
      title: 'Un titular',
      bodyHtml: '<p>cuerpo</p>',
      access: 'publico',
      coverUrl: 'https://x/1.jpg',
      topics: ['a'],
    });
  });

  it('arma la entrada de una nota con todas las fotos como medios', () => {
    const f = fila({ texto: 'hola', fotos: ['https://x/1.jpg', 'https://x/2.jpg'] });
    expect(aCrearNotaEntrada(f)).toEqual({
      body: 'hola',
      medios: [
        { tipo: 'imagen', url: 'https://x/1.jpg' },
        { tipo: 'imagen', url: 'https://x/2.jpg' },
      ],
    });
  });

  it('una nota sin fotos no manda `medios`', () => {
    expect(aCrearNotaEntrada(fila({ texto: 'hola' })).medios).toBeUndefined();
  });

  it('arma la entrada del planificador con la fecha calculada', () => {
    const f = fila({ tipo: 'articulo', title: 'T', texto: 'cuerpo' });
    const entrada = aEntradaDeItem(f, '2030-01-01T10:00:00.000Z');
    expect(entrada.publishAt).toBe('2030-01-01T10:00:00.000Z');
    expect(entrada.title).toBe('T');
    expect(entrada.kind).toBe('articulo');
  });
});

describe('plantilla CSV', () => {
  it('la plantilla generada se puede volver a leer sin errores', () => {
    const { filas, errores } = parsearCsv(generarPlantillaCsv());
    expect(errores).toEqual([]);
    expect(filas).toHaveLength(2);
    expect(filas[0]?.tipo).toBe('apunte');
    expect(filas[1]?.tipo).toBe('articulo');
  });
});

describe('parsearCsv', () => {
  it('lee tipo, titulo, texto, acceso y temas', () => {
    const csv = 'tipo,titulo,texto,acceso,temas\narticulo,Hola,"Cuerpo, con coma",suscriptores,"a, b"\n';
    const { filas, errores } = parsearCsv(csv);
    expect(errores).toEqual([]);
    expect(filas).toEqual([{ tipo: 'articulo', title: 'Hola', texto: 'Cuerpo, con coma', access: 'suscriptores', topics: ['a', 'b'] }]);
  });

  it('sin columna texto, falla con un error claro y ninguna fila', () => {
    const { filas, errores } = parsearCsv('tipo,titulo\napunte,Hola\n');
    expect(filas).toEqual([]);
    expect(errores[0]).toMatch(/texto/);
  });

  it('una fila sin texto se descarta con su propio error, sin tirar las demás', () => {
    const csv = 'tipo,texto\napunte,\napunte,Segunda fila\n';
    const { filas, errores } = parsearCsv(csv);
    expect(filas).toHaveLength(1);
    expect(filas[0]?.texto).toBe('Segunda fila');
    expect(errores[0]).toMatch(/Fila 2/);
  });

  it('un artículo sin titular se descarta con su propio error', () => {
    const csv = 'tipo,titulo,texto\narticulo,,Cuerpo\n';
    const { filas, errores } = parsearCsv(csv);
    expect(filas).toEqual([]);
    expect(errores[0]).toMatch(/titular/);
  });

  it('sin columna tipo, todo se trata como apunte', () => {
    const { filas } = parsearCsv('texto\nHola\n');
    expect(filas[0]?.tipo).toBe('apunte');
  });

  it('un acceso desconocido cae a público', () => {
    const { filas } = parsearCsv('texto,acceso\nHola,no-existe\n');
    expect(filas[0]?.access).toBe('publico');
  });

  it('un archivo vacío no tiene filas y explica por qué', () => {
    expect(parsearCsv('')).toEqual({ filas: [], errores: ['El archivo está vacío'] });
  });
});
