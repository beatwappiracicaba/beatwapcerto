#!/bin/bash

# Setup Cloudflare Tunnel para BeatWap Backend
# Execute: ./setup-cloudflare-tunnel.sh

echo "🚀 Configurando Cloudflare Tunnel para BeatWap Backend..."

# Instalar cloudflared se não estiver instalado
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Instalando cloudflared..."
    # Windows (com winget)
    if command -v winget &> /dev/null; then
        winget install cloudflare.cloudflared
    # Linux
    elif command -v apt &> /dev/null; then
        sudo apt install cloudflared
    # macOS
    elif command -v brew &> /dev/null; then
        brew install cloudflared
    else
        echo "❌ Por favor, instale o cloudflared manualmente:"
        echo "   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
fi

# Criar o tunnel
echo "🔑 Criando tunnel..."
cloudflared tunnel create beatwap-api

# Obter o ID do tunnel
TUNNEL_ID=$(cloudflared tunnel list | grep beatwap-api | awk '{print $1}')
echo "✅ Tunnel criado com ID: $TUNNEL_ID"

# Criar arquivo de configuração
cat > cloudflare-tunnel-config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: api.beatwapproducoes.pages.dev
    service: http://localhost:19931
  - service: http_status:404
EOF

echo "📝 Configuração criada em cloudflare-tunnel-config.yml"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o DNS no Cloudflare:"
echo "   - Crie um CNAME: api.beatwapproducoes.pages.dev → $TUNNEL_ID.cfargotunnel.com"
echo "2. Configure SSL/TLS para 'Full' no Cloudflare"
echo "3. Execute o tunnel:"
echo "   cloudflared tunnel --config cloudflare-tunnel-config.yml run beatwap-api"
echo ""
echo "🌐 O backend estará acessível em: https://api.beatwapproducoes.pages.dev"