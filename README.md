# SpecterAI — Autonomous Solana Trading Agent

> **Create your personal trading agent with Birdeye data**

[![GitHub](https://img.shields.io/badge/GitHub-SpecterAI-181717?style=for-the-badge&logo=github)](https://github.com/Benita2001/SpecterAI)
[![Birdeye](https://img.shields.io/badge/Powered_by-Birdeye_Data_API-10b981?style=for-the-badge)](https://bds.birdeye.so)
[![Claude AI](https://img.shields.io/badge/AI_by-Claude_AI-a78bfa?style=for-the-badge)](https://anthropic.com)
[![Telegram](https://img.shields.io/badge/Live_Alerts-Telegram-26A5E4?style=for-the-badge&logo=telegram)](https://t.me/OnchainEdgeBot)

---

## The Future Is Already Here

Studies estimate that **70–90% of all trading will be replaced by autonomous AI agents** within this decade. Institutional desks already run algo strategies 24/7. Hedge funds already use AI to detect patterns humans miss.

Memecoins will not be left out.

The question is no longer *whether* agents will trade memecoins — the question is **whose agent will find the signal first.**

SpecterAI is your answer to that question. It shows you that you can create your own personal agent to trade memecoins for you.

---

## What Is SpecterAI?

SpecterAI is a full agentic trading interface built on Birdeye's onchain APIs and Claude AI.

It scans Solana every few minutes, extracts intelligence from on-chain holder data using Birdeye's real-time APIs, reasons about every signal using Claude AI, and sends you a Telegram alert the moment it executes a trade.

But here's what makes it different from every other bot:

**You are not locked into someone else's strategy.**

You can describe your own trading logic in plain English — and SpecterAI will implement it, run it, and alert you when it finds a trading opportunity similar to your described strategy. All powered by Birdeye data.

---

## Two Default Strategies

### Strategy 1 — Wallet Tracker

**The idea is simple:**

Some wallets consistently find winners early. They know something — or they see something — that most people miss.

SpecterAI finds those wallets automatically. It extracts early buyers from tokens that hit $100K+ mcap and are in profit. It excludes bots. It builds a database of proven smart wallets.

Then it watches. When **6 or more of those wallets buy the same new token within 30 minutes** — that is the signal.

```
Scan trending tokens on Birdeye
  → Extract early buyers who are in profit
  → Exclude bots (identical amounts, new wallets)
  → Build smart wallet database
  → Monitor for consensus (6+ wallets, 30min window)
  → Claude AI checks holder profile
  → If clean: fire paper trade + Telegram alert
```

**Exit plan (staged):**
- +150% → take 50% off the table
- +500% → take another 50%
- +1000% → exit full position
- Smart wallets leaving → exit immediately regardless of price

---

### Strategy 2 — Zombie Hunter

**Dead tokens come back. The edge is catching them first.**

Most tokens launch, pump, then go silent. Volume drops to zero. Nobody talks about them. But sometimes tokens wake up and start to gain volume — sometimes weeks later, sometimes months later. When they do, the move is fast.

SpecterAI monitors for exactly this. It looks for tokens showing a 30%+ price surge with clean holder profiles — smart money entering, bundlers absent.

```
Scan trending tokens
  → Identify 30%+ price surge
  → Pull holder profile from Birdeye
  → Skip if bundlers > 50 (manipulation risk)
  → Claude AI evaluates conviction
  → If clean: fire paper trade + Telegram alert
```

**Exit plan:**
- +300% → sell 50%
- +1000% → exit full position
- -40% → stop loss, protect capital

---

## Create Your Own Strategy

This is the feature that sets SpecterAI apart.

Click **+ Create Strategy**. Describe what you want in plain English:

> *"Alert me when any token under $500K mcap has more than 20 smart traders buying in the last hour with less than 10 bundlers"*

Claude understands. It creates the strategy. It starts running. You get alerted when it fires.

Powered by Birdeye data. Running 24/7 without you.

---

## The Live Dashboard

Everything the agent does is visible in real time.

**Live Activity Feed** — watch every decision as it happens. Signals in yellow. Trades in green. Skips explained. Nothing hidden.

**Per-Strategy Trade Log** — click any strategy to see every trade it has taken. Entry price. Current price. PnL updating live.

**Editable Parameters** — every threshold is configurable from the UI. Change the consensus requirement. Adjust exit targets. The agent updates immediately, no code required.

**Chat With Specter** — ask the agent anything. *"Why did you buy ZOOMER?"* *"What are you watching right now?"* *"Be more conservative."* Specter responds with full context.

**Paper Balance** — start with 10 SOL paper balance. Deposit more. Watch it grow (or learn from when it doesn't).

---

## Telegram Alerts

When SpecterAI finds a signal, it comes to you:

```
⬡ SPECTER SIGNAL

✅ PAPER TRADE — ZOOMER
Strategy: ZOMBIE HUNTER
Confidence: 82%
Size: 1% portfolio
Entry: $0.001227

"118 smart traders with 0 bundlers meets 
strong BUY criteria"

🤖 Powered by Birdeye Data × Claude AI
```

You are already on Telegram all day. SpecterAI meets you there.

---

## Birdeye Data — The Intelligence Layer

SpecterAI chains 8 Birdeye endpoints to build its signals:

| Endpoint | What It Does |
|----------|-------------|
| `GET /defi/token_trending` | Discovers what Solana is trading right now |
| `GET /token/v1/holder-profile` ⭐ | Breaks down holders: smart traders, snipers, bundlers, insiders |
| `GET /defi/txs/token` | Extracts which wallets bought early |
| `GET /defi/v3/token/holder` | Top 10 holders + concentration risk |
| `GET /defi/token_overview` | Token fundamentals: price, holders, liquidity |
| `GET /defi/v3/token/market-data` | Market cap, FDV, supply |
| `GET /defi/history_price` | Price history for trend analysis |
| `GET /defi/v2/tokens/new_listing` | New launches for early entry |

⭐ The **Token Holder Profile API** — launched April 2026 — is the core of SpecterAI's intelligence. It tells us not just *how many* people hold a token, but *who* they are and *what they're doing*. Smart traders accumulating with positive PnL is a very different signal from snipers selling into bundler supply. SpecterAI reads that difference. Most tools don't.

---

## Claude AI — The Brain

Birdeye gives SpecterAI the data. Claude gives it judgment.

Every potential trade is evaluated by Claude with the full holder context. Claude doesn't just label it — it reasons about it:

> *"339 smart traders with 0 bundlers and strong buy pressure suggests institutional accumulation. The absence of bundlers is particularly notable — this looks organic."*

That reasoning appears in:
- The live activity feed
- The Telegram alert
- The trade log

You always know *why* the agent made a decision. Not just what it did.

---

## Self-Improvement

SpecterAI learns from its own trades.

After every 10 closed positions, it reviews its performance, identifies patterns in what worked and what didn't, and logs what it learned:

```
Specter learned: 68% win rate over 10 trades.
High bundler tokens caused 3 losses.
Raising bundler threshold from 50 to 30.
```

This is what makes it an agent — not just a bot.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python FastAPI — runs agent loop continuously |
| Agent Brain | Anthropic Claude AI (claude-haiku-4-5) |
| Onchain Data | Birdeye REST APIs (8 endpoints) |
| Alerts | Telegram Bot API |

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Birdeye API key → [bds.birdeye.so](https://bds.birdeye.so)
- Anthropic API key → [console.anthropic.com](https://console.anthropic.com)
- Telegram bot → [@BotFather](https://t.me/BotFather)

### Backend

```bash
cd specter-ai/backend
pip install -r requirements.txt
```

Create `backend/.env`:
```env
BIRDEYE_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

```bash
python3 -m uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd specter-ai/frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

```bash
npm run dev
```

---

## Project Structure

```
specter-ai/
├── backend/
│   ├── main.py                    # FastAPI + all API endpoints
│   └── agent/
│       ├── specter.py             # Agent loop + both strategies
│       └── tools/
│           ├── birdeye.py         # All Birdeye API calls
│           ├── claude_brain.py    # Claude reasoning engine
│           ├── executor.py        # Paper trade execution
│           ├── wallet_db.py       # Smart wallet database
│           └── telegram_alert.py  # Telegram notifications
└── frontend/
    └── app/
        └── page.tsx               # Full trading dashboard
```

---

## The Bigger Picture

This is not just a hackathon project.

AI agents are going to trade every market — including memecoins. The infrastructure for this already exists. Birdeye provides the data. Claude provides the reasoning. The only missing piece is humans being able to find good data sources to create an agent from and building one according to their own trading style.

That is what I am trying to prove with SpecterAI.

---

## Disclaimer

SpecterAI operates in paper trading mode. All trades are simulated. This is a demonstration of autonomous trading intelligence, not financial advice.

---

## Builder

Built by **Benita — @0xbeni** for the Birdeye BIP Hackathon Sprint 4, May 2026.

Pharmacist. AI builder. Memecoin trader. Building the tools I wish I had.

[![Twitter](https://img.shields.io/badge/Twitter-@0xbeni-1DA1F2?style=flat-square&logo=twitter)](https://x.com/0xbeni)
[![GitHub](https://img.shields.io/badge/GitHub-Benita2001-181717?style=flat-square&logo=github)](https://github.com/Benita2001)

---

*SpecterAI — The market never sleeps. Neither does Specter.*
