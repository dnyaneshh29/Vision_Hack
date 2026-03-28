from datetime import datetime, timezone
import uuid
from typing import Any


def success_response(data: Any) -> dict:
    return {
        "data": data,
        "meta": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": str(uuid.uuid4()),
        },
    }
