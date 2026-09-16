import { describe, expect, it } from 'vitest';

import { alcanza, etiquetaRol, mensajeFaltaRol } from './roles';

describe('alcanza', () => {
  it('deja pasar un papel igual al mínimo', () => {
    expect(alcanza('editor', 'editor')).toBe(true);
  });

  it('deja pasar un papel por encima del mínimo', () => {
    expect(alcanza('propietario', 'redactor')).toBe(true);
  });

  it('bloquea un papel por debajo del mínimo', () => {
    expect(alcanza('analista', 'editor')).toBe(false);
  });

  it('bloquea cuando no hay papel', () => {
    expect(alcanza(null, 'analista')).toBe(false);
    expect(alcanza(undefined, 'analista')).toBe(false);
  });

  it('respeta el orden completo de la escala', () => {
    expect(alcanza('redactor', 'analista')).toBe(true);
    expect(alcanza('redactor', 'editor')).toBe(false);
    expect(alcanza('propietario', 'propietario')).toBe(true);
  });
});

describe('etiquetaRol / mensajeFaltaRol', () => {
  it('etiqueta cada papel en español', () => {
    expect(etiquetaRol('propietario')).toBe('Propietario');
    expect(etiquetaRol(null)).toBe('Sin papel');
  });

  it('arma el mensaje de 403 en minúsculas', () => {
    expect(mensajeFaltaRol('editor')).toBe('Te falta el papel de editor en esta cuenta');
  });
});
