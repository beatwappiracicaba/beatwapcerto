# 🚀 Deploy do Backend BeatWap na VPS CloudClusters

Este guia ensina como fazer o deploy do backend Node.js na VPS do CloudClusters.

## 📋 Pré-requisitos

- Acesso SSH à VPS CloudClusters
- IP da VPS fornecido pelo CloudClusters
- Senha de root da VPS

## 🔧 Passo a Passo Completo

### 1. Conectar à VPS via SSH

```bash
ssh root@SEU_IP_DA_VPS
```

### 2. Executar o script de deploy automatizado

```bash
# Baixar e executar o script de deploy
curl -o deploy.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-vps.sh
chmod +x deploy.sh
./deploy.sh
```

### 3. Verificar se está funcionando

Após a execução do script, teste no navegador:
```
http://SEU_IP_DA_VPS:19931/api/profiles
```

## 📊 Comandos PM2 Úteis

```bash
# Ver logs
pm2 logs beatwap-backend

# Reiniciar aplicação
pm2 restart beatwap-backend

# Parar aplicação
pm2 stop beatwap-backend

# Ver status de todos os processos
pm2 status

# Monitorar em tempo real
pm2 monit
```

## 🔒 Configuração de Segurança

O script automaticamente:
- Configura o firewall UFW
- Libera a porta 19931
- Mantém a porta 22 aberta para SSH

## 🌐 Configuração do Frontend

No Cloudflare Pages, adicione a variável de ambiente:
```
REACT_APP_BACKEND_URL=http://SEU_IP_DA_VPS:19931
```

## 📝 Arquivos Importantes

- `index.js` - Arquivo principal do servidor
- `.env` - Variáveis de ambiente (não commitar senhas reais)
- `deploy-vps.sh` - Script de deploy automatizado

## 🆘 Troubleshooting

### Porta já em uso
```bash
# Verificar processos na porta 19931
lsof -i :19931

# Matar processo se necessário
kill -9 PID_DO_PROCESSO
```

### Erro de conexão com banco
- Verifique se o IP da VPS está na whitelist do CloudClusters
- Confirme as credenciais do banco no arquivo `.env`

### Erro CORS
- Verifique se as URLs do frontend estão corretas no `.env`
- Certifique-se de reiniciar o PM2 após mudanças

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs com `pm2 logs beatwap-backend`
2. Confirme que o firewall está configurado corretamente
3. Teste a conexão com o banco de dados
4. Verifique as variáveis de ambiente