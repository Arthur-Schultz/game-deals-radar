# 🎮 Game Deals Radar

Workflow em **n8n** que monitora promoções de jogos em lojas digitais, filtra as ofertas
que realmente valem a pena e envia alertas automaticamente.

> Status: **fase de planejamento** — definindo fonte de dados, destino e regras de filtro.

## Objetivo

- Coletar ofertas de jogos periodicamente (Schedule Trigger)
- Normalizar os dados (título, preço original, preço promocional, % de desconto, loja, link)
- Filtrar por regras configuráveis (desconto mínimo, preço máximo, plataforma)
- Evitar alertas duplicados
- Entregar as ofertas no destino escolhido (Discord / Telegram / Google Sheets / banco de dados)

## Estrutura do repositório

```
docs/        decisões técnicas, análise de fontes e requisitos
workflows/   exports JSON dos workflows do n8n
scripts/     código usado nos nodes Code (JS) e utilitários
```

## Documentação

- [Análise de fontes de dados](docs/01-fontes-de-dados.md)
- [Levantamento de requisitos](docs/02-requisitos.md)
- [Arquitetura proposta](docs/03-arquitetura.md)

## Stack

- [n8n](https://n8n.io) (self-hosted via Docker ou n8n Cloud)
- JavaScript nos nodes Code
- Fonte de dados e destino: a definir (ver docs)
