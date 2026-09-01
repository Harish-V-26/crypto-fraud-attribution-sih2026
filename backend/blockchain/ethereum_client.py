"""
Ethereum data client.
Uses Etherscan's public API. Requires a free API key
(sign up at https://etherscan.io/apis — takes 2 minutes, generous free tier).

Set the key via environment variable ETHERSCAN_API_KEY.
If no key is set, or the live call fails, automatically falls back
to mock/simulated data so the demo never breaks.
"""
import os
import httpx
from .mock_data import get_mock_eth_address_txs

BASE_URL = "https://api.etherscan.io/api"
API_KEY = os.environ.get("ETHERSCAN_API_KEY", "")


async def get_address_transactions(address: str, limit: int = 25) -> dict:
    if not API_KEY:
        return {
            "address": address,
            "chain": "ethereum",
            "source": "mock",
            "fallback_reason": "No ETHERSCAN_API_KEY set in environment",
            "txs": get_mock_eth_address_txs(address),
        }

    try:
        params = {
            "module": "account",
            "action": "txlist",
            "address": address,
            "startblock": 0,
            "endblock": 99999999,
            "page": 1,
            "offset": limit,
            "sort": "desc",
            "apikey": API_KEY,
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("status") != "1":
            raise ValueError(data.get("message", "Etherscan returned no data"))

        txs = []
        for tx in data.get("result", []):
            txs.append({
                "txid": tx.get("hash"),
                "inputs": [{"address": tx.get("from"), "value_wei": int(tx.get("value", 0))}],
                "outputs": [{"address": tx.get("to"), "value_wei": int(tx.get("value", 0))}],
                "confirmed": True,
                "block_time": int(tx.get("timeStamp", 0)),
            })

        return {"address": address, "chain": "ethereum", "source": "live", "txs": txs}

    except Exception as e:
        return {
            "address": address,
            "chain": "ethereum",
            "source": "mock",
            "fallback_reason": str(e),
            "txs": get_mock_eth_address_txs(address),
        }
