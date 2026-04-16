# Telegram Shopee Bot V4

Bot profissional para Telegram com:
- links da sua conta Shopee Afiliado
- score com IA
- painel web
- SQLite
- botão `Comprar agora`
- envio com foto quando disponível
- pronto para deploy 24h no Render

## Requisitos

- Node.js 22+
- Bot do Telegram criado no BotFather
- Token da OpenAI

## Instalação local

```bash
npm install
cp .env.example .env
npm start
```

Abra:

```text
http://localhost:3000
```

## Variáveis principais

Preencha no `.env`:

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_DEFAULT_CHAT_ID=-1001234567890
TELEGRAM_ADMIN_IDS=123456789
OPENAI_API_KEY=...
WEB_USERNAME=admin
WEB_PASSWORD=123456
```

## Formato da lista afiliada

Arquivo: `data/affiliate-lists.json`

```json
[
  {
    "name": "Ofertas Gerais",
    "category": "Geral",
    "chatId": "-1001234567890",
    "subId": "telegram_geral",
    "enabled": true,
    "links": [
      "https://s.shopee.com.br/abc123",
      "https://s.shopee.com.br/def456"
    ]
  }
]
```

## Comandos

```bash
npm start
npm run check
npm run commands
npm run db:reset
```

## Deploy no Render

1. Suba este projeto para um repositório GitHub.
2. No Render, crie um novo serviço a partir do repositório.
3. Use o `render.yaml` deste projeto.
4. Preencha as variáveis de ambiente.
5. Mantenha o disco persistente ativo.

## Como funciona o score com IA

Cada item passa por:
1. filtros simples
2. extração de dados do produto
3. score da IA
4. publicação somente se atingir a nota mínima

A IA devolve JSON com:
- `score`
- `approve`
- `reasons`
- `risks`
- `categorySuggestion`

## Observações

- Os dados da Shopee são obtidos por leitura HTML das páginas acessadas pelos links afiliados.
- Se a estrutura visual da Shopee mudar, pode ser necessário ajustar o parser.
- Em `DRY_RUN=true`, o bot avalia e registra, mas não envia ao Telegram.
