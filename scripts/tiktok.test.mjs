import test from 'node:test';
import assert from 'node:assert/strict';
import { elegir, cifrar, descifrar, recortar } from './tiktok.mjs';

const items = [{ slug: '002-oppa-unnie', texto: 'T2', titulo: '#2' }, { slug: 'examen', texto: 'TE', titulo: 'Examen' }];
const ultima = { archivo: '002-oppa-unnie.json' };

test('tiktok: envía la lección de hoy, luego el examen, sin repetir', () => {
  let r = elegir({ ultima, items, hoy: '2026-11-10' });
  assert.equal(r.slug, '002-oppa-unnie'); assert.equal(r.texto, 'T2'); assert.deepEqual(r.fotos, ['01.jpg', '02.jpg', '03.jpg']);
  assert.equal(elegir({ ultima, items, hoy: '2026-11-10', enviados: [{ dia: '2026-11-10', slug: 'x' }] }).motivo, 'ya-enviado-hoy');
  r = elegir({ ultima, items, hoy: '2026-11-11', enviados: [{ dia: '2026-11-10', slug: '002-oppa-unnie' }] });
  assert.equal(r.slug, 'examen');
  r = elegir({ ultima, items, hoy: '2026-11-12', enviados: [{ dia: '2026-11-10', slug: '002-oppa-unnie' }, { dia: '2026-11-11', slug: 'examen' }] });
  assert.equal(r.motivo, 'nada-nuevo');
  assert.equal(elegir({ ultima, items, hoy: '2026-11-10', listar: () => ['01.jpg', '02.jpg'] }).motivo, 'nada-nuevo');
});

test('tiktok: token cifrado ida y vuelta', () => {
  const c = cifrar({ refresh_token: 'rt.abc' }, 'secreto');
  assert.ok(!c.includes('rt.abc'));
  assert.equal(descifrar(c, 'secreto').refresh_token, 'rt.abc');
  assert.throws(() => descifrar(c, 'otro'));
});

test('tiktok: recorta título y descripción', () => {
  assert.equal(recortar('abc', 90), 'abc');
  assert.equal(recortar('x'.repeat(100), 90).length, 90);
});
