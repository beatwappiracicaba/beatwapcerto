# Cloudflare Tunnel Configuration for BeatWap

## Status Atual
- ✅ Backend rodando em: http://108.181.197.180:19931
- ✅ Frontend rodando em: https://beatwapproducoes.pages.dev
- ❌ CORS não está funcionando porque o frontend tenta HTTPS mas o backend é HTTP

## Solução: Cloudflare Tunnel

### Passo 1: Instalar Cloudflared
```bash
# Windows (com winget)
winget install cloudflare.cloudflared

# Linux
sudo apt install cloudflared

# macOS
brew install cloudflared
```

### Passo 2: Criar o Tunnel
```bash
cloudflared tunnel create beatwap-api
```

### Passo 3: Configurar DNS
1. Acesse: https://dash.cloudflare.com
2. Selecione seu domínio: `beatwapproducoes.pages.dev`
3. Vá para DNS → Records
4. Crie um CNAME:
   - Name: `api`
   - Target: `[seu-tunnel-id].cfargotunnel.com`
   - Proxy status: ✅ Proxied

### Passo 4: Configurar o Tunnel
```bash
# Criar configuração
cloudflared tunnel route dns beatwap-api api.beatwapproducoes.pages.dev

# Rodar o tunnel
cloudflared tunnel run beatwap-api --url http://localhost:19931
```

### Passo 5: Configuração Alternativa (Arquivo)
Crie um arquivo `cloudflare-tunnel-config.yml`:
```yaml
tunnel: [seu-tunnel-id]
credentials-file: /root/.cloudflared/[seu-tunnel-id].json

ingress:
  - hostname: api.beatwapproducoes.pages.dev
    service: http://localhost:19931
  - service: http_status:404
```

### Passo 6: Rodar com Config
```bash
cloudflared tunnel --config cloudflare-tunnel-config.yml run
```

## Verificação
Depois de configurado:
1. Teste: `curl -I https://api.beatwapproducoes.pages.dev/health`
2. Verifique se o CORS está funcionando no navegador

## Notas Importantes
- O tunnel precisa estar rodando constantemente
- Configure como serviço do sistema para produção
- Use PM2 ou systemd para manter o tunnel ativo