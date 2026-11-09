const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanText,
  safeNuuvemUrl,
  brl,
  parseCatalogPage,
  lastPageNumber,
  selectNewOffers,
  buildEmbed,
} = require('./nuuvem');

function card({ id, name, href, image, price, base, currency = 'BRL' }) {
  const ga = JSON.stringify({ id, name, price: price / 100, url: href, image_url: image, currency })
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
  const p = JSON.stringify({ v: price }).replace(/"/g, '&quot;');
  const b = JSON.stringify({ v: base }).replace(/"/g, '&quot;');
  return `<a title="x" href="${href}" data-ga-events-product-data-param="${ga}">
    <article data-component="product-card">
      <div class="mod-price product-price " data-price="${p}" data-base-price="${b}">
        <span class="product-price--discount">-x%</span>
      </div>
    </article></a>`;
}

const page = (cards, last = 3) =>
  `<html><body>${cards.join('\n')}<a href="/br-pt/catalog/price/promo/page/${last}">${last}</a></body></html>`;

const IMG = 'https://assets.nuuvem.com/image/upload/capa.jpg';

test('extrai ofertas válidas com preços em centavos', () => {
  const html = page([
    card({ id: 'abc1', name: 'Jogo A', href: 'https://www.nuuvem.com/br-pt/item/jogo-a?utm_source=x', image: IMG, price: 1990, base: 3990 }),
  ]);
  const [o] = parseCatalogPage(html);
  assert.equal(o.titulo, 'Jogo A');
  assert.equal(o.precoPromo, 19.9);
  assert.equal(o.precoOriginal, 39.9);
  assert.equal(o.desconto, 50);
  assert.equal(o.link, 'https://www.nuuvem.com/br-pt/item/jogo-a');
  assert.equal(o.imagem, IMG);
});

test('descarta links e imagens fora da Nuuvem', () => {
  const html = page([
    card({ id: 'mal1', name: 'Phishing', href: 'https://evil.example/item/x', image: IMG, price: 100, base: 200 }),
    card({ id: 'mal2', name: 'Img ruim', href: 'https://www.nuuvem.com/br-pt/item/y', image: 'javascript:alert(1)', price: 100, base: 200 }),
  ]);
  const ofertas = parseCatalogPage(html);
  assert.equal(ofertas.length, 1);
  assert.equal(ofertas[0].id, 'mal2');
  assert.equal(ofertas[0].imagem, null);
});

test('safeNuuvemUrl bloqueia http, domínios parecidos e credenciais na URL', () => {
  assert.equal(safeNuuvemUrl('http://www.nuuvem.com/x'), null);
  assert.equal(safeNuuvemUrl('https://nuuvem.com.evil.io/x'), null);
  assert.equal(safeNuuvemUrl('https://evilnuuvem.com/x'), null);
  assert.equal(safeNuuvemUrl('https://user:pw@www.nuuvem.com/x'), null);
  assert.equal(safeNuuvemUrl('https://www.nuuvem.com:8443/x'), null);
  assert.equal(safeNuuvemUrl('//evil.example/x'), null);
  assert.equal(safeNuuvemUrl('https://www.nuuvem.com/x"onmouseover=1'), null);
  assert.equal(safeNuuvemUrl('/br-pt/item/z'), 'https://www.nuuvem.com/br-pt/item/z');
});

test('não depende da classe URL (sandbox do n8n)', () => {
  const original = globalThis.URL;
  globalThis.URL = undefined;
  try {
    assert.equal(safeNuuvemUrl('https://www.nuuvem.com/br-pt/item/a?x=1'), 'https://www.nuuvem.com/br-pt/item/a');
  } finally {
    globalThis.URL = original;
  }
});

test('brl formata em reais', () => {
  assert.equal(brl(8.89), 'R$ 8,89');
  assert.equal(brl(1234.5), 'R$ 1.234,50');
  assert.equal(brl(0.5), 'R$ 0,50');
});

test('descarta preços inválidos ou sem desconto real', () => {
  const html = page([
    card({ id: 'p1', name: 'Sem desconto', href: '/item/a', image: IMG, price: 500, base: 500 }),
    card({ id: 'p2', name: 'Negativo', href: '/item/b', image: IMG, price: -1, base: 500 }),
    card({ id: 'p3', name: 'Moeda errada', href: '/item/c', image: IMG, price: 100, base: 500, currency: 'USD' }),
  ]);
  assert.deepEqual(parseCatalogPage(html), []);
});

test('limpa caracteres de controle e limita tamanho do título', () => {
  const sujo = 'Jogo' + String.fromCharCode(0) + String.fromCharCode(0x202e) + ' ' + 'x'.repeat(500);
  const limpo = cleanText(sujo);
  assert.ok(!/[\u0000-\u001f\u202e]/.test(limpo));
  assert.equal(limpo.length, 200);
});

test('HTML vazio ou quebrado não derruba o parser', () => {
  assert.deepEqual(parseCatalogPage(''), []);
  assert.deepEqual(parseCatalogPage(null), []);
  assert.deepEqual(parseCatalogPage('<a data-ga-events-product-data-param="{nao json">'), []);
});

test('lastPageNumber lê a paginação', () => {
  assert.equal(lastPageNumber(page([], 32)), 32);
  assert.equal(lastPageNumber('<html></html>'), 1);
});

const oferta = (id, desconto, precoPromo) => ({ id, titulo: id, desconto, precoPromo, precoOriginal: 100, link: 'https://www.nuuvem.com/i/' + id, imagem: null });
const cfg = { descontoMinimo: 30, maxAlertas: 2, agora: 't' };

test('primeira execução só registra, sem enviar', () => {
  const state = {};
  const r = selectNewOffers([oferta('a', 50, 50)], state, cfg);
  assert.equal(r.paraEnviar.length, 0);
  assert.equal(r.primeiraExecucao, true);
  assert.equal(state.enviados.a, 50);
});

test('envia só novas, com desconto mínimo, e respeita o limite', () => {
  const state = { inicializado: true, enviados: { a: 50 } };
  const r = selectNewOffers(
    [oferta('a', 50, 50), oferta('b', 20, 80), oferta('c', 40, 60), oferta('d', 70, 30), oferta('e', 35, 65)],
    state,
    cfg
  );
  assert.deepEqual(r.paraEnviar.map((o) => o.id), ['d', 'c']);
  assert.equal(r.pendentes, 1);
  assert.ok(!('b' in state.enviados));
});

test('reenvia se o preço cair e esquece o que saiu da promoção', () => {
  const state = { inicializado: true, enviados: { a: 50, sumiu: 10 } };
  const r = selectNewOffers([oferta('a', 60, 40)], state, cfg);
  assert.deepEqual(r.paraEnviar.map((o) => o.id), ['a']);
  assert.ok(!('sumiu' in state.enviados));
});

test('embed não usa content, então @everyone no título não notifica ninguém', () => {
  const e = buildEmbed({ ...oferta('x', 50, 50), titulo: '@everyone grátis' });
  assert.equal(e.title, '@everyone grátis');
  assert.ok(!('content' in e));
});

test('coleta parcial não apaga o histórico', () => {
  const state = { inicializado: true, enviados: { a: 50, b: 40 } };
  selectNewOffers([oferta('a', 50, 50)], state, { ...cfg, parcial: true });
  assert.equal(state.enviados.b, 40);
});

test('primeira execução pode enviar se o silêncio estiver desligado', () => {
  const state = {};
  const r = selectNewOffers([oferta('a', 50, 50), oferta('b', 10, 90)], state, { ...cfg, silenciarPrimeira: false });
  assert.deepEqual(r.paraEnviar.map((o) => o.id), ['a']);
});
