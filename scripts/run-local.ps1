param(
    [string]$DbUser = $env:DB_USER,
    [string]$DbPassword = $env:DB_PASSWORD,
    [string]$DbHost = $(if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }),
    [string]$DbName = "easyflow_local"
)

$ErrorActionPreference = "Stop"

if (-not $DbUser -or -not $DbPassword) {
    throw "Set DB_USER and DB_PASSWORD before starting local development. See .env.local.example."
}

if ($DbName -eq "easyflow") {
    throw "Refusing to start local development with the live easyflow database. Use a separate database."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Python virtual environment not found at $python."
}

$backendCommand = "`$env:DB_USER='$DbUser'; `$env:DB_PASSWORD='$DbPassword'; `$env:DB_HOST='$DbHost'; `$env:EASYFLOW_LOCAL_DB_NAME='$DbName'; & '$python' local_app.py"

Start-Process powershell -WorkingDirectory (Join-Path $projectRoot "server") -ArgumentList "-NoExit", "-Command", $backendCommand
Set-Location $projectRoot
npm run dev
