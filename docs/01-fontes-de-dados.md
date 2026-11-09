# 01 — Análise de fontes de dados

Critérios avaliados: facilidade de extração, estabilidade (quebra quando o site muda o layout?),
proteção anti-bot, relevância das ofertas para o público brasileiro e moeda.

| Fonte | Forma de acesso | Anti-bot | Moeda | Facilidade | Observação |
|---|---|---|---|---|---|
| **CheapShark** | API JSON pública, sem chave | Nenhuma relevante | USD | ⭐⭐⭐⭐⭐ | Agrega 30+ lojas de PC (Steam, GOG, Epic, Humble, GMG, Fanatical...) |
| **Steam Store** | Endpoints JSON não-oficiais (`/api/featuredcategories`, `/api/appdetails?cc=br`) | Baixa (rate limit) | BRL (com `cc=br`) | ⭐⭐⭐⭐ | Só Steam, mas preço em reais |
| **Nuuvem** | HTML (scraping de páginas de promoção) | Média, verificar Cloudflare | BRL | ⭐⭐⭐ | Loja brasileira, ótima para portfólio "scraping de verdade" |
| Epic Games | Endpoint `freeGamesPromotions` | Baixa | — | ⭐⭐⭐⭐ | Bom complemento: jogos grátis da semana |
| Amazon / GMG | HTML pesado / JS | Alta | — | ⭐ | Não recomendado |

## Recomendação inicial

1. **CheapShark** como fonte principal: dado estruturado, estável, cobre várias lojas.
2. **Steam (`cc=br`)** se preço em reais for requisito.
3. **Nuuvem** se o objetivo do portfólio for demonstrar scraping de HTML com Cheerio.

Uma combinação interessante: CheapShark (API) + Nuuvem (HTML), mostrando os dois tipos de integração.

## Ética e limites

- Respeitar `robots.txt` e os termos de uso de cada loja
- Frequência baixa de requisições (no máximo a cada algumas horas)
- User-Agent identificado; sem burlar captcha/Cloudflare
