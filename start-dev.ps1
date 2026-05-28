#!/usr/bin/env pwsh
# WORLDr Alpha v0.1 - Dev Environment Startup Script
# Starts PostgreSQL, Redis, Backend API, and Frontend

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  WORLDr Alpha v0.1 - Starting Dev Stack" -ForegroundColor Cyan  
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Start Docker Compose (PostgreSQL + Redis)
Write-Host "`n[1/4] Starting PostgreSQL and Redis via Docker Compose..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Compose failed. Ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

Write-Host "     ✓ PostgreSQL: localhost:5432 (worldr_db)" -ForegroundColor Green
Write-Host "     ✓ Redis: localhost:6379" -ForegroundColor Green

# 2. Wait for DB to be ready
Write-Host "`n[2/4] Waiting for database to initialize (10s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 3. Run migrations
Write-Host "`n[3/4] Running database migrations..." -ForegroundColor Yellow
$pgPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (Test-Path $pgPath) {
    & $pgPath -U postgres -d worldr_db -f ".\database\migrations\0001_base_schema.sql"
    & $pgPath -U postgres -d worldr_db -f ".\database\migrations\0002_simulation_tables.sql"
    & $pgPath -U postgres -d worldr_db -f ".\database\migrations\0003_vertical_slice.sql"
    & $pgPath -U postgres -d worldr_db -f ".\database\migrations\0004_elections.sql"
    Write-Host "     ✓ Migrations applied" -ForegroundColor Green
} else {
    Write-Host "     WARN: psql not found at $pgPath. Please run migrations manually." -ForegroundColor Yellow
    Write-Host "     HINT: The backend Knex connection will verify tables on startup." -ForegroundColor Gray
}

# 4. Start backend and frontend
Write-Host "`n[4/4] Starting dev servers..." -ForegroundColor Yellow
Write-Host "     Backend API: http://localhost:4000" -ForegroundColor Green
Write-Host "     Frontend:    http://localhost:3000" -ForegroundColor Green
Write-Host "`n  Open TWO terminal windows and run:" -ForegroundColor Cyan
Write-Host "    Terminal 1 (backend):  cd backend && npm run dev" -ForegroundColor White
Write-Host "    Terminal 2 (frontend): cd frontend && npm run dev" -ForegroundColor White
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  WORLDr Dev Stack Ready!" -ForegroundColor Green
Write-Host "  Visit: http://localhost:3000" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
