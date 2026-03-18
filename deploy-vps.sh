#!/bin/bash

# Script de Deployment para BeatWap Backend - VPS Locaweb
# Autor: DevOps Engineer
# Data: $(date)

set -e  # Sai em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_NAME="beatwap-api"
DOMAIN="api.beatwap.com.br"
PORT="3001"
USER="root"
BACKEND_DIR="/var/www/beatwapcerto/backend"
LOG_FILE="/var/log/beatwap-deploy.log"

# Funções de logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   log_error "Este script deve ser executado como root"
   exit 1
fi

# Criar diretório de logs
mkdir -p /var/log

log_info "Iniciando deployment do BeatWap Backend..."

# PASSO 1 - Preparar Servidor
log_info "Atualizando sistema..."
apt update && apt upgrade -y

log_info "Instalando dependências essenciais..."
apt install -y git curl nginx ufw build-essential python3-certbot-nginx software-properties-common

# PASSO 2 - Instalar Node.js LTS
log_info "Instalando Node.js LTS..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
log_success "Node.js instalado: $NODE_VERSION"
log_success "NPM instalado: $NPM_VERSION"

# PASSO 3 - Instalar PM2
log_info "Instalando PM2 globalmente..."
npm install -g pm2

# Configurar PM2 para iniciar automaticamente
pm2 startup systemd -u $USER --hp /$USER
log_success "PM2 configurado para iniciar automaticamente"

# PASSO 4 - Preparar diretório do projeto
log_info "Criando estrutura de diretórios..."
mkdir -p /var/www
cd /var/www

# Remover projeto antigo se existir
if [ -d "beatwapcerto" ]; then
    log_warning "Removendo instalação anterior..."
    rm -rf beatwapcerto
fi

# Clonar repositório
log_info "Clonando repositório..."
git clone https://github.com/beatwappiracicaba/beatwapcerto.git
cd beatwapcerto/backend

# PASSO 5 - Instalar dependências
log_info "Instalando dependências do backend..."
npm install --production

# PASSO 6 - Configurar variáveis de ambiente
log_info "Configurando variáveis de ambiente..."
cat > .env << EOF
PORT=$PORT
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
DB_PATH=/var/www/beatwapcerto/backend/database.sqlite
CORS_ORIGIN=https://beatwap.com.br,https://www.beatwap.com.br
EOF

log_success "Arquivo .env criado com configurações seguras"

# PASSO 7 - Configurar banco de dados
log_info "Preparando banco de dados..."
if [ ! -f "database.sqlite" ]; then
    npm run db:migrate
    npm run db:seed
    log_success "Banco de dados inicializado"
fi

# PASSO 8 - Configurar firewall
log_info "Configurando firewall UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
log_success "Firewall configurado"

# PASSO 9 - Configurar Nginx
log_info "Configurando Nginx..."

# Remover configuração default
rm -f /etc/nginx/sites-enabled/default

# Criar configuração do site
cat > /etc/nginx/sites-available/api.beatwap << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Access-Control-Allow-Origin \$http_origin always;
    add_header Vary "Origin" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, Content-Type, Authorization, X-Requested-With, Accept" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    location /health {
        access_log off;
        proxy_pass http://localhost:$PORT/health;
    }
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection '';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        add_header Access-Control-Allow-Origin \$http_origin always;
        add_header Vary "Origin" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Origin, Content-Type, Authorization, X-Requested-With, Accept" always;
        add_header Access-Control-Allow-Credentials "true" always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/api.beatwap /etc/nginx/sites-enabled/

# Testar configuração Nginx
nginx -t
log_success "Configuração Nginx aplicada"

# PASSO 10 - Configurar SSL com Certbot
log_info "Configurando SSL com Certbot..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@beatwap.com.br

# Criar renovação automática
echo "0 2 * * * certbot renew --quiet" | crontab -
log_success "SSL configurado com renovação automática"

# PASSO 11 - Configurar PM2
log_info "Configurando PM2..."

# Parar processo antigo se existir
pm2 delete $PROJECT_NAME 2>/dev/null || true

# Iniciar aplicação
pm2 start src/server.js --name $PROJECT_NAME --env production --log /var/log/pm2-$PROJECT_NAME.log --error /var/log/pm2-$PROJECT_NAME-error.log

# Salvar configuração PM2
pm2 save

# Criar script de reinicialização
cat > /etc/systemd/system/pm2-$USER.service << EOF
[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=$USER
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
TimeoutStartSec=8
Environment=PATH=/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/$USER/.local/bin
Environment=PM2_HOME=/$USER/.pm2
Restart=always
RestartSec=3
ExecStart=/usr/bin/pm2 resurrect
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pm2-$USER

log_success "PM2 configurado e aplicação iniciada"

# PASSO 12 - Testar aplicação
log_info "Testando aplicação..."
sleep 5

# Testar health check
if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
    log_success "Aplicação está respondendo corretamente"
else
    log_error "Aplicação não está respondendo. Verifique os logs:"
    pm2 logs $PROJECT_NAME --lines 50
    exit 1
fi

# PASSO 13 - Configurar monitoramento
log_info "Configurando monitoramento..."

# Criar script de monitoramento
cat > /usr/local/bin/beatwap-monitor.sh << EOF
#!/bin/bash
# Monitoramento BeatWap API

PORT="$PORT"
PROJECT_NAME="$PROJECT_NAME"
LOG_FILE="$LOG_FILE"

if ! curl -f http://localhost:\$PORT/health > /dev/null 2>&1; then
    echo "\$(date): API fora do ar, reiniciando..." >> \$LOG_FILE
    pm2 restart \$PROJECT_NAME
fi
EOF

chmod +x /usr/local/bin/beatwap-monitor.sh

# Adicionar ao crontab
echo "*/5 * * * * /usr/local/bin/beatwap-monitor.sh" | crontab -

# PASSO 14 - Limpeza e otimização finallog_info "Realizando limpeza e otimização..."
apt autoremove -y
apt autoclean

# Reiniciar serviços
systemctl restart nginx
pm2 restart $PROJECT_NAME

# Criar informações de deployment
cat > /root/beatwap-deployment-info.txt << EOF
=== INFORMAÇÕES DO DEPLOYMENT ===
Data: $(date)
Projeto: $PROJECT_NAME
Domínio: https://$DOMAIN/api
Porta: $PORT
Diretório: $BACKEND_DIR
Logs PM2: /var/log/pm2-$PROJECT_NAME.log
Logs Erro: /var/log/pm2-$PROJECT_NAME-error.log
Monitoramento: /usr/local/bin/beatwap-monitor.sh

=== COMANDOS ÚTEIS ===
Ver logs: pm2 logs $PROJECT_NAME
Monitorar: pm2 monit
Restart: pm2 restart $PROJECT_NAME
Stop: pm2 stop $PROJECT_NAME
Status: pm2 status

=== SEGURANÇA ===
Firewall: ufw status
SSL: certbot certificates
Updates: apt update && apt upgrade -y
EOF

log_success "Deployment concluído com sucesso!"
log_info "Acesse sua API em: https://$DOMAIN/api"
log_info "Informações salvas em: /root/beatwap-deployment-info.txt"
log_info "Use 'pm2 monit' para monitorar a aplicação"
