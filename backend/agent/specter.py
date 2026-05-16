import asyncio
from datetime import datetime, timezone
from agent.tools.birdeye import (
    get_holder_profile, get_trending_tokens,
    get_top_gainers, get_token_transactions,
    get_new_listings, get_token_overview,
    get_price_history, get_market_data
)
from agent.tools.wallet_db import (
    add_smart_wallet, check_wallet_consensus,
    get_smart_wallets
)
from agent.tools.claude_brain import analyze_signal, chat_with_specter
from agent.tools.executor import paper_trade
from agent.tools.telegram_alert import send_trade_alert, send_signal_alert

# ── Global state ──────────────────────────────
activity_feed = []
paper_trades = []
custom_strategies = []
cycle_count = 0
agent_running = False
PROCESSED_TOKENS: set = set()

# ── Strategy toggles ──────────────────────────
strategies = {
    "wallet_tracker": {"active": True, "trades": 0, "wins": 0},
    "zombie_hunter":  {"active": True, "trades": 0, "wins": 0},
}

# ── Strategy parameters (editable via API) ────
strategy_params = {
    "wallet_tracker": {
        "min_mcap_to_track": 100000,
        "min_consensus_30min": 3,
        "min_consensus_total": 3,
        "exit_pct_1": 150,
        "exit_sell_1": 50,
        "exit_pct_2": 500,
        "exit_sell_2": 50,
        "exit_pct_3": 1000,
        "exit_sell_3": 100,
        "description": "Tracks wallets that bought early into tokens that hit $800k+ mcap and are in profit. Fires when 6+ of these proven wallets buy the same token within 30 minutes."
    },
    "zombie_hunter": {
        "true_zombie_daily_vol": 50000,
        "sleeping_daily_vol": 100000,
        "dormancy_days": 7,
        "min_spike_ratio": 3,
        "exit_pct_1": 300,
        "exit_sell_1": 50,
        "exit_pct_2": 1000,
        "exit_sell_2": 100,
        "description": "Finds Solana tokens with near-zero volume for 7 days showing a 3x+ volume spike with smart money entering. Catches accumulation before price wakes up."
    }
}

# ── Logging ───────────────────────────────────
def log_activity(message: str, type: str = "info"):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": message,
        "type": type
    }
    activity_feed.insert(0, entry)
    if len(activity_feed) > 500:
        activity_feed.pop()
    print(f"[SPECTER] {message}")

# ── Stats ─────────────────────────────────────
def get_stats() -> dict:
    closed = [t for t in paper_trades if t.get("status") == "closed"]
    wins   = [t for t in closed if t.get("pnl_pct", 0) > 0]
    win_rate = (len(wins) / len(closed) * 100) if closed else 0
    return {
        "total_trades": len(paper_trades),
        "open_trades":  len([t for t in paper_trades if t.get("status") == "open"]),
        "closed_trades": len(closed),
        "win_rate": round(win_rate, 1),
        "smart_wallets_tracked": len(get_smart_wallets()),
        "cycle_count": cycle_count,
        "strategies": strategies,
        "custom_strategies": custom_strategies,
    }

# ── Bot detection helper ──────────────────────
def is_bot_wallet(tx_list: list, wallet: str) -> bool:
    wallet_txs = [tx for tx in tx_list
                  if tx.get("owner") == wallet or tx.get("source") == wallet]
    if len(wallet_txs) < 2:
        return False
    amounts = [tx.get("volume", 0) for tx in wallet_txs]
    if len(set(amounts)) == 1 and len(amounts) > 1:
        return True
    return False

# ── Price tracking helper ─────────────────────
async def get_current_price(token_address: str) -> float:
    try:
        overview = await get_token_overview(token_address)
        return float(overview.get("data", {}).get("price", 0) or 0)
    except:
        return 0.0

# ── Exit checker ─────────────────────────────
async def check_exits():
    open_trades = [t for t in paper_trades if t.get("status") == "open"]
    if not open_trades:
        return
    for trade in open_trades:
        address  = trade.get("token_address")
        strategy = trade.get("strategy")
        if not address:
            continue
        await asyncio.sleep(0.3)
        current_price = await get_current_price(address)
        if current_price <= 0 or trade.get("entry_price", 0) <= 0:
            continue
        pnl_pct = ((current_price - trade["entry_price"]) / trade["entry_price"]) * 100
        trade["current_price"] = current_price
        trade["pnl_pct"] = round(pnl_pct, 2)
        params = strategy_params.get(strategy, {})
        symbol = trade.get("symbol", "UNKNOWN")

        if strategy == "wallet_tracker":
            if pnl_pct >= params.get("exit_pct_3", 1000):
                trade["status"] = "closed"
                trade["exit_reason"] = f"+{pnl_pct:.0f}% — full exit at 1000% target"
                log_activity(f"EXIT FULL: {symbol} +{pnl_pct:.0f}% — 1000% target hit 🎯", "trade")
            elif pnl_pct >= params.get("exit_pct_2", 500) and not trade.get("exit_2_done"):
                trade["exit_2_done"] = True
                log_activity(f"EXIT 50%: {symbol} +{pnl_pct:.0f}% — 500% target hit, selling half remaining 📈", "trade")
            elif pnl_pct >= params.get("exit_pct_1", 150) and not trade.get("exit_1_done"):
                trade["exit_1_done"] = True
                log_activity(f"EXIT 50%: {symbol} +{pnl_pct:.0f}% — 150% target hit, taking first profit 💰", "trade")

        elif strategy == "zombie_hunter":
            if pnl_pct >= params.get("exit_pct_2", 1000):
                trade["status"] = "closed"
                trade["exit_reason"] = f"+{pnl_pct:.0f}% — full exit at 1000% target"
                log_activity(f"ZOMBIE EXIT FULL: {symbol} +{pnl_pct:.0f}% 🧟🎯", "trade")
            elif pnl_pct >= params.get("exit_pct_1", 300) and not trade.get("exit_1_done"):
                trade["exit_1_done"] = True
                log_activity(f"ZOMBIE EXIT 50%: {symbol} +{pnl_pct:.0f}% — 300% hit, selling half 🧟💰", "trade")
            elif pnl_pct <= -40:
                trade["status"] = "closed"
                trade["exit_reason"] = f"{pnl_pct:.0f}% — stop loss triggered"
                log_activity(f"STOP LOSS: {symbol} {pnl_pct:.0f}% 🛑", "trade")

# ── STRATEGY 1: Wallet Tracker ────────────────
async def run_wallet_tracker():
    if not strategies["wallet_tracker"]["active"]:
        return
    params = strategy_params["wallet_tracker"]
    log_activity("Wallet Tracker: scanning for smart wallet consensus...", "info")
    try:
        # Get trending tokens
        trending = await get_trending_tokens(limit=20)
        trend_data = trending.get("data", {})
        tokens = (
            trend_data.get("tokens", [])
            if isinstance(trend_data, dict)
            else (trend_data if isinstance(trend_data, list) else [])
        )

        # Extract wallets from ALL trending tokens
        # that are pumping (up 10%+)
        for token in tokens[:15]:
            address = token.get("address")
            if not address:
                continue
            if address in PROCESSED_TOKENS:
                continue
            PROCESSED_TOKENS.add(address)

            price_change = float(
                token.get("price24hChangePercent", 0) or
                token.get("v24hChangePercent", 0) or 0
            )

            # Extract from pumping tokens
            if price_change > 10:
                await asyncio.sleep(0.3)
                txs = await get_token_transactions(address, limit=20)
                tx_data = txs.get("data", {})
                tx_list = (
                    tx_data.get("items", [])
                    if isinstance(tx_data, dict) else []
                )
                wallets_added = 0
                for tx in tx_list[:15]:
                    side = tx.get("side", "")
                    if side != "buy":
                        continue
                    wallet = tx.get("owner")
                    if not wallet:
                        continue
                    if len(wallet) < 32:
                        continue
                    if is_bot_wallet(tx_list, wallet):
                        continue
                    add_smart_wallet(wallet, address, float(token.get("price", 0) or 0))
                    wallets_added += 1

                if wallets_added > 0:
                    log_activity(
                        f"Wallet DB: +{wallets_added} wallets from {token.get('symbol')} (+{price_change:.0f}%)",
                        "info"
                    )
                await asyncio.sleep(0.3)

        # Log total wallet count
        total_wallets = len(get_smart_wallets())
        log_activity(
            f"Wallet DB: {total_wallets} proven wallets tracked",
            "info"
        )

        # Now check ALL trending tokens for consensus
        for token in tokens:
            address = token.get("address")
            if not address:
                continue

            consensus = check_wallet_consensus(address)

            if consensus["consensus"]:
                symbol = token.get("symbol", address[:8])
                reason = consensus["reason"]
                count = consensus["recent_count"] if reason == "30min" else consensus["total_count"]

                log_activity(
                    f"CONSENSUS SIGNAL: {symbol} — {count} proven wallets ({reason} window) all buying same token!",
                    "signal"
                )
                asyncio.create_task(send_signal_alert(
                    token.get("symbol", ""),
                    "consensus",
                    f"{consensus['recent_count']} proven wallets entered simultaneously. Analyzing..."
                ))
                await asyncio.sleep(0.3)
                profile = await get_holder_profile(address)
                await evaluate_and_trade(token, profile, "wallet_tracker")

            await asyncio.sleep(0.1)

    except Exception as e:
        log_activity(f"Wallet Tracker error: {str(e)}", "warn")

# ── STRATEGY 2: Zombie Hunter ─────────────────
async def run_zombie_hunter():
    if not strategies["zombie_hunter"]["active"]:
        return
    params = strategy_params["zombie_hunter"]
    log_activity("Zombie Hunter: scanning for revival signals...", "info")
    try:
        trending = await get_trending_tokens(limit=20)
        trend_data = trending.get("data", {})
        tokens = (
            trend_data.get("tokens", [])
            if isinstance(trend_data, dict)
            else (trend_data if isinstance(trend_data, list) else [])
        )

        found = 0
        for token in tokens:
            address = token.get("address")
            if not address:
                continue

            price_change = float(
                token.get("price24hChangePercent", 0) or
                token.get("v24hChangePercent", 0) or 0
            )
            volume_24h = float(
                token.get("volume24hUSD", 0) or
                token.get("v24hUSD", 0) or 0
            )
            liquidity = float(
                token.get("liquidity", 0) or 0
            )

            # Zombie revival = massive price spike
            # with real volume but not a brand new token
            if price_change < 30:
                continue
            if volume_24h < 10000:
                continue
            if liquidity < 5000:
                continue

            await asyncio.sleep(0.3)

            # Check holder profile
            profile = await get_holder_profile(address)
            smart_count = 0
            bundler_count = 0
            total_holders = 0

            if profile and profile.get("data"):
                tags = profile["data"].get("tags", [])
                for tag in tags:
                    if tag.get("tag") == "smart_trader":
                        smart_count = tag.get("holder_count", 0)
                    elif tag.get("tag") == "bundler":
                        bundler_count = tag.get("holder_count", 0)
                holder_summary = profile["data"].get("holder_summary", {})
                total_holders = holder_summary.get("total_holder", 0)

            # Skip if too many bundlers
            if bundler_count > 50:
                log_activity(
                    f"Zombie Skip: {token.get('symbol')} +{price_change:.0f}% but {bundler_count} bundlers",
                    "info"
                )
                await asyncio.sleep(0.3)
                continue

            # Need some smart traders
            if smart_count < 1:
                await asyncio.sleep(0.3)
                continue

            found += 1
            log_activity(
                f"ZOMBIE REVIVAL: {token.get('symbol')} | +{price_change:.0f}% | Vol ${volume_24h/1000:.0f}K | Smart:{smart_count} Bundlers:{bundler_count}",
                "signal"
            )
            asyncio.create_task(send_signal_alert(
                token.get("symbol", ""),
                "zombie",
                f"+{price_change:.0f}% revival | Vol ${volume_24h/1000:.0f}K | Smart:{smart_count} Bundlers:{bundler_count}"
            ))

            await evaluate_and_trade(token, profile, "zombie_hunter")
            await asyncio.sleep(0.3)

        log_activity(
            f"Zombie Hunter: scanned {len(tokens)} tokens, found {found} revival signals",
            "info"
        )

    except Exception as e:
        log_activity(f"Zombie Hunter error: {str(e)}", "warn")

# ── Core evaluator ────────────────────────────
async def evaluate_and_trade(token: dict, profile: dict, strategy: str):
    address = token.get("address", "")
    symbol  = token.get("symbol", address[:8] if address else "UNKNOWN")
    if not address:
        return

    bundler_count = 0
    smart_count   = 0
    if profile and profile.get("data"):
        tags = profile["data"].get("tags", [])
        for tag in tags:
            if tag.get("tag") == "bundler":
                bundler_count = tag.get("holder_count", 0)
            elif tag.get("tag") == "smart_trader":
                smart_count = tag.get("holder_count", 0)

    log_activity(
        f"Evaluating {symbol} — Smart:{smart_count} Bundlers:{bundler_count}",
        "info"
    )

    if bundler_count > 200:
        log_activity(f"SKIP: {symbol} — bundler count too high ({bundler_count})", "info")
        return

    decision = analyze_signal(token, profile, strategy)

    if decision.get("action") == "BUY" and decision.get("confidence", 0) >= 65:
        confidence   = decision["confidence"]
        entry_price  = float(token.get("price", 0) or 0)

        if confidence >= 85:
            size = "2% portfolio"
        elif confidence >= 70:
            size = "1% portfolio"
        else:
            size = "0.5% portfolio"

        trade = paper_trade(address, symbol, confidence, size, strategy)
        trade["entry_price"]   = entry_price
        trade["current_price"] = entry_price
        trade["pnl_pct"]       = 0.0
        trade["exit_1_done"]   = False
        # Skip if already have open trade on this token
        if any(t.get("token_address") == address and t.get("status") == "open" for t in paper_trades):
            log_activity(f"SKIP DUPLICATE: {symbol} — already have open position", "info")
            return
        trade["exit_2_done"]   = False

        paper_trades.append(trade)
        asyncio.create_task(send_trade_alert(
            trade,
            decision.get("reasoning", "")
        ))
        strategies[strategy]["trades"] += 1

        log_activity(
            f"PAPER TRADE ✓ {symbol} | {strategy} | {confidence}% | {size} | entry ${entry_price:.6f} | {decision.get('reasoning', '')}",
            "trade"
        )
    else:
        log_activity(
            f"PASS: {symbol} — {decision.get('reasoning', 'low confidence')} ({decision.get('confidence', 0)}% confidence)",
            "info"
        )

# ── Self-improvement ──────────────────────────
async def self_improvement_review():
    closed = [t for t in paper_trades if t.get("status") == "closed"]
    if len(closed) > 0 and len(closed) % 10 == 0:
        wins     = [t for t in closed if t.get("pnl_pct", 0) > 0]
        win_rate = len(wins) / len(closed) * 100
        insight  = f"Specter learned: {win_rate:.0f}% win rate over {len(closed)} trades."
        log_activity(insight, "learn")

# ── Main loop ─────────────────────────────────
async def run_agent():
    global agent_running, cycle_count
    agent_running = True
    log_activity("SpecterAI awakening... autonomous trading agent online.", "info")
    log_activity("Strategies loaded: Wallet Tracker | Zombie Hunter", "info")

    while True:
        cycle_count += 1
        log_activity(f"━━━ Agent Cycle #{cycle_count} ━━━", "info")

        await run_wallet_tracker()
        await asyncio.sleep(1)
        await run_zombie_hunter()
        await asyncio.sleep(1)
        await check_exits()
        await self_improvement_review()

        log_activity(f"Cycle #{cycle_count} complete. Next scan in 60 seconds...", "info")
        await asyncio.sleep(300)
