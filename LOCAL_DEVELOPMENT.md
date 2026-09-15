# Easy-Flow local video development

Use this workflow to develop the website locally with the downloaded MP4 test videos.
It does not use the live CCTV URLs.

## What starts

`npm run dev:local` starts:

- the Vite frontend at `http://localhost:5173`;
- a separate Flask backend at `http://127.0.0.1:5000`; and
- the four test videos from `server/videoData`.

The local backend uses these files:

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
$env:DB_USER = "your_mysql_user"
$env:DB_PASSWORD = "your_mysql_password"
npm run dev:local
```

Optional database connection settings:

```powershell
$env:DB_HOST = "127.0.0.1"
```

The launcher always defaults to `easyflow_local`, even if `DB_NAME` is set in your
shell. To use a differently named development database, run the launcher directly:

```powershell
.\scripts\run-local.ps1 -DbName "easyflow_dev"
```

Open `http://localhost:5173` after both the Flask and Vite consoles report that they
are running.

## Isolation from the live workflow

The local launcher runs `server/local_app.py`, which explicitly sets:

```text
EASYFLOW_VIDEO_SOURCE=local
ENABLE_SUMO=false
DB_NAME=easyflow_local
```

It does not read CCTV credentials. It also refuses the database name `easyflow` to
help prevent local video processing from writing to the known live database.

The live workflow remains `server/app.py`. It defaults to `EASYFLOW_VIDEO_SOURCE=live`
and still requires the CCTV environment variables. Do not use `server/app.py` for
local video development.

## Stop the environment

Press `Ctrl+C` in the Vite terminal and close the separate Flask PowerShell window
opened by the launcher.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `DB_USER and DB_PASSWORD ... must be set` | Set both variables in the PowerShell session before running the command. |
| Database connection errors | Confirm MySQL is running, the credentials work, and `easyflow_local` has the required schema and seed rows. |
| `Missing local test video files` | Confirm all four MP4 files are present in `server/videoData`. |
| Port already in use | Stop the existing Vite process on port 5173 or Flask process on port 5000, then run the launcher again. |
| Empty dashboard/configuration errors | The local database is missing initial Easy-Flow configuration data; load the seed/configuration rows. |
