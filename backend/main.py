from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import asyncio
import json
from agent.specter import (
    run_agent, activity_feed, paper_trades,
    strategies, custom_strategies, get_stats,
    log_activity, strategy_params
)
from agent.tools.claude_brain import chat_with_specter
from agent.tools.wallet_db import get_smart_wallets

app = FastAPI(title="SpecterAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_agent())

@app.get("/health")
async def health():
    return {"status": "ok", "agent": "SpecterAI"}

@app.get("/feed")
async def get_feed():
    return {"feed": activity_feed[:50]}

@app.get("/trades")
async def get_trades():
    return {"trades": paper_trades}

@app.get("/stats")
async def get_stats_endpoint():
    return get_stats()

@app.get("/wallets")
async def get_wallets():
    wallets = get_smart_wallets()
    return {"total": len(wallets), "sample": list(wallets.keys())[:5]}

@app.get("/stream")
async def stream_feed():
    async def event_generator():
        last_index = 0
        while True:
            current = activity_feed[:50]
            if len(current) > last_index:
                new_items = current[:len(current) - last_index]
                for item in reversed(new_items):
                    yield f"data: {json.dumps(item)}\n\n"
                last_index = len(current)
            await asyncio.sleep(1)
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

class ChatMessage(BaseModel):
    message: str

@app.post("/chat")
async def chat(body: ChatMessage):
    stats = get_stats()
    response = chat_with_specter(
        body.message,
        {
            "total_trades": stats["total_trades"],
            "win_rate": stats["win_rate"],
            "smart_wallets": stats["smart_wallets_tracked"],
            "strategies": list(strategies.keys()),
        }
    )
    log_activity(f"User: {body.message}", "info")
    log_activity(f"Specter: {response}", "info")
    return {"response": response}

class StrategyToggle(BaseModel):
    strategy: str
    active: bool

@app.post("/strategy/toggle")
async def toggle_strategy(body: StrategyToggle):
    if body.strategy in strategies:
        strategies[body.strategy]["active"] = body.active
        status = "activated" if body.active else "paused"
        log_activity(f"Strategy {body.strategy} {status}", "info")
        return {"success": True}
    raise HTTPException(status_code=404, detail="Strategy not found")

@app.get("/strategy/params")
async def get_strategy_params():
    return strategy_params

class ParamUpdate(BaseModel):
    strategy: str
    param: str
    value: float

@app.post("/strategy/params/update")
async def update_param(body: ParamUpdate):
    if body.strategy not in strategy_params:
        raise HTTPException(status_code=404, detail="Strategy not found")
    if body.param not in strategy_params[body.strategy]:
        raise HTTPException(status_code=404, detail="Param not found")
    strategy_params[body.strategy][body.param] = body.value
    log_activity(
        f"Strategy {body.strategy} updated: {body.param} = {body.value}",
        "info"
    )
    return {"success": True}

class CustomStrategy(BaseModel):
    description: str

@app.post("/strategy/create")
async def create_strategy(body: CustomStrategy):
    response = chat_with_specter(
        f"Create a new trading strategy: {body.description}",
        {"total_trades": 0, "win_rate": 0, "smart_wallets": 0, "strategies": []}
    )
    strategy_name = body.description[:30].lower().replace(" ", "_")
    custom_strategies.append({
        "name": strategy_name,
        "description": body.description,
        "active": True,
        "claude_response": response
    })
    log_activity(f"New strategy created: {body.description[:50]}", "info")
    return {"success": True, "name": strategy_name, "response": response}
