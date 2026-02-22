# Script para configurar variáveis de ambiente no Cloudflare Worker
# Execute este script com os valores corretos do seu banco de dados

Write-Host "Configurando variáveis de ambiente do Worker..."
Write-Host ""
Write-Host "Por favor, insira as seguintes informações do seu banco de dados CloudClusters:"
Write-Host ""

# Solicitar informações ao usuário
$DB_HOST = Read-Host "Host do banco de dados (ex: postgres-XXXXX.cloudclusters.net)"
$DB_PORT = Read-Host "Porta do banco de dados (geralmente 10001)"
$DB_NAME = Read-Host "Nome do banco de dados"
$DB_USER = Read-Host "Usuário do banco de dados"
$DB_PASSWORD = Read-Host "Senha do banco de dados" -AsSecureString
$DB_TOKEN = Read-Host "Token do CloudClusters"
$JWT_SECRET = Read-Host "JWT Secret (mínimo 32 caracteres)"

# Converter senha segura para string
$DB_PASSWORD Plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

Write-Host ""
Write-Host "Configurando variáveis de ambiente..."

# Configurar variáveis de ambiente
npx wrangler secret put DB_HOST --env production
npx wrangler secret put DB_PORT --env production  
npx wrangler secret put DB_NAME --env production
npx wrangler secret put DB_USER --env production
npx wrangler secret put DB_PASSWORD --env production
npx wrangler secret put DB_TOKEN --env production
npx wrangler secret put JWT_SECRET --env production

Write-Host ""
Write-Host "Variáveis de ambiente configuradas com sucesso!"
Write-Host ""
Write-Host "Agora você pode fazer o deploy do Worker com:"
Write-Host "cd worker && npx wrangler deploy"