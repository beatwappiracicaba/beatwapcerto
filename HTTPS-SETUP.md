# Configuração HTTPS para Backend

## Opção 1: Cloudflare Tunnel (Recomendado)

1. **Instale o cloudflared:**
   ```bash
   # Windows
   winget install cloudflare.cloudflared
   
   # Linux
   sudo apt install cloudflared
   ```

2. **Crie o tunnel:**
   ```bash
   cloudflared tunnel create beatwap-api
   ```

3. **Configure o DNS no Cloudflare:**
   - Crie um CNAME: `api.beatwapproducoes.pages.dev` → `[tunnel-id].cfargotunnel.com`
   - Configure SSL/TLS em "Full"

4. **Rode o tunnel:**
   ```bash
   cloudflared tunnel --config cloudflare-tunnel.yml run beatwap-api
   ```

## Opção 2: Certificado SSL com Certbot

1. **Instale o Certbot:**
   ```bash
   sudo apt install certbot
   ```

2. **Obtenha o certificado:**
   ```bash
   sudo certbot certonly --standalone -d api.beatwapproducoes.pages.dev
   ```

3. **Configure o Express para HTTPS:**
   ```javascript
   const https = require('https');
   const fs = require('fs');
   
   const options = {
     key: fs.readFileSync('/etc/letsencrypt/live/api.beatwapproducoes.pages.dev/privkey.pem'),
     cert: fs.readFileSync('/etc/letsencrypt/live/api.beatwapproducoes.pages.dev/fullchain.pem')
   };
   
   https.createServer(options, app).listen(443);
   ```

## Opção 3: Usar um Serviço de Deploy (Mais Fácil)

**Deploy no Render.com (Gratuito):**
1. Acesse: https://render.com
2. Conecte seu GitHub
3. Deploy do backend automaticamente
4. Render fornece HTTPS automático

**Deploy no Railway.app (Gratuito):**
1. Acesse: https://railway.app
2. Conecte seu GitHub
3. Deploy com HTTPS automático

## Configuração Atualizada

Para qualquer opção, atualize o frontend para usar HTTPS:
```
VITE_API_URL=https://api.beatwapproducoes.pages.dev/api
```

## Recomendação

Use **Cloudflare Tunnel** - é gratuito, seguro e não precisa de certificado SSL.