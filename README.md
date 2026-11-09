# 🎮 Game Deals Radar

Workflow em **n8n** que monitora promoções de jogos em lojas digitais, filtra as ofertas
que realmente valem a pena e envia alertas automaticamente.

> Status: **requisitos definidos**. Nuuvem → só promoções novas → Discord, a cada 6 horas.
> Ver [decisões](docs/04-decisoes.md).

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
- [Decisões do projeto](docs/04-decisoes.md)
- [Segurança](SECURITY.md)

## Configuração

1. Copie `.env.example` para `.env` e preencha (o `.env` nunca vai para o Git).
2. Leia o [SECURITY.md](SECURITY.md) antes de exportar e commitar workflows.

## Stack

- [n8n](https://n8n.io) (self-hosted via Docker ou n8n Cloud)
- JavaScript nos nodes Code
- Fonte: Nuuvem (scraping de HTML)
- Destino: Discord (webhook)
- Docker para rodar o n8n localmente
