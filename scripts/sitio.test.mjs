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
