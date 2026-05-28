#!/usr/bin/env pwsh
# WORLDr Auth Gateway - Dev Environment Startup Script
# Starts PostgreSQL and logs backend/frontend start instructions

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  WORLDr Auth Core - Starting Dev Stack" -ForegroundColor Cyan  
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Start Docker Compose (PostgreSQL)
Write-Host "`n[1/3] Starting PostgreSQL and Redis via Docker Compose..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Compose failed. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Host "     ✓ PostgreSQL: localhost:5432 (worldr_db)" -ForegroundColor Green

# 2. Wait for DB to be ready
Write-Host "`n[2/3] Waiting for database to initialize (5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 3. Start backend and frontend
Write-Host "`n[3/3] Starting dev servers..." -ForegroundColor Yellow
Write-Host "     Backend API: http://localhost:4000" -ForegroundColor Green
Write-Host "     Frontend:    http://localhost:3000" -ForegroundColor Green
Write-Host "`n  Open TWO terminal windows and run:" -ForegroundColor Cyan
Write-Host "    Terminal 1 (backend):  cd backend && npm run dev" -ForegroundColor White
Write-Host "    Terminal 2 (frontend): cd frontend && npm run dev" -ForegroundColor White
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  WORLDr Dev Stack Ready!" -ForegroundColor Green
Write-Host "  Visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
