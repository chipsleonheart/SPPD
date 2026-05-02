# Automation Script for SPPD Deployment
# Run this from the project root

$OutputEncoding = [System.Text.Encoding]::UTF8
Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Build the frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
npx vite build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Pack the files
Write-Host "🗜️ Packing files..." -ForegroundColor Yellow
tar -czf deploy.tar.gz dist server.prod.js prisma/schema.prisma.prod package.json package-lock.json .env.production seed-admin.js

# 3. Upload to server
Write-Host "📤 Uploading to server..." -ForegroundColor Yellow
scp deploy.tar.gz remote-deploy.sh sppd-server:~/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

# 4. Execute Remote Script
Write-Host "🔄 Executing remote deployment..." -ForegroundColor Yellow
ssh sppd-server "chmod +x ~/remote-deploy.sh && ~/remote-deploy.sh"

Write-Host "✨ All done!" -ForegroundColor Green
