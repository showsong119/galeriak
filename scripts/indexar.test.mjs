import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { leerSitemap, pendientes, prioritarias, jwt, INDEXNOW_KEY } from './indexar.mjs';

const XML = `<urlset><url><loc>https://galeriakmx.com/</loc><lastmod>2026-11-08</lastmod></url>
<url><loc>https://galeriakmx.com/guias/niacinamida/</loc><lastmod>2026-11-09</lastmod></url>
<url><loc>https://galeriakmx.com/p/12/</loc><lastmod>2026-11-07</lastmod></url>
<url><loc>https://galeriakmx.com/g/</loc></url><url><loc>https://otro.com/x</loc></url></urlset>`;

test('lee el sitemap', () => {
  const u = leerSitemap(XML);
  assert.equal(u.length, 5);
  assert.deepEqual(u[1], { loc: 'https://galeriakmx.com/guias/niacinamida/', lastmod: '2026-11-09' });
  assert.equal(u[3].lastmod, '');
});
test('solo URLs nuevas o con otra fecha, y solo de nuestro dominio', () => {
  const u = leerSitemap(XML);
  assert.equal(pendientes(u, {}).length, 4);
  const est = { 'https://galeriakmx.com/': '2026-11-08', 'https://galeriakmx.com/g/': '-', 'https://galeriakmx.com/p/12/': '2026-11-01' };
  assert.deepEqual(pendientes(u, est).map(x => x.loc), ['https://galeriakmx.com/guias/niacinamida/', 'https://galeriakmx.com/p/12/']);
});
test('prioritarias: páginas fijas y publicaciones recientes', () => {
  const p = prioritarias(leerSitemap(XML)).map(x => x.loc);
  assert.ok(p.includes('https://galeriakmx.com/guias/niacinamida/') && p.includes('https://galeriakmx.com/p/12/'));
  assert.ok(!p.includes('https://galeriakmx.com/g/'));
});
test('clave IndexNow publicada en site/', () => {
  assert.equal(readFileSync(new URL(`../site/${INDEXNOW_KEY}.txt`, import.meta.url), 'utf8'), INDEXNOW_KEY);
});
test('JWT de cuenta de servicio firmado con RS256', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const t = jwt({ client_email: 'bot@x.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, 'scope', 1000);
  const [h, b, s] = t.split('.');
  assert.equal(JSON.parse(Buffer.from(b, 'base64url')).iss, 'bot@x.iam.gserviceaccount.com');
  assert.ok(createVerify('RSA-SHA256').update(h + '.' + b).verify(publicKey, s, 'base64url'));
});
