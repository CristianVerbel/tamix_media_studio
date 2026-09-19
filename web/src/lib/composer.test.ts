import { describe, expect, it } from 'vitest';

import {
  esApunte,
  esDeNota,
  esHilo,
  hiloCabe,
  permiteAlcance,
  permiteCirculo,
  pideTitular,
  porQueNoSePuedePublicar,
  quedanDeApunte,
  trozosDelHilo,
  TOPE_DE_APUNTE,
  type EntradaDeComposer,
  type Formato,
} from './composer';

function entrada(overrides: Partial<EntradaDeComposer> = {}): EntradaDeComposer {
  return {
    formato: 'nota',
    titular: '',
    cuerpo: '',
    partes: [],
    opciones: [],
    piezas: 0,
    tieneArchivo: false,
    tieneCaratula: false,
    enlaceDelDirecto: '',
    ...overrides,
  };
}

describe('esApunte / esHilo / esDeNota', () => {
  it('sólo nota es apunte, sólo hilo es hilo, los dos son "de nota"', () => {
    expect(esApunte('nota')).toBe(true);
    expect(esApunte('hilo')).toBe(false);
    expect(esHilo('hilo')).toBe(true);
    expect(esDeNota('nota')).toBe(true);
    expect(esDeNota('hilo')).toBe(true);
    expect(esDeNota('articulo')).toBe(false);
  });
});

describe('pideTitular / permiteAlcance / permiteCirculo', () => {
  it('apunte e hilo no piden titular; el resto sí', () => {
    expect(pideTitular('nota')).toBe(false);
    expect(pideTitular('hilo')).toBe(false);
    expect(pideTitular('articulo')).toBe(true);
    expect(pideTitular('encuesta')).toBe(true);
  });

  it('el alcance ("quién puede verlo") es lo contrario del círculo ("quién puede responder")', () => {
    for (const formato of ['nota', 'hilo'] as Formato[]) {
      expect(permiteAlcance(formato)).toBe(false);
      expect(permiteCirculo(formato)).toBe(true);
    }
    for (const formato of ['articulo', 'audio', 'video', 'envivo', 'encuesta', 'pregunta'] as Formato[]) {
      expect(permiteAlcance(formato)).toBe(true);
      expect(permiteCirculo(formato)).toBe(false);
    }
  });
});

describe('quedanDeApunte', () => {
  it('cuenta caracteres unicode uno por uno, no bytes', () => {
    expect(quedanDeApunte('')).toBe(TOPE_DE_APUNTE);
    expect(quedanDeApunte('hola')).toBe(TOPE_DE_APUNTE - 4);
  });

  it('da negativo al pasarse', () => {
    expect(quedanDeApunte('a'.repeat(TOPE_DE_APUNTE + 10))).toBe(-10);
  });
});

describe('hiloCabe / trozosDelHilo', () => {
  it('cabe si todas las partes están dentro del tope', () => {
    expect(hiloCabe(['una', 'dos'])).toBe(true);
    expect(hiloCabe(['una', 'a'.repeat(TOPE_DE_APUNTE + 1)])).toBe(false);
  });

  it('descarta las partes vacías, conserva el orden de las demás', () => {
    expect(trozosDelHilo(['  ', 'primera', '', 'segunda'])).toEqual(['primera', 'segunda']);
  });
});

describe('porQueNoSePuedePublicar — nota', () => {
  it('exige texto o al menos una foto', () => {
    expect(porQueNoSePuedePublicar(entrada())).toMatch(/Escribe algo/);
    expect(porQueNoSePuedePublicar(entrada({ piezas: 1 }))).toBeNull();
    expect(porQueNoSePuedePublicar(entrada({ cuerpo: 'hola' }))).toBeNull();
  });

  it('rechaza pasarse del tope', () => {
    const motivo = porQueNoSePuedePublicar(entrada({ cuerpo: 'a'.repeat(TOPE_DE_APUNTE + 5) }));
    expect(motivo).toMatch(/Te pasaste por 5/);
  });
});

describe('porQueNoSePuedePublicar — hilo', () => {
  it('exige la primera parte, y que quepan todas las demás', () => {
    expect(porQueNoSePuedePublicar(entrada({ formato: 'hilo' }))).toMatch(/Empieza el hilo/);
    expect(
      porQueNoSePuedePublicar(entrada({ formato: 'hilo', cuerpo: 'inicio', partes: ['a'.repeat(TOPE_DE_APUNTE + 1)] }))
    ).toMatch(/se pasó de 500/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'hilo', cuerpo: 'inicio', partes: ['siguiente'] }))).toBeNull();
  });
});

describe('porQueNoSePuedePublicar — envivo', () => {
  it('exige título, enlace y cuerpo', () => {
    expect(porQueNoSePuedePublicar(entrada({ formato: 'envivo' }))).toMatch(/título/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'envivo', titular: 't' }))).toMatch(/enlace/);
    expect(
      porQueNoSePuedePublicar(entrada({ formato: 'envivo', titular: 't', enlaceDelDirecto: 'https://youtu.be/x' }))
    ).toMatch(/cuerpo/);
    expect(
      porQueNoSePuedePublicar(
        entrada({ formato: 'envivo', titular: 't', enlaceDelDirecto: 'https://youtu.be/x', cuerpo: 'c' })
      )
    ).toBeNull();
  });
});

describe('porQueNoSePuedePublicar — audio/video', () => {
  it('audio exige título, archivo, carátula y cuerpo, en ese orden', () => {
    expect(porQueNoSePuedePublicar(entrada({ formato: 'audio' }))).toMatch(/título/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'audio', titular: 't' }))).toMatch(/subir el audio/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'audio', titular: 't', tieneArchivo: true }))).toMatch(/portada/);
    expect(
      porQueNoSePuedePublicar(entrada({ formato: 'audio', titular: 't', tieneArchivo: true, tieneCaratula: true }))
    ).toMatch(/cuerpo/);
  });

  it('video no exige carátula, sólo título, archivo y cuerpo', () => {
    expect(porQueNoSePuedePublicar(entrada({ formato: 'video', titular: 't' }))).toMatch(/subir el video/);
    expect(
      porQueNoSePuedePublicar(entrada({ formato: 'video', titular: 't', tieneArchivo: true, cuerpo: 'c' }))
    ).toBeNull();
  });
});

describe('porQueNoSePuedePublicar — encuesta', () => {
  it('exige pregunta, al menos dos opciones y cuerpo', () => {
    expect(porQueNoSePuedePublicar(entrada({ formato: 'encuesta' }))).toMatch(/pregunta/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'encuesta', titular: '¿Sí o no?', opciones: ['sí'] }))).toMatch(
      /al menos 2 opciones/
    );
    expect(
      porQueNoSePuedePublicar(entrada({ formato: 'encuesta', titular: '¿Sí o no?', opciones: ['sí', 'no'] }))
    ).toMatch(/cuerpo/);
    expect(
      porQueNoSePuedePublicar(
        entrada({ formato: 'encuesta', titular: '¿Sí o no?', opciones: ['sí', 'no'], cuerpo: 'c' })
      )
    ).toBeNull();
  });
});

describe('porQueNoSePuedePublicar — artículo/pregunta', () => {
  it('exigen titular y cuerpo', () => {
    expect(porQueNoSePuedePublicar(entrada({ formato: 'articulo' }))).toMatch(/titular/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'articulo', titular: 't' }))).toMatch(/cuerpo/);
    expect(porQueNoSePuedePublicar(entrada({ formato: 'articulo', titular: 't', cuerpo: 'c' }))).toBeNull();
    expect(porQueNoSePuedePublicar(entrada({ formato: 'pregunta', titular: 't', cuerpo: 'c' }))).toBeNull();
  });
});
