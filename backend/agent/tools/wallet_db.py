from datetime import datetime, timezone
from typing import Any
from collections import defaultdict

# wallet_address -> {tokens: [addresses], first_seen, wins}
SMART_WALLETS: dict[str, dict[str, Any]] = {}

# token_address -> set of wallet addresses that bought it
TOKEN_BUYERS: dict[str, set] = defaultdict(set)

# token_address -> list of {wallet, timestamp} for 30min window
RECENT_BUYS: dict[str, list] = defaultdict(list)


def add_smart_wallet(wallet: str, token: str, entry_price: float) -> None:
    import time
    now = time.time()

    # Add to smart wallets
    if wallet not in SMART_WALLETS:
        SMART_WALLETS[wallet] = {
            "wins": 0,
            "tokens": [],
            "first_seen": datetime.now(timezone.utc).isoformat(),
        }

    record = SMART_WALLETS[wallet]
    if token not in [t["token"] for t in record["tokens"]]:
        record["tokens"].append({
            "token": token,
            "entry_price": entry_price,
            "tracked_at": datetime.now(timezone.utc).isoformat(),
        })

    # Track this wallet bought this token
    TOKEN_BUYERS[token].add(wallet)

    # Track recent buy for 30min consensus
    RECENT_BUYS[token].append({
        "wallet": wallet,
        "timestamp": now
    })


def get_smart_wallets() -> dict:
    return SMART_WALLETS


def check_wallet_consensus(token_address: str) -> dict:
    import time
    now = time.time()
    window = 30 * 60  # 30 minutes

    # Total wallets that ever bought this token
    total_wallets = len(TOKEN_BUYERS.get(token_address, set()))

    # Recent wallets in last 30 minutes
    recent = RECENT_BUYS.get(token_address, [])
    recent_wallets = [
        b for b in recent
        if now - b["timestamp"] < window
    ]
    recent_count = len(recent_wallets)

    # Consensus if 6+ in 30min OR 10+ total
    consensus = recent_count >= 6 or total_wallets >= 10

    return {
        "consensus": consensus,
        "recent_count": recent_count,
        "total_count": total_wallets,
        "reason": "30min" if recent_count >= 6 else "total" if total_wallets >= 10 else "none"
    }


def get_token_buyers(token_address: str) -> dict:
    return {
        "total": len(TOKEN_BUYERS.get(token_address, set())),
        "recent_buys": len(RECENT_BUYS.get(token_address, []))
    }
