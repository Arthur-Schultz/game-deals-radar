# 03 — Arquitetura proposta (rascunho)

```
Schedule Trigger
   └─► HTTP Request (fonte)         ← API JSON ou página HTML
         └─► Normalizar (Code)       ← formato único de oferta
               └─► Filtrar (IF/Code) ← desconto mínimo, preço máximo, nota
                     └─► Deduplicar  ← compara com ofertas já enviadas
                           └─► Formatar mensagem
                                 └─► Destino (Discord/Telegram/Sheets/DB)
```

## Modelo de dados normalizado

```json
{
  "id": "loja:idDoJogo",
  "titulo": "Nome do jogo",
  "loja": "Steam",
  "precoOriginal": 199.9,
  "precoPromo": 49.9,
  "desconto": 75,
  "moeda": "BRL",
  "nota": 88,
  "link": "https://...",
  "coletadoEm": "2026-11-09T12:00:00Z"
}
```

## Resiliência

- Retry nos nodes HTTP (3 tentativas, backoff)
- Timeout configurado
- Error Trigger em workflow separado avisando falhas
- Paginação controlada (limite de páginas por execução)

> Este rascunho será ajustado depois das respostas em [02-requisitos.md](02-requisitos.md).
