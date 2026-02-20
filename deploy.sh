#!/bin/bash

# Script de deploy do backend BeatWap para CloudClusters VPS
# Este script automatiza a instalação e configuração do backend

echo "🚀 Iniciando deploy do backend BeatWap..."

# Atualizar sistema
echo "📦 Atualizando sistema..."
apt update -y
apt install git curl ufw -y

# Instalar Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs

# Verificar instalações
echo "✅ Verificando instalações..."
node -v
npm -v

# Clonar repositório
echo "📥 Clonando repositório..."
git clone https://github.com/beatwappiracicaba/beatwapproducoes.git
cd beatwapproducoes/backend

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Criar arquivo .env
echo "⚙️ Criando arquivo .env..."
cat > .env << EOF
DATABASE_URL=postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap
PORT=19931
FRONTEND_URLS=https://www.beatwap.com.br,https://beatwapproducoes.pages.dev
EOF

# Configurar firewall
echo "🔒 Configurando firewall..."
ufw allow 19931/tcp
ufw allow 22/tcp
ufw --force enable

# Instalar PM2 globalmente
echo "🔄 Instalando PM2..."
npm install -g pm2

# Iniciar aplicação com PM2
echo "🚀 Iniciando aplicação com PM2..."
pm2 start index.js --name "beatwap-backend"
pm2 save
pm2 startup -y

# Salvar configuração do PM2
env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

echo "✅ Deploy concluído!"
echo "🌐 Backend rodando em: http://$(curl -s ifconfig.me):19931"
echo "📊 Status do PM2:"
pm2 status

echo ""
echo "📋 Comandos úteis:"
echo "  pm2 logs beatwap-backend    - Ver logs"
echo "  pm2 restart beatwap-backend  - Reiniciar aplicação"
echo "  pm2 stop beatwap-backend     - Parar aplicação"
echo "  pm2 monit                    - Monitorar todos os processos"