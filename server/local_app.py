"""Local-only Easy-Flow launcher using the bundled MP4 test videos."""

# The PowerShell launcher supplies and validates all local-only environment variables
# before this module imports app.py.

from app import app, startBackend


if __name__ == "__main__":
    startBackend()
    app.run(debug=True, use_reloader=False)
