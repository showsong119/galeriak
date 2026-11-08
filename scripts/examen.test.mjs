import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../site/examen-coreano/index.html', import.meta.url), 'utf8');
const core = html.split('/* ===== CORE')[1].split('/* ===== /CORE')[0];
const ctx = vm.createContext({});
vm.runInContext('/*' + core + ';Object.assign(this,{BANK,BLUEPRINT,EXAM_N,pickExam,grade,BYID});', ctx);
const { BANK, BLUEPRINT, EXAM_N, pickExam, grade, BYID } = ctx;

test('banco: ids únicos, 4 opciones distintas, al menos 3 veces lo que pide cada examen', () => {
  assert.equal(new Set(BANK.map(q => q.id)).size, BANK.length);
  for (const q of BANK) {
    assert.equal(q.o.length, 4, q.id);
    assert.equal(new Set(q.o).size, 4, q.id);
    assert.ok(q.e && (q.t || q.a), q.id);
  }
  for (const [s, o] of Object.entries(BLUEPRINT)) for (const [lv, n] of Object.entries(o))
    assert.ok(BANK.filter(q => q.s === s && q.lv === +lv).length >= 3 * n, `${s}${lv}`);
});
test('examen: 30 preguntas según el plan', () => {
  const ids = pickExam({});
  assert.equal(ids.length, EXAM_N);
  assert.equal(new Set(ids).size, EXAM_N);
  for (const [s, o] of Object.entries(BLUEPRINT)) for (const [lv, n] of Object.entries(o))
    assert.equal(ids.filter(id => BYID[id].s === s && BYID[id].lv === +lv).length, n);
});
test('tres intentos seguidos no repiten ninguna pregunta', () => {
  const seen = {}; const all = [];
  for (let k = 0; k < 3; k++) { const ids = pickExam(seen); ids.forEach(id => seen[id] = (seen[id] || 0) + 1); all.push(...ids); }
  assert.equal(new Set(all).size, all.length);
});
test('nivel: acertar hasta L da nivel L con cualquier examen', () => {
  for (let r = 0; r < 5; r++) {
    const qs = pickExam({}).map(id => BYID[id]);
    assert.equal(grade({}, qs).level, 0);
    for (let L = 1; L <= 6; L++) assert.equal(grade(Object.fromEntries(qs.map(q => [q.id, q.lv <= L ? 0 : 1])), qs).level, L);
  }
});
test('sin enlaces de Amazon y anuncios apagados hasta configurar', () => {
  assert.doesNotMatch(html, /amazon/i);
  assert.match(html, /const ADS=\{client:"",/);
});
