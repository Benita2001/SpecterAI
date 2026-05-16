import anthropic
import os
import json
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def analyze_signal(token: dict, profile: dict, strategy: str) -> dict:
    bundler_count = 0
    smart_count = 0
    sniper_count = 0

    if profile and profile.get("data"):
        tags = profile["data"].get("tags", [])
        for tag in tags:
            if tag.get("tag") == "bundler":
                bundler_count = tag.get("holder_count", 0)
            elif tag.get("tag") == "smart_trader":
                smart_count = tag.get("holder_count", 0)
            elif tag.get("tag") == "sniper":
                sniper_count = tag.get("holder_count", 0)

    prompt = f"""You are SpecterAI, an autonomous Solana memecoin trading agent.
Analyze this signal and respond in JSON only. No markdown. No explanation outside JSON.

Strategy: {strategy}
Token: {token.get('symbol', 'UNKNOWN')}
Price: {token.get('price', 'unknown')}
Volume 24h USD: {token.get('volume24hUSD', 'unknown')}

Holder Profile:
- Smart Traders: {smart_count}
- Bundlers: {bundler_count}
- Snipers: {sniper_count}

Rules:
- Bundlers > 100 = PASS always
- Smart traders > 20 + bundlers < 50 = strong BUY
- Smart traders > 10 + bundlers < 100 = BUY
- Otherwise = PASS

Respond ONLY with this JSON:
{{"confidence": 75, "action": "BUY", "reasoning": "one sentence max", "risk": "low|medium|high"}}"""

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(text)
    except:
        return {"confidence": 0, "action": "PASS",
                "reasoning": "parse error", "risk": "unknown"}


def chat_with_specter(message: str, context: dict) -> str:
    prompt = f"""You are SpecterAI, an autonomous Solana trading agent.
You are currently running with these stats:
- Total trades: {context.get('total_trades', 0)}
- Win rate: {context.get('win_rate', 0)}%
- Smart wallets tracked: {context.get('smart_wallets', 0)}
- Active strategies: {context.get('strategies', [])}

The user says: "{message}"

Respond naturally as SpecterAI. Be concise. Max 3 sentences.
If they ask you to change strategy parameters, acknowledge and confirm.
If they ask about a trade, explain your reasoning.
Never break character."""

    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()
