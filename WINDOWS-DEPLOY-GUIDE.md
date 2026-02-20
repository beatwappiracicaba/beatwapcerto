# 🚀 Deploy Backend BeatWap - Windows PowerShell Guide

## 📋 Pré-requisitos Windows

- Windows 10/11
- PowerShell
- Acesso ao CloudClusters via navegador ou SSH cliente

## 🖥️ Opção A: Usar PowerShell + SSH Client

### Passo 1 - Instalar SSH Client no Windows
```powershell
# Instalar OpenSSH Client (se não tiver)
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0

# Verificar se instalou
ssh --version
```

### Passo 2 - Conectar ao CloudClusters
```powershell
# Conectar via SSH
ssh root@108.181.197.180

# Se pedir senha, digite a senha da VPS
# Se falhar, tente porta 2222:
ssh -p 2222 root@108.181.197.180
```

### Passo 3 - Dentro do CloudClusters (Linux), execute:
```bash
# Baixar script de deploy
curl -o deploy-cloudclusters.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-cloudclusters.sh

# Executar script
bash deploy-cloudclusters.sh
```

## 🖥️ Opção B: Usar PuTTY (Mais Fácil)

### Passo 1 - Baixar PuTTY
1. Acesse: https://www.putty.org/
2. Baixe e instale o PuTTY
3. Abra o PuTTY

### Passo 2 - Configurar Conexão
- **Host Name:** 108.181.197.180
- **Port:** 22 (ou 2222 se 22 não funcionar)
- **Connection Type:** SSH
- Clique em "Open"

### Passo 3 - No Terminal PuTTY, execute:
```bash
# Script completo de deploy
curl -o deploy-cloudclusters.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-cloudclusters.sh
bash deploy-cloudclusters.sh
```

## 🖥️ Opção C: Usar Windows Subsystem for Linux (WSL)

### Passo 1 - Instalar WSL
```powershell
# Como Administrador no PowerShell
wsl --install

# Reinicie o computador
# Depois configure usuário Linux
```

### Passo 2 - Dentro do WSL, execute:
```bash
# Instalar curl
sudo apt update && sudo apt install -y curl

# Conectar e deploy
ssh root@108.181.197.180
# Dentro do CloudClusters:
bash deploy-cloudclusters.sh
```

## 🖥️ Opção D: Git Bash (Mais Simples)

### Passo 1 - Instalar Git Bash
1. Baixe Git: https://git-scm.com/download/win
2. Durante instalação, marque "Git Bash Here"
3. Clique com botão direito → "Git Bash Here"

### Passo 2 - No Git Bash:
```bash
# Conectar via SSH
ssh root@108.181.197.180

# Dentro do CloudClusters:
bash deploy-cloudclusters.sh
```

## 🧪 Testar Conexão (PowerShell)

```powershell
# Testar se IP está acessível
Test-NetConnection -ComputerName 108.181.197.180 -Port 22

# Testar porta do backend
Test-NetConnection -ComputerName 108.181.197.180 -Port 19931

# Se ambas funcionarem, teste no navegador:
Start-Process "http://108.181.197.180:19931/api/profiles"
```

## 🆘 Solução de Problemas Windows

### "SSH: Connection timed out"
- Verifique no painel CloudClusters se VPS está ligada
- Confirme IP correto (108.181.197.180)
- Tente porta 2222: `ssh -p 2222 root@108.181.197.180`

### "Permission denied"
- Use senha correta do root
- Verifique se SSH está habilitado no painel CloudClusters

### "bash: command not found"
- Você está no PowerShell, não no Linux
- Use PuTTY, WSL ou Git Bash para comandos Linux

## 🎯 Recomendação Final

**Para você, recomendo PuTTY - é o mais simples:**

1. Baixe PuTTY
2. Configure: Host=108.181.197.180, Port=22
3. Clique Open
4. Digite usuário: root
5. Digite senha
6. Execute: `bash deploy-cloudclusters.sh`

## 📞 Suporte

Se tiver problemas para conectar:
1. Verifique no painel CloudClusters se VPS está online
2. Confirme IP e porta corretos
3. Tente diferentes clientes SSH (PuTTY, WSL, Git Bash)
4. Verifique firewall do Windows