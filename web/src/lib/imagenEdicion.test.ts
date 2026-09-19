import { describe, expect, it } from 'vitest';

import { calcularRecorte, medidaComprimida } from './imagenEdicion';

describe('medidaComprimida', () => {
  it('no toca una imagen que ya cabe en el tope', () => {
    expect(medidaComprimida(1000, 800, 2048)).toEqual({ ancho: 1000, alto: 800 });
  });

  it('achica manteniendo la proporción cuando el lado largo se pasa', () => {
    expect(medidaComprimida(4096, 2048, 2048)).toEqual({ ancho: 2048, alto: 1024 });
  });

  it('usa el lado largo aunque sea el alto', () => {
    expect(medidaComprimida(1000, 4000, 2000)).toEqual({ ancho: 500, alto: 2000 });
  });
});

describe('calcularRecorte', () => {
  it('sin proporción (original) devuelve el rectángulo entero', () => {
    expect(calcularRecorte(800, 600, null)).toEqual({ x: 0, y: 0, ancho: 800, alto: 600 });
  });

  it('recorta el ancho cuando la imagen es más ancha que la proporción pedida', () => {
    // 800x600 es 4:3 (1.33); pedir cuadrada (1) recorta el ancho a 600, centrado.
    const r = calcularRecorte(800, 600, 1);
    expect(r).toEqual({ x: 100, y: 0, ancho: 600, alto: 600 });
  });

  it('recorta el alto cuando la imagen es más alta que la proporción pedida', () => {
    // 600x800 es 3:4 (0.75); pedir horizontal (16:9 ≈ 1.78) recorta el alto.
    const r = calcularRecorte(600, 800, 16 / 9);
    expect(r.ancho).toBe(600);
    expect(r.alto).toBeCloseTo(337.5, 5);
    expect(r.x).toBe(0);
    expect(r.y).toBeCloseTo((800 - 337.5) / 2, 5);
  });

  it('en una imagen cuadrada, pedir vertical (4:5) recorta el ancho y centra en X', () => {
    const r = calcularRecorte(1000, 1000, 4 / 5);
    expect(r).toEqual({ x: 100, y: 0, ancho: 800, alto: 1000 });
  });
});
