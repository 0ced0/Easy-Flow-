"""Fail-closed runtime configuration for Easy-Flow environments."""

import os
from functools import lru_cache
from pathlib import Path


LOCAL_DATABASE_NAME = "easyflow_local"
LIVE_DATABASE_NAME = "easyflow"
LOCAL_DATABASE_HOSTS = {"127.0.0.1", "localhost", "::1"}
CCTV_ENVIRONMENT_NAMES = (
    "STOL_CCTV_USERNAME", "STOL_CCTV_PASSWORD",
    "STOP_CCTV_USERNAME", "STOP_CCTV_PASSWORD",
    "STOS_CCTV_USERNAME", "STOS_CCTV_PASSWORD",
    "STOC_CCTV_USERNAME", "STOC_CCTV_PASSWORD",
)
LOCAL_VIDEO_ENVIRONMENT_NAMES = {
    "STOL": "EASYFLOW_STOL_VIDEO",
    "STOP": "EASYFLOW_STOP_VIDEO",
    "STOS": "EASYFLOW_STOS_VIDEO",
    "STOC": "EASYFLOW_STOC_VIDEO",
}


def _required(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}.")
    return value


@lru_cache(maxsize=1)
def validateEnvironment():
    """Validate the selected infrastructure before any camera or DB connection."""
    environment = _required("EASYFLOW_ENV").lower()
    videoSource = _required("EASYFLOW_VIDEO_SOURCE").lower()
    databaseName = _required("DB_NAME")

    if environment not in ("local", "live"):
        raise RuntimeError("EASYFLOW_ENV must be either 'local' or 'live'.")

    if environment == "local":
        if videoSource != "local":
            raise RuntimeError(
                "LOCAL startup requires EASYFLOW_VIDEO_SOURCE=local; live cameras are disabled."
            )
        if databaseName != LOCAL_DATABASE_NAME:
            raise RuntimeError(
                f"LOCAL startup requires DB_NAME={LOCAL_DATABASE_NAME}; production databases are disabled."
            )

        databaseHost = os.environ.get("DB_HOST", "127.0.0.1").strip().lower()
        if databaseHost not in LOCAL_DATABASE_HOSTS:
            raise RuntimeError(
                "LOCAL startup requires DB_HOST to be localhost, 127.0.0.1, or ::1."
            )

        configuredCctv = [name for name in CCTV_ENVIRONMENT_NAMES if os.environ.get(name)]
        if configuredCctv:
            raise RuntimeError(
                "LOCAL startup refuses municipal CCTV configuration: "
                + ", ".join(configuredCctv)
            )

        localVideoPaths = {}
        for approach, variableName in LOCAL_VIDEO_ENVIRONMENT_NAMES.items():
            videoPath = Path(_required(variableName)).expanduser().resolve()
            if not videoPath.is_file():
                raise RuntimeError(
                    f"LOCAL startup cannot find {approach} simulation video: {videoPath}"
                )
            localVideoPaths[approach] = videoPath

        print("[LOCAL DEV]")
        print("Environment: LOCAL")
        print(f"Database: {databaseName}")
        print("Video source: local files")
        print("Municipal gateway: DISABLED")
        print("[LOCAL VIDEO]")
        for approach, videoPath in localVideoPaths.items():
            print(f"{approach} -> {videoPath}")

        if len(set(localVideoPaths.values())) < len(localVideoPaths):
            print("[LOCAL DEV WARNING]")
            print("Multiple approaches are using the same simulation recording.")
    else:
        if videoSource != "live":
            raise RuntimeError(
                "LIVE startup requires EASYFLOW_VIDEO_SOURCE=live; local video files are disabled."
            )
        if databaseName != LIVE_DATABASE_NAME:
            raise RuntimeError(
                f"LIVE startup requires DB_NAME={LIVE_DATABASE_NAME}."
            )
        if not _required("DB_USER") or not os.environ.get("DB_PASSWORD", "").strip():
            raise RuntimeError("LIVE startup requires non-empty DB_USER and DB_PASSWORD.")

        missingCctv = [name for name in CCTV_ENVIRONMENT_NAMES if not os.environ.get(name)]
        if missingCctv:
            raise RuntimeError(
                "LIVE startup requires municipal CCTV credentials: " + ", ".join(missingCctv)
            )

        print("[LIVE]")
        print("Environment: LIVE")
        print(f"Database: {databaseName}")
        print("Video source: municipal RTSP gateway")
        print("Simulation video: DISABLED")

    return {
        "environment": environment,
        "videoSource": videoSource,
        "databaseName": databaseName,
        "localVideoPaths": localVideoPaths if environment == "local" else None,
    }
