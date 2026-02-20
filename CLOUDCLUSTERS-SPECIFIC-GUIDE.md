# 🚀 Deploy Backend BeatWap - CloudClusters Específico

## 📋 Informações Importantes do CloudClusters

### 📁 Armazenamento Permanente
- **Diretório:** `/cloudclusters/`
- **Só arquivos aqui sobrevivem a reinicializações**
- **PostgreSQL já está instalado e configurado**

### 🔧 Ajustes Necessários

## ✅ PASSO 1 - Acessar o Container PostgreSQL

Você já está dentro do container! O CloudClusters te coloca diretamente no ambiente PostgreSQL.

## ✅ PASSO 2 - Executar Deploy do Backend

**Execute este comando dentro do container:**

```bash
# Baixar e executar script de deploy
curl -o deploy-cloudclusters.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-cloudclusters.sh
bash deploy-cloudclusters.sh
```

## ✅ PASSO 3 - Verificar Instalação

```bash
# Verificar se backend está rodando
pm2 status

# Ver logs
pm2 logs beatwap-backend --lines 20

# Testar conexão local
curl http://localhost:19931/api/profiles
```

## ✅ PASSO 4 - Configurar IP Externo

**O CloudClusters usa NAT, então precisamos verificar o IP externo:**

```bash
# Descobrir IP externo
curl -s ifconfig.me

# Verificar se porta 19931 está acessível externamente
# Teste no navegador: http://IP_EXTERNO:19931/api/profiles
```

## 🔁 Reinicialização Automática

**Criamos script em `/cloudclusters/backend/start-backend.sh` que será executado automaticamente quando reiniciar o container.**

## 🆘 Problemas Comuns no CloudClusters

### 1. "apt-get: command not found"
```bash
# Use yum ou dnf dependendo da distro
yum install -y curl git
# ou
dnf install -y curl git
```

### 2. "Porta 19931 já em uso"
```bash
# Verificar processos
netstat -tlnp | grep 19931

# Matar processo se necessário
kill -9 PID
```

### 3. "Permission denied" ao instalar Node.js
```bash
# Usar nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install node
```

### 4. Arquivos desaparecem após reiniciar
```bash
# Verificar se está em /cloudclusters/
pwd
ls -la /cloudclusters/

# Mover arquivos para diretório permanente
mv /caminho/arquivo /cloudclusters/backend/
```

## 📊 Comandos Úteis no CloudClusters

```bash
# Ver recursos disponíveis
df -h
free -m

# Ver processos
ps aux | grep node

# Ver portas
netstat -tlnp

# Logs do PostgreSQL
tail -f /var/log/postgresql/postgresql-*.log
```

## 🌐 Testes Finais

### Testar todas as rotas do backend:
```bash
# Testar localmente no container
curl http://localhost:19931/api/profiles
curl http://localhost:19931/api/home/producers
curl http://localhost:19931/api/releases

# Testar conexão com PostgreSQL
psql -U postgres -c "SELECT current_database(), current_user, now();"
```

### Testar externamente:
```bash
# Descobrir IP externo
EXTERNAL_IP=$(curl -s ifconfig.me)
echo "IP Externo: $EXTERNAL_IP"
echo "Teste no navegador: http://$EXTERNAL_IP:19931/api/profiles"
```

## 🎯 Configuração Frontend (Cloudflare Pages)

Adicione variável de ambiente:
```
REACT_APP_BACKEND_URL=http://108.181.197.180:19931
```

## ⚠️ IMPORTANTE - CloudClusters

1. **Sempre use `/cloudclusters/` para arquivos importantes**
2. **Node.js precisa ser reinstalado após reinicialização**
3. **PM2 salva configurações mas precisa ser restaurado**
4. **PostgreSQL já está rodando e configurado**
5. **Firewall geralmente já está configurado**

## 📞 Suporte CloudClusters

Se tiver problemas específicos:
1. Verifique logs: `dmesg | tail`
2. Confirme recursos: `free -m && df -h`
3. Teste conectividade: `ping postgresql-208539-0.cloudclusters.net`
4. Abra ticket no painel do CloudClusters