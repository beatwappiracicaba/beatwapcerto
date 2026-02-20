# 🚀 Guia Rápido - Verificar Backend na VPS

## ✅ Seu IP: 108.181.197.180:19931

## 🔍 Passo 1 - Conectar via SSH

### No PowerShell (Windows):
```powershell
ssh root@108.181.197.180
```

### Se der erro de timeout:
- Verifique no painel CloudClusters se a VPS está ligada
- Confirme se o IP está correto
- Tente porta 2222: `ssh -p 2222 root@108.181.197.180`

## 🔧 Passo 2 - Verificar se Backend está Rodando

**Depois de conectar na VPS, execute:**

```bash
# Verificar se o backend está rodando
pm2 status

# Ver logs do backend
pm2 logs beatwap-backend --lines 50

# Verificar se a porta 19931 está aberta
netstat -tlnp | grep 19931

# Testar conexão com banco de dados
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.log('Erro:', err);
  else console.log('Conectado:', res.rows[0]);
  pool.end();
});
"
```

## 🆘 Problemas Comuns

### 1. Backend não está rodando
```bash
# Instalar dependências
cd beatwapproducoes/backend
npm install

# Iniciar com PM2
pm2 start index.js --name "beatwap-backend"
pm2 save
```

### 2. Erro de conexão com banco
```bash
# Verificar arquivo .env
cat .env

# Se não existir, criar:
nano .env
# Cole:
DATABASE_URL=postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap
PORT=19931
FRONTEND_URLS=https://www.beatwap.com.br,https://beatwapproducoes.pages.dev
```

### 3. Firewall bloqueando
```bash
# Liberar porta 19931
sudo ufw allow 19931/tcp
sudo ufw status
```

## 🎯 Testar Backend

### Depois de tudo configurado, teste no navegador:
```
http://108.181.197.180:19931/api/profiles
```

### Ou no PowerShell (Windows):
```powershell
# Testar conexão
Test-NetConnection -ComputerName 108.181.197.180 -Port 19931

# Testar API (se conexão TCP funcionar)
Invoke-RestMethod -Uri "http://108.181.197.180:19931/api/profiles" -Method GET
```

## 📞 Se ainda tiver problemas:

1. **Verifique IP correto no CloudClusters**
2. **Confirme se VPS está ligada**
3. **Teste SSH com Putty ou outro cliente**
4. **Verifique firewall do Windows:**
```powershell
# No PowerShell como Admin
New-NetFirewallRule -DisplayName "BeatWap-Backend" -Direction Outbound -Protocol TCP -RemotePort 19931 -Action Allow
```

## 🎉 Sucesso!

Quando tudo estiver funcionando, você verá JSON no navegador ao acessar:
```
http://108.181.197.180:19931/api/profiles
```