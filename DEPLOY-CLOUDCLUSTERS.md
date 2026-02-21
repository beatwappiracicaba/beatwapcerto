# 🚀 Guia Completo de Deploy - Backend BeatWap na VPS CloudClusters

## ✅ PASSO 1 — postgresql-208539-0.cloudclusters.net

No seu computador, abra o terminal e conecte via SSH:

```bash
ssh root@SEU_IP_DA_VPS
```

(Use o IP que o CloudClusters te forneceu)

Se pedir senha, coloque a senha da VPS.

## ✅ PASSO 2 — Deploy Automatizado (RECOMENDADO)

Dentro da VPS, execute:

```bash
# Baixar e executar o script de deploy
curl -o deploy.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-vps.sh
chmod +x deploy.sh
./deploy.sh
```

## ✅ PASSO 3 — Deploy Manual (Alternativa)

Se preferir fazer manualmente:

### 3.1 Clonar o backend do GitHub na VPS

```bash
apt update -y
apt install git curl ufw -y

git clone https://github.com/beatwappiracicaba/beatwapproducoes.git
cd beatwapproducoes/backend
```

### 3.2 Instalar Node.js na VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs

# Verificar
node -v
npm -v
```

### 3.3 Instalar dependências

```bash
npm install
```

### 3.4 Criar o arquivo .env

```bash
nano .env
```

Cole dentro:
```
DATABASE_URL=postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap
PORT=19931
FRONTEND_URLS=https://www.beatwap.com.br,https://beatwapproducoes.pages.dev
```

Salve com: `CTRL + X`, `Y`, `ENTER`

### 3.5 Configurar firewall

```bash
ufw allow 19931/tcp
ufw allow 22/tcp
ufw --force enable
```

### 3.6 Rodar com PM2 (para rodar 24h)

```bash
npm install -g pm2
pm2 start index.js --name "beatwap-backend"
pm2 save
pm2 startup systemd -u root --hp /root
```

## ✅ PASSO 4 — Testar no navegador

No seu navegador, acesse:
```
http://IP_DA_VPS:19931/api/profiles
```

Se retornar JSON → backend está online 🎉

## ✅ PASSO 5 — Conectar com o Frontend (Cloudflare)

No Cloudflare Pages:

1. Vá em **Settings** → **Environment Variables**
2. Adicione:
   ```
   REACT_APP_BACKEND_URL=http://IP_DA_VPS:19931
   ```

No frontend, use:
```javascript
fetch(`${process.env.REACT_APP_BACKEND_URL}/api/profiles`)
```

## 🆘 Comandos Úteis

```bash
# Ver logs
pm2 logs beatwap-backend

# Reiniciar
pm2 restart beatwap-backend

# Status
pm2 status

# Monitorar
pm2 monit
```

## ⚠️ IMPORTANTE

- O backend está configurado para rodar na porta **19931**
- CORS está configurado para aceitar seus domínios: `https://www.beatwap.com.br` e `https://beatwapproducoes.pages.dev`
- Use PM2 para manter o servidor rodando 24h
- O banco de dados está na CloudClusters com SSL habilitado

## 📞 Suporte

Se tiver problemas:
1. Verifique logs: `pm2 logs beatwap-backend`
2. Confirme firewall: `ufw status`
3. Teste conexão com banco: `node -e "console.log('Testando...')"`
4. Verifique variáveis de ambiente no arquivo `.env`