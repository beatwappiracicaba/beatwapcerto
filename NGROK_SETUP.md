# Configuração do Ngrok para expor o backend

## Passo 1: Iniciar o servidor da API
```bash
cd api
npm start
```

## Passo 2: Em outro terminal, iniciar o ngrok
```bash
ngrok http 4000
```

## Passo 3: Copiar a URL gerada
O ngrok vai gerar uma URL como: `https://abc123.ngrok.io`

## Passo 4: Criar arquivo .env no frontend
Crie um arquivo `c:\Users\Família\Desktop\site inicio\.env` com o conteúdo:
```
VITE_API_URL=https://abc123.ngrok.io
```

## Passo 5: Rebuildar o frontend
```bash
npm run build
```

## Passo 6: Atualizar CORS no backend
No arquivo `api/src/index.js`, atualize a origem para a URL do ngrok:
```javascript
app.use(cors({
  origin: ['https://abc123.ngrok.io', 'https://beatwapproducoes.pages.dev'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

## Passo 7: Atualizar GitHub
```bash
git add .
git commit -m "Configura ngrok para backend"
git push origin master
```

## Importante:
- A URL do ngrok muda toda vez que você reinicia o ngrok
- Para URL permanente, você precisa de uma conta paga do ngrok
- Alternativa: hospedar o backend em um serviço como Railway, Render, ou Heroku