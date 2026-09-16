/**
 * Canal mínimo para avisar a la app (fuera de cualquier componente) que la
 * sesión murió — el refresh token quedó inválido — para que el shell pueda
 * mandar a la persona de vuelta a /entrar sin que cada llamada a la API
 * tenga que conocer el router.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(): void {
  for (const listener of listeners) listener();
}
