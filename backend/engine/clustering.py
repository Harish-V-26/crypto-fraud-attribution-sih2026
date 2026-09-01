"""
Wallet clustering via the common-input-ownership heuristic.

This is a real, well-established technique in blockchain forensics:
if two+ addresses are used together as inputs to the same transaction,
they're almost certainly controlled by the same wallet/entity (since
spending requires the private key for each input).

Works directly on real transaction data returned by the blockchain clients.
Most useful for Bitcoin (UTXO model); Ethereum's account model doesn't
need this heuristic since one address = one account already.
"""
from collections import defaultdict


def cluster_from_txs(txs: list[dict]) -> list[list[str]]:
    """
    Given a list of transactions (each with an 'inputs' list of
    {'address': ...}), return clusters of addresses that co-appear
    as inputs — i.e. are likely the same owner.
    """
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for tx in txs:
        addrs = [i["address"] for i in tx.get("inputs", []) if i.get("address")]
        for a in addrs:
            find(a)
        for i in range(1, len(addrs)):
            union(addrs[0], addrs[i])

    groups = defaultdict(list)
    for addr in parent:
        groups[find(addr)].append(addr)

    return [sorted(set(g)) for g in groups.values() if len(g) > 1]
