param(
    [string]$DbUser = $env:DB_USER,
    [string]$DbPassword = $env:DB_PASSWORD,
    [string]$DbHost = $(if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" })
)

$ErrorActionPreference = "Stop"

$DbHost = $DbHost.Trim().ToLowerInvariant()

if (-not $DbUser -or -not $DbPassword) {
    throw "Set DB_USER and DB_PASSWORD before starting local development. See .env.local.example."
}

if ($DbHost -notin @("127.0.0.1", "localhost", "::1")) {
    throw "Local development only permits a local database host (127.0.0.1, localhost, or ::1)."
}

$municipalCctvVariables = @(
    "STOL_CCTV_USERNAME", "STOL_CCTV_PASSWORD",
    "STOP_CCTV_USERNAME", "STOP_CCTV_PASSWORD",
    "STOS_CCTV_USERNAME", "STOS_CCTV_PASSWORD",
    "STOC_CCTV_USERNAME", "STOC_CCTV_PASSWORD"
)

foreach ($variableName in $municipalCctvVariables) {
    if ([Environment]::GetEnvironmentVariable($variableName, "Process")) {
        throw "Local development refuses municipal CCTV configuration ($variableName is set). Clear it before starting."
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    throw "Python virtual environment not found at $python."
}

$localVideoDirectory = Join-Path $projectRoot "server\videoData"
$localVideoFiles = @(
    "sambat_to_lspu.mp4",
    "sambat_to_patimbao.mp4",
    "sambat_to_sunstar.mp4",
    "sambat_to_complex.mp4"
)

foreach ($localVideoFile in $localVideoFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $localVideoDirectory $localVideoFile))) {
        throw "Missing local test video file: $localVideoFile"
    }
}

$backendCommand = "`$env:DB_USER='$DbUser'; `$env:DB_PASSWORD='$DbPassword'; `$env:DB_HOST='$DbHost'; `$env:DB_NAME='easyflow_local'; `$env:EASYFLOW_ENV='local'; `$env:EASYFLOW_VIDEO_SOURCE='local'; `$env:ENABLE_SUMO='false'; `$env:EASYFLOW_PERF_LOGGING='true'; & '$python' local_app.py"

Start-Process powershell -WorkingDirectory (Join-Path $projectRoot "server") -ArgumentList "-NoExit", "-Command", $backendCommand
Set-Location $projectRoot
$env:VITE_PERF_LOGGING = "true"
npm run dev
