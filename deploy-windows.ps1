# 🚀 Deploy Backend BeatWap - Script PowerShell Windows
# Execute este script como Administrador no PowerShell

Write-Host "🚀 Iniciando deploy do backend BeatWap..." -ForegroundColor Green

# 📋 Verificar se está rodando como Administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Por favor execute como Administrador!" -ForegroundColor Yellow
    exit 1
}

# 🔧 Instalar OpenSSH Client (se não tiver)
Write-Host "📦 Instalando OpenSSH Client..." -ForegroundColor Cyan
try {
    Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0 -ErrorAction SilentlyContinue
    Write-Host "✅ OpenSSH Client instalado!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  OpenSSH já está instalado ou erro na instalação" -ForegroundColor Yellow
}

# 🌐 Configurações
$VPS_IP = "108.181.197.180"
$VPS_PORT = 22
$BACKEND_PORT = 19931

# 🧪 Testar conectividade
Write-Host "🧪 Testando conectividade com VPS..." -ForegroundColor Cyan
$sshTest = Test-NetConnection -ComputerName $VPS_IP -Port $VPS_PORT -WarningAction SilentlyContinue
$backendTest = Test-NetConnection -ComputerName $VPS_IP -Port $BACKEND_PORT -WarningAction SilentlyContinue

if ($sshTest.TcpTestSucceeded) {
    Write-Host "✅ SSH ($VPS_IP:$VPS_PORT) está acessível!" -ForegroundColor Green
} else {
    Write-Host "❌ SSH não está acessível. Verifique:" -ForegroundColor Red
    Write-Host "   - VPS está ligada no CloudClusters?" -ForegroundColor Yellow
    Write-Host "   - IP está correto?" -ForegroundColor Yellow
    Write-Host "   - Firewall permite SSH?" -ForegroundColor Yellow
    exit 1
}

if ($backendTest.TcpTestSucceeded) {
    Write-Host "✅ Backend porta $BACKEND_PORT está acessível!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Backend porta $BACKEND_PORT não está acessível ainda" -ForegroundColor Yellow
}

# 📝 Criar script de deploy para Linux
$linuxScript = @'
#!/bin/bash
# Script de deploy para CloudClusters

echo "🚀 Iniciando deploy do backend BeatWap no CloudClusters..."

# 📁 Criar diretório permanente
mkdir -p /cloudclusters/backend
cd /cloudclusters/backend

# 📥 Clonar repositório
echo "📥 Clonando repositório..."
git clone https://github.com/beatwappiracicaba/beatwapproducoes.git temp
cp -r temp/backend/* .
rm -rf temp

# 📦 Instalar Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get update && apt-get install -y nodejs

# 📦 Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 🔧 Criar .env
echo "🔧 Configurando ambiente..."
cat > .env << 'EOF'
DATABASE_URL=postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap
PORT=19931
FRONTEND_URLS=https://www.beatwap.com.br,https://beatwapproducoes.pages.dev
EOF

# 🔧 Instalar PM2 e iniciar
echo "🔧 Iniciando PM2..."
npm install -g pm2
pm2 start index.js --name "beatwap-backend"
pm2 save

# ✅ Verificar
echo "✅ Verificando status..."
pm2 status
sleep 3
curl -f http://localhost:19931/api/profiles && echo "✅ Backend funcionando!" || echo "⚠️  Verifique logs"

echo "🎉 Deploy concluído!"
echo "📊 Comandos úteis:"
echo "  pm2 status          - Ver status"
echo "  pm2 logs beatwap-backend  - Ver logs"
echo "  pm2 restart beatwap-backend - Reiniciar"
'@

# 💾 Salvar script Linux temporário
$tempScript = "$env:TEMP\deploy-backend-linux.sh"
$linuxScript | Out-File -FilePath $tempScript -Encoding UTF8

# 🚀 Perguntar se quer executar deploy
Write-Host "`n🎯 Pronto para conectar ao CloudClusters e fazer deploy!" -ForegroundColor Green
$continue = Read-Host "Deseja conectar via SSH e executar o deploy? (s/n)"

if ($continue -eq 's' -or $continue -eq 'S') {
    Write-Host "🌐 Conectando ao CloudClusters..." -ForegroundColor Cyan
    Write-Host "📡 Use: root@$VPS_IP" -ForegroundColor Yellow
    Write-Host "📝 Após conectar, execute: bash deploy-backend-linux.sh" -ForegroundColor Yellow
    Write-Host "`n🚀 Abrindo SSH..." -ForegroundColor Green
    
    # Abrir SSH
    ssh root@$VPS_IP
    
} else {
    Write-Host "📋 Script Linux salvo em: $tempScript" -ForegroundColor Cyan
    Write-Host "📝 Para executar manualmente:" -ForegroundColor Yellow
    Write-Host "   1. Conecte via SSH: ssh root@$VPS_IP" -ForegroundColor White
    Write-Host "   2. Execute: bash deploy-backend-linux.sh" -ForegroundColor White
}

# 🧪 Teste final
Write-Host "`n🧪 Testando backend após deploy..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
$finalTest = Test-NetConnection -ComputerName $VPS_IP -Port $BACKEND_PORT -WarningAction SilentlyContinue

if ($finalTest.TcpTestSucceeded) {
    Write-Host "✅ Backend está respondendo na porta $BACKEND_PORT!" -ForegroundColor Green
    Write-Host "🌐 Teste no navegador: http://$VPS_IP`:$BACKEND_PORT/api/profiles" -ForegroundColor Green
    
    # Abrir navegador
    $openBrowser = Read-Host "Deseja abrir no navegador para testar? (s/n)"
    if ($openBrowser -eq 's' -or $openBrowser -eq 'S') {
        Start-Process "http://$VPS_IP`:$BACKEND_PORT/api/profiles"
    }
} else {
    Write-Host "⚠️  Backend ainda não está respondendo. Verifique logs com: pm2 logs beatwap-backend" -ForegroundColor Yellow
}

Write-Host "`n🎉 Script concluído!" -ForegroundColor Green