param(
    [string]$DbUser = $(if ($env:DB_USER) { $env:DB_USER } else { "root" }),
    [string]$DbPassword = $env:DB_PASSWORD,
    [string]$DbHost = $(if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }),
    [string]$StolVideo = $env:EASYFLOW_STOL_VIDEO,
    [string]$StopVideo = $env:EASYFLOW_STOP_VIDEO,
    [string]$StosVideo = $env:EASYFLOW_STOS_VIDEO,
    [string]$StocVideo = $env:EASYFLOW_STOC_VIDEO,
    [int]$BackendReadyTimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"

$DbHost = $DbHost.Trim().ToLowerInvariant()

if (-not $DbUser) {
    throw "Set DB_USER before starting local development. DB_PASSWORD may be empty for XAMPP."
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
$localVideoSources = [ordered]@{
    STOL = $(if ($StolVideo) { $StolVideo } else { Join-Path $localVideoDirectory "sambat_to_lspu.mp4" })
    STOP = $(if ($StopVideo) { $StopVideo } else { Join-Path $localVideoDirectory "sambat_to_patimbao.mp4" })
    STOS = $(if ($StosVideo) { $StosVideo } else { Join-Path $localVideoDirectory "sambat_to_sunstar.mp4" })
    STOC = $(if ($StocVideo) { $StocVideo } else { Join-Path $localVideoDirectory "sambat_to_complex.mp4" })
}

foreach ($approach in @($localVideoSources.Keys)) {
    $videoPath = $localVideoSources[$approach]
    if (-not (Test-Path -LiteralPath $videoPath -PathType Leaf)) {
        throw "Missing local simulation video for ${approach}: $videoPath"
    }
    $localVideoSources[$approach] = (Resolve-Path -LiteralPath $videoPath).Path
}

$listener = Get-NetTCPConnection -State Listen -LocalPort 5000 -ErrorAction SilentlyContinue
if ($listener) {
    throw "Port 5000 is already in use by process $($listener[0].OwningProcess). Stop it before running local development."
}

$logsDirectory = Join-Path $projectRoot ".local-logs"
New-Item -ItemType Directory -Force -Path $logsDirectory | Out-Null
$logStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backendStdout = Join-Path $logsDirectory "backend-$logStamp.stdout.log"
$backendStderr = Join-Path $logsDirectory "backend-$logStamp.stderr.log"
New-Item -ItemType File -Path $backendStdout, $backendStderr | Out-Null

function Quote-PowerShellString([string]$Value) {
    return "'" + $Value.Replace("'", "''") + "'"
}

$backendEnvironment = [ordered]@{
    DB_USER = $DbUser
    DB_PASSWORD = $DbPassword
    DB_HOST = $DbHost
    DB_NAME = "easyflow_local"
    EASYFLOW_ENV = "local"
    EASYFLOW_VIDEO_SOURCE = "local"
    EASYFLOW_STOL_VIDEO = $localVideoSources.STOL
    EASYFLOW_STOP_VIDEO = $localVideoSources.STOP
    EASYFLOW_STOS_VIDEO = $localVideoSources.STOS
    EASYFLOW_STOC_VIDEO = $localVideoSources.STOC
    ENABLE_SUMO = "false"
    EASYFLOW_PERF_LOGGING = "true"
    PYTHONPATH = $projectRoot
}
$backendAssignments = foreach ($name in $backendEnvironment.Keys) {
    "`$env:$name=$(Quote-PowerShellString $backendEnvironment[$name])"
}
$backendCommand = ($backendAssignments + @(
    "Set-Location $(Quote-PowerShellString (Join-Path $projectRoot 'server'))"
    "& $(Quote-PowerShellString $python) -u local_app.py"
    "exit `$LASTEXITCODE"
)) -join "; "

$backendProcess = Start-Process powershell -WindowStyle Hidden -PassThru `
    -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand `
    -RedirectStandardOutput $backendStdout -RedirectStandardError $backendStderr

Write-Host "Waiting for LOCAL Flask on http://127.0.0.1:5000 ..."
$readinessUri = "http://127.0.0.1:5000/get_intersection_timers"
$deadline = (Get-Date).AddSeconds($BackendReadyTimeoutSeconds)
$backendReady = $false
while ((Get-Date) -lt $deadline) {
    if ($backendProcess.HasExited) {
        Write-Host "Backend stdout ($backendStdout):"
        Get-Content -LiteralPath $backendStdout -Tail 100 -ErrorAction SilentlyContinue
        Write-Host "Backend stderr ($backendStderr):"
        Get-Content -LiteralPath $backendStderr -Tail 100 -ErrorAction SilentlyContinue
        throw "LOCAL Flask exited before becoming ready (exit code $($backendProcess.ExitCode))."
    }

    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $readinessUri -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {
        # Flask and the CV workers are still starting.
    }
    Start-Sleep -Milliseconds 500
}

if (-not $backendReady) {
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Backend stdout ($backendStdout):"
    Get-Content -LiteralPath $backendStdout -Tail 100 -ErrorAction SilentlyContinue
    Write-Host "Backend stderr ($backendStderr):"
    Get-Content -LiteralPath $backendStderr -Tail 100 -ErrorAction SilentlyContinue
    throw "LOCAL Flask did not become ready within $BackendReadyTimeoutSeconds seconds."
}

Write-Host "LOCAL Flask is ready on 127.0.0.1:5000."
Write-Host "Backend stdout: $backendStdout"
Write-Host "Backend stderr: $backendStderr"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Get-Content -LiteralPath '$(($backendStdout).Replace("'", "''"))','$(($backendStderr).Replace("'", "''"))' -Tail 50 -Wait"
Set-Location $projectRoot
$env:VITE_PERF_LOGGING = "true"
npm run dev
