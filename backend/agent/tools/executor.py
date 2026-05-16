from datetime import datetime, timezone
import uuid


def paper_trade(token_address: str, symbol: str,
                confidence: int, size: str,
                strategy: str) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "token_address": token_address,
        "symbol": symbol,
        "confidence": confidence,
        "size": size,
        "strategy": strategy,
        "type": "paper",
        "status": "open",
        "entry_time": datetime.now(timezone.utc).isoformat(),
        "pnl": 0,
        "exit_reason": None
    }
