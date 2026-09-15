"""Local-only Easy-Flow launcher using the bundled MP4 test videos."""

import os

# Set these before importing app.py, which imports the stream and database modules.
os.environ["EASYFLOW_VIDEO_SOURCE"] = "local"
os.environ["DB_NAME"] = os.environ.get("EASYFLOW_LOCAL_DB_NAME", "easyflow_local")
os.environ.setdefault("ENABLE_SUMO", "false")

from app import app, startBackend


if __name__ == "__main__":
    startBackend()
    app.run(debug=True, use_reloader=False)
