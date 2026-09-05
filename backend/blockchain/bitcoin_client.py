"""
Bitcoin data client.
Uses Blockstream's public Esplora API and Mempool.space API — free, no API key required.
Docs: https://github.com/Blockstream/esplora/blob/master/API.md

Falls back to mock/simulated data automatically if the live API
is unreachable (offline demo mode / sandboxed environment).
"""
import httpx
from typing import Optional
from .mock_data import get_mock_btc_address_txs

ESPLORA_URL = "https://blockstream.info/api"
MEMPOOL_URL = "https://mempool.space/api"


async def get_address_transactions(address: str, limit: int = 25) -> dict:
    """
    Fetch recent transactions touching a BTC address.
    Returns a normalized dict: {address, source: 'live'|'mock', txs: [...]}
    """
    endpoints = [
        (f"{ESPLORA_URL}/address/{address}/txs", "blockstream"),
        (f"{MEMPOOL_URL}/address/{address}/txs", "mempool_space"),
    ]

    for url, provider in endpoints:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                raw_txs = resp.json()[:limit]

            txs = []
            for tx in raw_txs:
                outputs = [
                    {
                        "address": vout.get("scriptpubkey_address"),
                        "value_sats": vout.get("value", 0),
                    }
                    for vout in tx.get("vout", [])
                    if vout.get("scriptpubkey_address")
                ]
                inputs = [
                    {
                        "address": vin.get("prevout", {}).get("scriptpubkey_address"),
                        "value_sats": vin.get("prevout", {}).get("value", 0),
                    }
                    for vin in tx.get("vin", [])
                    if vin.get("prevout", {}).get("scriptpubkey_address")
                ]
                txs.append({
                    "txid": tx.get("txid"),
                    "inputs": inputs,
                    "outputs": outputs,
                    "fee": tx.get("fee"),
                    "confirmed": tx.get("status", {}).get("confirmed", False),
                    "block_time": tx.get("status", {}).get("block_time"),
                })

            return {"address": address, "chain": "bitcoin", "source": "live", "provider": provider, "txs": txs}

        except Exception:
            continue

    # Automatic fallback to simulation mode
    return {
        "address": address,
        "chain": "bitcoin",
        "source": "mock",
        "fallback_reason": "Live explorers unavailable or simulated case",
        "txs": get_mock_btc_address_txs(address),
    }
