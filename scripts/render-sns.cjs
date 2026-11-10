// GaleríaK · Renderiza el kit de redes a archivos reales (para Instagram/Facebook automáticos y TikTok programado):
//   site/img/sns/<slug>.jpg  (1080x1350, la misma tarjeta de /sns/)
//   site/img/sns/<slug>.mp4  (1080x1920 vertical, 8 s, para TikTok/Reels)
// Uso: PLAYWRIGHT=/opt/npm-tools/node_modules/playwright CHROME=/usr/bin/google-chrome node scripts/render-sns.cjs [--todo]
// Primero: python3 scripts/gen-sns.py (y después de renderizar, otra vez para enlazar los archivos).
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), SITE = path.join(ROOT, 'site'), OUT = path.join(SITE, 'img/sns');
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const TODO = process.argv.includes('--todo');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = http.createServer((q, r) => {
    let f = path.join(SITE, decodeURIComponent(q.url.split('?')[0]));
    if (f.endsWith('/')) f += 'index.html';
    if (!f.startsWith(SITE) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  }).listen(0);
  const port = srv.address().port;
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const p = await b.newPage();
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await p.goto(`http://127.0.0.1:${port}/sns/`);
  await p.waitForTimeout(1500);
  const items = await p.evaluate(() => ITEMS.map(i => i.slug));
  let n = 0;
  for (let k = 0; k < items.length; k++) {
    const slug = items[k], jpg = path.join(OUT, slug + '.jpg'), mp4 = path.join(OUT, slug + '.mp4');
    if (!TODO && fs.existsSync(jpg) && fs.existsSync(mp4)) continue;
    const data = await p.evaluate(async k => {
      const blob = await lienzo(ITEMS[k]); if (!blob) return null;
      const bmp = await createImageBitmap(blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0); return c.toDataURL('image/jpeg', 0.9);
    }, k);
    if (!data) { console.log('⚠️ sin imagen:', slug); continue; }
    fs.writeFileSync(jpg, Buffer.from(data.split(',')[1], 'base64'));
    // Video vertical 9:16 con fondo pastel y un zoom suave (TikTok/Reels piden video)
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-i', jpg, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '8',
      '-vf', "scale=1080:1350,pad=1080:1920:0:110:color=0xffe8ef,zoompan=z='min(zoom+0.0006,1.05)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=240:s=1080x1920:fps=30,format=yuv420p",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart', mp4]);
    n++; console.log('✓', slug);
  }
  await b.close(); srv.close();
  console.log(`✅ ${n} archivos nuevos en site/img/sns/`);
})().catch(e => { console.error(e); process.exit(1); });
