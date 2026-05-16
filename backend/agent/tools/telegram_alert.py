import httpx
import asyncio

TELEGRAM_BOT_TOKEN = "8433165509:AAFb-cY2T-U4l-23YEBMfOccUpC1fr13mZI"
TELEGRAM_CHAT_ID = "814347668"
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"


async def send_trade_alert(trade: dict, reasoning: str = "") -> bool:
    symbol = trade.get("symbol", "UNKNOWN")
    strategy = trade.get("strategy", "").replace("_", " ").upper()
    confidence = trade.get("confidence", 0)
    size = trade.get("size", "")
    entry_price = trade.get("entry_price", 0)
    pnl = trade.get("pnl_pct", 0)

    signal_emoji = "✅" if confidence >= 80 else "⚡"

    message = f"""⬡ *SPECTER SIGNAL*

{signal_emoji} *PAPER TRADE — {symbol}*
Strategy: {strategy}
Confidence: {confidence}%
Size: {size}
Entry: ${entry_price:.6f}
PnL: {pnl}%

_{reasoning[:200] if reasoning else 'Signal detected'}_

🤖 Powered by Birdeye Data × Claude AI
"""

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            return response.status_code == 200
    except Exception as e:
        print(f"[TELEGRAM] Alert failed: {e}")
        return False


async def send_signal_alert(symbol: str, signal_type: str, details: str) -> bool:
    if signal_type == "consensus":
        emoji = "🎯"
        title = "CONSENSUS SIGNAL"
    elif signal_type == "zombie":
        emoji = "🧟"
        title = "ZOMBIE REVIVAL"
    else:
        emoji = "⚡"
        title = "SIGNAL DETECTED"

    message = f"""⬡ *SPECTER ALERT*

{emoji} *{title} — {symbol}*

{details[:300]}

🤖 SpecterAI — Autonomous Solana Agent
"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            return response.status_code == 200
    except Exception as e:
        print(f"[TELEGRAM] Signal alert failed: {e}")
        return False
