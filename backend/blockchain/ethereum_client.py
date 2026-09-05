"""
Ethereum data client.
Uses multi-source live querying:
  1. Etherscan API (if ETHERSCAN_API_KEY is provided)
  2. Blockscout v2 public explorer API (free, open, no key required)
  3. Public Ethereum RPCs
  4. Resilient simulation fallback (demo never fails)
"""
import os
import httpx
from typing import Optional
from .mock_data import get_mock_eth_address_txs

ETHERSCAN_BASE_URL = "https://api.etherscan.io/api"
ETHERSCAN_API_KEY = os.environ.get("ETHERSCAN_API_KEY", "")
BLOCKSCOUT_BASE_URL = "https://eth.blockscout.com/api/v2"


async def get_address_transactions(address: str, limit: int = 25) -> dict:
    """
    Fetch recent transactions touching an Ethereum address.
    Returns: {address, chain: 'ethereum', source: 'live'|'mock', txs: [...]}
    """
    # 1. Try Etherscan if API key is set
    if ETHERSCAN_API_KEY:
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
                "apikey": ETHERSCAN_API_KEY,
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(ETHERSCAN_BASE_URL, params=params)
                resp.raise_for_status()
                data = resp.json()

            if data.get("status") == "1" and data.get("result"):
                txs = []
                for tx in data.get("result", []):
                    txs.append({
                        "txid": tx.get("hash"),
                        "inputs": [{"address": tx.get("from"), "value_wei": int(tx.get("value", 0))}],
                        "outputs": [{"address": tx.get("to"), "value_wei": int(tx.get("value", 0))}],
                        "confirmed": True,
                        "block_time": int(tx.get("timeStamp", 0)),
                    })
                return {"address": address, "chain": "ethereum", "source": "live", "provider": "etherscan", "txs": txs}
        except Exception:
            pass

    # 2. Try Blockscout Public API (No API key needed)
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{BLOCKSCOUT_BASE_URL}/addresses/{address}/transactions")
            if resp.status_code == 200:
                items = resp.json().get("items", [])
                if items:
                    txs = []
                    for tx in items[:limit]:
                        from_addr = tx.get("from", {}).get("hash") if isinstance(tx.get("from"), dict) else tx.get("from")
                        to_addr = tx.get("to", {}).get("hash") if isinstance(tx.get("to"), dict) else tx.get("to")
                        val_wei = int(tx.get("value", 0)) if tx.get("value") else 0
                        txs.append({
                            "txid": tx.get("hash"),
                            "inputs": [{"address": from_addr, "value_wei": val_wei}],
                            "outputs": [{"address": to_addr, "value_wei": val_wei}],
                            "confirmed": tx.get("status") == "ok",
                            "block_time": int(tx.get("timestamp", 0)) if str(tx.get("timestamp", "")).isdigit() else 0,
                        })
                    return {"address": address, "chain": "ethereum", "source": "live", "provider": "blockscout", "txs": txs}
    except Exception:
        pass

    # 3. Fallback to mock/simulated data
    return {
        "address": address,
        "chain": "ethereum",
        "source": "mock",
        "fallback_reason": "Live providers unavailable or demo address",
        "txs": get_mock_eth_address_txs(address),
    }
