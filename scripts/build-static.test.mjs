import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, readSiteConfig, esc, isThin, buildSitemap, bodyHTML } from './build-static.mjs';

const UID = '00000000-0000-0000-0000-00000000000c';
const data = {
  posts: [
    { id: 11, gallery_id: 'skincare', author_id: UID, title: 'Mi rutina <script>', body: 'Uso limpiador, tónico, hidratante y protector solar todos los días en la mañana y en la noche.\n[foto:' + UID + '/abcdef12.webp]', up_count: 3, comment_count: 1, created_at: '2026-11-08T10:00:00Z', profiles: { nickname: 'ana' } },
    { id: 12, gallery_id: 'bts', author_id: UID, title: 'Hola', body: 'hola', up_count: 0, comment_count: 0, created_at: '2026-11-08T09:00:00Z', profiles: { nickname: 'ana' } },
  ],
  comments: [{ id: 1, post_id: 11, body: '¡Gracias!', created_at: '2026-11-08T11:00:00Z', profiles: { nickname: 'luis' } }],
};

test('lee GALS y CATS del sitio', () => {
  const cfg = readSiteConfig(readFileSync('site/index.html', 'utf8'));
  assert.ok(cfg.GALS.find(g => g.id === 'bts'));
  assert.ok(cfg.CATS.find(c => c.id === 'kpop'));
  assert.match(cfg.url, /supabase\.co/);
  assert.ok(cfg.key);
});

test('genera páginas, escapa HTML y arma el sitemap', async () => {
  const out = mkdtempSync(join(tmpdir(), 'gk-'));
  cpSync('site', out, { recursive: true });
  const r = await build(out, data);
  assert.equal(r.nPosts, 2);
  assert.equal(r.nIndexed, 1);
  const p = readFileSync(join(out, 'p/11/index.html'), 'utf8');
  assert.ok(!p.includes('Mi rutina <script>'));
  assert.match(p, /Mi rutina &lt;script&gt;/);
  assert.match(p, /DiscussionForumPosting/);
  assert.match(p, /post-images\/0{8}-0{4}-0{4}-0{4}-0{11}c\/abcdef12\.webp/);
  assert.match(p, /pagead2\.googlesyndication\.com/);
  assert.match(readFileSync(join(out, 'p/12/index.html'), 'utf8'), /noindex/);
  assert.ok(existsSync(join(out, 'g/bts/index.html')));
  assert.ok(existsSync(join(out, 'g/index.html')));
  const sm = readFileSync(join(out, 'sitemap.xml'), 'utf8');
  assert.match(sm, /\/p\/11\//);
  assert.ok(!sm.includes('/p/12/'));
  assert.match(sm, /\/guias\/doble-limpieza\//);
  assert.match(sm, /\/g\/skincare\//);
  assert.match(sm, /\/g\/bts\//);
  assert.ok(!sm.includes('/g/twice/'), 'galería vacía fuera del sitemap');
});

test('utilidades', () => {
  assert.equal(esc('<a "x">'), '&lt;a &quot;x&quot;&gt;');
  assert.equal(isThin({ body: 'corto' }, 0), true);
  assert.equal(isThin({ body: 'corto' }, 2), false);
  const sm = buildSitemap('<urlset><url><loc>https://galeriakmx.com/p/1/</loc></url><url><loc>https://galeriakmx.com/guias/</loc></url></urlset>', [{ loc: 'https://galeriakmx.com/p/2/' }]);
  assert.ok(!sm.includes('/p/1/') && sm.includes('/p/2/') && sm.includes('/guias/'));
  assert.ok(!bodyHTML({ author_id: 'otro', body: '[foto:' + UID + '/abcdef12.webp]' }, 'https://x').includes('<img'));
});
