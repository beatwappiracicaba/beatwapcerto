# Script para build com variável de ambiente
Write-Host "Iniciando build"

# Navegar para frontend e executar build
cd frontend
npm install
npm run build

# Voltar para raiz e copiar dist
cd ..
npm run copy-dist

Write-Host "Build concluído com sucesso!"
