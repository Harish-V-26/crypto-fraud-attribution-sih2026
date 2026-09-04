"""
Core tracing engine — extended with bridge and DeFi detection.

Given a victim-reported wallet address, performs a breadth-first walk
outward through subsequent transactions to find the nearest known
exchange/VASP deposit address.

Extended features:
  - Cross-chain bridge detection (Wormhole, LayerZero, Hop, Stargate, etc.)
  - DeFi protocol detection (Uniswap, Aave, Compound, 1inch, etc.)
  - Both flagged as distinct node types in the graph for 3D visualization.
"""
import json
import os
from typing import Literal

from blockchain import bitcoin_client, ethereum_client
from engine.cross_chain import is_bridge, is_defi

_DATA_DIR = os.path.dirname(__file__) + "/../data"
with open(f"{_DATA_DIR}/known_exchanges.json") as f:
    _KNOWN = json.load(f)

_EXCHANGE_INDEX = {}
for chain in ("bitcoin", "ethereum"):
    for entry in _KNOWN.get(chain, []):
        _EXCHANGE_INDEX[entry["address"].lower()] = entry

_MIXER_INDEX = {}
for chain in ("bitcoin", "ethereum"):
    for entry in _KNOWN.get("mixers_and_high_risk", {}).get(chain, []):
        _MIXER_INDEX[entry["address"].lower()] = entry


def _client_for(chain: str):
    return bitcoin_client if chain == "bitcoin" else ethereum_client


def _value_of(entry: dict) -> float:
    return entry.get("value_sats") or entry.get("value_wei") or 0


async def trace_wallet(address: str, chain: Literal["bitcoin", "ethereum"], max_hops: int = 12, max_branches: int = 4):
    """
    BFS outward from `address`, following the largest-value outputs of
    each hop, until a known exchange/VASP address is hit or max_hops
    is reached.

    Returns a structured trace result with:
      - path: ordered list of hops (for the primary/highest-value branch)
      - graph: full node/edge list (for visualization — includes bridge/defi nodes)
      - attribution: matched exchange, or None if untraceable
      - flags: mixer touches, layering wallet count, bridge events, defi events
      - data_source: 'live' or 'mock'
    """
    client = _client_for(chain)
    visited = set()
    graph_nodes = {address: {"id": address, "type": "source", "label": "Reported wallet"}}
    graph_edges = []
    path = [{"address": address, "role": "victim_reported"}]
    flags = {
        "mixer_touched": False,
        "layering_wallets": 0,
        "hops_to_exchange": None,
        "bridge_events": [],
        "defi_events": [],
        "cross_chain_detected": False,
    }
    data_source = "live"

    current = address
    attribution = None

    for hop in range(max_hops):
        visited.add(current)
        result = await client.get_address_transactions(current, limit=15)
        if result["source"] == "mock":
            data_source = "mock"

        txs = result["txs"]
        if not txs:
            break

        candidates = []
        for tx in txs:
            for out in tx.get("outputs", []):
                out_addr = out.get("address")
                if out_addr and out_addr.lower() != current.lower() and out_addr not in visited:
                    candidates.append((out_addr, _value_of(out), tx["txid"]))

        if not candidates:
            break

        candidates.sort(key=lambda c: c[1], reverse=True)
        next_addr, value, txid = candidates[0]

        node_type = "layering"
        label = f"Hop {hop + 1}"

        # --- Priority-ordered type detection ---
        addr_lower = next_addr.lower()

        if addr_lower in _MIXER_INDEX:
            node_type = "mixer"
            label = _MIXER_INDEX[addr_lower]["service"]
            flags["mixer_touched"] = True

        elif addr_lower in _EXCHANGE_INDEX:
            node_type = "exchange"
            entry = _EXCHANGE_INDEX[addr_lower]
            label = f"{entry['exchange']} ({entry['type']})"
            attribution = entry
            flags["hops_to_exchange"] = hop + 1

        elif (bridge_meta := is_bridge(next_addr)) is not None:
            node_type = "bridge"
            label = bridge_meta.get("bridge", "Cross-Chain Bridge")
            flags["cross_chain_detected"] = True
            flags["bridge_events"].append({
                "hop": hop + 1, "address": next_addr,
                "bridge": bridge_meta.get("bridge"),
                "destination_chains": bridge_meta.get("destination_chains", []),
                "txid": txid,
            })

        elif (defi_meta := is_defi(next_addr)) is not None:
            node_type = "defi"
            label = defi_meta.get("protocol", "DeFi Protocol")
            flags["defi_events"].append({
                "hop": hop + 1, "address": next_addr,
                "protocol": defi_meta.get("protocol"),
                "category": defi_meta.get("category"),
                "txid": txid,
            })

        else:
            flags["layering_wallets"] += 1

        graph_nodes[next_addr] = {"id": next_addr, "type": node_type, "label": label}
        graph_edges.append({"from": current, "to": next_addr, "txid": txid, "value": value})
        path.append({"address": next_addr, "role": node_type, "txid": txid})

        # --- Add side-branch nodes (secondary outputs) to graph for rich 3D visualisation ---
        # These show the full "fanout" a real fraudster uses — multiple layering wallets
        # created simultaneously at each hop to increase complexity.
        for branch_addr, branch_value, branch_txid in candidates[1: max_branches + 1]:
            if branch_addr not in graph_nodes and branch_addr not in visited:
                b_lower = branch_addr.lower()
                if b_lower in _EXCHANGE_INDEX:
                    b_type = "exchange"
                    b_label = _EXCHANGE_INDEX[b_lower].get("exchange", "Exchange")
                elif b_lower in _MIXER_INDEX:
                    b_type = "mixer"
                    b_label = _MIXER_INDEX[b_lower].get("service", "Mixer")
                elif is_bridge(branch_addr):
                    b_type = "bridge"
                    b_label = "Bridge Output"
                else:
                    b_type = "layering"
                    b_label = f"Branch-{hop + 1}"
                graph_nodes[branch_addr] = {"id": branch_addr, "type": b_type, "label": b_label}
                graph_edges.append({
                    "from": current, "to": branch_addr,
                    "txid": branch_txid, "value": branch_value,
                    "is_branch": True,
                })

        if node_type == "exchange":
            break

        current = next_addr

    return {
        "source_address": address,
        "chain": chain,
        "data_source": data_source,
        "attribution": attribution,
        "path": path,
        "graph": {"nodes": list(graph_nodes.values()), "edges": graph_edges},
        "flags": flags,
        "traced_hops": len(path) - 1,
    }
