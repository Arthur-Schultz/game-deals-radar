# Segurança

Medidas adotadas neste projeto e regras para quem for contribuir.

## Segredos

- **Nenhum segredo no repositório.** A chave de criptografia do n8n fica só no arquivo `.env`
  (ignorado pelo Git). O modelo é o `.env.example`.
- **A URL do webhook do Discord é salva como credencial do n8n** (tipo "Discord Webhook"),
  criptografada com a `N8N_ENCRYPTION_KEY`. O node do Discord só referencia a credencial pelo nome,
  então o JSON exportado do workflow não contém a URL e pode ir para o GitHub.
- Os workflows **não têm acesso às variáveis de ambiente** (`N8N_BLOCK_ENV_ACCESS_IN_NODE=true`),
  então nenhum node consegue ler a chave de criptografia.
- Antes de commitar um workflow, conferir que ele não contém URL de webhook:
  `grep -riE "discord(app)?\.com/api/webhooks" workflows/` deve voltar vazio.
- Se um webhook vazar, **apague-o no Discord** (Configurações do canal → Integrações) e crie outro.
  Remover o commit não basta: o histórico do Git e forks continuam com a URL.

## n8n

- A porta do n8n é publicada só em `127.0.0.1` (não fica acessível pela rede local nem pela internet).
- Criar a conta de dono (owner) do n8n no primeiro acesso, com senha forte.
- `N8N_ENCRYPTION_KEY` fixa no `.env`, para as credenciais salvas continuarem criptografadas
  e legíveis depois de recriar o container. O `docker compose` se recusa a subir sem ela.
- Container com `no-new-privileges`, código dos nodes Code em task runner isolado
  e telemetria desligada.
- Execuções antigas são apagadas após 7 dias.
- Manter a imagem do n8n atualizada (`docker compose pull`), pois versões antigas têm
  vulnerabilidades corrigidas nas novas.
- Não instalar nodes da comunidade de origem desconhecida.

## Dados vindos da Nuuvem (entrada não confiável)

Todo texto extraído do site é tratado como não confiável:

- **Sem menções no Discord:** as mensagens usam só embed (sem `content`), e embeds nunca
  notificam menções, então um título como `@everyone` não avisa ninguém.
- **Links validados:** só são aceitos links `https://` cujo domínio seja `nuuvem.com`
  (ou subdomínio), sem credenciais, porta ou aspas; query string e fragmento são removidos.
  Qualquer outro link é descartado.
- **Imagens validadas** com a mesma regra de `https://`.
- **Texto limitado:** títulos são cortados nos limites do Discord e caracteres de controle removidos.
- **Preços validados:** só números finitos e positivos; oferta com preço inválido é ignorada.
- O código dos nodes Code nunca usa `eval`, `new Function` ou executa texto vindo do site.

## Scraping responsável

- Uma execução a cada 6 horas, 10 segundos entre páginas, timeout de 30 s e User-Agent
  identificando o projeto.
- Respeitar o `robots.txt` e os termos de uso da Nuuvem. Não contornar captcha nem proteção anti-bot.

## Reportar um problema

Abra uma issue sem incluir segredos, ou fale diretamente com o mantenedor.
