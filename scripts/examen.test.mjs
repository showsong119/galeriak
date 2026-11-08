import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../site/examen-coreano/index.html', import.meta.url), 'utf8');
const core = html.split('/* ===== CORE')[1].split('/* ===== /CORE')[0];
const ctx = vm.createContext({});
vm.runInContext('/*' + core + ';this.Q=QUESTIONS;this.grade=grade;', ctx);
const upTo = L => Object.fromEntries(ctx.Q.map(q => [q.id, q.lv <= L ? 0 : 1]));
test('examen: 30 preguntas y nivel correcto', () => {
  assert.equal(ctx.Q.length, 30);
  assert.equal(ctx.grade({}).level, 0);
  for (let L = 1; L <= 6; L++) assert.equal(ctx.grade(upTo(L)).level, L);
});
test('examen: anuncios apagados hasta configurar AdSense', () => {
  assert.match(html, /const ADS=\{client:"",/);
});
