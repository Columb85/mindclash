# Stop local backend started by start-local.ps1
pm2 stop mindclash-api 2>$null
Write-Host "Stopped mindclash-api (if running)" -ForegroundColor Green
