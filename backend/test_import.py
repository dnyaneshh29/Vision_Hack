import sys
import traceback

try:
    from app.main import app
    print("Successfully imported app.main!")
except Exception as e:
    with open("crash_log.txt", "w") as f:
        f.write(traceback.format_exc())
    print("Failed to import. Check crash_log.txt")
