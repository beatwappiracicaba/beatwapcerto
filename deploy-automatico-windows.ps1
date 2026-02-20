# 🚀 Deploy Backend BeatWap - Script Automático Windows
# Execute como Administrador - Faz TUDO sozinho!

Clear-Host
Write-Host "🚀 DEPLOY AUTOMÁTICO BEATWAP PARA CLOUDCLUSTERS" -ForegroundColor Green -BackgroundColor Black
Write-Host "=" * 60 -ForegroundColor Cyan

# 📋 Configurações
$VPS_IP = "108.181.197.180"
$VPS_PORT = 22
$BACKEND_PORT = 19931
$DB_HOST = "postgresql-208539-0.cloudclusters.net"
$DB_PORT = 19931
$DB_NAME = "BeatWap"
$DB_USER = "Alangodoy"
$DB_PASS = "@Aggtr4907"

# 🧪 Função para testar conexão
function Test-Connection-VPS {
    param($IP, $Port, $Service)
    Write-Host "🧪 Testando $Service ($IP`:$Port)..." -ForegroundColor Yellow -NoNewline
    try {
        $test = Test-NetConnection -ComputerName $IP -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
        if ($test) {
            Write-Host " ✅ ONLINE!" -ForegroundColor Green
            return $true
        } else {
            Write-Host " ❌ OFFLINE!" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host " ❌ ERRO!" -ForegroundColor Red
        return $false
    }
}

# 🔧 Função para instalar PuTTY
function Install-PuTTY {
    Write-Host "📦 Instalando PuTTY..." -ForegroundColor Cyan
    try {
        # Baixar PuTTY
        $puttyUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/putty.exe"
        $puttyPath = "$env:ProgramFiles\PuTTY\putty.exe"
        
        New-Item -ItemType Directory -Path "$env:ProgramFiles\PuTTY" -Force -ErrorAction SilentlyContinue
        
        Write-Host "⬇️  Baixando PuTTY..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $puttyUrl -OutFile $puttyPath -UseBasicParsing
        
        Write-Host "✅ PuTTY instalado em: $puttyPath" -ForegroundColor Green
        return $puttyPath
    } catch {
        Write-Host "⚠️  Erro ao instalar PuTTY: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 📝 Função para criar script de deploy Linux
function Create-LinuxDeployScript {
    $script = @"
#!/bin/bash
# 🚀 DEPLOY BACKEND BEATWAP - CLOUDCLUSTERS

echo "================================================"
echo "🚀 DEPLOY BACKEND BEATWAP - CLOUDCLUSTERS"
echo "================================================"

# 📁 Diretório permanente
mkdir -p /cloudclusters/backend
cd /cloudclusters/backend

# 📥 Clonar repositório
echo "📥 Clonando repositório..."
git clone https://github.com/beatwappiracicaba/beatwapproducoes.git temp
cp -r temp/backend/* .
cp -r temp/backend/.[^.]* . 2>/dev/null || true
rm -rf temp

# 📦 Instalar Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get update && apt-get install -y nodejs curl git

# 📦 Dependências
echo "📦 Instalando dependências..."
npm install

# 🔧 Configurar ambiente
echo "🔧 Configurando ambiente..."
cat > .env << 'EOF'
DATABASE_URL=postgres://Alangodoy:%40Aggtr4907@postgresql-208539-0.cloudclusters.net:19931/BeatWap
PORT=19931
FRONTEND_URLS=https://www.beatwap.com.br,https://beatwapproducoes.pages.dev
EOF

# 🔧 PM2
echo "🔧 Configurando PM2..."
npm install -g pm2
pm2 start index.js --name "beatwap-backend"
pm2 save

# ✅ Verificar
echo "✅ Verificando backend..."
pm2 status
sleep 5

# 🧪 Testar
echo "🧪 Testando conexão..."
curl -s http://localhost:19931/api/profiles > /tmp/test.json
if [ -s /tmp/test.json ]; then
    echo "✅ BACKEND FUNCIONANDO!"
    echo "📊 Resposta: $(cat /tmp/test.json | head -c 100)..."
else
    echo "⚠️  Backend pode estar iniciando..."
fi

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo "📊 Comandos úteis:"
echo "  pm2 status          - Status do backend"
echo "  pm2 logs beatwap-backend  - Ver logs"
echo "  pm2 restart beatwap-backend - Reiniciar"
echo ""
echo "🌐 Teste no navegador:"
echo "  http://108.181.197.180:19931/api/profiles"
"@
    
    $tempScript = "$env:TEMP\linux-deploy.sh"
    $script | Out-File -FilePath $tempScript -Encoding UTF8 -Force
    return $tempScript
}

# 🌐 Função para abrir PuTTY com comandos
function Start-PuTTY-Deploy {
    param($PuTTYPath, $ScriptPath)
    
    Write-Host "🚀 Abrindo PuTTY com script de deploy..." -ForegroundColor Green
    
    # Criar arquivo de comandos para PuTTY
    $commands = @"
# 🚀 DEPLOY AUTOMÁTICO BEATWAP
curl -o deploy.sh https://raw.githubusercontent.com/beatwappiracicaba/beatwapproducoes/master/backend/deploy-cloudclusters.sh
bash deploy.sh
"@
    
    $commandsPath = "$env:TEMP\putty-commands.txt"
    $commands | Out-File -FilePath $commandsPath -Encoding UTF8
    
    Write-Host "📋 Script criado. Copie e cole no PuTTY quando conectar:" -ForegroundColor Cyan
    Write-Host $commands -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 Abrindo PuTTY..." -ForegroundColor Yellow
    
    # Abrir PuTTY
    Start-Process $PuTTYPath -ArgumentList "-ssh root@$VPS_IP -P $VPS_PORT"
    
    Write-Host "📋 Comandos copiados para área de transferência!" -ForegroundColor Green
    $commands | Set-Clipboard
    
    Write-Host "📝 Após conectar no PuTTY, cole os comandos (Ctrl+V)" -ForegroundColor Yellow
}

# 🎬 SCRIPT PRINCIPAL
Write-Host "🔍 Verificando conectividade..." -ForegroundColor Cyan

# Testar conexões
$sshOk = Test-Connection-VPS -IP $VPS_IP -Port $VPS_PORT -Service "SSH"
$backendOk = Test-Connection-VPS -IP $VPS_IP -Port $BACKEND_PORT -Service "BACKEND"

Write-Host ""

if (-not $sshOk) {
    Write-Host "❌ VPS não está acessível. Verifique:" -ForegroundColor Red
    Write-Host "   ✅ VPS está ligada no CloudClusters?" -ForegroundColor Yellow
    Write-Host "   ✅ IP está correto: $VPS_IP?" -ForegroundColor Yellow
    Write-Host "   ✅ Porta SSH ($VPS_PORT) está aberta?" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎉 VPS está ONLINE!" -ForegroundColor Green

if ($backendOk) {
    Write-Host "✅ Backend já está respondendo!" -ForegroundColor Green
    $testAgain = Read-Host "Deseja testar no navegador? (s/n)"
    if ($testAgain -eq 's') {
        Start-Process "http://$VPS_IP`:$BACKEND_PORT/api/profiles"
    }
    exit 0
}

Write-Host "🚀 Preparando deploy do backend..." -ForegroundColor Cyan

# Criar script Linux
$linuxScript = Create-LinuxDeployScript
if (-not $linuxScript) {
    Write-Host "❌ Erro ao criar script Linux" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Script Linux criado: $linuxScript" -ForegroundColor Green

# Instalar PuTTY
Write-Host "📦 Verificando PuTTY..." -ForegroundColor Cyan
$puttyPath = "$env:ProgramFiles\PuTTY\putty.exe"

if (-not (Test-Path $puttyPath)) {
    Write-Host "⚠️  PuTTY não encontrado. Instalando..." -ForegroundColor Yellow
    $puttyPath = Install-PuTTY
}

if ($puttyPath) {
    Write-Host "✅ PuTTY encontrado: $puttyPath" -ForegroundColor Green
    
    # Perguntar se quer continuar
    $continue = Read-Host "Deseja abrir PuTTY e fazer deploy agora? (s/n)"
    
    if ($continue -eq 's' -or $continue -eq 'S') {
        Start-PuTTY-Deploy -PuTTYPath $puttyPath -ScriptPath $linuxScript
    } else {
        Write-Host "📋 Script Linux salvo em: $linuxScript" -ForegroundColor Cyan
        Write-Host "📝 Para deploy manual:" -ForegroundColor Yellow
        Write-Host "   1. Abra PuTTY" -ForegroundColor White
        Write-Host "   2. Conecte: root@$VPS_IP" -ForegroundColor White
        Write-Host "   3. Execute: bash deploy-cloudclusters.sh" -ForegroundColor White
    }
} else {
    Write-Host "❌ Erro ao localizar PuTTY" -ForegroundColor Red
    Write-Host "📋 Script Linux criado em: $linuxScript" -ForegroundColor Cyan
    Write-Host "📝 Use qualquer cliente SSH para conectar a root@$VPS_IP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "🎉 SCRIPT CONCLUÍDO!" -ForegroundColor Green -BackgroundColor Black
Write-Host "🌐 Após deploy, teste: http://$VPS_IP`:$BACKEND_PORT/api/profiles" -ForegroundColor Green