Start-Transcript -Path "d:\WorldR\install_transcript.log" -Force
$ErrorActionPreference = "Continue"

Write-Output "Stopping any running postgres installer processes..."
Stop-Process -Name postgresql-18* -Force -ErrorAction SilentlyContinue

Write-Output "Cleaning up previous PostgreSQL 18 directory..."
Remove-Item -Path "C:\Program Files\PostgreSQL\18" -Recurse -Force -ErrorAction SilentlyContinue

Write-Output "Installing PostgreSQL 18 with runtimes disabled..."
choco install postgresql18 -y --ia "--install_runtimes 0 --superpassword postgres"

Write-Output "Installing Redis..."
choco install redis -y

Write-Output "Starting Services..."
Start-Service -Name "postgresql*" -ErrorAction SilentlyContinue
Start-Service -Name "redis*" -ErrorAction SilentlyContinue

Write-Output "Creating worldr_db database..."
$pgBin = Get-ChildItem -Path "C:\Program Files\PostgreSQL" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pgBin) {
    $env:PATH += ";$($pgBin.FullName)\bin"
}
$env:PGPASSWORD = "postgres"
createdb -U postgres worldr_db 2>&1

Stop-Transcript
Start-Sleep -Seconds 5
