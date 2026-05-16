import asyncio
import logging
import os
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

BIRDEYE_BASE_URL = "https://public-api.birdeye.so"
API_KEY = os.getenv("BIRDEYE_API_KEY", "")
HEADERS = {
    "X-API-KEY": API_KEY,
    "x-chain": "solana",
    "accept": "application/json",
}


async def _request(path: str, params: dict[str, Any]) -> Any:
    await asyncio.sleep(0.3)

    async with httpx.AsyncClient(base_url=BIRDEYE_BASE_URL, timeout=20.0) as client:
        for attempt in range(2):
            try:
                response = await client.get(path, params=params, headers=HEADERS)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 429 and attempt == 0:
                    await asyncio.sleep(1.0)
                    continue

                return {
                    "error": "birdeye request failed",
                    "status_code": exc.response.status_code,
                    "details": exc.response.text,
                    "path": path,
                    "params": params,
                }
            except httpx.RequestError as exc:
                return {
                    "error": "birdeye request failed",
                    "details": str(exc),
                    "path": path,
                    "params": params,
                }


async def get_holder_profile(token_address: str) -> Any:
    return await _request(
        "/token/v1/holder-profile",
        {"token_address": token_address},
    )


async def get_top_holders(token_address: str, limit: int = 10) -> Any:
    return await _request(
        "/defi/v3/token/holder",
        {"address": token_address, "limit": limit},
    )


async def get_trending_tokens(limit: int = 8) -> Any:
    return await _request(
        "/defi/token_trending",
        {"sort_by": "rank", "sort_type": "asc", "offset": 0, "limit": limit},
    )


async def get_token_overview(token_address: str) -> Any:
    return await _request(
        "/defi/token_overview",
        {"address": token_address},
    )


async def get_price_history(token_address: str, timeframe: str = "15m") -> Any:
    return await _request(
        "/defi/history_price",
        {"address": token_address, "address_type": "token", "type": timeframe},
    )


async def get_market_data(token_address: str) -> Any:
    return await _request(
        "/defi/v3/token/market-data",
        {"address": token_address},
    )


async def get_top_gainers(limit: int = 10) -> Any:
    return await _request(
        "/defi/token_trending",
        {"sort_by": "rank", "sort_type": "asc", "offset": 0, "limit": limit},
    )


async def get_token_transactions(token_address: str, limit: int = 50) -> Any:
    return await _request(
        "/defi/txs/token",
        {"address": token_address, "limit": limit},
    )


async def get_new_listings(limit: int = 10) -> Any:
    try:
        return await _request(
            "/defi/v2/tokens/new_listing",
            {"limit": limit},
        )
    except httpx.HTTPStatusError as exc:
        body = exc.response.text
        logger.exception("Birdeye new listings endpoint failed: %s %s", exc.response.status_code, body)
        return {
            "error": "endpoint unavailable",
            "status_code": exc.response.status_code,
            "details": body,
            "data": [],
        }
    except Exception as exc:
        logger.exception("Birdeye new listings endpoint raised an unexpected error")
        return {
            "error": "endpoint unavailable",
            "details": str(exc),
            "data": [],
        }
