import { describe, expect, it } from 'vitest';

import { ApiError, shapeApiError } from './apiError';

describe('shapeApiError', () => {
  it('usa el mensaje del servidor cuando el cuerpo trae {error}', () => {
    const err = shapeApiError(403, { error: 'Para esto hace falta ser editor de la cuenta en Tamix' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe('Para esto hace falta ser editor de la cuenta en Tamix');
  });

  it('cae a un mensaje genérico cuando el cuerpo no tiene forma reconocible', () => {
    const err = shapeApiError(500, null);
    expect(err.status).toBe(500);
    expect(err.message).toContain('500');
  });

  it('ignora un campo error que no es texto', () => {
    const err = shapeApiError(400, { error: 42 });
    expect(err.message).toContain('400');
  });

  it('expone esPermisoDenegado sólo en 403', () => {
    expect(shapeApiError(403, { error: 'x' }).esPermisoDenegado).toBe(true);
    expect(shapeApiError(404, { error: 'x' }).esPermisoDenegado).toBe(false);
  });

  it('expone esNoAutenticado sólo en 401', () => {
    expect(shapeApiError(401, { error: 'x' }).esNoAutenticado).toBe(true);
    expect(shapeApiError(403, { error: 'x' }).esNoAutenticado).toBe(false);
  });
});
