$ErrorActionPreference = "Continue"
$OutputEncoding = [System.Text.Encoding]::UTF8

Set-Location "c:\Users\Adilson\Desktop\adilson\Nova pasta\PetCare Agenda"

Write-Host "=== DEBUG NEXT.JS ===" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "1. Node.js:" -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "   $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERRO: $_" -ForegroundColor Red
    exit 1
}

# Verificar npm
Write-Host "2. npm:" -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    Write-Host "   $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERRO: $_" -ForegroundColor Red
    exit 1
}

# Verificar Next.js
Write-Host "3. Verificando Next.js..." -ForegroundColor Yellow
if (Test-Path "node_modules\next") {
    Write-Host "   Next.js encontrado" -ForegroundColor Green
} else {
    Write-Host "   Next.js NAO encontrado!" -ForegroundColor Red
    Write-Host "   Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Tentar executar next --version
Write-Host "4. Testando Next.js..." -ForegroundColor Yellow
try {
    $process = Start-Process -FilePath "node_modules\.bin\next.cmd" -ArgumentList "--version" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "next-version.txt" -RedirectStandardError "next-version-err.txt"
    if (Test-Path "next-version.txt") {
        $version = Get-Content "next-version.txt" -Raw
        Write-Host "   Versao: $version" -ForegroundColor Green
    }
    if (Test-Path "next-version-err.txt") {
        $err = Get-Content "next-version-err.txt" -Raw
        if ($err) {
            Write-Host "   Erro: $err" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   ERRO: $_" -ForegroundColor Red
}

# Executar npm run dev e capturar saída
Write-Host ""
Write-Host "5. Executando npm run dev..." -ForegroundColor Yellow
Write-Host "   (Aguarde 10 segundos...)" -ForegroundColor Gray
Write-Host ""

$job = Start-Job -ScriptBlock {
    Set-Location "c:\Users\Adilson\Desktop\adilson\Nova pasta\PetCare Agenda"
    npm run dev 2>&1 | Out-File -FilePath "npm-dev-output.txt" -Encoding UTF8
}

Start-Sleep -Seconds 10

Stop-Job $job
Remove-Job $job

if (Test-Path "npm-dev-output.txt") {
    Write-Host "=== SAIDA DO npm run dev ===" -ForegroundColor Cyan
    Get-Content "npm-dev-output.txt"
    Write-Host ""
} else {
    Write-Host "Nenhuma saida capturada" -ForegroundColor Yellow
}

Write-Host "=== FIM ===" -ForegroundColor Cyan






















