# Script para copiar dist do frontend para a raiz
if (Test-Path '../dist') { 
    Remove-Item '../dist' -Recurse -Force 
}
Copy-Item -Path 'dist' -Destination '../dist' -Recurse -Force