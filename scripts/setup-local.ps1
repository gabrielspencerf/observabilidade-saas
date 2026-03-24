# Setup local: cria banco, aplica migrations e roda seed.
# Requer: PostgreSQL rodando em localhost:5432 e .env com DATABASE_URL e SEED_ADMIN_PASSWORD.
# Uso: .\scripts\setup-local.ps1   ou   pwsh -File scripts\setup-local.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "1/3 Criando banco (se nao existir)..." -ForegroundColor Cyan
npm run db:create
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao criar banco. PostgreSQL esta rodando em localhost:5432? Senha no .env esta correta?" -ForegroundColor Red
    exit 1
}

Write-Host "2/3 Aplicando migrations..." -ForegroundColor Cyan
npm run db:migrate
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "3/3 Rodando seed (usuario e tenant)..." -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nSetup concluido. Rode: npm run dev" -ForegroundColor Green
Write-Host "Login: use o email e senha do SEED_* no .env (ex.: admin@exemplo.com)" -ForegroundColor Green
