import test from 'node:test';
import assert from 'node:assert/strict';
import { decidir, fotosDe, sinFotos, armarEntrada, puntajesAltos, extracto, main, ayerCDMX, activa } from './moderar.mjs';

const U = '0f8fad5b-d9cb-469f-a165-70867728950e';
const res = (cats = {}, scores = {}, flagged = Object.values(cats).some(Boolean)) => ({ flagged, categories: cats, category_scores: scores });

test('texto normal → ok', () => {
  assert.deepEqual(decidir(res({ sexual: false }, { sexual: 0.01 })), { nivel: 'ok', motivos: [] });
  assert.deepEqual(decidir(null), { nivel: 'ok', motivos: [] });
});

test('contenido sexual o violencia gráfica → ocultar', () => {
  assert.equal(decidir(res({ sexual: true })).nivel, 'ocultar');
  assert.equal(decidir(res({ 'violence/graphic': true })).nivel, 'ocultar');
  assert.equal(decidir(res({ 'harassment/threatening': true, harassment: true })).nivel, 'ocultar');
});

test('cualquier señal de menores (≥0.2) se oculta aunque no esté marcada', () => {
  const d = decidir(res({}, { 'sexual/minors': 0.25 }, false));
  assert.equal(d.nivel, 'ocultar');
  assert.deepEqual(d.motivos, ['sexual/minors']);
});

test('acoso u odio sin amenaza → revisar (sigue visible)', () => {
  assert.deepEqual(decidir(res({ harassment: true })), { nivel: 'revisar', motivos: ['harassment'] });
  assert.equal(decidir(res({ 'self-harm/intent': true, 'self-harm': true })).nivel, 'revisar');
  assert.equal(decidir(res({ 'categoria-nueva': true })).nivel, 'revisar');
});

test('solo se revisan fotos de la carpeta del autor', () => {
  const body = `Hola\n[foto:${U}/a.webp]\n[foto:11111111-2222-3333-4444-555555555555/b.jpg]\nAdiós`;
  assert.deepEqual(fotosDe(body, U), [`${U}/a.webp`]);
  assert.equal(sinFotos(body), 'Hola\nAdiós');
});

test('entrada para OpenAI: texto + fotos (comentarios sin fotos)', () => {
  const e = armarEntrada({ tipo: 'post', title: 'Título', body: `cuerpo\n[foto:${U}/x.png]`, author_id: U }, 'https://s.supabase.co');
  assert.equal(e.input.length, 2);
  assert.equal(e.input[0].text, 'Título\n\ncuerpo');
  assert.equal(e.input[1].image_url.url, `https://s.supabase.co/storage/v1/object/public/post-images/${U}/x.png`);
  const c = armarEntrada({ tipo: 'comment', title: '', body: `[foto:${U}/x.png]`, author_id: U }, 'https://s');
  assert.equal(c.input.length, 0);
});

test('puntajes altos y extracto', () => {
  assert.deepEqual(puntajesAltos(res({}, { sexual: 0.91234, hate: 0.02 })), { sexual: 0.912 });
  assert.equal(puntajesAltos(res({}, { hate: 0.02 })), null);
  assert.equal(extracto('  a \n\n b  '), 'a b');
  assert.equal(extracto('x'.repeat(500)).length, 200);
});

test('sin llaves: termina sin error', async () => {
  const keep = { ...process.env };
  delete process.env.OPENAI_API_KEY; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.GITHUB_STEP_SUMMARY;
  process.env.SUPABASE_URL = 'https://x';
  const log = console.log; console.log = () => {};
  try { await main(); assert.notEqual(process.exitCode, 1); } finally { console.log = log; process.env = keep; }
});

test('pausa: solo se activa con 100+ visitantes ayer (hora CDMX)', () => {
  assert.equal(activa(null), false); assert.equal(activa(99), false); assert.equal(activa(100), true);
  assert.equal(ayerCDMX(new Date('2026-11-10T05:00:00Z')), '2026-11-08'); // 23:00 del 9 en CDMX → ayer = 8
  assert.equal(ayerCDMX(new Date('2026-11-10T07:00:00Z')), '2026-11-09'); // 01:00 del 10 en CDMX → ayer = 9
});
