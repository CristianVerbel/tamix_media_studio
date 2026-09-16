import assert from 'node:assert/strict';
import { test } from 'node:test';

import { editable, proximoReintento, REINTENTOS_MINUTOS, revisarEntrada } from '../src/domain/planificador.ts';

const ahora = new Date('2026-09-16T12:00:00.000Z');

test('programar en el pasado falla con un mensaje accionable', () => {
  const resultado = revisarEntrada(
    { title: 'Algo', bodyHtml: '<p>x</p>', publishAt: '2026-09-16T11:00:00.000Z' },
    ahora
  );
  assert.equal(resultado.ok, false);
  if (resultado.ok) throw new Error('no debería pasar');
  assert.match(resultado.motivo, /pasado/);
});

test('sin titular no hay nada que programar', () => {
  const resultado = revisarEntrada({ bodyHtml: '<p>x</p>', publishAt: '2026-09-17T00:00:00.000Z' }, ahora);
  assert.equal(resultado.ok, false);
});

test('una entrada válida se normaliza a ISO', () => {
  const resultado = revisarEntrada(
    { title: '  Un titular  ', bodyHtml: '<p>x</p>', publishAt: '2026-09-17T09:00:00-05:00' },
    ahora
  );
  assert.equal(resultado.ok, true);
  if (!resultado.ok) throw new Error('no debería pasar');
  assert.equal(resultado.entrada.title, 'Un titular');
  assert.equal(resultado.entrada.publishAt, '2026-09-17T14:00:00.000Z');
  assert.equal(resultado.entrada.access, 'publico');
});

test('sólo lo programado o lo fallido se puede tocar', () => {
  assert.equal(editable('programado'), true);
  assert.equal(editable('fallido'), true);
  assert.equal(editable('publicando'), false);
  assert.equal(editable('publicado'), false);
  assert.equal(editable('cancelado'), false);
});

test('los reintentos siguen la escalera documentada y luego se paran', () => {
  assert.equal(REINTENTOS_MINUTOS.length, 7);
  assert.equal(proximoReintento(0, ahora)?.toISOString(), ahora.toISOString());
  assert.equal(proximoReintento(6, ahora)?.toISOString(), '2026-09-17T12:00:00.000Z');
  assert.equal(proximoReintento(7, ahora), null);
});
