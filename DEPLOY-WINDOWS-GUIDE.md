# 🚀 Guia de Deploy - Backend BeatWap no Windows (PowerShell)

## 📋 Pré-requisitos

- Windows com PowerShell
- Acesso ao painel CloudClusters
- IP correto da VPS
- Credenciais de acesso

## 🔍 Passo 1 - Verificar Conectividade

### Verificar se a VPS está online:
```powershell
# Testar conexão SSH
Test-NetConnection -ComputerName SEU_IP_DA_VPS -Port 22

# Se falhar, tente ping
ping SEU_IP_DA_VPS
```

### Se não conseguir conectar:
1. Acesse o painel do CloudClusters
2. Verifique se a VPS está ligada
3. Confirme o IP correto
4. Verifique regras de firewall

## 🖥️ Passo 2 - Conectar via SSH (Windows)

### Opção A: Usar PowerShell nativo (Windows 10/11)
```powershell
# Instalar OpenSSH Client (se não tiver)
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Conectar via SSH
ssh root@SEU_IP_DA_VPS
```

### Opção B: Usar PuTTY (alternativa)
1. Baixe o PuTTY em: https://www.putty.org/
2. Instale e abra o PuTTY
3. Digite o IP da VPS em "Host Name"
4. Porta: 22
5. Clique em "Open"

## 🚀 Passo 3 - Deploy na VPS (Linux)

**⚠️ Importante: Os comandos abaixo devem ser executados DENTRO da VPS (Linux), não no Windows!**

Depois de conectar via SSH, execute:

```bash
# Baixar e executar o script de deploy
curl -o deploy.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-vps.sh
bash deploy.sh
```

## 🌐 Passo 4 - Verificar Deploy

### No Windows, teste no navegador:
```
http://SEU_IP_DA_VPS:19931/api/profiles
```

### Se não funcionar, verifique:
1. **Firewall da VPS:**
```bash
# Dentro da VPS
sudo ufw status
sudo ufw allow 19931/tcp
```

2. **Firewall do Windows:**
```powershell
# No PowerShell (Windows) como Administrador
New-NetFirewallRule -DisplayName "BeatWap-Backend" -Direction Inbound -Protocol TCP -LocalPort 19931 -Action Allow
```

## 🆘 Solução de Problemas

### Erro: "Connection timed out"
- Verifique se o IP está correto
- Acesse o painel CloudClusters e ligue a VPS
- Verifique regras de firewall no painel

### Erro: "Permission denied"
- Use a senha correta do root
- Verifique se SSH está habilitado na VPS

### Erro: "Port 22: Connection refused"
- SSH pode estar em porta diferente (tente porta 2222)
- Verifique no painel do CloudClusters

### Backend não responde na porta 19931
```bash
# Dentro da VPS, verifique se está rodando:
pm2 status
netstat -tlnp | grep 19931

# Se não estiver, reinicie:
pm2 restart beatwap-backend
```

## 📞 Suporte CloudClusters

Se ainda tiver problemas para conectar:
1. Acesse o painel do CloudClusters
2. Verifique o status da VPS
3. Abra um ticket de suporte
4. Peça para verificar conectividade SSH

## 🎯 Checklist Final

- [ ] VPS está ligada no painel
- [ ] IP está correto
- [ ] SSH está funcionando
- [ ] Script de deploy executado
- [ ] Backend respondendo na porta 19931
- [ ] Frontend configurado com novo IP