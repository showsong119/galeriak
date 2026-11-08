// Convierte las ilustraciones SVG a JPG 1200x630 para compartir en redes (og:image).
// Uso: node scripts/render-og.cjs   (requiere playwright con Chromium)
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), src = path.join(root, 'site/img/guias'), out = path.join(root, 'site/img/og');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const files = fs.readdirSync(src).filter(f => f.endsWith('.svg')).map(f => path.join(src, f)).concat(path.join(root, 'site/img/examen.svg'));
  for (const f of files) { await p.goto('file://' + f); await p.screenshot({ path: path.join(out, path.basename(f, '.svg') + '.jpg'), type: 'jpeg', quality: 85 }); }
  await b.close(); console.log(files.length + ' imágenes og');
})();
