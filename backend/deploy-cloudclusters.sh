#!/bin/bash

# 🚀 Script de Deploy - Backend BeatWap no CloudClusters
# Este script instala o backend Node.js no ambiente CloudClusters

set -e

echo "🚀 Iniciando deploy do backend BeatWap no CloudClusters..."

# 📁 Criar diretório permanente para o backend
mkdir -p /cloudclusters/backend
cd /cloudclusters/backend

echo "📥 Clonando repositório..."
# Clonar backend para diretório permanente
git clone https://github.com/beatwappiracicaba/beatwapproducoes.git temp
cp -r temp/backend/* .
cp -r temp/backend/.[^.]* . 2>/dev/null || true
rm -rf temp

echo "📦 Instalando Node.js..."
# Instalar Node.js (será perdido se reiniciar, mas fica no script)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

echo "📦 Instalando dependências..."
npm install

echo "🔧 Criando arquivo .env..."
cat > .env << 'EOF'
DATABASE_URL=postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap
PORT=19931
FRONTEND_URLS=https://www.beatwap.com.br,https://beatwapproducoes.pages.dev
EOF

echo "🔧 Configurando PM2..."
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar backend com PM2
pm2 start index.js --name "beatwap-backend"

# Salvar configuração do PM2
pm2 save

echo "✅ Backend iniciado! Verificando status..."
pm2 status

echo "📝 Criando script de inicialização automática..."
# Criar script que será executado quando reiniciar o container
cat > /cloudclusters/backend/start-backend.sh << 'EOF'
#!/bin/bash
cd /cloudclusters/backend
# Reinstalar Node.js (será perdido ao reiniciar)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs
# Reinstalar PM2
npm install -g pm2
# Restaurar processos do PM2
pm2 resurrect
# Iniciar backend
pm2 start index.js --name "beatwap-backend"
EOF

chmod +x /cloudclusters/backend/start-backend.sh

echo "🧪 Testando backend..."
sleep 5
curl -f http://localhost:19931/api/profiles || echo "⚠️  Backend pode estar iniciando..."

echo "✅ Deploy concluído!"
echo "📊 Comandos úteis:"
echo "  pm2 status          - Ver status dos processos"
echo "  pm2 logs beatwap-backend  - Ver logs do backend"
echo "  pm2 restart beatwap-backend - Reiniciar backend"
echo ""
echo "🌐 Teste no navegador: http://108.181.197.180:19931/api/profiles"