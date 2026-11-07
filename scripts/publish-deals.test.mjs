import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCandidate, buildPost, affiliateUrl, readOffer, signPaapi } from './publish-deals.mjs';

test('valida candidatos', () => {
  assert.deepEqual(validateCandidate({ asin: 'B00PBX3L7K', title: 'COSRX Snail 96 Essence', price: 299 }), []);
  assert.ok(validateCandidate({ asin: 'abc', title: 'x' }).length >= 2);
  assert.ok(validateCandidate({ asin: 'B00PBX3L7K', title: 'Ver https://spam.com', price: 10 }).includes('el título no lleva enlaces'));
  assert.ok(validateCandidate({ asin: 'B00PBX3L7K', title: 'Producto ok', price: -5 }).includes('precio inválido'));
});

test('enlace de afiliado', () => {
  assert.equal(affiliateUrl('B00PBX3L7K', 'galeriak-20'), 'https://www.amazon.com.mx/dp/B00PBX3L7K?tag=galeriak-20');
});

test('arma la publicación con descuento, aviso y caducidad de 24 h', () => {
  const now = new Date('2026-11-09T15:00:00Z');
  const p = buildPost({ asin: 'B00PBX3L7K', title: 'COSRX Snail 96 Essence 100 ml', price: 299, list_price: 450, note: 'Buen precio.', verified: true }, 'galeriak-20', now);
  assert.equal(p.gallery, 'ofertas');
  assert.ok(p.title.startsWith('[-34%] '));
  assert.ok(p.body.includes('Como Afiliado de Amazon'));
  assert.ok(p.body.includes('$299 MXN'));
  assert.equal(p.deal_source, 'amazon-pa-api');
  assert.equal(new Date(p.deal_expires_at) - now, 24 * 3600e3);
  const q = buildPost({ asin: 'B00PBX3L7K', title: 'Sin precio' }, 't-20', now);
  assert.equal(q.deal_price, null);
  assert.equal(q.deal_price_at, null);
  assert.ok(q.body.includes('Revisa el precio actual'));
});

test('lee ofertas v2 y v1', () => {
  assert.deepEqual(readOffer({ OffersV2: { Listings: [{ Price: { Money: { Amount: 199 }, SavingBasis: { Money: { Amount: 300 } } }, Availability: { Type: 'IN_STOCK' } }] } }), { price: 199, list: 300, available: true });
  assert.deepEqual(readOffer({ Offers: { Listings: [{ Price: { Amount: 99 }, Availability: { Type: 'Now' } }] } }), { price: 99, list: null, available: true });
  assert.equal(readOffer({ OffersV2: { Listings: [{ Price: { Money: { Amount: 1 } }, Availability: { Type: 'OUT_OF_STOCK' } }] } }).available, false);
});

test('firma SigV4 estable y bien formada', () => {
  const now = new Date('2026-11-09T15:00:00Z');
  const a = signPaapi('GetItems', { ItemIds: ['B00PBX3L7K'] }, 'AKIDEXAMPLE', 'secret', now);
  const b = signPaapi('GetItems', { ItemIds: ['B00PBX3L7K'] }, 'AKIDEXAMPLE', 'secret', now);
  assert.equal(a.headers.authorization, b.headers.authorization);
  assert.equal(a.url, 'https://webservices.amazon.com.mx/paapi5/getitems');
  assert.match(a.headers.authorization, /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/20261109\/us-east-1\/ProductAdvertisingAPI\/aws4_request, SignedHeaders=content-encoding;content-type;host;x-amz-date;x-amz-target, Signature=[0-9a-f]{64}$/);
  assert.equal(a.headers['x-amz-date'], '20261109T150000Z');
});
