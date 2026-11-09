# 02 — Levantamento de requisitos

Perguntas em aberto. As respostas definem a arquitetura final.

## Negócio

- [ ] **Fonte alvo:** CheapShark, Steam, Nuuvem ou combinação?
- [ ] **Público:** uso pessoal, grupo de amigos ou canal público?
- [ ] **Moeda:** preço em reais é obrigatório?
- [ ] **Plataformas:** só PC ou também PlayStation/Xbox/Switch?

## Filtros

- [ ] Desconto mínimo (%)
- [ ] Preço máximo
- [ ] Nota mínima (Metacritic / avaliação Steam)
- [ ] Lista de desejos (só avisar sobre jogos específicos)?
- [ ] Incluir jogos gratuitos (ex.: grátis da semana da Epic)?

## Destino

- [ ] Discord (webhook), Telegram (bot), Google Sheets, Postgres/Supabase, e-mail?
- [ ] Formato da mensagem: uma por oferta ou resumo agrupado?

## Execução

- [ ] Frequência do Schedule Trigger
- [ ] Hospedagem do n8n: local (Docker), VPS ou n8n Cloud?
- [ ] Deduplicação: não repetir a mesma oferta enquanto ela estiver ativa?

## Estratégia de scraping

- [ ] HTTP Request + JSON (API) — preferível
- [ ] HTTP Request + HTML Extract (Cheerio) — para Nuuvem
- [ ] Puppeteer/Playwright headless — só se a página depender de JS
