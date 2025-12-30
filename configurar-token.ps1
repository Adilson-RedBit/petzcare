# Script para configurar o API Token
# Execute: .\configurar-token.ps1

Write-Host "Configurando API Token do Cloudflare..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, cole o token que voce criou:" -ForegroundColor Cyan
$token = Read-Host "Token"

$env:CLOUDFLARE_API_TOKEN = $token

Write-Host ""
Write-Host "Verificando autenticacao..." -ForegroundColor Yellow
wrangler whoami

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Token configurado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANTE: O token esta configurado apenas nesta sessao do PowerShell." -ForegroundColor Yellow
    Write-Host "Para usar em outras sessoes, execute novamente:" -ForegroundColor Yellow
    Write-Host '  $env:CLOUDFLARE_API_TOKEN="seu-token"' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Agora podemos continuar com o deploy!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Erro ao verificar token. Verifique se o token esta correto." -ForegroundColor Red
}



























