# 03 — Arquitetura

## Workflow principal (`workflows/game-deals-radar.json`)

```
A cada 6 horas (Schedule Trigger)
   └─► Config (Code)                 ← desconto mínimo, limite de alertas, URL do catálogo
         └─► Buscar 1ª página (HTTP)  ← catálogo de promoções da Nuuvem
               └─► Planejar páginas (Code)  ← lê a última página da paginação (máx. 49)
                     └─► Pausa inicial (Wait 10 s)
                           └─► Buscar páginas (HTTP, 1 a cada 10 s)
                                 └─► Extrair ofertas (Code)  ← parser + validação
                                       └─► Filtrar novas ofertas (Code)  ← histórico + regras
                                             └─► Uma por vez (Loop)
                                                   └─► Enviar no Discord (webhook, embed)
                                                         └─► Pausa (1,5 s) ─┐
                                                   ▲────────────────────────┘
```

## Workflow de alerta (`workflows/alerta-de-erro.json`)

```
Error Trigger → Montar alerta (Code) → Avisar no Discord
```

## Modelo de dados de uma oferta

```json
{
  "id": "6ad8c6ae4fd6b1ac1fdccf38",
  "titulo": "Nome do jogo",
  "link": "https://www.nuuvem.com/br-pt/item/nome-do-jogo",
  "imagem": "https://assets.nuuvem.com/...",
  "precoOriginal": 199.9,
  "precoPromo": 49.9,
  "desconto": 75,
  "moeda": "BRL"
}
```

## Estado entre execuções

Guardado com `$getWorkflowStaticData('global')`:

```json
{ "inicializado": true, "ultimaExecucao": "2026-11-09T18:00:00.000Z", "enviados": { "<id>": 49.9 } }
```

## Resiliência

- Retry na 1ª página (3 tentativas); nas demais, falha de uma página marca a coleta como parcial
  em vez de derrubar a execução.
- Nenhuma oferta extraída → erro explícito → workflow de alerta avisa no Discord.
- Timeout de 30 s por requisição.
- Execuções antigas apagadas após 7 dias (`EXECUTIONS_DATA_MAX_AGE`).
