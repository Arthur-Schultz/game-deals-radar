# 04 — Decisões do projeto

Respostas ao [levantamento de requisitos](02-requisitos.md), registradas em 09/11/2026.

| Tema | Decisão |
|---|---|
| Fonte | **Nuuvem** (scraping de HTML, preço em BRL) |
| Destino | **Discord** via webhook |
| Formato | **Uma mensagem por jogo** (embed com capa, preço e link) |
| Frequência | **A cada 6 horas** (Schedule Trigger) |
| Desconto mínimo | **30%** (configurável no node "Config") |
| Filtro extra | **Nenhum**: todos os jogos em promoção (lista de desejos descartada) |
| Duplicadas | **Só ofertas novas**: guardar o que já foi enviado |
| Hospedagem | **n8n no PC com Docker** |

## Consequências técnicas

- **Scraping:** HTTP Request (resposta em texto) + node Code com parser próprio.
  Cada card do catálogo traz um atributo `data-ga-events-product-data-param` (JSON com id,
  nome, link e capa) e um `div.product-price` com `data-price` / `data-base-price` em centavos.
  O desconto é calculado a partir desses dois preços.
- **Paginação:** o node "Planejar páginas" lê o número da última página na página 1 e gera
  as demais (limite de 49, o máximo liberado pelo `robots.txt` da Nuuvem).
- **Rate limit da Nuuvem:** rajadas geram HTTP 429 e um bloqueio temporário do IP.
  Por isso: página 1 baixada uma só vez, pausa de 10 s antes da paginação e 10 s entre páginas
  (~5 min por coleta, a cada 6 h). Página que falha não derruba a execução: a coleta é marcada
  como parcial e o histórico não é limpo.
- **Sandbox do n8n:** os nodes Code não têm a classe `URL` nem dependem de `Intl`; a validação de
  links e a formatação em reais são feitas sem elas (ver `scripts/nuuvem.js`).
- **Volume:** a Nuuvem tem centenas de jogos em promoção ao mesmo tempo. Para não lotar o canal:
  - **Primeira execução silenciosa:** só registra as ofertas atuais, sem enviar nada.
    Daí em diante, só chegam promoções novas.
  - **Limite por execução:** no máximo `maxAlertasPorExecucao` mensagens (padrão 20);
    o restante fica para a próxima execução, priorizando os maiores descontos.
- **Deduplicação:** `$getWorkflowStaticData('global')` guardando `id → preço`.
  Se o preço cair de novo, a oferta é reenviada; se sair da promoção, é esquecida.
  O histórico só é gravado em execuções automáticas (workflow publicado).
- **Discord:** uma mensagem por jogo, só com embed, com pausa de 1,5 s entre mensagens.
- **Falhas:** o workflow "Alerta de erro" avisa no Discord quando a coleta falha
  (ex.: layout do site mudou e nenhuma oferta foi extraída).
