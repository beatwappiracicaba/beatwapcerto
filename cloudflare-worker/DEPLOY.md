# 🚀 Deploy do BeatWap API no Cloudflare Workers

## 📦 Instalação e Configuração

### 1. Instalar Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Autenticar no Cloudflare
```bash
wrangler login
```

### 3. Configurar o Projeto
```bash
cd cloudflare-worker
npm install
```

## 🔧 Configuração das Variáveis de Ambiente

### Opção 1: Usar wrangler.toml (Recomendado)
Edite o arquivo `wrangler.toml` com suas configurações:

```toml
name = "beatwap-api-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production.vars]
# Frontend URL (seu domínio no Cloudflare Pages)
FRONTEND_URL = "https://beatwapproducoes.pages.dev"

# PostgreSQL Connection (CloudClusters)
DATABASE_URL = "https://api.cloudclusters.net/db/query"
DB_HOST = "postgres-XXXXX.cloudclusters.net"
DB_PORT = "10001"
DB_NAME = "beatwap_db"
DB_USER = "beatwap_user"
DB_PASSWORD = "sua-senha-aqui"
DB_TOKEN = "seu-token-cloudclusters"

# JWT Secret
JWT_SECRET = "sua-chave-secreta-super-segura"

# CORS Origins
ALLOWED_ORIGINS = "https://beatwapproducoes.pages.dev,https://www.beatwap.com.br"
```

### Opção 2: Usar Cloudflare Dashboard
1. Vá para [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecione seu Worker
3. Vá para "Settings" → "Variables"
4. Adicione as variáveis:
   - `FRONTEND_URL`: `https://beatwapproducoes.pages.dev`
   - `DATABASE_URL`: URL do seu CloudClusters
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - `JWT_SECRET`: Chave secreta para JWT
   - `ALLOWED_ORIGINS`: Domínios permitidos para CORS

## 🚀 Comandos de Deploy

### Desenvolvimento Local
```bash
npm run dev
# ou
wrangler dev
```

### Deploy para Produção
```bash
npm run deploy
# ou
wrangler deploy
```

### Ver Logs em Tempo Real
```bash
npm run tail
# ou
wrangler tail
```

## 📋 Estrutura do Projeto

```
cloudflare-worker/
├── src/
│   ├── index.js          # Entry point principal
│   ├── router.js         # Sistema de roteamento
│   ├── handlers/         # Handlers das rotas
│   │   ├── auth.js       # Login
│   │   ├── profiles.js   # Profiles
│   │   ├── admin.js      # Admin
│   │   ├── analytics.js  # Analytics
│   │   ├── songs.js      # Songs
│   │   ├── compositions.js # Compositions
│   │   └── sponsors.js   # Sponsors
│   ├── utils/            # Utilitários
│   │   ├── cors.js       # CORS
│   │   ├── database.js   # Database
│   │   ├── jwt.js        # JWT
│   │   ├── response.js   # Response helpers
│   │   └── pg-client.js  # PostgreSQL client
│   └── examples/         # Exemplos
├── wrangler.toml         # Configuração do Worker
├── package.json          # Dependências
└── README.md            # Documentação
```

## 🔍 Testando as Rotas

### Testar Health Check
```bash
curl https://beatwap-api-worker.seu-subdomain.workers.dev/api/health
```

### Testar Login
```bash
curl -X POST https://beatwap-api-worker.seu-subdomain.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alangodoygtr@gmail.com",
    "senha": "@Aggtr4907"
  }'
```

### Testar Profile
```bash
curl https://beatwap-api-worker.seu-subdomain.workers.dev/api/profiles/{id}
```

## ⚠️ Troubleshooting

### Erro de CORS
Certifique-se de que `FRONTEND_URL` está configurado corretamente no `wrangler.toml`.

### Erro de Conexão PostgreSQL
1. Verifique se o CloudClusters está acessível
2. Confirme as credenciais no `wrangler.toml`
3. Teste a conexão localmente primeiro

### Erro de JWT
Certifique-se de que `JWT_SECRET` tem pelo menos 32 caracteres.

### Logs de Erro
Use `wrangler tail` para ver logs em tempo real.

## 🔄 Migração do Render

### 1. Backup do Banco de Dados
Faça backup dos dados atuais antes da migração.

### 2. Atualizar Frontend
Altere as chamadas da API no frontend de:
```javascript
// Antigo (Render)
fetch('https://beatwapproducoes.onrender.com/api/login')

// Novo (Cloudflare Workers)
fetch('https://beatwap-api-worker.seu-subdomain.workers.dev/api/login')
```

### 3. Testar Tudo
Teste todas as funcionalidades antes de desativar o Render.

## 📊 Performance

- **Cold Start**: < 50ms
- **Warm Requests**: < 10ms
- **Escalabilidade**: Automática (sem limite)
- **Geographic Distribution**: Global (mais de 300 edge locations)

## 🔐 Segurança

- JWT para autenticação
- CORS configurado
- PostgreSQL com SSL
- Secrets gerenciados pelo Cloudflare

## 📈 Monitoramento

- Logs em tempo real com `wrangler tail`
- Métricas no Cloudflare Dashboard
- Analytics integrado

---

**Pronto para produção!** 🎉

Seu backend agora está rodando em serverless com Cloudflare Workers, com performance global e escalabilidade automática.