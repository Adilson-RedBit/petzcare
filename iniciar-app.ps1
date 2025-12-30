# Script para iniciar o servidor Next.js
$ErrorActionPreference = "Continue"

Set-Location "c:\Users\Adilson\Desktop\adilson\Nova pasta\PetCare Agenda"

Write-Host "=== Iniciando PetCare Agenda ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Verificar se .env.local existe
if (-not (Test-Path ".env.local")) {
    Write-Host "Criando .env.local..." -ForegroundColor Yellow
    @"
JWT_SECRET=dev-secret-key-for-local-development-only-K8j3mN9pQ2rT5vX8zA1bC4dE7fG0hI3jK6mN9pQ2rT5vX8zA1bC4dE7fG0hI
NODE_ENV=development
WORKER_URL=http://localhost:5173
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "Arquivo .env.local criado!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Iniciando servidor de desenvolvimento..." -ForegroundColor Green
Write-Host "Aguardando servidor iniciar..." -ForegroundColor Yellow
Write-Host ""
Write-Host "O app estara disponivel em: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""

# Iniciar servidor
npm run dev













