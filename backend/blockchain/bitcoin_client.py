"""
Bitcoin data client.
Uses Blockstream's public Esplora API — free, no API key required.
Docs: https://github.com/Blockstream/esplora/blob/master/API.md

Falls back to mock/simulated data automatically if the live API
is unreachable (offline demo mode / sandboxed environment).
"""
import httpx
from typing import Optional
from .mock_data import get_mock_btc_address_txs

BASE_URL = "https://blockstream.info/api"


async def get_address_transactions(address: str, limit: int = 25) -> dict:
    """
    Fetch recent transactions touching a BTC address.
    Returns a normalized dict: {address, source: 'live'|'mock', txs: [...]}
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(f"{BASE_URL}/address/{address}/txs")
            resp.raise_for_status()
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

        return {"address": address, "chain": "bitcoin", "source": "live", "txs": txs}

    except Exception as e:
        # Automatic fallback to simulation mode
        return {
            "address": address,
            "chain": "bitcoin",
            "source": "mock",
            "fallback_reason": str(e),
            "txs": get_mock_btc_address_txs(address),
        }
