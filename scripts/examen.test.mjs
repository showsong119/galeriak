import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../site/examen-coreano/index.html', import.meta.url), 'utf8');
const core = html.split('/* ===== CORE')[1].split('/* ===== /CORE')[0];
const ctx = vm.createContext({});
vm.runInContext('/*' + core + ';Object.assign(this,{BANK,BLUEPRINT,EXAM_N,pickExam,grade,BYID,MODES});', ctx);
const { BANK, BLUEPRINT, EXAM_N, pickExam, grade, BYID, MODES } = ctx;

test('banco: ids únicos, 4 opciones distintas, al menos 6 veces lo que pide cada examen', () => {
  assert.equal(new Set(BANK.map(q => q.id)).size, BANK.length);
  for (const q of BANK) {
    assert.equal(q.o.length, 4, q.id);
    assert.equal(new Set(q.o).size, 4, q.id);
    assert.ok(q.e && (q.t || q.a), q.id);
  }
  for (const [s, o] of Object.entries(BLUEPRINT)) for (const [lv, n] of Object.entries(o))
    assert.ok(BANK.filter(q => q.s === s && q.lv === +lv).length >= 6 * n, `${s}${lv}`);
});
test('examen: 30 preguntas según el plan', () => {
  const ids = pickExam({});
  assert.equal(ids.length, EXAM_N);
  assert.equal(new Set(ids).size, EXAM_N);
  for (const [s, o] of Object.entries(BLUEPRINT)) for (const [lv, n] of Object.entries(o))
    assert.equal(ids.filter(id => BYID[id].s === s && BYID[id].lv === +lv).length, n);
});
test('seis intentos seguidos no repiten ninguna pregunta', () => {
  const seen = {}; const all = [];
  for (let k = 0; k < 6; k++) { const ids = pickExam(seen); ids.forEach(id => seen[id] = (seen[id] || 0) + 1); all.push(...ids); }
  assert.equal(new Set(all).size, all.length);
});
test('nivel: acertar hasta L da nivel L con cualquier examen', () => {
  for (let r = 0; r < 5; r++) {
    const qs = pickExam({}).map(id => BYID[id]);
    assert.equal(grade({}, qs).level, 0);
    for (let L = 1; L <= 6; L++) assert.equal(grade(Object.fromEntries(qs.map(q => [q.id, q.lv <= L ? 0 : 1])), qs).level, L);
  }
});
test('sin enlaces de Amazon y AdSense configurado', () => {
  assert.doesNotMatch(html, /amazon/i);
  assert.match(html, /const ADS=\{client:"(ca-pub-\d+)?",/);
});

test('niveles elegibles: 30 preguntas, solo de su rango y sin repetir en 2 intentos', () => {
  for (const [k, m] of Object.entries(MODES)) {
    const seen = {}; const all = [];
    for (let t = 0; t < 2; t++) {
      const ids = pickExam(seen, Math.random, k);
      assert.equal(ids.length, EXAM_N, k);
      assert.equal(new Set(ids).size, EXAM_N, k);
      for (const id of ids) assert.ok(BYID[id].lv >= m.lv[0] && BYID[id].lv <= m.lv[1], k + ' ' + id);
      for (const s of ['V', 'R', 'L']) assert.ok(ids.some(id => BYID[id].s === s), k + ' sin ' + s);
      ids.forEach(id => seen[id] = (seen[id] || 0) + 1); all.push(...ids);
    }
    assert.equal(new Set(all).size, all.length, k + ' repite');
  }
});
test('niveles elegibles: calificación dentro del rango', () => {
  for (const k of ['basico', 'intermedio', 'avanzado']) {
    const [lo, hi] = MODES[k].lv;
    const qs = pickExam({}, Math.random, k).map(id => BYID[id]);
    const none = grade({}, qs, k), all = grade(Object.fromEntries(qs.map(q => [q.id, 0])), qs, k);
    assert.equal(none.level, lo - 1); assert.equal(none.bajo, true);
    assert.equal(all.level, hi); assert.equal(all.tope, hi < 6);
    const half = grade(Object.fromEntries(qs.map(q => [q.id, q.lv === lo ? 0 : 1])), qs, k);
    assert.equal(half.level, lo);
  }
});
