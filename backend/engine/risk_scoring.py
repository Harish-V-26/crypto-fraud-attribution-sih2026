"""
Risk scoring engine.

Rule-based (transparent, explainable) scoring — deliberately NOT a black-box
ML model, because investigators and courts need to know *why* a wallet was
flagged. This is real, working logic; it's the same style of scoring real
chain-analysis platforms surface as "risk indicators".

An optional ML layer (see train_synthetic_model.py) can be added on top for
anomaly detection at scale, trained on synthetic typologies since no public
labeled fraud dataset exists.
"""

RISK_WEIGHTS = {
    "mixer_touched": 40,
    "unresolved_after_max_hops": 20,
    "high_layering_count": 15,   # >3 intermediary wallets before resolution
    "rapid_fanout": 10,          # many candidate onward txs (obfuscation)
    "no_exchange_found": 15,
}


def score_trace(trace: dict) -> dict:
    score = 0
    reasons = []

    if trace["flags"]["mixer_touched"]:
        score += RISK_WEIGHTS["mixer_touched"]
        reasons.append("Funds passed through a known mixer/tumbler service")

    if trace["flags"]["layering_wallets"] > 3:
        score += RISK_WEIGHTS["high_layering_count"]
        reasons.append(f"{trace['flags']['layering_wallets']} intermediary layering wallets detected")

    if trace["attribution"] is None:
        score += RISK_WEIGHTS["no_exchange_found"]
        reasons.append("No known exchange/VASP deposit address found within trace depth")

    if trace["traced_hops"] >= 5 and trace["attribution"] is None:
        score += RISK_WEIGHTS["unresolved_after_max_hops"]
        reasons.append("Trail exceeds maximum trace depth without resolution — possible advanced laundering")

    score = min(score, 100)

    if score >= 70:
        band = "CRITICAL"
    elif score >= 45:
        band = "HIGH"
    elif score >= 20:
        band = "MEDIUM"
    else:
        band = "LOW"

    return {
        "risk_score": score,
        "risk_band": band,
        "reasons": reasons,
    }
