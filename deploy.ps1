# Script de Deploy Automatizado - PetCare Agenda
# Execute este script no PowerShell

Write-Host "🚀 Iniciando deploy do PetCare Agenda..." -ForegroundColor Green
Write-Host ""

# Verificar se wrangler está instalado
Write-Host "📦 Verificando Wrangler..." -ForegroundColor Yellow
$wranglerVersion = wrangler --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Wrangler não encontrado. Instalando..." -ForegroundColor Red
    npm install -g wrangler
}

# Verificar autenticação
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$whoami = wrangler whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Não autenticado. Por favor, faça login:" -ForegroundColor Yellow
    Write-Host "   1. Execute: wrangler login" -ForegroundColor Cyan
    Write-Host "   2. Ou configure um API Token:" -ForegroundColor Cyan
    Write-Host "      - Acesse: https://dash.cloudflare.com/profile/api-tokens" -ForegroundColor Cyan
    Write-Host "      - Crie um token com permissões: Workers, D1, R2, Pages" -ForegroundColor Cyan
    Write-Host "      - Configure: `$env:CLOUDFLARE_API_TOKEN='seu-token'" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Autenticado!" -ForegroundColor Green
Write-Host ""

# Criar banco de dados D1
Write-Host "💾 Criando banco de dados D1..." -ForegroundColor Yellow
$dbResult = wrangler d1 create petcare-db 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Banco de dados criado!" -ForegroundColor Green
    Write-Host $dbResult -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Copie o database_id acima e atualize o wrangler.json" -ForegroundColor Yellow
    Write-Host "   Pressione qualquer tecla após atualizar o wrangler.json..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
} else {
    Write-Host "❌ Erro ao criar banco de dados" -ForegroundColor Red
    Write-Host $dbResult -ForegroundColor Red
}

# Criar bucket R2
Write-Host "📦 Criando bucket R2..." -ForegroundColor Yellow
$r2Result = wrangler r2 bucket create petcare-files 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Bucket R2 criado!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Bucket pode já existir ou erro ao criar" -ForegroundColor Yellow
    Write-Host $r2Result -ForegroundColor Yellow
}

# Executar migrations
Write-Host "📝 Executando migrations..." -ForegroundColor Yellow
$migrations = @("1", "2", "3", "4", "5", "6", "7", "8", "9", "10")
foreach ($migration in $migrations) {
    Write-Host "   Executando migration $migration..." -ForegroundColor Cyan
    wrangler d1 execute petcare-db --file="./migrations/$migration.sql" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Migration $migration executada" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Erro na migration $migration" -ForegroundColor Yellow
    }
}

# Build do worker
Write-Host "🔨 Fazendo build do worker..." -ForegroundColor Yellow
npm run build:worker
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build do worker concluído!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no build do worker" -ForegroundColor Red
    exit 1
}

# Deploy do worker
Write-Host "🚀 Fazendo deploy do worker..." -ForegroundColor Yellow
wrangler deploy
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Worker deployado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️  ANOTE A URL DO WORKER ACIMA!" -ForegroundColor Yellow
    Write-Host "   Você precisará dela para configurar o Next.js" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "❌ Erro no deploy do worker" -ForegroundColor Red
    exit 1
}

# Build do Next.js
Write-Host "🔨 Fazendo build do Next.js..." -ForegroundColor Yellow
npm run build:pages
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build do Next.js concluído!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no build do Next.js" -ForegroundColor Red
    exit 1
}

# Deploy do Next.js
Write-Host "🚀 Fazendo deploy do Next.js..." -ForegroundColor Yellow
wrangler pages deploy .vercel/output/static
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Next.js deployado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro no deploy do Next.js" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deploy concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Configure a variável WORKER_URL no Cloudflare Pages" -ForegroundColor Cyan
Write-Host "   2. Configure o domínio customizado petzcare.org" -ForegroundColor Cyan
Write-Host "   3. Teste a aplicação!" -ForegroundColor Cyan



























