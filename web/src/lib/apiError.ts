/**
 * Forma de error compartida por las dos APIs (Tamix y Studio): siempre
 * `{error: string}` en un cuerpo no-2xx. `ApiError` la envuelve con el
 * código de estado para que la UI pueda distinguir un 403 (falta de papel)
 * de cualquier otro fallo sin volver a parsear el cuerpo.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }

  get esPermisoDenegado(): boolean {
    return this.status === 403;
  }

  get esNoAutenticado(): boolean {
    return this.status === 401;
  }
}

function tieneCampoError(body: unknown): body is { error: string } {
  return typeof body === 'object' && body !== null && 'error' in body && typeof (body as { error?: unknown }).error === 'string';
}

/**
 * Construye un `ApiError` a partir de una respuesta no-2xx. Pura: no toca
 * `fetch` ni nada asíncrono, así que se puede probar con objetos sueltos.
 */
export function shapeApiError(status: number, body: unknown): ApiError {
  if (tieneCampoError(body)) return new ApiError(status, body.error);
  return new ApiError(status, `La API respondió ${status} sin un mensaje de error legible`);
}
