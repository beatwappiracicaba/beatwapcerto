# Script para build com variável de ambiente
$env:VITE_API_BASE_URL = "https://beatwap-api-worker.beatwappiracicaba.workers.dev"

Write-Host "Iniciando build com VITE_API_BASE_URL: $env:VITE_API_BASE_URL"

# Navegar para frontend e executar build
cd frontend
npm install
npm run build

# Voltar para raiz e copiar dist
cd ..
npm run copy-dist

Write-Host "Build concluído com sucesso!"