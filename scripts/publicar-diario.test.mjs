import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { validar, armarPost, COLA, TEMAS } from './publicar-diario.mjs';

test('todas las lecciones de la cola son válidas y sin títulos repetidos', () => {
  const fs = readdirSync(COLA).filter(f => f.endsWith('.json'));
  const titles = new Set();
  for (const f of fs) {
    const l = JSON.parse(readFileSync(`${COLA}/${f}`, 'utf8'));
    assert.deepEqual(validar(l, f), [], f);
    assert.ok(l.ilus, 'falta ilus (ilustración) en ' + f);
    assert.ok(!titles.has(l.title), 'repetido: ' + l.title); titles.add(l.title);
  }
});
test('validación y post', () => {
  assert.ok(validar({ title: 'corto', body: 'x' }).length >= 2);
  assert.ok(validar({ title: 'Título válido de prueba', body: 'a'.repeat(400) }).includes('el cuerpo no tiene hangul'));
  const p = armarPost({ title: ' Hola coreano ', body: '안녕 ' + 'x'.repeat(400) }, 'u1');
  assert.equal(p.gallery_id, 'coreano'); assert.equal(p.author_id, 'u1'); assert.equal(p.title, 'Hola coreano');
  assert.match(p.body, /examen-coreano/);
  assert.ok(TEMAS.includes('kpop'));
});
test('ilustración: marca al inicio y validación', () => {
  const l = { title: 'Hola coreano de prueba', body: '안녕 ' + 'x'.repeat(400), ilus: { ko: '안녕!', rom: 'annyeong', es: '¡Hola!', motivo: 'kpop' } };
  assert.match(armarPost(l, 'u1', '002-oppa-unnie.json').body, /^\[ilus:002-oppa-unnie\]\n\n안녕/);
  assert.ok(validar(l, '999-no-existe.json').some(e => /ilustración/.test(e)));
  assert.ok(validar({ ...l, ilus: { ko: 'hola', es: 'x' } }).some(e => /ilus\.ko/.test(e)));
  assert.ok(validar({ ...l, body: '[ilus:x]\n' + l.body }).length);
});
