# 04 — Decisões do projeto

Respostas ao [levantamento de requisitos](02-requisitos.md), registradas em 09/11/2026.

| Tema | Decisão |
|---|---|
| Fonte | **Nuuvem** (scraping de HTML, preço em BRL) |
| Destino | **Discord** via webhook |
| Formato | **Uma mensagem por jogo** (embed com capa, preço e link) |
| Frequência | **A cada 6 horas** (Schedule Trigger) |
| Desconto mínimo | **Qualquer promoção** (desconto > 0%) |
| Filtro extra | **Lista de desejos**: só avisar sobre jogos escolhidos |
| Duplicadas | **Só ofertas novas**: guardar o que já foi enviado |
| Hospedagem | **n8n no PC com Docker** |

## Consequências técnicas

- **Scraping:** HTTP Request + node HTML (seletores CSS). Se a página de promoções
  depender de JavaScript ou tiver desafio anti-bot, reavaliar.
- **Lista de desejos:** arquivo/configuração simples com nomes dos jogos; o filtro
  compara títulos normalizados (minúsculas, sem acentos e símbolos).
- **Deduplicação:** `$getWorkflowStaticData('global')` guardando `id + preço`.
  Se o preço cair de novo, a oferta é reenviada.
- **Discord:** pausa curta entre mensagens para respeitar o rate limit do webhook.
- **Docker:** incluir `docker-compose.yml` com volume persistente para o n8n.
