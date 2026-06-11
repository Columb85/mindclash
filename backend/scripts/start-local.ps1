# Local backend (read-only mode, port 4001)
# Usage: .\scripts\start-local.ps1
# Frontend: NEXT_PUBLIC_API_URL=http://localhost:4001/api in frontend/.env.local

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $BackendRoot
$env:Path += ";$env:APPDATA\npm"

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example (read-only mode)" -ForegroundColor Yellow
}

Write-Host "==> Rebuilding native deps (better-sqlite3)..." -ForegroundColor Cyan
npm rebuild better-sqlite3 2>&1 | Out-Null

Write-Host "==> Starting local API (port 4001, read-only)..." -ForegroundColor Cyan
$app = pm2 jlist 2>$null | ConvertFrom-Json | Where-Object { $_.name -eq "mindclash-api" }
if ($app) {
    pm2 restart mindclash-api --update-env
} else {
    pm2 start ecosystem.config.js
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Local API ready:" -ForegroundColor Green
Write-Host "  Health: http://localhost:4001/health"
Write-Host "  API:    http://localhost:4001/api"
Write-Host "  Mode:   read-only (no on-chain signing)"
Write-Host ""
Write-Host "Live on-chain demo: https://mindclash.xyz" -ForegroundColor DarkGray
