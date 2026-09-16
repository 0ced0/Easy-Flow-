# Easy-Flow local video development

Use this workflow to develop the website locally with the downloaded MP4 test videos.
It does not use the live CCTV URLs.

## What starts

`npm run dev:local` starts:

- the Vite frontend at `http://localhost:5173`;
- a separate Flask backend at `http://127.0.0.1:5000`; and
- the four test videos from `server/videoData`.

By default, the launcher configures these files:

- `sambat_to_lspu.mp4`
- `sambat_to_patimbao.mp4`
- `sambat_to_sunstar.mp4`
- `sambat_to_complex.mp4`

SUMO is disabled in local mode.

## One-time setup

1. Make sure the Python virtual environment exists at `.venv` and Node dependencies
   are installed in `node_modules`.
2. Create a separate MySQL development database named `easyflow_local`.
3. Load the Easy-Flow database schema and required configuration/seed rows into that
   local database. Do not use the live database for local development.

The local backend needs MySQL because it records video-derived traffic intervals and
serves the dashboard data, traffic-light settings, and violations.

## Start the local environment

From the repository root, run:

```powershell
$env:DB_USER = "root"
$env:DB_PASSWORD = ""
npm run dev:local
```

Optional database connection settings:

```powershell
$env:DB_HOST = "127.0.0.1"
```

To use other recordings, set one or more source variables before starting. The same
recording may be assigned to more than one approach for UI/performance development.

```powershell
$env:EASYFLOW_STOL_VIDEO = "C:\videos\stol.mp4"
$env:EASYFLOW_STOP_VIDEO = "C:\videos\stop.mp4"
$env:EASYFLOW_STOS_VIDEO = "C:\videos\stos.mp4"
$env:EASYFLOW_STOC_VIDEO = "C:\videos\stoc.mp4"
```

The launcher resolves and verifies all four paths, then passes them to the backend.
When starting `server/local_app.py` directly, all four `EASYFLOW_*_VIDEO` variables
are required.

The launcher always uses `easyflow_local`. It refuses a non-local database host and
refuses to start if municipal CCTV environment variables are set.

Open `http://localhost:5173` after both the Flask and Vite consoles report that they
are running.

## Isolation from the live workflow

The local launcher validates and sets:

```text
EASYFLOW_ENV=local
EASYFLOW_VIDEO_SOURCE=local
EASYFLOW_STOL_VIDEO=<local MP4 path>
EASYFLOW_STOP_VIDEO=<local MP4 path>
EASYFLOW_STOS_VIDEO=<local MP4 path>
EASYFLOW_STOC_VIDEO=<local MP4 path>
ENABLE_SUMO=false
DB_NAME=easyflow_local
```

It validates all four local MP4 files before the backend starts and rejects municipal
CCTV credentials or any non-loopback database host. `server/local_app.py` does not
provide defaults; it fails if this explicit configuration is missing.

The live workflow remains `server/app.py`, but it must be started explicitly with
`EASYFLOW_ENV=live`, `EASYFLOW_VIDEO_SOURCE=live`, `DB_NAME=easyflow`, and all
municipal CCTV credentials. Do not use `server/app.py` for local video development.

## Stop the environment

Press `Ctrl+C` in the Vite terminal and close the separate Flask PowerShell window
opened by the launcher.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Database authentication errors | XAMPP's default local account is `root` with an empty password. Confirm MariaDB is running and that its local credentials match. |
| Database connection errors | Confirm MySQL is running, the credentials work, and `easyflow_local` has the required schema and seed rows. |
| `Missing local test video files` | Confirm all four MP4 files are present in `server/videoData`. |
| Port already in use | Stop the existing Vite process on port 5173 or Flask process on port 5000, then run the launcher again. |
| Empty dashboard/configuration errors | The local database is missing initial Easy-Flow configuration data; load the seed/configuration rows. |





# SIMULATION STARTUP
python simulation\SUMO_testing_environment.py --follow-url http://127.0.0.1:5000/get_intersection_timers





# KILL PROCESS
Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    ForEach-Object { Stop-Process -Id $_ -Force }


Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    ForEach-Object { Stop-Process -Id $_ -Force }
