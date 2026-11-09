# Segurança

Medidas adotadas neste projeto e regras para quem for contribuir.

## Segredos

- **Nenhum segredo no repositório.** A URL do webhook do Discord e a chave de criptografia
  do n8n ficam só no arquivo `.env` (ignorado pelo Git). O modelo é o `.env.example`.
- O workflow lê o webhook via variável de ambiente (`$env.DISCORD_WEBHOOK_URL`),
  nunca com a URL escrita dentro de um node. Assim o JSON exportado pode ir para o GitHub.
- Antes de commitar um workflow exportado, conferir que ele não contém `discord.com/api/webhooks`
  nem tokens: `grep -ri "webhooks/\|token\|password" workflows/` deve voltar vazio.
- Se um webhook vazar, **apague-o no Discord** (Configurações do canal → Integrações) e crie outro.
  Remover o commit não basta: o histórico do Git e forks continuam com a URL.

## n8n

- A porta do n8n é publicada só em `127.0.0.1` (não fica acessível pela rede local nem pela internet).
- Criar a conta de dono (owner) do n8n no primeiro acesso, com senha forte.
- `N8N_ENCRYPTION_KEY` fixa no `.env`, para as credenciais salvas continuarem criptografadas
  e legíveis depois de recriar o container.
- Manter a imagem do n8n atualizada (`docker compose pull`), pois versões antigas têm
  vulnerabilidades corrigidas nas novas.
- Não instalar nodes da comunidade de origem desconhecida.

## Dados vindos da Nuuvem (entrada não confiável)

Todo texto extraído do site é tratado como não confiável:

- **Menções bloqueadas no Discord:** as mensagens são enviadas com
  `allowed_mentions: { parse: [] }`, então um título como `@everyone` não notifica ninguém.
- **Links validados:** só são aceitos links `https://` cujo domínio seja `nuuvem.com`
  (ou subdomínio). Qualquer outro link é descartado.
- **Imagens validadas** com a mesma regra de `https://`.
- **Texto limitado:** títulos são cortados nos limites do Discord e caracteres de controle removidos.
- **Preços validados:** só números finitos e positivos; oferta com preço inválido é ignorada.
- O código dos nodes Code nunca usa `eval`, `new Function` ou executa texto vindo do site.

## Scraping responsável

- Uma execução a cada 6 horas, poucas páginas por execução, timeout e no máximo 3 tentativas.
- Respeitar o `robots.txt` e os termos de uso da Nuuvem. Não contornar captcha nem proteção anti-bot.

## Reportar um problema

Abra uma issue sem incluir segredos, ou fale diretamente com o mantenedor.
