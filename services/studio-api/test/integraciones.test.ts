import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  firmarPayload,
  firmaValida,
  revisarFuenteRss,
  revisarWebhookSaliente,
} from '../src/domain/integraciones.ts';

test('una fuente RSS tiene que ser HTTPS', () => {
  const http = revisarFuenteRss({ url: 'http://ejemplo.com/feed.xml' });
  assert.equal(http.ok, false);

  const https = revisarFuenteRss({ url: 'https://ejemplo.com/feed.xml' });
  assert.equal(https.ok, true);
});

test('sin dirección no hay fuente', () => {
  assert.equal(revisarFuenteRss({}).ok, false);
});

test('un webhook necesita al menos un evento válido', () => {
  const sinEventos = revisarWebhookSaliente({ url: 'https://ejemplo.com/hook' });
  assert.equal(sinEventos.ok, false);

  const conEventoInventado = revisarWebhookSaliente({
    url: 'https://ejemplo.com/hook',
    eventos: ['algo.que.no.existe' as never],
  });
  assert.equal(conEventoInventado.ok, false);

  const valido = revisarWebhookSaliente({
    url: 'https://ejemplo.com/hook',
    eventos: ['planificador.publicado'],
  });
  assert.equal(valido.ok, true);
});

test('la firma se verifica contra el mismo secreto y el mismo cuerpo', () => {
  const cuerpo = JSON.stringify({ hola: 'mundo' });
  const firma = firmarPayload(cuerpo, 'un-secreto');

  assert.equal(firmaValida(cuerpo, firma, 'un-secreto'), true);
  assert.equal(firmaValida(cuerpo, firma, 'otro-secreto'), false);
  assert.equal(firmaValida(cuerpo + 'x', firma, 'un-secreto'), false);
  assert.equal(firmaValida(cuerpo, '', 'un-secreto'), false);
});
