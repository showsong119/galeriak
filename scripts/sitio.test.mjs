import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Si el script principal tiene un error de sintaxis, el sitio solo muestra el texto de respaldo.
for (const f of ['site/index.html', 'site/examen-coreano/index.html']) {
  test(`${f}: todos los <script> en línea compilan`, () => {
    const html = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
      .filter(m => !/\bsrc=/.test(m[1]) && !/application\/(ld\+)?json/.test(m[1]) && m[2].trim());
    assert.ok(scripts.length > 0);
    for (const [, attrs, code] of scripts) {
      if (/type=["']?module/.test(attrs)) continue;
      assert.doesNotThrow(() => new vm.Script(code), `${f} ${attrs}`);
    }
  });
}

// 2026-11-10: sendAttend usaba busy() del manejador de formularios → ReferenceError y la asistencia no se guardaba.
test('busy() solo se usa donde está definido', () => {
  const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
  const ini = html.indexOf("document.addEventListener('submit'");
  const fin = html.indexOf('\n});', ini);
  let i = -1, malos = [];
  while ((i = html.indexOf('busy(', i + 1)) !== -1) {
    if (i > ini && i < fin) continue;                         // dentro del manejador: busy está definido
    const f = html.lastIndexOf('function ', i);
    if (!/const busy\s*=/.test(html.slice(f, i))) malos.push(html.slice(Math.max(0, i - 60), i + 10).replace(/\s+/g, ' '));
  }
  assert.deepEqual(malos, []);
});
