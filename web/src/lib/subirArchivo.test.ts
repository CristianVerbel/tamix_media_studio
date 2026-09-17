import { describe, expect, it } from 'vitest';

import { familiaDe, LIMITE, porQueNoSePuedeSubir } from './subirArchivo';

function archivo(type: string, size: number, name = 'archivo'): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('familiaDe', () => {
  it('reconoce imagen, audio y vídeo por el content type', () => {
    expect(familiaDe('image/png')).toBe('imagen');
    expect(familiaDe('audio/mpeg')).toBe('audio');
    expect(familiaDe('video/mp4')).toBe('video');
  });

  it('no reconoce un content type ajeno', () => {
    expect(familiaDe('application/pdf')).toBeNull();
  });
});

describe('porQueNoSePuedeSubir', () => {
  it('deja pasar un archivo permitido y dentro del tope', () => {
    expect(porQueNoSePuedeSubir(archivo('image/jpeg', 1_000_000))).toBeNull();
  });

  it('rechaza un formato que no está en la lista', () => {
    expect(porQueNoSePuedeSubir(archivo('application/pdf', 1000))).toMatch(/no se admite/);
  });

  it('rechaza una imagen que pasa su tope', () => {
    const mensaje = porQueNoSePuedeSubir(archivo('image/png', LIMITE.imagen + 1));
    expect(mensaje).toMatch(/imagen/);
  });

  it('rechaza un vídeo que pasa su tope', () => {
    const mensaje = porQueNoSePuedeSubir(archivo('video/mp4', LIMITE.video + 1));
    expect(mensaje).toMatch(/video/);
  });

  it('un audio del mismo peso que una imagen de sobra no rebota, porque su tope es otro', () => {
    expect(porQueNoSePuedeSubir(archivo('audio/mpeg', LIMITE.imagen + 1))).toBeNull();
  });
});
