// Gera os JSONs de workflow em workflows/ a partir de scripts/nuuvem.js,
// para o código dos nodes Code ser o mesmo que está testado.
// Uso: node scripts/build-workflow.js
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const lib = fs
  .readFileSync(path.join(__dirname, 'nuuvem.js'), 'utf8')
  .split("if (typeof module !== 'undefined')")[0]
  .trim();

const USER_AGENT = 'game-deals-radar/1.0 (+https://github.com/Arthur-Schultz/game-deals-radar)';

const code = (body) => `${lib}\n\n// ---- lógica deste node ----\n${body.trim()}\n`;

const httpNode = (name, url, position, extra = {}) => ({
  parameters: {
    url,
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: 'User-Agent', value: USER_AGENT },
        { name: 'Accept-Language', value: 'pt-BR,pt;q=0.9' },
      ],
    },
    options: {
      timeout: 30000,
      response: { response: { responseFormat: 'text', outputPropertyName: 'data' } },
      ...extra,
    },
  },
  name,
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position,
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 5000,
});

const discordNode = (name, position, embedExpr) => ({
  parameters: {
    authentication: 'webhook',
    operation: 'sendLegacy',
    content: '',
    options: {},
    embeds: { values: [{ inputMethod: 'json', json: embedExpr }] },
  },
  name,
  type: 'n8n-nodes-base.discord',
  typeVersion: 2,
  position,
  credentials: { discordWebhookApi: { id: '', name: 'Discord Webhook' } },
});

const main = {
  name: 'Game Deals Radar — Nuuvem → Discord',
  nodes: [
    {
      parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 6 }] } },
      name: 'A cada 6 horas',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [0, 0],
    },
    {
      parameters: {
        jsCode: `// Ajuste aqui o comportamento do workflow.
return [{
  json: {
    baseUrl: 'https://www.nuuvem.com/br-pt/catalog/price/promo/sort/bestselling/sort-mode/desc',
    descontoMinimo: 30,          // % mínimo para alertar
    maxAlertasPorExecucao: 20,   // evita lotar o canal; o resto vai na próxima execução
    maxPaginas: 49,              // robots.txt da Nuuvem libera até a página 49
  },
}];`,
      },
      name: 'Config',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 0],
    },
    httpNode('Buscar 1ª página', '={{ $json.baseUrl }}', [440, 0]),
    {
      parameters: {
        jsCode: code(`
const cfg = $('Config').first().json;
const total = Math.min(lastPageNumber($input.first().json.data), cfg.maxPaginas, 49);
// A página 1 já foi baixada; aqui saem só as seguintes.
// (Se o catálogo tiver uma página só, ela é buscada de novo para o fluxo seguir.)
const paginas = [];
for (let p = 2; p <= total; p++) {
  paginas.push({ json: { pagina: p, url: cfg.baseUrl + '/page/' + p } });
}
return paginas.length ? paginas : [{ json: { pagina: 1, url: cfg.baseUrl } }];`),
      },
      name: 'Planejar páginas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [660, 0],
    },
    {
      parameters: { amount: 10 },
      name: 'Pausa inicial',
      type: 'n8n-nodes-base.wait',
      typeVersion: 1.1,
      position: [880, 0],
      webhookId: '8b2e4f61-3c7d-4a9e-b5f0-1d6c2a8e7b34',
    },
    {
      ...httpNode('Buscar páginas', '={{ $json.url }}', [1100, 0], {
        batching: { batch: { batchSize: 1, batchInterval: 10000 } },
        response: { response: { responseFormat: 'text', outputPropertyName: 'data', neverError: true } },
      }),
      retryOnFail: false,
    },
    {
      parameters: {
        jsCode: code(`
// Página 1 (já baixada) + as demais. Uma página sem nenhuma oferta indica
// erro (ex.: 429 por excesso de requisições) e marca a coleta como parcial.
const htmls = [$('Buscar 1ª página').first().json.data, ...$input.all().map((i) => i.json.data)];
const porId = new Map();
let paginasComFalha = 0;
for (const html of htmls) {
  const ofertas = parseCatalogPage(html);
  if (ofertas.length === 0) paginasComFalha++;
  for (const oferta of ofertas) {
    if (!porId.has(oferta.id)) porId.set(oferta.id, oferta);
  }
}
// Se nada foi extraído, o layout do site provavelmente mudou (ou fomos bloqueados):
// falha em vez de mexer no histórico de ofertas enviadas.
if (porId.size === 0) {
  throw new Error('Nenhuma oferta extraída da Nuuvem. O site bloqueou as requisições ou o layout mudou.');
}
return [{ json: { ofertas: [...porId.values()], paginas: htmls.length, paginasComFalha } }];`),
      },
      name: 'Extrair ofertas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1320, 0],
    },
    {
      parameters: {
        jsCode: code(`
// Histórico salvo entre execuções. Só é gravado em execuções automáticas
// (workflow ativo); execuções manuais de teste não alteram o histórico.
const cfg = $('Config').first().json;
const estado = $getWorkflowStaticData('global');
const { ofertas, paginasComFalha } = $input.first().json;
const { paraEnviar } = selectNewOffers(ofertas, estado, {
  descontoMinimo: cfg.descontoMinimo,
  maxAlertas: cfg.maxAlertasPorExecucao,
  agora: new Date().toISOString(),
  parcial: paginasComFalha > 0,
});
return paraEnviar.map((oferta) => ({ json: { ...oferta, embed: buildEmbed(oferta) } }));`),
      },
      name: 'Filtrar novas ofertas',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1540, 0],
    },
    {
      parameters: { options: {} },
      name: 'Uma por vez',
      type: 'n8n-nodes-base.splitInBatches',
      typeVersion: 3,
      position: [1760, 0],
    },
    discordNode('Enviar no Discord', [1980, 100], '={{ JSON.stringify($json.embed) }}'),
    {
      parameters: { amount: 1.5 },
      name: 'Pausa (rate limit)',
      type: 'n8n-nodes-base.wait',
      typeVersion: 1.1,
      position: [2200, 100],
      webhookId: '5f1c2c7e-6a8b-4c55-9f3e-2b0d7c1a9e41',
    },
  ],
  connections: {
    'A cada 6 horas': { main: [[{ node: 'Config', type: 'main', index: 0 }]] },
    Config: { main: [[{ node: 'Buscar 1ª página', type: 'main', index: 0 }]] },
    'Buscar 1ª página': { main: [[{ node: 'Planejar páginas', type: 'main', index: 0 }]] },
    'Planejar páginas': { main: [[{ node: 'Pausa inicial', type: 'main', index: 0 }]] },
    'Pausa inicial': { main: [[{ node: 'Buscar páginas', type: 'main', index: 0 }]] },
    'Buscar páginas': { main: [[{ node: 'Extrair ofertas', type: 'main', index: 0 }]] },
    'Extrair ofertas': { main: [[{ node: 'Filtrar novas ofertas', type: 'main', index: 0 }]] },
    'Filtrar novas ofertas': { main: [[{ node: 'Uma por vez', type: 'main', index: 0 }]] },
    'Uma por vez': { main: [[], [{ node: 'Enviar no Discord', type: 'main', index: 0 }]] },
    'Enviar no Discord': { main: [[{ node: 'Pausa (rate limit)', type: 'main', index: 0 }]] },
    'Pausa (rate limit)': { main: [[{ node: 'Uma por vez', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1', saveManualExecutions: true },
  pinData: {},
};

const erros = {
  name: 'Game Deals Radar — Alerta de erro',
  nodes: [
    {
      parameters: {},
      name: 'Quando o workflow falhar',
      type: 'n8n-nodes-base.errorTrigger',
      typeVersion: 1,
      position: [0, 0],
    },
    {
      parameters: {
        jsCode: code(`
const { execution = {}, workflow = {} } = $input.first().json;
const erro = execution.error || {};
return [{
  json: {
    embed: {
      title: cleanText('Falha: ' + (workflow.name || 'workflow'), 256),
      color: 0xd83c3e,
      description: cleanText(String(erro.message || 'Erro desconhecido'), 1000),
      fields: [{ name: 'Node', value: cleanText(String(execution.lastNodeExecuted || '?'), 100) || '?' }],
      footer: { text: 'Game Deals Radar' },
    },
  },
}];`),
      },
      name: 'Montar alerta',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 0],
    },
    discordNode('Avisar no Discord', [440, 0], '={{ JSON.stringify($json.embed) }}'),
  ],
  connections: {
    'Quando o workflow falhar': { main: [[{ node: 'Montar alerta', type: 'main', index: 0 }]] },
    'Montar alerta': { main: [[{ node: 'Avisar no Discord', type: 'main', index: 0 }]] },
  },
  settings: { executionOrder: 'v1' },
  pinData: {},
};

for (const [file, wf] of [
  ['game-deals-radar.json', main],
  ['alerta-de-erro.json', erros],
]) {
  fs.writeFileSync(path.join(root, 'workflows', file), JSON.stringify(wf, null, 2) + '\n');
  console.log('gerado workflows/' + file);
}
