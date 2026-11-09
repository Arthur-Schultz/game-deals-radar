
const NUUVEM_HOST = 'nuuvem.com';
const MAX_TITULO = 200;
const CONTROL_CHARS = new RegExp(
  '[' +
    [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x206f]]
      .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b))
      .join('') +
    ']',
  'g'
);

function decodeEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => safeCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

function safeCodePoint(n) {
  return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? decodeEntities(m[1]) : null;
}

function parseJsonSafe(str) {
  try {
    const v = JSON.parse(str);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

function cleanText(value, max = MAX_TITULO) {
  if (typeof value !== 'string') return '';
  return value
    .replace(CONTROL_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function safeNuuvemUrl(value) {
  if (typeof value !== 'string') return null;
  let v = value.trim();
  if (v.length === 0 || v.length > 2048) return null;
  if (v.startsWith('/') && !v.startsWith('//')) v = 'https://www.nuuvem.com' + v;

  const m = v.match(/^https:\/\/([^/?#@:\s]+)(\/[^?#\s]*)?(?:[?#][^\s]*)?$/i);
  if (!m) return null;
  const host = m[1].toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (host !== NUUVEM_HOST && !host.endsWith('.' + NUUVEM_HOST)) return null;
  const path = m[2] || '/';
  if (/["'<>\\`]/.test(path)) return null;
  return 'https://' + host + path;
}

function centsToReais(cents) {
  return Number.isInteger(cents) && cents > 0 && cents < 10_000_000 ? cents / 100 : null;
}

function parseCatalogPage(html) {
  if (typeof html !== 'string' || html.length === 0) return [];

  const tagRe = /<a\s[^>]*data-ga-events-product-data-param="[^"]*"[^>]*>/g;
  const tags = [...html.matchAll(tagRe)];
  const offers = [];

  tags.forEach((match, i) => {
    const start = match.index;
    const end = i + 1 < tags.length ? tags[i + 1].index : Math.min(html.length, start + 20000);
    const segment = html.slice(start, end);

    const data = parseJsonSafe(attr(match[0], 'data-ga-events-product-data-param') || '');
    if (!data) return;

    const priceTag = segment.match(/<div[^>]*class="[^"]*\bproduct-price\b[^"]*"[^>]*>/);
    if (!priceTag) return;
    const price = parseJsonSafe(attr(priceTag[0], 'data-price') || '');
    const base = parseJsonSafe(attr(priceTag[0], 'data-base-price') || '');

    const precoPromo = centsToReais(price && price.v);
    const precoOriginal = centsToReais(base && base.v);
    if (precoPromo === null || precoOriginal === null || precoPromo >= precoOriginal) return;

    const id = cleanText(String(data.id || ''), 64);
    const titulo = cleanText(data.name);
    const link = safeNuuvemUrl(attr(match[0], 'href') || data.url);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !titulo || !link) return;

    if (data.currency && data.currency !== 'BRL') return;
    const imagem = safeNuuvemUrl(data.image_url);
    const desconto = Math.round((1 - precoPromo / precoOriginal) * 100);

    offers.push({
      id,
      titulo,
      link,
      imagem,
      precoOriginal,
      precoPromo,
      desconto,
      moeda: 'BRL',
    });
  });

  return offers;
}

function lastPageNumber(html) {
  if (typeof html !== 'string') return 1;
  let max = 1;
  for (const m of html.matchAll(/\/page\/(\d{1,4})"/g)) {
    const n = Number(m[1]);
    if (n > max) max = n;
  }
  return max;
}

function selectNewOffers(offers, state, { descontoMinimo, maxAlertas, agora, parcial = false, silenciarPrimeira = true }) {
  const enviados = state.enviados && typeof state.enviados === 'object' ? state.enviados : {};
  const primeiraExecucao = !state.inicializado;

  const elegiveis = offers.filter((o) => o.desconto >= descontoMinimo);
  const vistos = new Set(offers.map((o) => o.id));

  if (!parcial) {
    for (const id of Object.keys(enviados)) {
      if (!vistos.has(id)) delete enviados[id];
    }
  }

  const novos = elegiveis
    .filter((o) => !(o.id in enviados) || o.precoPromo < enviados[o.id])
    .sort((a, b) => b.desconto - a.desconto);

  let paraEnviar;
  if (primeiraExecucao && silenciarPrimeira) {
    for (const o of elegiveis) enviados[o.id] = o.precoPromo;
    paraEnviar = [];
  } else {
    paraEnviar = novos.slice(0, maxAlertas);
    for (const o of paraEnviar) enviados[o.id] = o.precoPromo;
  }

  state.enviados = enviados;
  state.inicializado = true;
  state.ultimaExecucao = agora;

  return { paraEnviar, pendentes: Math.max(0, novos.length - paraEnviar.length), primeiraExecucao };
}

function brl(valor) {
  const [inteiro, centavos] = valor.toFixed(2).split('.');
  return 'R$ ' + inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + centavos;
}

function buildEmbed(o) {
  const embed = {
    title: cleanText(o.titulo, 256),
    url: o.link,
    color: 0x1f8b4c,
    description: `**-${o.desconto}%** · ~~${brl(o.precoOriginal)}~~ → **${brl(o.precoPromo)}**`,
    footer: { text: 'Nuuvem · Game Deals Radar' },
  };
  if (o.imagem) embed.image = o.imagem;
  return embed;
}

if (typeof module !== 'undefined') {
  module.exports = {
    decodeEntities,
    cleanText,
    safeNuuvemUrl,
    brl,
    parseCatalogPage,
    lastPageNumber,
    selectNewOffers,
    buildEmbed,
  };
}
