# 🎮 Game Deals Radar

Workflow em **n8n** que monitora as promoções da **Nuuvem** a cada 6 horas e envia no
**Discord** só as ofertas novas com **30% de desconto ou mais**, sem repetir alertas.

## Como funciona

```
A cada 6 horas
  → Config (desconto mínimo, limite de alertas)
  → Buscar 1ª página → Planejar páginas (lê a paginação)
  → Buscar páginas (1 a cada 10 s, respeitando o rate limit e o robots.txt)
  → Extrair ofertas (parser em JS, valida links e preços)
  → Filtrar novas ofertas (histórico salvo no n8n, sem duplicatas)
  → Uma mensagem por jogo no Discord (embed com capa, preço antigo e novo)
```

- **Primeira execução silenciosa:** só registra as promoções atuais; depois disso, avisa apenas as novas.
- **Preço caiu de novo?** A oferta é reenviada.
- **Até 20 alertas por execução**, priorizando os maiores descontos; o resto fica para a próxima.
- **Alerta de erro:** um segundo workflow avisa no Discord se a coleta falhar.

## Estrutura do repositório

```
workflows/   workflows do n8n prontos para importar
scripts/     código dos nodes Code (nuuvem.js), testes e gerador dos workflows
```

## Como rodar

Pré-requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

1. Copie `.env.example` para `.env` e preencha a `N8N_ENCRYPTION_KEY`
   (gere com `openssl rand -hex 32`). O `.env` nunca vai para o Git.
2. Suba o n8n e abra http://localhost:5678 (crie a conta de dono com senha forte):
   ```bash
   docker compose up -d
   ```
3. Importe os dois arquivos de `workflows/` (menu do n8n → **Import from File**).
4. No Discord, crie um webhook no canal (Configurações do canal → Integrações → Webhooks).
5. No n8n, abra o node **"Enviar no Discord"**, crie uma credencial **Discord Webhook** com a URL
   do webhook e use a mesma credencial no node **"Avisar no Discord"** do workflow de alerta.
6. Publique o workflow de alerta, selecione-o em **Settings → Error workflow** do workflow
   principal e publique o principal.

Para parar: `docker compose down` (os dados ficam no volume `n8n_data`).

## Desenvolvimento

O código dos nodes Code fica em `scripts/nuuvem.js`, com testes:

```bash
node --test scripts/*.test.js       # testes do parser, filtros e validações
node scripts/build-workflow.js      # regenera os JSONs em workflows/
```

Detalhes de segurança em [SECURITY.md](SECURITY.md).

## Stack

- [n8n](https://n8n.io) self-hosted via Docker
- JavaScript (nodes Code + testes com `node:test`)
- Fonte: Nuuvem (scraping de HTML, preços em BRL)
- Destino: Discord (webhook)
