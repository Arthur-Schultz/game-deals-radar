# 04 — Decisões do projeto

Respostas ao [levantamento de requisitos](02-requisitos.md), registradas em 09/11/2026.

| Tema | Decisão |
|---|---|
| Fonte | **Nuuvem** (scraping de HTML, preço em BRL) |
| Destino | **Discord** via webhook |
| Formato | **Uma mensagem por jogo** (embed com capa, preço e link) |
| Frequência | **A cada 6 horas** (Schedule Trigger) |
| Desconto mínimo | **Qualquer promoção** (desconto > 0%) |
| Filtro extra | **Nenhum**: todos os jogos em promoção (lista de desejos descartada) |
| Duplicadas | **Só ofertas novas**: guardar o que já foi enviado |
| Hospedagem | **n8n no PC com Docker** |

## Consequências técnicas

- **Scraping:** HTTP Request + node HTML (seletores CSS). Se a página de promoções
  depender de JavaScript ou tiver desafio anti-bot, reavaliar.
- **Volume sem filtro:** a Nuuvem pode ter centenas de jogos em promoção ao mesmo tempo.
  Para não lotar o canal:
  - **Primeira execução silenciosa:** só registra as ofertas atuais, sem enviar nada.
    Daí em diante, só chegam promoções novas.
  - **Limite por execução:** no máximo `MAX_ALERTAS_POR_EXECUCAO` mensagens (padrão 20);
    o restante fica para a próxima execução.
- **Deduplicação:** `$getWorkflowStaticData('global')` guardando `id + preço`.
  Se o preço cair de novo, a oferta é reenviada.
- **Discord:** pausa curta entre mensagens para respeitar o rate limit do webhook.
- **Docker:** incluir `docker-compose.yml` com volume persistente para o n8n.
