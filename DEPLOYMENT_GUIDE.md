# Guia Completo de Deployment - BeatWap Backend

## 📋 Visão Geral
Este guia fornece instruções completas para fazer deployment do backend BeatWap em uma VPS Linux da Locaweb.

## 🚀 Arquivos Criados

### 1. Script Principal de Deployment
**Arquivo**: `deploy-vps.sh`
- Script completo e automatizado
- Configuração de segurança integrada
- Monitoramento automático
- SSL com Certbot

### 2. Configuração de Ambiente
**Arquivo**: `backend/.env.production`
- Variáveis de ambiente otimizadas para produção
- Configurações de segurança
- Rate limiting
- CORS configurado

### 3. Configuração Nginx
**Arquivo**: `nginx-config.conf`
- Rate limiting por endpoint
- Headers de segurança
- Gzip compression
- SSL/TLS otimizado

### 4. Monitoramento
**Arquivo**: `monitor-api.sh`
- Health checks automáticos
- Verificação de recursos
- Logs de erros
- Relatórios diários

### 5. Manutenção
**Arquivo**: `maintenance.sh`
- Backup do banco de dados
- Limpeza de logs
- Verificação de integridade
- Atualizações de segurança

## 🔧 Passos de Instalação

### 1. Upload dos Scripts
```bash
# Conectar na VPS
ssh root@201.76.43.224

# Criar diretório de scripts
mkdir -p /root/scripts

# Fazer upload dos scripts (use SCP ou similar)
scp deploy-vps.sh root@201.76.43.224:/root/scripts/
```

### 2. Executar Deployment
```bash
# Dar permissão de execução
chmod +x /root/scripts/deploy-vps.sh

# Executar deployment
./deploy-vps.sh
```

### 3. Configurar Cron Jobs
```bash
# Adicionar monitoramento a cada 5 minutos
crontab -e

# Adicionar linhas:
*/5 * * * * /root/scripts/monitor-api.sh
0 2 * * 0 /root/scripts/maintenance.sh  # Domingos 2h
0 0 * * * /root/scripts/monitor-api.sh  # Relatório diário
```

## 🔍 Verificação e Troubleshooting

### Verificar Status
```bash
# Status da aplicação
pm2 status beatwap-api

# Logs em tempo real
pm2 logs beatwap-api --lines 100

# Health check
curl https://api.beatwap.com.br/health

# Status do Nginx
systemctl status nginx
```

### Comandos Úteis
```bash
# Restart aplicação
pm2 restart beatwap-api

# Restart Nginx
systemctl restart nginx

# Ver logs de erro
tail -f /var/log/nginx/api.beatwap.error.log

# Ver logs de acesso
tail -f /var/log/nginx/api.beatwap.access.log
```

## 🛡️ Segurança Implementada

### Firewall (UFW)
- Bloqueio de entrada por padrão
- Permite apenas SSH e Nginx
- Rate limiting por IP

### Nginx Security
- Headers de segurança (HSTS, CSP, etc)
- Rate limiting por endpoint
- Limite de conexões
- SSL/TLS moderno

### Aplicação
- JWT com segredo aleatório
- CORS configurado
- Rate limiting
- Input validation

## 📊 Monitoramento

### Métricas Monitoradas
- Uptime da aplicação
- Uso de CPU/Memória
- Erros por hora
- Tempo de resposta
- Conexões ativas

### Alertas
- Health check falhou
- CPU > 80%
- Memória > 80%
- Disco > 80%
- Erros críticos

## 🔄 Manutenção Automática

### Backup Diário
- Banco de dados SQLite
- Retenção de 30 dias
- Compressão com gzip

### Limpeza de Logs
- Logs antigos removidos
- Logs do PM2 rotacionados
- Sistema de logs otimizado

## 📞 Suporte e Troubleshooting

### Problemas Comuns

1. **Aplicação não inicia**
   ```bash
   pm2 logs beatwap-api --lines 50
   ```

2. **Nginx não conecta**
   ```bash
   nginx -t
   systemctl status nginx
   ```

3. **SSL não funciona**
   ```bash
   certbot certificates
   certbot renew --dry-run
   ```

4. **Banco de dados corrompido**
   ```bash
   sqlite3 /var/www/beatwapcerto/backend/database.sqlite "PRAGMA integrity_check;"
   ```

### Informações Importantes
- **Diretório do projeto**: `/var/www/beatwapcerto/backend`
- **Logs PM2**: `/var/log/pm2-beatwap-api.log`
- **Logs Nginx**: `/var/log/nginx/api.beatwap.*.log`
- **Backup**: `/var/backups/beatwap/`
- **Health Check**: `https://api.beatwap.com.br/health`

## 🎯 Verificação Final

Após a instalação, teste:
1. ✅ Health check: `curl https://api.beatwap.com.br/health`
2. ✅ API endpoints: `curl https://api.beatwap.com.br/api/health`
3. ✅ Frontend conectando corretamente
4. ✅ SSL funcionando (https://)
5. ✅ Rate limiting ativo
6. ✅ Logs sendo gerados
7. ✅ Backup configurado
8. ✅ Monitoramento ativo

## 📚 Referências
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)