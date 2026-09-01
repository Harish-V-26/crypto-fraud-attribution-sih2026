"""
Deterministic synthetic transaction generator.

Used automatically whenever a live blockchain API is unreachable or
no API key is configured, so the platform is always demoable offline.

Design note: each call only needs to return the NEXT hop for the given
address (the tracer calls this once per hop it walks). To keep the
overall trace coherent without needing shared state between calls,
each address's next hop is a *pure deterministic function of that
address* (seeded hash) — so the same wallet always produces the same
next hop, and a full path naturally chains together and reliably
resolves to a known exchange within a few hops, mirroring how real
short laundering chains behave.
"""
import hashlib
import random
import time
import json
import os

_DATA_DIR = os.path.dirname(__file__) + "/../data"
with open(f"{_DATA_DIR}/known_exchanges.json") as f:
    _KNOWN = json.load(f)


def _seeded_rng(address: str) -> random.Random:
    seed = int(hashlib.sha256(address.encode()).hexdigest(), 16) % (10 ** 8)
    return random.Random(seed)


def _fake_addr(chain: str, seed_address: str) -> str:
    h = hashlib.sha256(f"layer::{seed_address}".encode()).hexdigest()
    if chain == "bitcoin":
        return "bc1q" + h[:38]
    return "0x" + h[:40]


def get_mock_btc_address_txs(address: str):
    return _next_hop_tx(address, "bitcoin")


def get_mock_eth_address_txs(address: str):
    return _next_hop_tx(address, "ethereum")


def _next_hop_tx(address: str, chain: str):
    """
    Returns a single simulated outgoing transaction from `address`.
    The destination is chosen deterministically from a hash of the
    address itself, so calling this repeatedly along a chain of
    derived addresses produces a stable, reproducible path:

      P(next hop is a known exchange)        ~ 45%
      P(next hop is a known mixer)            ~ 12%
      P(next hop is another layering wallet)  ~ 43%

    This gives a geometric-ish distribution of path lengths (mean ~2-3
    hops before resolution), consistent with typical real-world
    layering depths, and reliably resolves within the default
    max_hops=5 trace budget in the large majority of cases.
    """
    rng = _seeded_rng(address)
    known_list = _KNOWN.get(chain, [])
    mixer_list = _KNOWN.get("mixers_and_high_risk", {}).get(chain, [])

    roll = rng.random()
    if roll < 0.22 and known_list:
        next_addr = rng.choice(known_list)["address"]
    elif roll < 0.35 and mixer_list:
        next_addr = rng.choice(mixer_list)["address"]
    else:
        next_addr = _fake_addr(chain, address)

    value = round(rng.uniform(0.05, 3.5), 4)
    value_unit = "value_sats" if chain == "bitcoin" else "value_wei"
    value_raw = int(value * (1e8 if chain == "bitcoin" else 1e18))
    now = int(time.time())

    tx = {
        "txid": hashlib.sha256(f"{address}->{next_addr}".encode()).hexdigest(),
        "inputs": [{"address": address, value_unit: value_raw}],
        "outputs": [{"address": next_addr, value_unit: value_raw}],
        "confirmed": True,
        "block_time": now - 3600,
        "simulated": True,
    }
    return [tx]


def get_mock_mempool(chain: str, count: int = 50) -> list:
    """
    Generate `count` synthetic unconfirmed mempool transactions for the
    ambient blockchain universe animation. Each call seeds on the current
    10-second epoch so the set "updates" visually every 10 seconds while
    remaining stable within each epoch (no flicker).
    """
    epoch = int(time.time()) // 10          # stable for 10-second windows
    rng = random.Random(epoch ^ hash(chain) & 0xFFFFFFFF)
    known_list = _KNOWN.get(chain, [])
    value_unit = "value_sats" if chain == "bitcoin" else "value_wei"

    def _rnd_addr(seed: str) -> str:
        h = hashlib.sha256(seed.encode()).hexdigest()
        return ("bc1q" + h[:38]) if chain == "bitcoin" else ("0x" + h[:40])

    txs = []
    for i in range(count):
        seed = f"mempool::{chain}::{epoch}::{i}"
        rng2 = random.Random(hashlib.sha256(seed.encode()).hexdigest())
        sender = _rnd_addr(f"send::{seed}")
        # 25 % chance destination is a known exchange — makes the mempool
        # feel realistic with real destinations visible in the background
        if rng2.random() < 0.25 and known_list:
            receiver = rng2.choice(known_list)["address"]
        else:
            receiver = _rnd_addr(f"recv::{seed}")
        value = round(rng2.uniform(0.001, 5.0), 6)
        txs.append({
            "txid": hashlib.sha256(seed.encode()).hexdigest(),
            "sender": sender,
            "receiver": receiver,
            value_unit: int(value * (1e8 if chain == "bitcoin" else 1e18)),
            "value_display": value,
            "confirmed": False,
            "fee_rate": round(rng2.uniform(1, 200), 1),
        })
    return txs
