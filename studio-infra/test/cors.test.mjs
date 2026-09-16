import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

/**
 * Que las dos puertas de CORS digan lo mismo.
 *
 * Mismo motivo que la prueba homónima en Tamix-social-media: API Gateway
 * contesta el `OPTIONS` antes de que la Lambda arranque, así que un método
 * que falte ahí apaga la ruta desde el navegador sin ningún error que se
 * pueda leer, aunque el enrutador de Hono lo permita.
 */

const infra = readFileSync(new URL('../sst.config.ts', import.meta.url), 'utf8');
const enrutador = readFileSync(
  new URL('../../services/studio-api/src/index.ts', import.meta.url),
  'utf8'
);

function metodos(fuente) {
  const m = /allowMethods:\s*\[([^\]]*)\]/.exec(fuente);
  assert.ok(m, 'no se encontró ningún allowMethods');
  return m[1]
    .split(',')
    .map((x) => x.trim().replace(/['"]/g, ''))
    .filter(Boolean)
    .sort();
}

test('la puerta y el enrutador permiten los mismos métodos', () => {
  assert.deepEqual(
    metodos(infra),
    metodos(enrutador),
    'Las dos listas de CORS se han separado. La que falte apaga esas rutas desde el navegador.'
  );
});
